// ABYSS LINE (assay) — visual regression sweep for the route-display
// readability fix: (A1) route_link connector draws only between spatially
// adjacent picks, (A3) free-pick copy + toned-down keyboard-focus bracket.
// Selection LOGIC is unchanged (this is display-only verification).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const GRID_DIM = 14
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT_DIR = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-routefix-0707'
fs.mkdirSync(OUT_DIR, { recursive: true })

const VIEWPORTS = [
  { key: 'desktop-1440x900', width: 1440, height: 900 },
  { key: 'pixel7-412x915', width: 412, height: 915 },
  { key: 'iphone14pro-393x852', width: 393, height: 852 },
]

const results = {}

for (const vp of VIEWPORTS) {
  console.log(`\n\n########## VIEWPORT ${vp.key} ##########`)
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: vp.width, height: vp.height })

  const consoleErrors = []
  const failedRequests = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message))
  page.on('requestfailed', (r) => failedRequests.push(`${r.url()} :: ${r.failure()?.errorText}`))
  page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`) })

  // Instrument BEFORE app boot: fillText digit log (proves ring+number pairs
  // — both drawn in the same `if (inTrail...)` block per source read), and a
  // per-stroke path log tagged with the strokeStyle active at stroke() time
  // (isolates the route_link connector draw from rings/cursor-bracket/etc).
  await page.evaluateOnNewDocument(() => {
    window.__orderLog = []
    window.__strokeLog = []
    const proto = CanvasRenderingContext2D.prototype
    const origFillText = proto.fillText
    proto.fillText = function (text, x, y, ...rest) {
      const c = this.canvas
      if (/^\d+$/.test(String(text)) && c && c.width === c.height && c.width > 200) {
        window.__orderLog.push({ text: String(text), x, y })
      }
      return origFillText.call(this, text, x, y, ...rest)
    }
    let currentPath = []
    const origBeginPath = proto.beginPath
    proto.beginPath = function (...a) { currentPath = []; return origBeginPath.apply(this, a) }
    const origMoveTo = proto.moveTo
    proto.moveTo = function (x, y) { currentPath.push({ op: 'move', x, y }); return origMoveTo.call(this, x, y) }
    const origLineTo = proto.lineTo
    proto.lineTo = function (x, y) { currentPath.push({ op: 'line', x, y }); return origLineTo.call(this, x, y) }
    const origStroke = proto.stroke
    proto.stroke = function (...a) {
      const c = this.canvas
      if (c && c.width === c.height && c.width > 200 && currentPath.length > 2) {
        window.__strokeLog.push({ strokeStyle: String(this.strokeStyle), path: currentPath.slice() })
      }
      return origStroke.apply(this, a)
    }
  })

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => localStorage.setItem('assay_coachmark_seen_v1', '1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)

  // ── LOBBY ──
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-01-lobby.png`, fullPage: false })

  // ── open planning ──
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('ENTER THE DIVE'))
    if (b) { b.click(); return true }
    return false
  })
  console.log('opened planning:', opened)
  await wait(400)
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-02-planning-empty.png` })

  // ── copy check at trailLen=0 (guaranteed < MIN_TRAIL, the free-pick copy's
  //    gated visible state) — the definitive check, independent of how many
  //    picks later land, since the copy is DESIGNED to hide once armed. ──
  const emptyStateCopyCheck = await page.evaluate(() => {
    const all = [...document.querySelectorAll('span,div')]
    const hits = all.filter((el) => el.textContent && (el.textContent.includes('tap any tiles') || el.textContent.includes('Picks are free')))
    return hits.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        text: el.textContent.slice(0, 80),
        scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
        rectW: r.width, rectH: r.height,
        clipped: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2,
      }
    })
  })
  console.log('emptyStateCopyCheck (trailLen=0):', JSON.stringify(emptyStateCopyCheck, null, 2))

  const geom = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')]
    const board = canvases.find((c) => (c.getAttribute('aria-label') || '').includes('Abyss floor board'))
    if (!board) return null
    const r = board.getBoundingClientRect()
    return { left: r.left, top: r.top, width: r.width, height: r.height }
  })
  console.log('board geom:', geom)
  results[vp.key] = { geom, consoleErrors: [], failedRequests: [] }
  if (!geom) {
    console.log('FAIL: could not locate board canvas — aborting this viewport')
    results[vp.key].fatal = 'board canvas not found'
    await browser.close()
    continue
  }
  const tile = geom.width / GRID_DIM
  // Re-fetch the board's live rect before EVERY dispatched click — the
  // mobile chassis is a fixed-tile (644x644) canvas panned inside a
  // narrower `overflow:auto` porthole (confirmed live: the porthole shows
  // only ~4 columns at a time, not the full viewport width), so a
  // precomputed-once rect would silently miss if the app auto-pans between
  // taps. `tile` itself (canvas px per grid cell) is constant.
  const xyToIdx = (x, y) => {
    const col = Math.floor(x / tile)
    const row = Math.floor(y / tile)
    if (col < 0 || col >= GRID_DIM || row < 0 || row >= GRID_DIM) return null
    return row * GRID_DIM + col
  }

  // Live re-measure + PAN-AWARE tap: the mobile chassis is a fixed-tile
  // (644x644) canvas viewed through a narrow `overflow:auto` porthole
  // (confirmed live: ~180x180px, a 2D loupe over the 14x14 grid — both
  // scrollLeft AND scrollTop clip it, not just horizontal). A tile outside
  // the porthole's CURRENT visible window is unreachable by a plain click
  // at its "would-be" screen position (the ancestor clips that region, so
  // hit-testing lands on the porthole DIV, not the canvas) — exactly the
  // real user experience, which requires panning first. This helper pans
  // the porthole (scrollLeft/scrollTop) to center the target tile before
  // tapping, mirroring the mobile PAN gesture, then clicks with a freshly
  // re-measured rect (never a stale precomputed one).
  const tapTile = async (idx) => {
    const col = idx % GRID_DIM
    const row = Math.floor(idx / GRID_DIM)
    await page.evaluate(({ col, row, tile }) => {
      const c = [...document.querySelectorAll('canvas')].find((x) => (x.getAttribute('aria-label') || '').includes('Abyss floor board'))
      const parent = c.parentElement
      const targetLocalX = (col + 0.5) * tile
      const targetLocalY = (row + 0.5) * tile
      parent.scrollLeft = Math.max(0, Math.min(c.width - parent.clientWidth, targetLocalX - parent.clientWidth / 2))
      parent.scrollTop = Math.max(0, Math.min(c.height - parent.clientHeight, targetLocalY - parent.clientHeight / 2))
    }, { col, row, tile })
    await wait(60)
    const g = await page.evaluate(() => {
      const c = [...document.querySelectorAll('canvas')].find((x) => (x.getAttribute('aria-label') || '').includes('Abyss floor board'))
      const r = c.getBoundingClientRect()
      return { left: r.left, top: r.top }
    })
    const x = g.left + (col + 0.5) * tile
    const y = g.top + (row + 0.5) * tile
    await page.mouse.click(x, y)
  }

  // ── mixed pick pattern: a contiguous run of 4 (row5, cols3-6) + 4 GENUINELY
  //    spread/isolated taps in far corners of the 14x14 grid — panning the
  //    mobile porthole to reach each one, mirroring the real user gesture
  //    (drag to pan, then tap). codotty's source note confirms MOBILE IS
  //    TAP-ONLY (no drag-paint), so every pick incl. the "contiguous run"
  //    is a discrete click — valid identically on desktop (full board
  //    visible, panning is a no-op there) and mobile.
  const contigRun = [73, 74, 75, 76] // row5, col3..6
  const spreadTaps = [8, 187, 40, 152] // row0/col8, row13/col5, row2/col12, row10/col12 — far corners
  const allPicks = [...contigRun, ...spreadTaps]

  await page.evaluate(() => { window.__orderLog = []; window.__strokeLog = [] })
  for (const idx of allPicks) {
    await tapTile(idx)
    await wait(90)
  }
  await wait(300)
  // Pan back to center on the contiguous run for the canonical screenshot
  // framing (a real user would end up wherever they last tapped/panned;
  // recentering here just gives a consistent, reviewable screenshot).
  await page.evaluate(({ tile }) => {
    const c = [...document.querySelectorAll('canvas')].find((x) => (x.getAttribute('aria-label') || '').includes('Abyss floor board'))
    const parent = c.parentElement
    parent.scrollLeft = Math.max(0, Math.min(c.width - parent.clientWidth, 4.5 * tile - parent.clientWidth / 2))
    parent.scrollTop = Math.max(0, Math.min(c.height - parent.clientHeight, 5.5 * tile - parent.clientHeight / 2))
  }, { tile })
  await wait(150)

  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-03-planning-mixed-picks.png` })

  // ── verify rings+numbers: every pick has exactly one order digit rendered ──
  const orderLog = await page.evaluate(() => window.__orderLog)
  const orderByIdx = new Map()
  for (const e of orderLog) {
    const idx = xyToIdx(e.x, e.y)
    if (idx != null) orderByIdx.set(idx, Number(e.text))
  }
  const missingRings = allPicks.filter((idx) => !orderByIdx.has(idx))
  const extraRings = [...orderByIdx.keys()].filter((idx) => !allPicks.includes(idx))
  console.log('picks:', allPicks.sort((a, b) => a - b))
  console.log('rendered order-numbered tiles:', [...orderByIdx.keys()].sort((a, b) => a - b))
  console.log('missingRings (picked but no ring+number):', missingRings)
  console.log('extraRings (ring+number but not picked):', extraRings)

  // ── verify connector: only adjacent consecutive-pick pairs get a lineTo,
  //    non-adjacent pairs get a moveTo (path break) ──
  const strokeLog = await page.evaluate(() => window.__strokeLog)
  // The connector draw is the ONE multi-point path matching path.length === allPicks.length.
  const connectorStroke = strokeLog.find((s) => s.path.length === allPicks.length)
  let connectorAnalysis = null
  if (connectorStroke) {
    const pts = connectorStroke.path.map((p) => ({ ...p, idx: xyToIdx(p.x, p.y) }))
    const segments = []
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]
      const pCol = a.idx % GRID_DIM, pRow = Math.floor(a.idx / GRID_DIM)
      const cCol = b.idx % GRID_DIM, cRow = Math.floor(b.idx / GRID_DIM)
      const adjacent = Math.abs(pCol - cCol) <= 1 && Math.abs(pRow - cRow) <= 1
      segments.push({ from: a.idx, to: b.idx, drawnOp: b.op, spatiallyAdjacent: adjacent })
    }
    connectorAnalysis = segments
    console.log('connector strokeStyle:', connectorStroke.strokeStyle)
    console.log('connector segments (from -> to, drawnOp, spatiallyAdjacent):')
    for (const s of segments) console.log(`  ${s.from} -> ${s.to} :: ${s.drawnOp} :: adjacent=${s.spatiallyAdjacent}`)
    const badLines = segments.filter((s) => s.drawnOp === 'line' && !s.spatiallyAdjacent)
    const badMoves = segments.filter((s) => s.drawnOp === 'move' && s.spatiallyAdjacent)
    console.log('BAD (lineTo drawn across a non-adjacent gap — the jump bug):', badLines)
    console.log('SUBOPTIMAL (moveTo used between two adjacent picks — missing a real connector):', badMoves)
  } else {
    console.log('WARNING: could not isolate a connector stroke of length', allPicks.length, '- strokeLog lengths:', strokeLog.map((s) => s.path.length))
  }

  // ── verify copy renders (no overflow/clip) ──
  const copyCheck = await page.evaluate(() => {
    const body = document.body.innerText
    const hasStatusCopy = body.includes('tap any tiles') || body.includes('they need not connect')
    // find elements containing the copy and check overflow
    const all = [...document.querySelectorAll('span,div')]
    const hits = all.filter((el) => el.textContent && (el.textContent.includes('tap any tiles') || el.textContent.includes('Picks are free')))
    const overflowInfo = hits.map((el) => {
      const r = el.getBoundingClientRect()
      return { text: el.textContent.slice(0, 60), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, rectW: r.width, rectH: r.height, clipped: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2 }
    })
    return { hasStatusCopy, overflowInfo }
  })
  console.log('copy check:', JSON.stringify(copyCheck, null, 2))

  // ── verify focus bracket (toned-down) renders on keyboard focus ──
  await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')]
    const board = canvases.find((c) => (c.getAttribute('aria-label') || '').includes('Abyss floor board'))
    board && board.focus()
  })
  await wait(200)
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-04-planning-keyboard-focus.png` })
  // sample the bracket stroke color used (rgba(230,241,245,0.4) per source)
  const bracketStrokeSeen = strokeLog.concat(await page.evaluate(() => window.__strokeLog)).some((s) => s.strokeStyle.includes('230, 241, 245') || s.strokeStyle.toLowerCase().includes('rgba(230'))
  console.log('bracketStrokeSeen (rough, may miss due to log timing):', bracketStrokeSeen)
  await page.evaluate(() => { const c = document.activeElement; c && c.blur && c.blur() })

  // ── run the line -> active -> settled ──
  const ran = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
    if (b && !b.disabled) { b.click(); return true }
    return false
  })
  console.log('RUN THE LINE clicked:', ran)
  await wait(1200)
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-05-active.png` })
  await wait(5000)
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-06-settled.png` })

  // try to open Glass Box receipt drawer if a toggle exists
  const openedGB = await page.evaluate(() => {
    const cands = [...document.querySelectorAll('button,[role=button]')]
    const b = cands.find((x) => /glass box|receipt|certificate|expand|details/i.test(x.textContent || '') || /glass box|receipt|certificate/i.test(x.getAttribute('aria-label') || ''))
    if (b) { b.click(); return true }
    return false
  })
  console.log('opened glass box drawer:', openedGB)
  await wait(300)
  await page.screenshot({ path: `${OUT_DIR}/${vp.key}-07-settled-glassbox.png` })

  results[vp.key].consoleErrors = consoleErrors
  results[vp.key].failedRequests = failedRequests
  results[vp.key].missingRings = missingRings
  results[vp.key].extraRings = extraRings
  results[vp.key].connectorAnalysis = connectorAnalysis
  results[vp.key].copyCheck = copyCheck
  results[vp.key].emptyStateCopyCheck = emptyStateCopyCheck
  results[vp.key].ranTheLine = ran

  console.log('console errors:', consoleErrors.length ? consoleErrors : 'NONE')
  console.log('failed requests / 4xx-5xx:', failedRequests.length ? failedRequests : 'NONE')

  await browser.close()
}

fs.writeFileSync(`${OUT_DIR}/_results.json`, JSON.stringify(results, null, 2))
console.log('\n\nALL DONE. Results written to', `${OUT_DIR}/_results.json`)
