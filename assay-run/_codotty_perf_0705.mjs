// Reveal-cascade perf probe (BLOCKER 2). Drives a multi-disc claim line on the
// DESKTOP 196-tile board (worst case: all 196 draw), throttles CPU to expose
// per-frame cost, captures rAF frame deltas across the reveal cascade, and
// reports max-frame-ms + over-budget count (budget = 22.2ms ≈ 45fps floor).
// A per-disc full-board rebake shows up as one frame spike PER revealed disc.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const THROTTLE = Number(process.argv[2] || 6)
const BUDGET = 22.2

function summary(frames) {
  if (!frames.length) return { count: 0 }
  const s = [...frames].sort((a, b) => a - b)
  const over = frames.filter(f => f > BUDGET)
  return {
    count: frames.length,
    avgMs: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(2),
    p95Ms: +s[Math.floor(frames.length * 0.95)].toFixed(2),
    maxMs: +Math.max(...frames).toFixed(2),
    overBudgetCount: over.length,
    overBudgetMs: over.map(f => +f.toFixed(1)).sort((a, b) => b - a).slice(0, 12),
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
const client = await page.createCDPSession()

let best = null
for (let attempt = 0; attempt < 12; attempt++) {
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(500)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(300)
  // lowest-risk tier (first TEMPLE DEPTH button) to keep the trail alive longer
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    let c = heading?.parentElement
    for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement }
  })
  await wait(150)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  // Paint a long snake trail (up to 20 discs) so multiple reveals fire.
  const cells = []
  for (let row = 3; row <= 7; row++) {
    const cols = row % 2 ? [3,4,5,6] : [6,5,4,3]
    for (const col of cols) cells.push([col, row])
  }
  for (const [col, row] of cells) {
    await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(35)
  }
  await wait(200)
  await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft.push(n - last); last = n; window.__raf = requestAnimationFrame(tick) } window.__raf = requestAnimationFrame(tick) })
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(4000)
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__ft.slice() })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const proven = await page.evaluate(() => {
    const t = document.body.innerText
    const m = t.match(/(\d+)\s*\/\s*\d+\s*proven/i) || t.match(/proven[^0-9]*(\d+)/i)
    return { won: /LINE CLAIMED|CLAIMED/i.test(t), bust: /BUSTED|BUST/i.test(t) }
  })
  // Ignore the first ~10 warmup frames (throttle ramp)
  const rev = summary(frames.slice(10))
  console.log(`attempt ${attempt}: ${proven.won ? 'WON' : proven.bust ? 'BUST' : '?'}  frames=${rev.count} max=${rev.maxMs}ms p95=${rev.p95Ms}ms over(${BUDGET}ms)=${rev.overBudgetCount}`)
  if (!best || rev.count > best.count) best = rev
}
console.log(`\n=== REVEAL-CASCADE FRAME TIMING (CPU throttle ${THROTTLE}x, desktop 196 tiles) ===`)
console.log(JSON.stringify(best, null, 2))
await browser.close()
