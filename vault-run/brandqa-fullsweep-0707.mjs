// brandqa-fullsweep-0707.mjs — comprehensive brand-cohesion sweep across
// lobby/bet-entry/playing/settled x 3 worlds, forcing WIN + LOSS outcomes.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5286'
const OUT = process.argv[3] || 'shots-brandqa-fullsweep-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickWorldCard(page, mode) {
  return page.evaluate((mode) => {
    const el = document.querySelector(`[data-testid="vault-world-card-${mode}"]`)
    if (el) { el.click(); return true }
    return false
  }, mode)
}
async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: v.dsf || 1, isMobile: !!v.mobile, hasTouch: !!v.mobile })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(600)
}
async function boardBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
function cellSeqFor(gridSize) {
  const seq = []
  for (let cy = 0; cy < gridSize; cy++) for (let cx = 0; cx < gridSize; cx++) seq.push([cx, cy])
  return seq
}
async function tapCell(page, box, gridSize, idx) {
  const seq = cellSeqFor(gridSize)
  const [cx, cy] = seq[idx]
  const fx = 0.06 + ((cx + 0.5) / gridSize) * 0.88
  const fy = 0.08 + ((cy + 0.5) / gridSize) * 0.8
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
const isSettled = (page) => page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"], [data-testid="vault-settled-receipt-card"]') || document.body.textContent.toLowerCase().includes('bet again'))

const emdashScan = (page) => page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const hits = []
  let n
  while ((n = walker.nextNode())) {
    if (n.nodeValue && n.nodeValue.includes('—')) {
      hits.push({ text: n.nodeValue.trim().slice(0, 160), parent: n.parentElement ? n.parentElement.tagName + (n.parentElement.getAttribute('data-testid') ? '#' + n.parentElement.getAttribute('data-testid') : '') : 'none' })
    }
  }
  document.querySelectorAll('[aria-label], [title]').forEach((el) => {
    const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
    if (al && al.includes('—')) hits.push({ text: al.slice(0, 160), parent: 'aria-label:' + el.tagName })
    if (ti && ti.includes('—')) hits.push({ text: ti.slice(0, 160), parent: 'title:' + el.tagName })
  })
  return hits
})
const casinoVocabScan = (page) => page.evaluate(() => {
  const re = /\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/gi
  const hits = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    const v = n.nodeValue
    if (v && re.test(v)) hits.push({ text: v.trim().slice(0, 160), parent: n.parentElement ? n.parentElement.tagName : 'none' })
    re.lastIndex = 0
  }
  document.querySelectorAll('[aria-label], [title]').forEach((el) => {
    const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
    if (al && re.test(al)) hits.push({ text: al.slice(0, 160), parent: 'aria-label:' + el.tagName })
    re.lastIndex = 0
    if (ti && re.test(ti)) hits.push({ text: ti.slice(0, 160), parent: 'title:' + el.tagName })
    re.lastIndex = 0
  })
  return hits
})
const cyanScan = (page) => page.evaluate(() => {
  const targets = ['0, 240, 255', '41, 230, 255', '0, 208, 222']
  const hits = []
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el)
    const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.boxShadow]
    for (const val of props) {
      if (val && targets.some((t) => val.includes(t))) {
        hits.push({ tag: el.tagName, cls: el.className, testid: el.getAttribute('data-testid') })
        break
      }
    }
  })
  return hits
})
const wordmarkScan = (page) => page.evaluate(() => {
  const hasAttr = !!document.querySelector('[data-watermark], .swoobz-watermark')
  const bodyHasSwoobzWord = /swoobz/i.test(document.body.innerHTML) && !/localStorage|import|href|src=/.test('') // cheap
  return { hasAttr }
})
const bgScan = (page) => page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor }))
const fontScan = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  return el ? getComputedStyle(el).fontFamily : null
}, sel)

const results = {}

async function sweepPhase(page, key) {
  results.emdash = results.emdash || {}
  results.casino = results.casino || {}
  results.cyan = results.cyan || {}
  results.bg = results.bg || {}
  const ed = await emdashScan(page)
  const cv = await casinoVocabScan(page)
  const cy = await cyanScan(page)
  const bg = await bgScan(page)
  if (ed.length) results.emdash[key] = ed
  if (cv.length) results.casino[key] = cv
  results.cyan[key] = cy.length
  results.bg[key] = bg
  await page.screenshot({ path: `${OUT}/${key.replace(/[^a-z0-9-]/gi, '_')}.png` })
}

async function main() {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
  const page = await b.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const worlds = [
    { name: 'bluechips', gridSize: 5 },
    { name: 'altseason', gridSize: 5 },
    { name: 'shitcoin', gridSize: 7 },
  ]

  results.wordmark = await (async () => { await loadFresh(page, { w: 1440, h: 900 }); return wordmarkScan(page) })()
  results.fonts = {}

  for (const w of worlds) {
    // LOBBY
    await loadFresh(page, { w: 1440, h: 900 })
    await sweepPhase(page, `${w.name}-lobby`)

    // pick world + BET ENTRY
    await clickWorldCard(page, w.name)
    await wait(300)
    await clickText(page, 'ape in')
    await wait(500)
    await sweepPhase(page, `${w.name}-betentry`)

    // HOW TO PLAY modal
    const helpClicked = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-corner-help"], [aria-label="Close"]')
      const cand = document.querySelector('[data-testid="vault-corner-help"]')
      if (cand) { cand.click(); return true }
      return false
    })
    await wait(300)
    await sweepPhase(page, `${w.name}-howtoplay`)
    await page.evaluate(() => { document.querySelectorAll('button').forEach((b) => { if ((b.textContent || '').trim() === '✕' || (b.textContent||'').trim().toLowerCase().includes('got it')) b.click() }) })
    await wait(200)

    // PLAYING
    await clickText(page, 'send it')
    await wait(700)
    await sweepPhase(page, `${w.name}-playing`)
    results.fonts[`${w.name}-playing-numeral`] = await fontScan(page, '[data-testid="vault-hud-pump-value"], [data-testid="vault-grid-hud-inner"]')

    // force LOSS: tap tiles in sequence until settled (row-major hits a mine
    // quickly given mine density) — cap at gridSize*gridSize taps.
    const total = w.gridSize * w.gridSize
    let settledFlag = false
    for (let i = 0; i < total; i++) {
      const box = await boardBox(page)
      if (!box) break
      await tapCell(page, box, w.gridSize, i)
      await wait(150)
      settledFlag = await isSettled(page)
      if (settledFlag) break
    }
    await wait(400)
    await sweepPhase(page, `${w.name}-settled-loss`)

    // BET AGAIN -> fresh round, force WIN (tap once safe, then take profit)
    await clickText(page, 'bet again')
    await wait(500)
    await clickText(page, 'send it')
    await wait(500)
    const box2 = await boardBox(page)
    if (box2) { await tapCell(page, box2, w.gridSize, 0); await wait(300) }
    let settledAfterOne = await isSettled(page)
    if (!settledAfterOne) {
      await clickText(page, 'take profit')
      await wait(500)
    }
    await sweepPhase(page, `${w.name}-settled-win`)
  }

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await b.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
