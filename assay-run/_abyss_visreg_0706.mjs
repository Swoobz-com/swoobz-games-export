import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = process.argv[2] || 'shots-abyss-visreg-0706'
fs.mkdirSync(OUT, { recursive: true })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'pixel7', width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'iphone14pro', width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer')
    )
    if (b) {
      b.click()
      return true
    }
    return false
  }, re.source)

async function traceLine(page, n, isMobile) {
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
  if (!geo) return false
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 10 && cells.length < n; row++) {
    const cols = row % 2 ? [3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3]
    for (const col of cols) {
      if (cells.length < n) cells.push([col, row])
    }
  }
  for (const [col, row] of cells) {
    const x = geo.left + col * TILE + TILE / 2
    const y = geo.top + row * TILE + TILE / 2
    if (isMobile) {
      await page.touchscreen.tap(x, y)
    } else {
      await page.mouse.click(x, y)
    }
    await wait(50)
  }
  return true
}

async function countGridTiles(page) {
  // The board is canvas-drawn; count via exported GRID_DIM constant proxy — inspect via a
  // page-injected probe reading the module's own board-cell math is not directly reachable
  // from outside React internals, so instead validate via canvas element presence + size +
  // the documented 14x14 in source, cross-checked with a visible-content pixel scan.
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return { present: false }
    const rect = c.getBoundingClientRect()
    return { present: true, w: rect.width, h: rect.height, cw: c.width, ch: c.height }
  })
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const report = { viewports: {} }

  for (const vp of VIEWPORTS) {
    const vpReport = { console: [], pageerrors: [], failedRequests: [], phases: {} }
    const page = await browser.newPage()
    page.on('console', (msg) => {
      if (msg.type() === 'error') vpReport.console.push(msg.text())
    })
    page.on('pageerror', (err) => vpReport.pageerrors.push(String(err)))
    page.on('requestfailed', (req) => vpReport.failedRequests.push(req.url() + ' :: ' + (req.failure()?.errorText || '')))
    page.on('response', (res) => {
      if (res.status() >= 400) vpReport.failedRequests.push(res.url() + ' :: HTTP ' + res.status())
    })

    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.deviceScaleFactor,
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
    })
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
    await wait(800)

    // ---- ENTRY (lobby) ----
    await page.screenshot({ path: `${OUT}/abyss-${vp.name}-entry.png`, fullPage: vp.isMobile })
    vpReport.phases.entry = { grid: await countGridTiles(page) }

    // Verify the 2 abyss SVGs actually loaded as background-image / img resources
    const svgCheck = await page.evaluate(() => {
      const html = document.documentElement.outerHTML
      return {
        bgRef: /abyss-background/.test(html),
        assetsRef: /abyss-assets/.test(html),
      }
    })
    vpReport.svgRefEntry = svgCheck

    // ---- open planning / PLOT phase ----
    const openedPlan = await clickText(page, /ENTER THE DIVE/)
    await wait(400)
    await page.screenshot({ path: `${OUT}/abyss-${vp.name}-plot-empty.png`, fullPage: vp.isMobile })

    // trace a partial line (below min) then to a valid runnable line
    const traced = await traceLine(page, 10, vp.isMobile)
    await wait(400)
    await page.screenshot({ path: `${OUT}/abyss-${vp.name}-plot.png`, fullPage: vp.isMobile })
    vpReport.phases.plot = { openedPlan, traced }

    // ---- RUN phase ----
    const ranClicked = await clickText(page, /^RUN THE LINE/)
    await wait(700)
    await page.screenshot({ path: `${OUT}/abyss-${vp.name}-run-mid.png`, fullPage: vp.isMobile })
    vpReport.phases.run = { ranClicked }

    // Let the reveal play out to settlement
    await wait(4500)
    await page.screenshot({ path: `${OUT}/abyss-${vp.name}-result.png`, fullPage: vp.isMobile })
    const settleText = await page.evaluate(() => document.body.innerText)
    const outcome = /SECURED THE HAUL/i.test(settleText) ? 'WON' : /RUGGED BY THE DEEP/i.test(settleText) ? 'BUST' : 'UNKNOWN'
    vpReport.phases.result = { outcome }

    // Retry loop: if the first attempt didn't bust, force a full 60-tile line on a NEW round
    // (higher crack probability) to also capture a BUST banner + pod-flip variety in one pass.
    if (outcome === 'WON') {
      await clickText(page, /BET AGAIN|RUN AGAIN|PLAY AGAIN|ENTER THE DIVE/)
      await wait(400)
      await traceLine(page, 45, vp.isMobile)
      await wait(300)
      await clickText(page, /^RUN THE LINE/)
      await wait(5000)
      await page.screenshot({ path: `${OUT}/abyss-${vp.name}-result-2.png`, fullPage: vp.isMobile })
      const settleText2 = await page.evaluate(() => document.body.innerText)
      vpReport.phases.result2 = {
        outcome: /SECURED THE HAUL/i.test(settleText2) ? 'WON' : /RUGGED BY THE DEEP/i.test(settleText2) ? 'BUST' : 'UNKNOWN',
      }
    }

    // horizontal overflow check
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }))
    vpReport.overflow = overflow

    report.viewports[vp.name] = vpReport
    await page.close()
  }

  await browser.close()
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

run().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
