// Supplementary frame-timing scaling check (trail=8 vs trail=16), run back-to-
// back on the SAME machine/moment to control for ambient CPU noise (this box
// has a live multi-tab Chrome browser open concurrently — absolute ms values
// are inflated vs. a quiet machine, but the SCALING comparison is still valid).
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const BUDGET = 22.2

function summary(frames) {
  const s = [...frames].sort((a, b) => a - b)
  const over = frames.filter(f => f > BUDGET)
  return { count: frames.length, maxMs: +Math.max(...frames).toFixed(1), p95Ms: +s[Math.floor(frames.length*0.95)].toFixed(1), overBudgetCount: over.length }
}

async function runTrial(trailLen) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const client = await page.createCDPSession()
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(300)
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    let c = heading?.parentElement
    for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement }
  })
  await wait(150)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let i = 0; i < trailLen; i++) cells.push([2 + (i % 4), 2 + Math.floor(i / 4)])
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(35) }
  await wait(200)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 6 })
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft.push(n - last); last = n; window.__raf = requestAnimationFrame(tick) } window.__raf = requestAnimationFrame(tick) })
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(3000)
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__ft.slice() })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await browser.close()
  return { trailLen, ...summary(frames.slice(10)) }
}

for (const trailLen of [8, 16, 8, 16]) {
  const r = await runTrial(trailLen)
  console.log(`trailLen=${r.trailLen} maxMs=${r.maxMs} p95Ms=${r.p95Ms} overBudgetCount=${r.overBudgetCount} (frames=${r.count})`)
}
