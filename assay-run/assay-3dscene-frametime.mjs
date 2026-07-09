import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5188/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (page, txt) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b) { b.click(); return true }
    return false
  }, txt)

async function getDesktopCanvasBox(page) {
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

async function paintTrail(page, box, n) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
    }
  }
  return count
}

function stats(deltas) {
  const d = [...deltas].sort((a, b) => a - b)
  const sum = d.reduce((s, v) => s + v, 0)
  return {
    n: d.length,
    avgMs: +(sum / d.length).toFixed(3),
    p50Ms: +d[Math.floor(d.length * 0.5)].toFixed(3),
    p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(3),
    maxMs: +d[d.length - 1].toFixed(3),
  }
}

async function measureDeltas(page, ms) {
  const raw = await page.evaluate((dur) => new Promise((resolve) => {
    const deltas = []
    let last = performance.now()
    const start = last
    const tick = (t) => {
      deltas.push(t - last)
      last = t
      if (t - start < dur) requestAnimationFrame(tick)
      else resolve(deltas.slice(1)) // drop first (includes setup)
    }
    requestAnimationFrame(tick)
  }), ms)
  return stats(raw)
}

async function main() {
  const viewports = [
    { width: 1440, height: 900, dpr: 2, label: '1440x900' },
    { width: 1920, height: 1080, dpr: 1, label: '1920x1080' },
    { width: 2560, height: 1440, dpr: 1, label: '2560x1440' },
  ]
  const results = {}

  for (const vp of viewports) {
    const browser = await puppeteer.launch({
      executablePath: EXE, headless: 'new',
      args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
    })
    const page = (await browser.pages())[0]
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr })
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(500)
    const box = await getDesktopCanvasBox(page)

    const idle = await measureDeltas(page, 1500)

    await paintTrail(page, box, 10)
    await wait(300)
    const planningWithTrail = await measureDeltas(page, 1200)

    await clickText(page, 'THROW BREAKER')
    await wait(120)
    const cascadeAssaying = await measureDeltas(page, 1800)

    await wait(1500) // let it settle/bust
    const settled = await measureDeltas(page, 1000)

    results[vp.label] = { idle, planningWithTrail, cascadeAssaying, settled }
    await browser.close()
  }
  console.log(JSON.stringify(results, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
