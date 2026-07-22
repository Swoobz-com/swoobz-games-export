import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0703'
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

// CORRECT geometry this time: rect-to-rect gap distance (0 if overlapping,
// else the true Euclidean-ish axis gap) between each named FRAME element
// (outer-card border LINE, each corner bracket rect, each specimen bezel
// ring rect) and each cyan/volt-bearing element's rect EXPANDED by its own
// glow blur radius. For the outer card, we test the actual 1px border LINE
// (not "inside the card bbox", which is meaningless since the card contains
// everything) via perpendicular distance + span-overlap check.
async function scanFrameContact(page) {
  return page.evaluate(() => {
    function rectGap(a, b) {
      const dx = Math.max(a.left - b.right, b.left - a.right, 0)
      const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0)
      return Math.sqrt(dx * dx + dy * dy)
    }
    function lineDistance(edge, r) {
      // edge: {x0,y0,x1,y1} axis-aligned. r: rect. Returns Infinity if no span overlap.
      if (edge.y0 === edge.y1) { // horizontal line
        const spanOverlap = r.right >= edge.x0 && r.left <= edge.x1
        if (!spanOverlap) return Infinity
        return Math.min(Math.abs(r.top - edge.y0), Math.abs(r.bottom - edge.y0))
      } else {
        const spanOverlap = r.bottom >= edge.y0 && r.top <= edge.y1
        if (!spanOverlap) return Infinity
        return Math.min(Math.abs(r.left - edge.x0), Math.abs(r.right - edge.x0))
      }
    }
    const isCyanish = (v) => v && (/0,\s*240,\s*255/.test(v) || /41,\s*230,\s*255/.test(v))
    const cyanEls = [...document.querySelectorAll('*')].filter(el => {
      const cs = getComputedStyle(el)
      return isCyanish(cs.color) || isCyanish(cs.backgroundColor) || isCyanish(cs.borderColor) || isCyanish(cs.boxShadow) || isCyanish(cs.textShadow)
    }).map(el => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      let margin = 0
      const m = cs.boxShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (m) margin = parseInt(m[3], 10)
      const m2 = cs.textShadow.match(/(\d+)px\s+(\d+)px\s+(\d+)px/)
      if (m2) margin = Math.max(margin, parseInt(m2[3], 10))
      return { el, rect: { left: r.left - margin, right: r.right + margin, top: r.top - margin, bottom: r.bottom + margin }, margin, tag: el.tagName, cs: { color: cs.color, bg: cs.backgroundColor, border: cs.borderColor, shadow: cs.boxShadow.slice(0, 90) } }
    })

    // Outer card: the ONE div whose OWN border (not descendant) is the brass hairline.
    const cardEl = [...document.querySelectorAll('div')].find(d => {
      const cs = getComputedStyle(d)
      return /202,\s*160,\s*64/.test(cs.borderTopColor)
    })
    const results = { cardHairlineContacts: [], bracketContacts: [], bezelContacts: [] }
    if (cardEl) {
      const cr = cardEl.getBoundingClientRect()
      const edges = [
        { name: 'top', x0: cr.left, y0: cr.top, x1: cr.right, y1: cr.top },
        { name: 'bottom', x0: cr.left, y0: cr.bottom, x1: cr.right, y1: cr.bottom },
        { name: 'left', x0: cr.left, y0: cr.top, x1: cr.left, y1: cr.bottom },
        { name: 'right', x0: cr.right, y0: cr.top, x1: cr.right, y1: cr.bottom },
      ]
      const THRESH = 2 // px — genuine contact tolerance
      for (const c of cyanEls) {
        for (const e of edges) {
          const d = lineDistance(e, c.rect)
          if (d < THRESH) results.cardHairlineContacts.push({ edge: e.name, dist: d, tag: c.tag, style: c.cs })
        }
      }
    }
    // Corner brackets: small absolutely-positioned divs with brass border-top/left/right at top corners (16x16-ish)
    const brackets = [...document.querySelectorAll('div')].filter(d => {
      const cs = getComputedStyle(d)
      return (/202,\s*160,\s*64/.test(cs.borderTopColor) || /202,\s*160,\s*64/.test(cs.borderLeftColor) || /202,\s*160,\s*64/.test(cs.borderRightColor)) && d.offsetWidth < 30 && d.offsetHeight < 30
    })
    const THRESH2 = 2
    for (const b of brackets) {
      const br = b.getBoundingClientRect()
      for (const c of cyanEls) {
        const d = rectGap(br, c.rect)
        if (d < THRESH2) results.bracketContacts.push({ bracketRect: { x: br.x, y: br.y, w: br.width, h: br.height }, dist: d, tag: c.tag, style: c.cs })
      }
    }
    // Specimen bezel rings: divs with 3px solid #caa040 or #8f7d5c border
    const bezels = [...document.querySelectorAll('div')].filter(d => {
      const cs = getComputedStyle(d)
      return cs.borderTopWidth === '3px' && (/202,\s*160,\s*64/.test(cs.borderTopColor) || /143,\s*125,\s*92/.test(cs.borderTopColor))
    })
    for (const bz of bezels) {
      const bzr = bz.getBoundingClientRect()
      for (const c of cyanEls) {
        const d = rectGap(bzr, c.rect)
        if (d < THRESH2) results.bezelContacts.push({ bezelRect: { x: bzr.x, y: bzr.y, w: bzr.width, h: bzr.height }, dist: d, tag: c.tag, style: c.cs })
      }
    }
    results.meta = { cyanElCount: cyanEls.length, bracketCount: brackets.length, bezelCount: bezels.length, cardFound: !!cardEl }
    return results
  })
}

await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 150))
let won = false
let anyContact = false
for (let attempt = 0; attempt < 60 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const tile = box.w / 32
  for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
  await new Promise(r => setTimeout(r, 40))
  const pace = await bodyText()
  if (pace.includes('PACE: INSTANT')) { await clickText('PACE:'); await new Promise(r => setTimeout(r, 30)) }
  await clickText('PLUNGE')
  for (let t = 0; t < 8; t++) {
    await new Promise(r => setTimeout(r, 90))
    const scan = await scanFrameContact(page)
    const total = scan.cardHairlineContacts.length + scan.bracketContacts.length + scan.bezelContacts.length
    console.log(`t=${t * 90}ms attempt=${attempt} meta=`, JSON.stringify(scan.meta))
    if (total > 0) {
      anyContact = true
      console.log(`CONTACT at t=${t * 90}ms attempt=${attempt}`, JSON.stringify(scan, null, 2))
      await page.screenshot({ path: `${OUT}/REAL-CONTACT-attempt${attempt}-t${t}.png` })
    }
  }
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    await page.screenshot({ path: `${OUT}/win-full2.png` })
    const finalScan = await scanFrameContact(page)
    console.log('FINAL_SETTLE_SCAN', JSON.stringify(finalScan, null, 2))
    if (finalScan.cardHairlineContacts.length + finalScan.bracketContacts.length + finalScan.bezelContacts.length > 0) anyContact = true
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r => setTimeout(r, 200))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 100))
  }
}
console.log('won', won, 'anyContact', anyContact)
await browser.close()
