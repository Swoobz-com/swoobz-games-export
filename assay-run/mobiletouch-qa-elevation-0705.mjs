// Mobile + Perf QA — premium-elevation pass (codotty round 2, 2026-07-05).
// Covers: perf budget under 4x CPU + slow-3G throttle across reveal cascade +
// board bloom; TreasureDressing absence on mobile + no horizontal overflow;
// touch-target thumb-zone reachability + real touchscreen firing; board pan.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-elevation-0705'
fs.mkdirSync(OUT, { recursive: true })
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
  if (!el) return null
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, top: r.top } })
  await page.touchscreen.tap(box.x, box.y)
  return box
}

const boxOf = async (page, txt) => page.evaluate((t) => {
  const btns = [...document.querySelectorAll('button')]
  const b = btns.find((x) => x.textContent && x.textContent.includes(t))
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }
}, txt)

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

async function run(dev) {
  const result = { device: dev.name, viewport: `${dev.width}x${dev.height}` }
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  page.on('console', (m) => { if (m.type() === 'error') (result.consoleErrors ??= []).push(m.text()) })
  page.on('pageerror', (e) => (result.consoleErrors ??= []).push(String(e)))
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })

  // ── LOBBY: title, warm-gold check, overflow, treasure-dressing absence ──
  const navStart = Date.now()
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  result.loadMs = Date.now() - navStart
  await wait(500)
  result.title = await page.title()
  await page.screenshot({ path: `${OUT}/${dev.name}-1-lobby.png` })

  result.lobbyOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
  }))

  // TreasureDressing bars use a unique clip-path polygon starting '8% 100%,0% 30%,20% 0%,100% 0%,92% 100%'
  result.treasureDressingPresentLobby = await page.evaluate(() => {
    return [...document.querySelectorAll('div')].some((d) => (d.style.clipPath || '').includes('8% 100%,0% 30%,20% 0%'))
  })

  // wordmark gold-check (should not be flat grey/steel)
  result.wordmarkColor = await page.evaluate(() => {
    const el = [...document.querySelectorAll('span')].find((s) => s.textContent.trim() === 'SWOOBZ')
    return el ? getComputedStyle(el).color : null
  })

  // ── Enter game (tap, not click) ──
  const enterBox = await tapText(page, 'ENTER THE ASSAY LINE')
  result.lobbyCtaTap = enterBox
  await wait(500)
  await page.screenshot({ path: `${OUT}/${dev.name}-2-planning.png` })

  result.planningOverflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
  }))
  result.treasureDressingPresentPlanning = await page.evaluate(() => {
    return [...document.querySelectorAll('div')].some((d) => (d.style.clipPath || '').includes('8% 100%,0% 30%,20% 0%'))
  })

  // ── Touch target inventory: hit-size + thumb-zone (vertical center 30-90% vh) ──
  const targets = {}
  for (const label of ['RUN THE LINE', 'PLAY SAFE']) {
    targets[label] = await boxOf(page, label)
  }
  // TEMPLE DEPTH selector buttons — grab any button inside a container whose
  // nearest labeled ancestor text includes TEMPLE DEPTH; fall back to scanning
  // buttons with tier-like labels (Shallow/Standard/Deep or similar).
  const templeDepthBoxes = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || ''))
    if (!heading) return []
    let container = heading.parentElement
    for (let i = 0; i < 4 && container; i++) {
      const btns = [...container.querySelectorAll('button')]
      if (btns.length >= 2) return btns.map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
      container = container.parentElement
    }
    return []
  })
  targets['TEMPLE DEPTH tiers'] = templeDepthBoxes

  // Bet steppers — buttons with +/- glyphs or aria-labels near a numeric bet display.
  const betStepperBoxes = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    return btns
      .filter((b) => /^[+\-−–]$/.test((b.textContent || '').trim()) || /increase|decrease|bet/i.test(b.getAttribute('aria-label') || ''))
      .map((b) => { const r = b.getBoundingClientRect(); return { text: b.textContent.trim(), aria: b.getAttribute('aria-label'), x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } })
  })
  targets['bet steppers'] = betStepperBoxes

  result.touchTargets = {}
  const vh = dev.height
  const evalTarget = (name, box) => {
    if (!box) { result.touchTargets[name] = { present: false }; return }
    const hitOk = box.w >= 44 && box.h >= 44
    const centerPct = (box.cy !== undefined ? box.cy : box.y + box.h / 2) / vh
    const thumbOk = centerPct >= 0.3 && centerPct <= 0.9
    result.touchTargets[name] = { present: true, w: Math.round(box.w), h: Math.round(box.h), centerPct: Math.round(centerPct * 1000) / 10, hitOk, thumbOk }
  }
  evalTarget('RUN THE LINE', targets['RUN THE LINE'])
  evalTarget('PLAY SAFE', targets['PLAY SAFE'])
  templeDepthBoxes.forEach((b, i) => evalTarget(`TEMPLE DEPTH[${i}] ${b.text}`, b))
  betStepperBoxes.forEach((b, i) => evalTarget(`bet stepper[${i}] ${b.text || b.aria}`, b))

  // ── touch-action: manipulation probe on RUN THE LINE / PLAY SAFE ──
  result.touchAction = await page.evaluate(() => {
    const get = (txt) => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(txt))
      return b ? getComputedStyle(b).touchAction : null
    }
    return { runTheLine: get('RUN THE LINE'), playSafe: get('PLAY SAFE') }
  })

  // ── tap-to-paint a min trail via touchscreen (real touch, not click) ──
  const canvasWrap = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    const w = c.parentElement.getBoundingClientRect()
    return { canvas: { left: r.left, top: r.top, width: r.width, height: r.height }, wrap: { left: w.left, top: w.top, width: w.width, height: w.height } }
  })
  result.canvasFound = !!canvasWrap
  if (canvasWrap) {
    const TILE = 46
    const geo = canvasWrap.canvas
    for (let i = 0; i < 8; i++) {
      const col = 2 + (i % 4), row = 2 + Math.floor(i / 4)
      await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
      await wait(70)
    }
    await wait(200)
  }
  await page.screenshot({ path: `${OUT}/${dev.name}-3-trail.png` })

  // ── board pan probe: native scroll container, touch-drag and confirm scroll delta ──
  result.pan = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const el = c ? c.parentElement : null
    if (!el) return null
    return { scrollLeftBefore: el.scrollLeft, scrollTopBefore: el.scrollTop, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, touchAction: getComputedStyle(el).touchAction }
  })
  if (canvasWrap && result.pan) {
    const wrap = canvasWrap.wrap
    const cx = wrap.left + wrap.width / 2
    const cy = wrap.top + wrap.height / 2
    const touch = await page.touchscreen.touchStart(cx, cy)
    for (let i = 1; i <= 16; i++) { await touch.move(cx - (120 * i) / 16, cy - (80 * i) / 16); await wait(16) }
    await touch.end()
    await wait(200)
    result.panAfter = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const el = c.parentElement
      return { scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
    })
  }

  // ── PERF: throttle AFTER interaction setup, run reveal cascade + measure frames ──
  const client = await page.createCDPSession()
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  await page.evaluate(() => { window.__ft = []; let last = performance.now(); function tick() { const n = performance.now(); window.__ft.push(n - last); last = n; requestAnimationFrame(tick) } requestAnimationFrame(tick) })

  const runBox = await boxOf(page, 'RUN THE LINE')
  let tapped = false
  if (runBox) { await page.touchscreen.tap(runBox.cx, runBox.cy); tapped = true }
  result.runTheLineTapped = tapped
  await wait(3500) // covers disc-by-disc reveal cascade + win bloom sweep if it lands
  const revealFrames = await page.evaluate(() => window.__ft.slice())
  result.revealCascadeFrameTiming = fpsSummary(revealFrames)

  await page.screenshot({ path: `${OUT}/${dev.name}-4-settled.png` })
  result.outcomeText = await page.evaluate(() => {
    const t = document.body.innerText
    if (/LINE CLAIMED/i.test(t)) return 'WON'
    if (/BUSTED/i.test(t)) return 'BUST'
    return 'UNKNOWN'
  })

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await browser.close()
  return result
}

const all = {}
for (const dev of DEVICES) {
  console.log('=== running', dev.name, '===')
  try {
    all[dev.name] = await run(dev)
  } catch (e) {
    all[dev.name] = { error: String(e && e.stack || e) }
  }
  console.log(JSON.stringify(all[dev.name], null, 2))
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(all, null, 2))
console.log('done ->', `${OUT}/report.json`)
