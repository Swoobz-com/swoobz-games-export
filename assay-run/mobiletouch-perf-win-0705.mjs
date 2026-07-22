// Capture throttled frame timing specifically during a WINNING settle (board
// bloom sweep + coin-fly + cartouche pop-in), which the main pass mostly
// missed (busted both times). Uses the lowest-risk Outer tier + a 2-disc
// trail + INSTANT pace toggled off (keep default staggered) to raise the
// odds of landing a claim within a small number of attempts.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-elevation-0705'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function fpsSummary(frames) {
  const long = frames.filter((f) => f > 1000 / 45)
  return {
    count: frames.length,
    avgMs: frames.length ? Math.round((frames.reduce((a, b) => a + b, 0) / frames.length) * 100) / 100 : null,
    p95Ms: frames.length ? Math.round([...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)] * 100) / 100 : null,
    maxMs: frames.length ? Math.round(Math.max(...frames) * 100) / 100 : null,
    pctBelow45fps: frames.length ? Math.round((long.length / frames.length) * 1000) / 10 : null,
    impliedAvgFps: frames.length ? Math.round((1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)) * 10) / 10 : null,
  }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })

const client = await page.createCDPSession()
await client.send('Network.enable')

const tapText = async (txt) => {
  const box = await page.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, txt)
  if (!box) return false
  await page.touchscreen.tap(box.x, box.y)
  return true
}

let won = false
for (let attempt = 0; attempt < 25 && !won; attempt++) {
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(300)
  await tapText('ENTER THE ASSAY LINE')
  await wait(300)
  // Ensure Outer tier (lowest risk) is selected.
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    let c = heading?.parentElement
    for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return }; c = c.parentElement }
  })
  await wait(150)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top } })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = 2 + (i % 4), row = 2 + Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(70)
  }
  await wait(200)

  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft.push(n - last); last = n; requestAnimationFrame(tick) } requestAnimationFrame(tick) })
  await tapText('RUN THE LINE')
  await wait(3000)
  const frames = await page.evaluate(() => window.__ft.slice())
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })

  const outcome = await page.evaluate(() => { const t = document.body.innerText; if (/LINE CLAIMED/i.test(t)) return 'WON'; if (/BUSTED/i.test(t)) return 'BUST'; return 'UNKNOWN' })
  console.log('attempt', attempt, outcome)
  if (outcome === 'WON') {
    won = true
    await page.screenshot({ path: `${OUT}/pixel7-win-settle.png` })
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
    console.log('WIN frame timing:', JSON.stringify(fpsSummary(frames), null, 2))
    console.log('overflow at win settle:', overflow)
  }
}
if (!won) console.log('no win captured after 25 attempts')
await browser.close()
