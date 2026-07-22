// Follow-up: dump raw frame self-times at 2560x1440 cascade+bust to check
// whether the >10ms static-rebuild spikes are ISOLATED single frames (fine,
// spaced by CASCADE_INTERVAL_MS) or CHAINED consecutive frames (real jank).
import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5555/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INSTRUMENT = () => {
  window.__frames = []
  const origRAF = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => origRAF((t) => {
    const s = performance.now()
    cb(t)
    window.__frames.push({ t: s, selfMs: +(performance.now() - s).toFixed(3) })
  })
}

const clickText = (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)

async function getBiggestCanvasBox(page) {
  return page.evaluate(() => {
    const cs = [...document.querySelectorAll('canvas')]
    let best = null
    for (const c of cs) {
      const r = c.getBoundingClientRect()
      if (r.width <= 0) continue
      if (!best || r.width * r.height > best.w * best.h) best = { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    return best
  })
}
async function paintSerpentine(page, box, n) {
  const tile = box.w / 20
  let count = 0
  outer: for (let row = 0; row < 20; row++) {
    const cols = row % 2 === 0 ? [...Array(20).keys()] : [...Array(20).keys()].reverse()
    for (const col of cols) {
      if (count >= n) break outer
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
    }
  }
  return count
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 1 })
  await page.evaluateOnNewDocument(INSTRUMENT)
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const box = await getBiggestCanvasBox(page)
  await paintSerpentine(page, box, 60)
  await wait(200)
  await page.evaluate(() => { window.__frames = [] })
  await clickText(page, 'THROW BREAKER')
  for (let i = 0; i < 60; i++) {
    await wait(100)
    const txt = await page.evaluate(() => document.body.innerText)
    if (/BAD VEIN|BUSTED|GLASS BOX CERTIFICATE/i.test(txt)) break
  }
  await wait(300)
  const frames = await page.evaluate(() => window.__frames)
  // Print every frame with selfMs > 5ms, plus its immediate neighbors, to see
  // if spikes cluster (consecutive) or are isolated.
  const spikeIdx = frames.map((f, i) => (f.selfMs > 5 ? i : -1)).filter((i) => i >= 0)
  console.log('total frames', frames.length)
  console.log('spike frame indices (selfMs>5ms):', spikeIdx)
  for (const i of spikeIdx) {
    const win = frames.slice(Math.max(0, i - 2), i + 3)
    console.log(`--- spike at idx ${i} ---`)
    console.log(win.map((f) => f.selfMs))
  }
  await browser.close()
}
main()
