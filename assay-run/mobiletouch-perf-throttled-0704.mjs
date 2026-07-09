// Throttled mobile perf pass (CHECK 6): 4x CPU throttle + Slow-3G-ish network
// via CDP, matching the mobile-touch QA spec's Probe 6, applied specifically
// to the pan gesture + cascade-reveal sequence (the two things unique to this
// vault-pivot: panning a large fixed-tile canvas while coin-reveal pops
// animate). Unthrottled dev-machine numbers in the main pass were optimistic;
// this is the realistic mid/low-tier-mobile read.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915 },
  { name: 'iphone14pro', width: 393, height: 852 },
]

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

async function touchDrag(page, cx, cy, dx, dy, steps = 16, stepWaitMs = 16) {
  const touch = await page.touchscreen.touchStart(cx, cy)
  for (let i = 1; i <= steps; i++) {
    await touch.move(cx + (dx * i) / steps, cy + (dy * i) / steps)
    await wait(stepWaitMs)
  }
  await touch.end()
  await wait(200)
}

function fpsSummary(frames) {
  const long = frames.filter((f) => f > 1000 / 45)
  return {
    count: frames.length,
    avgMs: frames.length ? Math.round((frames.reduce((a, b) => a + b, 0) / frames.length) * 100) / 100 : null,
    p95Ms: frames.length ? Math.round([...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)] * 100) / 100 : null,
    maxMs: frames.length ? Math.round(Math.max(...frames) * 100) / 100 : null,
    framesBelow45fps: long.length,
    pctBelow45fps: frames.length ? Math.round((long.length / frames.length) * 1000) / 10 : null,
    impliedAvgFps: frames.length ? Math.round((1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)) * 10) / 10 : null,
  }
}

async function run(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })

  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  })

  const navStart = Date.now()
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  const loadMs = Date.now() - navStart
  await wait(400)

  // Apply CPU throttle AFTER initial load (throttling the load itself under
  // Slow-3G+4x-CPU would time out the harness; the app's own perf budget is
  // about round-active responsiveness, which is what we're isolating here).
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  // Build a min-trail (8 tiles) inside the initially-visible window (col2-5,row2-3).
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const cr = c.getBoundingClientRect(); return { left: cr.left, top: cr.top } })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = 2 + (i % 4), row = 2 + Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(70)
  }

  // ── Frame timing during a real pan gesture (throttled) ──────────────────
  await page.evaluate(() => { window.__ft = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft.push(n - last); last = n; requestAnimationFrame(tick) } requestAnimationFrame(tick) })
  const gRect = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.parentElement.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  await touchDrag(page, gRect.cx, gRect.cy, -150, -100, 24, 16)
  await touchDrag(page, gRect.cx, gRect.cy, 150, 100, 24, 16)
  const panFrames = await page.evaluate(() => window.__ft.slice())

  // ── Frame timing during the plunge cascade reveal (throttled) ───────────
  // Scroll the whole page down (native swipe on a neutral area) to reach
  // THROW BREAKER, exactly like a real thumb would have to.
  const vfPt = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent.trim() === 'VAULT FLOOR')
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await touchDrag(page, vfPt.x, vfPt.y, 0, -500, 16, 14)
  await wait(150)
  const breakerBox = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('THROW BREAKER'))
    const r = b.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, visible: r.top >= 0 && r.bottom <= window.innerHeight }
  })
  await page.evaluate(() => { window.__ft2 = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft2.push(n - last); last = n; requestAnimationFrame(tick) } requestAnimationFrame(tick) })
  if (breakerBox.visible) await page.touchscreen.tap(breakerBox.x, breakerBox.y)
  await wait(3200)
  const cascadeFrames = await page.evaluate(() => window.__ft2.slice())
  await page.screenshot({ path: `${OUT}/${dev.name}-perf-throttled-final.png` })

  const bodyAfter = await page.evaluate(() => document.body.innerText)
  const outcome = /CLAIM PROVEN/i.test(bodyAfter) ? 'WIN' : /BUSTED/i.test(bodyAfter) ? 'BUST' : 'UNKNOWN'

  await browser.close()
  return {
    device: dev.name,
    loadMs,
    breakerTapRegistered: breakerBox.visible,
    outcome,
    panFrameTiming: fpsSummary(panFrames),
    cascadeFrameTiming: fpsSummary(cascadeFrames),
  }
}

const all = {}
for (const dev of DEVICES) {
  console.log('=== throttled perf:', dev.name, '===')
  all[dev.name] = await run(dev)
  console.log(JSON.stringify(all[dev.name], null, 2))
}
fs.writeFileSync(`${OUT}/perf-throttled-report.json`, JSON.stringify(all, null, 2))
