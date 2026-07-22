// Scaling check: does the full-bake (>=100 drawImage calls/frame) count scale
// with revealed-disc count? Old bug: 1 full bake PER disc (so trail=4 -> ~4
// full bakes, trail=8 -> ~8 full bakes). Fixed behavior: 1 full bake total
// (phase transition only), independent of trail length.
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

async function runTrial(trailLen) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument(() => {
    window.__frameCounts = []; window.__curCount = 0
    const orig = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...a) { window.__curCount++; return orig.apply(this, a) }
    window.__raf0 = null
    function tick() { window.__frameCounts.push(window.__curCount); window.__curCount = 0; window.__raf0 = requestAnimationFrame(tick) }
    window.__startCounting = () => { window.__frameCounts = []; window.__curCount = 0; window.__raf0 = requestAnimationFrame(tick) }
    window.__stopCounting = () => { if (window.__raf0) cancelAnimationFrame(window.__raf0); return window.__frameCounts.slice() }
  })
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
  await page.evaluate(() => window.__startCounting())
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(3000)
  const frameCounts = await page.evaluate(() => window.__stopCounting())
  const outcome = await page.evaluate(() => { const t = document.body.innerText; return { won: /LINE CLAIMED|CLAIMED/i.test(t), bust: /BUSTED|BUST/i.test(t) } })
  await browser.close()
  const full = frameCounts.filter(c => c >= 100)
  const mid = frameCounts.filter(c => c > 12 && c < 100)
  return { trailLen, outcome: outcome.won ? 'WON' : outcome.bust ? 'BUST' : '?', fullBakeCount: full.length, fullBakeValues: full, midBakeCount: mid.length, midBakeValues: mid }
}

for (const trailLen of [8, 16, 8, 16]) {
  const r = await runTrial(trailLen)
  console.log(`trailLen=${r.trailLen} outcome=${r.outcome} fullBakeCount(>=100 drawImage/frame)=${r.fullBakeCount} values=${JSON.stringify(r.fullBakeValues)} midBakeCount(13-99)=${r.midBakeCount}`)
}
