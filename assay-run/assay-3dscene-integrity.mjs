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
  const clicked = []
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      clicked.push({ row, col })
      count++
    }
  }
  return clicked
}

// Scan the WHOLE board canvas pixel buffer for near-magenta (missing-texture) pixels.
async function scanForMagenta(page) {
  return page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')]
    const board = canvases.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      return rb.width * rb.height - ra.width * ra.height
    })[0]
    if (!board) return { error: 'no canvas' }
    const ctx = board.getContext('2d')
    const { width, height } = board
    const data = ctx.getImageData(0, 0, width, height).data
    let hits = 0
    const samples = []
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2]
      if (r > 235 && g < 40 && b > 235) {
        hits++
        if (samples.length < 5) samples.push({ idx: i / 4, r, g, b })
      }
    }
    return { width, height, totalPixels: width * height, magentaHits: hits, samples }
  })
}

async function sampleTileCenters(page, box, tilesRC) {
  return page.evaluate((b, list) => {
    const canvases = [...document.querySelectorAll('canvas')]
    const board = canvases.sort((a, c) => {
      const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect()
      return rc.width * rc.height - ra.width * ra.height
    })[0]
    const ctx = board.getContext('2d')
    const dpr = board.width / board.getBoundingClientRect().width
    const tile = (board.width) / 32
    return list.map(({ row, col, label }) => {
      const x = Math.floor(col * tile + tile / 2)
      const y = Math.floor(row * tile + tile / 2)
      const d = ctx.getImageData(x, y, 1, 1).data
      return { label, row, col, x, y, rgba: [d[0], d[1], d[2], d[3]] }
    })
  }, box, tilesRC)
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu', '--ignore-gpu-blocklist'],
  })
  const page = (await browser.pages())[0]
  const failures = []
  page.on('response', (resp) => {
    if (resp.status() >= 400) failures.push(`${resp.status()} ${resp.url()}`)
  })
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(400)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(600)
  const box = await getDesktopCanvasBox(page)

  // Dormant-coin tile sample BEFORE any interaction (should be far from any trail).
  const dormantSample = await sampleTileCenters(page, box, [{ row: 20, col: 20, label: 'dormant-untouched' }])

  const clicked = await paintTrail(page, box, 10)
  await wait(200)
  const pinnedSample = await sampleTileCenters(page, box, clicked.map((c) => ({ ...c, label: 'pinned' })))

  const magentaBeforeRun = await scanForMagenta(page)

  await clickText(page, 'THROW BREAKER')
  await wait(3000) // let a good chunk of the cascade/settle play out

  const provenSample = await sampleTileCenters(page, box, clicked.map((c) => ({ ...c, label: 'post-run' })))
  const magentaAfterRun = await scanForMagenta(page)

  await page.screenshot({ path: 'assay-integrity-1920.png', fullPage: false })

  console.log(JSON.stringify({
    assetFailures: failures,
    dormantSample,
    pinnedSample,
    provenSample,
    magentaBeforeRun: { totalPixels: magentaBeforeRun.totalPixels, magentaHits: magentaBeforeRun.magentaHits, samples: magentaBeforeRun.samples },
    magentaAfterRun: { totalPixels: magentaAfterRun.totalPixels, magentaHits: magentaAfterRun.magentaHits, samples: magentaAfterRun.samples },
  }, null, 2))

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
