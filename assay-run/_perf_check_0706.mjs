import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false } })

const client = await page.createCDPSession()
await client.send('Network.emulateNetworkConditions', {
  offline: false, latency: 150, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
})
await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(400)

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return null
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return box
}

await tapText(page, 'ENTER THE DIVE')
await wait(500)

const canvasGeom = await page.evaluate(() => {
  const scroll = document.querySelector('.assayBoardScroll')
  const canvas = scroll.querySelector('canvas')
  const cr = canvas.getBoundingClientRect()
  return { top: cr.top, left: cr.left }
})
const TILE = 46
for (let i = 0; i < 8; i++) {
  const col = 4 + (i % 3)
  const row = 4 + Math.floor(i / 3)
  const x = canvasGeom.left + (col + 0.5) * TILE
  const y = canvasGeom.top + (row + 0.5) * TILE
  await page.touchscreen.tap(x, y)
  await wait(50)
}

// start frame-time instrumentation ONLY right before the commit tap
await page.evaluate(() => {
  window.__frames = []
  let last = performance.now()
  function tick() {
    const now = performance.now()
    window.__frames.push(now - last)
    last = now
    if (window.__frames.length < 400) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const runLineBox = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label*="Run the line"]')
  const r = b.getBoundingClientRect()
  return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }
})
await page.touchscreen.tap(runLineBox.x, runLineBox.y)

await wait(3500)
const frames = await page.evaluate(() => window.__frames)
const overBudgetIdx = frames.map((f, i) => ({ i, f })).filter((x) => x.f > 1000 / 45)
const maxFrame = Math.max(...frames)
console.log(JSON.stringify({
  totalFrames: frames.length,
  maxFrameMs: maxFrame,
  overBudget45fps: overBudgetIdx.length,
  pctOverBudget: ((overBudgetIdx.length / frames.length) * 100).toFixed(1) + '%',
  overBudgetFrames: overBudgetIdx,
}, null, 2))

await browser.close()
