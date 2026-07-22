import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-brandqa-0703'
fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5399/', { waitUntil: 'networkidle0' })

const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)

await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 200))

const results = {}

// ── 1. em-dash scan across all rendered DOM text ──
results.emDash = await page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const hits = []
  let n
  while ((n = walker.nextNode())) {
    if (n.nodeValue.includes('—')) {
      hits.push({ text: n.nodeValue.trim(), parent: n.parentElement?.outerHTML?.slice(0, 120) })
    }
  }
  return hits
})

// ── 2. Corner bracket + hairline pixel-contact probe ──
// Find the card wrapper (has border with rgba(202,160,64) and overflow hidden) and the two corner brackets.
const cardInfo = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')]
  const card = all.find(d => {
    const cs = getComputedStyle(d)
    return cs.borderTopColor.includes('202, 160, 64') || cs.borderTopColor.includes('202,160,64')
  })
  if (!card) return null
  const r = card.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
results.cardInfo = cardInfo

async function sampleZoom(name, clip) {
  await page.screenshot({ path: `${OUT}/${name}.png`, clip })
}

if (cardInfo) {
  // top-left corner bracket zoom (30x30 at card top-left)
  await sampleZoom('corner-topleft', { x: Math.max(0, cardInfo.x - 5), y: Math.max(0, cardInfo.y - 5), width: 40, height: 40 })
  await sampleZoom('corner-topright', { x: cardInfo.x + cardInfo.w - 35, y: Math.max(0, cardInfo.y - 5), width: 40, height: 40 })
  // full outer hairline edges
  await sampleZoom('card-full', { x: cardInfo.x - 4, y: cardInfo.y - 4, width: cardInfo.w + 8, height: cardInfo.h + 8 })
}

// Pixel probe: sample along the card border (all 4 edges) for any cyan-leaning pixel.
// volt=#00F0FF (0,240,255), cyan=#29E6FF (41,230,255). "cyan-leaning" = B high, G>150, R<100.
results.hairlinePixelScan = await page.evaluate((info) => {
  if (!info) return null
  function isCyanish(r, g, b) {
    return b > 180 && g > 140 && r < 110
  }
  const hits = []
  // Sample a screenshot isn't directly available in DOM context; instead we
  // rasterize via a canvas snapshot of the whole page using html2canvas is
  // unavailable, so we fall back to checking computed styles of elements
  // whose bounding box intersects a thin band around the card border.
  const bandPx = 6
  const edges = [
    { x0: info.x, y0: info.y, x1: info.x + info.w, y1: info.y }, // top
    { x0: info.x, y0: info.y + info.h, x1: info.x + info.w, y1: info.y + info.h }, // bottom
    { x0: info.x, y0: info.y, x1: info.x, y1: info.y + info.h }, // left
    { x0: info.x + info.w, y0: info.y, x1: info.x + info.w, y1: info.y + info.h }, // right
  ]
  const all = [...document.querySelectorAll('*')]
  for (const el of all) {
    const cs = getComputedStyle(el)
    const hasCyanColor = [cs.color, cs.backgroundColor, cs.borderColor, cs.boxShadow].some(v =>
      v && (v.includes('0, 240, 255') || v.includes('0,240,255') || v.includes('41, 230, 255') || v.includes('41,230,255'))
    )
    if (!hasCyanColor) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    for (const e of edges) {
      // distance from element rect to the edge line segment (axis-aligned approx)
      let dist = Infinity
      if (e.y0 === e.y1) { // horizontal edge
        const withinX = r.right >= e.x0 - bandPx && r.left <= e.x1 + bandPx
        if (withinX) dist = Math.min(Math.abs(r.top - e.y0), Math.abs(r.bottom - e.y0))
      } else { // vertical edge
        const withinY = r.bottom >= e.y0 - bandPx && r.top <= e.y1 + bandPx
        if (withinY) dist = Math.min(Math.abs(r.left - e.x0), Math.abs(r.right - e.x0))
      }
      if (dist < bandPx) {
        hits.push({ tag: el.tagName, cls: el.className?.toString().slice(0,60), dist, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, style: { color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, shadow: cs.boxShadow.slice(0,80) } })
      }
    }
  }
  return hits
}, cardInfo)

// ── 3. Numeric readout font check ──
results.numericFonts = await page.evaluate(() => {
  const candidates = [...document.querySelectorAll('*')].filter(el => {
    const t = el.textContent?.trim() || ''
    return el.children.length === 0 && /^[\$\-\+0-9.,%×x]+$/.test(t) && t.length > 0 && /[0-9]/.test(t)
  })
  return candidates.map(el => ({ text: el.textContent.trim(), font: getComputedStyle(el).fontFamily }))
})

// ── 4. wordmark presence + clipping ──
results.wordmark = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(e => e.textContent?.trim() === 'SWOOBZ' && e.children.length === 0)
  if (els.length === 0) return { present: false }
  const el = els[0]
  const r = el.getBoundingClientRect()
  // check ancestor overflow:hidden clipping
  let clipped = false
  let p = el.parentElement
  while (p) {
    const cs = getComputedStyle(p)
    if (cs.overflow === 'hidden' || cs.overflowY === 'hidden' || cs.overflowX === 'hidden') {
      const pr = p.getBoundingClientRect()
      if (r.top < pr.top || r.bottom > pr.bottom || r.left < pr.left || r.right > pr.right) clipped = true
    }
    p = p.parentElement
  }
  return { present: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, clipped, computedFont: getComputedStyle(el).fontFamily, color: getComputedStyle(el).color }
})

// ── 5. gold hex scan on rendered computed styles (play surface only, excluding known frame els) ──
results.goldOnPlaySurface = await page.evaluate(() => {
  const goldish = (v) => v && /rgba?\((2[0-3]\d|1\d\d),\s*(1[5-9]\d|2[01]\d)/.test(v) === false && (v.includes('255, 216, 115') || v.includes('232, 176, 61') || v.includes('138, 106, 36'))
  const hits = []
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el)
    ;[cs.color, cs.backgroundColor, cs.borderColor].forEach(v => { if (goldish(v)) hits.push({ tag: el.tagName, v }) })
  })
  return hits
})

console.log(JSON.stringify(results, null, 2))

// ── 6. Coin fly cyan check ──
const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
const tile = box.w / 32
for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
await new Promise(r => setTimeout(r, 60))
const pace = await bodyText()
if (pace.includes('PACE: INSTANT')) { await clickText('PACE:'); await new Promise(r => setTimeout(r, 50)) }
await clickText('PLUNGE')
await new Promise(r => setTimeout(r, 140))
const coinFlyProbe = await page.evaluate(() => {
  const fixedEls = [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).position === 'fixed' && getComputedStyle(d).borderRadius === '50%')
  return fixedEls.map(el => {
    const cs = getComputedStyle(el)
    return { bg: cs.backgroundImage || cs.background, border: cs.borderColor, shadow: cs.boxShadow }
  })
})
console.log('COINFLY_PROBE', JSON.stringify(coinFlyProbe, null, 2))
await page.screenshot({ path: `${OUT}/coinfly-inflight.png` })

await browser.close()
