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

async function measureFps(page, ms) {
  return page.evaluate((dur) => new Promise((resolve) => {
    let frames = 0
    const start = performance.now()
    const tick = () => {
      frames++
      const elapsed = performance.now() - start
      if (elapsed < dur) requestAnimationFrame(tick)
      else resolve({ frames, elapsedMs: elapsed, fps: (frames / elapsed) * 1000 })
    }
    requestAnimationFrame(tick)
  }), ms)
}

async function samplePixels(page, box) {
  return page.evaluate((b) => {
    const canvas = document.elementFromPoint(b.x + b.w / 2, b.y + b.h / 2)?.closest('canvas')
      || [...document.querySelectorAll('canvas')].sort((a, c) => {
        const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect()
        return rc.width * rc.height - ra.width * ra.height
      })[0]
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    const dpr = canvas.width / canvas.getBoundingClientRect().width
    const pts = []
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        const x = Math.floor((canvas.width / 4) * i)
        const y = Math.floor((canvas.height / 4) * j)
        const d = ctx.getImageData(x, y, 1, 1).data
        pts.push({ x, y, rgba: [d[0], d[1], d[2], d[3]] })
      }
    }
    return pts
  }, box)
}

async function countOffscreenCanvases(page) {
  return page.evaluate(() => window.__canvasCreateCount ?? null)
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

    // Instrument canvas element creation count (proxy for sprite-cache rebuild storms)
    await page.evaluateOnNewDocument(() => {
      window.__canvasCreateCount = 0
      const origCreateElement = document.createElement.bind(document)
      document.createElement = (tag, ...rest) => {
        if (String(tag).toLowerCase() === 'canvas') window.__canvasCreateCount++
        return origCreateElement(tag, ...rest)
      }
    })

    const failures = []
    page.on('response', (resp) => {
      const url = resp.url()
      if (resp.status() >= 400 && /\.(png|jpg|jpeg|webp|svg|glb|gltf|bin|ktx2)(\?|$)/i.test(url)) {
        failures.push(`${resp.status()} ${url}`)
      }
    })
    const consoleErrors = []
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })

    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr })
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(500)

    const canvasCountAfterLoad = await countOffscreenCanvases(page)

    const box = await getDesktopCanvasBox(page)

    // Idle FPS (planning phase, no interaction)
    const idleFps = await measureFps(page, 1500)

    // Paint a trail (drag/click) then measure FPS during idle-with-pinned-coins
    await paintTrail(page, box, 10)
    await wait(300)
    const afterPaintFps = await measureFps(page, 1200)
    const canvasCountAfterPaint = await countOffscreenCanvases(page)

    // Cascade (PLUNGE) — measure FPS during active reveal animation
    await page.evaluate(() => { window.__canvasCreateCount = 0 })
    await clickText(page, 'THROW BREAKER')
    await wait(150)
    const cascadeFps = await measureFps(page, 2000)
    const canvasCreatedDuringCascade = await countOffscreenCanvases(page)

    // Wait for settle/bust and sample pixels for render integrity
    await wait(1500)
    const settlePixels = await samplePixels(page, box)

    // Screenshot for visual record
    await page.screenshot({ path: `C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/assay-${vp.label}.png` })

    results[vp.label] = {
      canvasCountAfterLoad,
      canvasCountAfterPaint,
      canvasCreatedDuringCascade,
      idleFps: idleFps.fps.toFixed(1),
      afterPaintFps: afterPaintFps.fps.toFixed(1),
      cascadeFps: cascadeFps.fps.toFixed(1),
      assetFailures: failures,
      consoleErrors: consoleErrors.slice(0, 10),
      settlePixelSample: settlePixels,
    }

    await browser.close()
  }

  console.log(JSON.stringify(results, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
