import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/mtqa/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const GRID_DIM = 14

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915, dsf: 2.625 },
  { name: 'iphone14pro', width: 393, height: 852, dsf: 3 },
]

function findByText(re) {
  const els = [...document.querySelectorAll('button, div, span')]
  return els.find(
    (x) => re.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
  )
}

async function rectOf(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const el = els.find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
    )
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      touchAction: cs.touchAction,
      disabled: el.disabled === true,
      vCenterPct: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
      text: (el.textContent || '').trim().slice(0, 40),
    }
  }, re.source)
}

async function tapEl(page, re) {
  const r = await rectOf(page, re)
  if (!r || r.disabled) return { fired: false, rect: r }
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2)
  return { fired: true, rect: r }
}

async function runDevice(device) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = await browser.newPage()
  await page.setViewport({ width: device.width, height: device.height, deviceScaleFactor: device.dsf, isMobile: true, hasTouch: true })
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push('console.error: ' + m.text()) })

  const out = { device: device.name, viewport: `${device.width}x${device.height}` }

  const resp = await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  out.http = resp.status()
  await wait(700)

  // overflow
  out.overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    hasHorizOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))

  // bg scene presence
  out.bgScene = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('img[src*="abyss"], img[src*="background"], object[data*="abyss"]')]
    const bgImgDivs = [...document.querySelectorAll('div')].filter((d) => {
      const bi = getComputedStyle(d).backgroundImage
      return bi && bi !== 'none' && /abyss|background/i.test(bi)
    })
    return { imgTags: nodes.length, bgImageDivs: bgImgDivs.length }
  })

  await page.screenshot({ path: OUT + device.name + '-1-entry.png' })

  // lobby CTA hit target
  out.lobbyCTA = await rectOf(page, /ENTER THE DIVE/i)

  // PLAY SAFE on entry
  out.playSafeEntry = await rectOf(page, /PLAY SAFE/i)

  // tap lobby CTA (real touch)
  const lobbyTap = await tapEl(page, /ENTER THE DIVE/i)
  out.lobbyTapFired = lobbyTap.fired
  await wait(500)
  await page.screenshot({ path: OUT + device.name + '-2-plot.png' })
  out.planningText = (await page.evaluate(() => document.body.innerText)).slice(0, 500)

  // board geometry
  out.boardGeo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    const cs = getComputedStyle(c)
    const scrollEl = c.closest('.assayBoardScroll')
    const sb = scrollEl ? scrollEl.getBoundingClientRect() : null
    return {
      canvasRect: { x: r.x, y: r.y, width: r.width, height: r.height },
      touchAction: cs.touchAction,
      scrollBox: sb ? { x: sb.x, y: sb.y, width: sb.width, height: sb.height } : null,
      scrollLeft: scrollEl ? scrollEl.scrollLeft : null,
      scrollTop: scrollEl ? scrollEl.scrollTop : null,
      scrollWidthTotal: scrollEl ? scrollEl.scrollWidth : null,
    }
  })
  out.effectiveTilePx = out.boardGeo ? out.boardGeo.canvasRect.width / GRID_DIM : null

  // tap-select ducats within the visible scroll viewport
  const tapResults = []
  if (out.boardGeo && out.boardGeo.scrollBox) {
    const vis = out.boardGeo.scrollBox
    const cellsFrac = [
      [0.5, 0.25], [0.5, 0.33], [0.5, 0.41], [0.5, 0.49], [0.5, 0.57],
      [0.5, 0.65], [0.5, 0.73], [0.42, 0.6], [0.58, 0.6], [0.5, 0.81],
    ]
    for (const [fx, fy] of cellsFrac) {
      const x = vis.x + vis.width * fx
      const y = vis.y + vis.height * fy
      await page.touchscreen.tap(x, y)
      await wait(50)
    }
    tapResults.push({ tappedCount: cellsFrac.length })
  }
  out.podTapResults = tapResults
  await wait(200)
  out.afterPodTapsText = (await page.evaluate(() => document.body.innerText)).slice(0, 500)
  await page.screenshot({ path: OUT + device.name + '-3-after-pod-taps.png' })

  // pan test (swipe across visible window)
  let panResult = null
  if (out.boardGeo && out.boardGeo.scrollBox) {
    const before = await page.evaluate(() => {
      const el = document.querySelector('.assayBoardScroll')
      return { l: el ? el.scrollLeft : null, t: el ? el.scrollTop : null }
    })
    const vis = out.boardGeo.scrollBox
    const startX = vis.x + vis.width * 0.75
    const startY = vis.y + vis.height * 0.5
    const endX = vis.x + vis.width * 0.25
    const endY = vis.y + vis.height * 0.5
    await page.touchscreen.touchStart(startX, startY)
    for (let i = 1; i <= 6; i++) {
      await page.touchscreen.touchMove(startX + ((endX - startX) * i) / 6, startY + ((endY - startY) * i) / 6)
      await wait(16)
    }
    await page.touchscreen.touchEnd()
    await wait(250)
    const after = await page.evaluate(() => {
      const el = document.querySelector('.assayBoardScroll')
      return { l: el ? el.scrollLeft : null, t: el ? el.scrollTop : null }
    })
    panResult = { before, after, moved: before.l !== after.l || before.t !== after.t }
  }
  out.panResult = panResult
  await page.screenshot({ path: OUT + device.name + '-4-after-pan.png' })

  // scroll pan window back to a known area, then select enough tiles to reach MIN_TRAIL (8)
  // reset scroll to center-ish then tap a clean diagonal path of 12 cells
  await page.evaluate(() => {
    const el = document.querySelector('.assayBoardScroll')
    if (el) { el.scrollLeft = 0; el.scrollTop = 0 }
  })
  await wait(150)
  const geo2 = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width }
  })
  const TILE = geo2.width / GRID_DIM
  const cells = []
  for (let row = 1; row <= 4 && cells.length < 12; row++) {
    const cols = row % 2 ? [1, 2, 3] : [3, 2, 1]
    for (const col of cols) if (cells.length < 12) cells.push([col, row])
  }
  for (const [col, row] of cells) {
    await page.touchscreen.tap(geo2.left + col * TILE + TILE / 2, geo2.top + row * TILE + TILE / 2)
    await wait(45)
  }
  await wait(200)
  await page.screenshot({ path: OUT + device.name + '-5-route-selected.png' })
  out.routeText = (await page.evaluate(() => document.body.innerText)).slice(0, 500)

  // DIVE DEPTH cards, pace toggle, bet steppers, chips, PLAY SAFE (planning)
  out.depthCardTap = await tapEl(page, /MIDNIGHT ZONE|REEF SHELF|HADAL TRENCH/i)
  await wait(150)
  out.paceToggleRect = await rectOf(page, /DISC-BY-DISC|INSTANT/i)
  const paceTap = await tapEl(page, /DISC-BY-DISC|INSTANT/i)
  out.paceToggleFired = paceTap.fired
  await wait(150)
  out.betStepperPlusRect = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === '+')
    if (!btns.length) return null
    const r = btns[0].getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  if (out.betStepperPlusRect) {
    await page.touchscreen.tap(out.betStepperPlusRect.x + out.betStepperPlusRect.width / 2, out.betStepperPlusRect.y + out.betStepperPlusRect.height / 2)
  }
  await wait(150)
  out.chipTap = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /^\$?\d+(\.\d+)?$/.test((b.textContent || '').trim()))
    return btns.length
  })
  out.playSafePlanningRect = await rectOf(page, /PLAY SAFE/i)

  // RUN THE LINE CTA
  out.runLineRect = await rectOf(page, /RUN THE LINE/i)
  const runTap = await tapEl(page, /RUN THE LINE/i)
  out.runLineTapFired = runTap.fired
  await wait(150)
  await page.screenshot({ path: OUT + device.name + '-6-committed.png' })

  // ---- PERF PROBE: instrument rAF frame timing during the reveal cascade ----
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    function loop(t) {
      window.__frames.push(t - last)
      last = t
      window.__raf = requestAnimationFrame(loop)
    }
    window.__raf = requestAnimationFrame(loop)
  })

  const client = await page.target().createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.5 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await wait(3500) // let the reveal cascade / FX run under throttle

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })

  const frameStats = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf)
    const frames = window.__frames.slice(2) // drop the first couple (setup noise)
    const max = Math.max(...frames, 0)
    const over16 = frames.filter((f) => f > 16.7).length
    const over33 = frames.filter((f) => f > 33.3).length // budget for 30fps floor
    const over22 = frames.filter((f) => f > 22.2).length // 45fps mobile target
    return { count: frames.length, maxFrameMs: max, overBudget45fpsCount: over22, overBudget30fpsCount: over33, over16msCount: over16 }
  })
  out.perf = frameStats

  await page.screenshot({ path: OUT + device.name + '-7-post-reveal.png' })
  out.settledText = (await page.evaluate(() => document.body.innerText)).slice(0, 600)

  // safe-area/bottom-dock check (dock rect vs viewport bottom)
  out.playSafeSettled = await rectOf(page, /PLAY SAFE/i)
  out.diveAgainRect = await rectOf(page, /DIVE AGAIN/i)

  out.consoleErrors = consoleErrors

  await browser.close()
  return out
}

const all = {}
for (const d of DEVICES) {
  console.log('=== running', d.name, '===')
  all[d.name] = await runDevice(d)
}

console.log(JSON.stringify(all, null, 2))
