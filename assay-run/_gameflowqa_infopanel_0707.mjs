// ABYSS LINE (originals/assay) — NEW INFO ("?") panel open/close flow +
// no-overlap / no-dead-end verification. Harness-only (assay-run/), NO
// source edits. Own, fresh driver (swoobz-game-flow-qa, 2026-07-07).
//
// Probes:
//   1. "?" trigger present + clickable across lobby/planning/settled, desktop
//      1440 + mobile 412.
//   2. Open+close (button / Esc / Close control) from multiple phases; after
//      close, full plan->plunge->settle->restart loop still works.
//   3. No overlap: trigger + open panel vs board, DIVE DEPTH, HAUL, TO WIN,
//      YOUR BET, BALANCE, PLAY SAFE, settled receipt (measured rects).
//   4. Opening mid-planning does not lose/scramble the in-progress claim line.
//   5. 0 console errors.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-infopanel-flowqa-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'mobile-412', width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
]

function rectsOverlap(a, b) {
  if (!a || !b) return { overlap: false, area: 0, reason: 'missing rect' }
  const ix = Math.max(a.left, b.left)
  const iy = Math.max(a.top, b.top)
  const ax = Math.min(a.right, b.right)
  const ay = Math.min(a.bottom, b.bottom)
  const w = ax - ix
  const h = ay - iy
  if (w > 0 && h > 0) return { overlap: true, area: Math.round(w * h) }
  return { overlap: false, area: 0 }
}

// clip-aware effective (actually-painted) rect — ported verbatim pattern from
// _visreg_overlap_sweep_0706d.mjs (AGENT_MEMORY: the raw canvas rect gives a
// FALSE overlap on mobile since the board <canvas> is oversized inside the
// small .assayBoardScroll pan window).
async function effectiveRect(page, fnStr) {
  return page.evaluate((fnStr) => {
    // eslint-disable-next-line no-new-func
    const fn = new Function('return ' + fnStr)()
    const el = fn()
    if (!el) return null
    const rect = el.getBoundingClientRect()
    let cur = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    let anc = el.parentElement
    while (anc && anc !== document.documentElement) {
      const s = getComputedStyle(anc)
      if (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible') {
        const ar = anc.getBoundingClientRect()
        cur = { left: Math.max(cur.left, ar.left), top: Math.max(cur.top, ar.top), right: Math.min(cur.right, ar.right), bottom: Math.min(cur.bottom, ar.bottom) }
      }
      anc = anc.parentElement
    }
    cur.left = Math.max(cur.left, 0)
    cur.top = Math.max(cur.top, 0)
    cur.right = Math.min(cur.right, window.innerWidth)
    cur.bottom = Math.min(cur.bottom, window.innerHeight)
    const w = cur.right - cur.left
    const h = cur.bottom - cur.top
    if (w <= 0 || h <= 0) return null
    return cur
  }, fnStr)
}

// Finders (element-getter closures serialized into the page)
const F = {
  infoTrigger: () => `() => document.querySelector('${INFO_SEL}')`,
  playSafe: () => `() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'PLAY SAFE')`,
  canvas: () => `() => document.querySelector('canvas')`,
  diveDepth: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent==='DIVE DEPTH'); return d ? (d.closest('[data-rail]') || d.parentElement.parentElement || d.parentElement) : null }`,
  haul: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent==='HAUL'); return d ? d.parentElement : null }`,
  toWin: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent==='TO WIN'); return d ? d.parentElement : null }`,
  yourBet: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent==='YOUR BET'); return d ? d.parentElement : null }`,
  balance: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent==='BALANCE'); return d ? d.parentElement : null }`,
  settledReceipt: () => `() => { const d = [...document.querySelectorAll('div')].find(d => d.children.length===0 && (d.textContent==='SECURED THE HAUL' || d.textContent==='RUGGED BY THE DEEP')); if(!d) return null; let n=d; for(let i=0;i<3 && n.parentElement;i++) n=n.parentElement; return n }`,
}

async function measureRect(page, key) {
  return effectiveRect(page, F[key]())
}

async function clickInfoTrigger(page) {
  return page.evaluate((sel) => {
    const b = document.querySelector(sel)
    if (!b) return false
    b.click()
    return true
  }, INFO_SEL)
}
async function dialogOpen(page) {
  return page.evaluate((sel) => !!document.querySelector(sel), DIALOG_SEL)
}
async function closeViaX(page) {
  return page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return false
    const btn = d.querySelector('button[aria-label="Close how to play"]')
    if (!btn) return false
    btn.click()
    return true
  }, DIALOG_SEL)
}
async function closeViaCloseButton(page) {
  return page.evaluate((dlgSel) => {
    const d = document.querySelector(dlgSel)
    if (!d) return false
    const btn = [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'CLOSE')
    if (!btn) return false
    btn.click()
    return true
  }, DIALOG_SEL)
}
async function closeViaEsc(page) {
  await page.keyboard.press('Escape')
  return true
}
async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}
async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t) && !x.disabled)
    if (b) { b.click(); return true }
    return false
  }, txt)
}
async function readClaimLineCount(page) {
  // Odometer: a <span> with the raw digit count sitting next to a sibling
  // whose text starts with "DUCATS · MIN". Read the CLAIM LINE RailRow's own
  // rendered number directly (robust to markup depth).
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'CLAIM LINE')
    if (!labelDiv || !labelDiv.parentElement) return null
    const row = labelDiv.parentElement
    const spans = [...row.querySelectorAll('span')]
    const numSpan = spans.find((s) => /^\d+$/.test((s.textContent || '').trim()))
    return numSpan ? parseInt(numSpan.textContent.trim(), 10) : null
  })
}
async function getCanvasBoxRaw(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top, w: r.width, h: r.height }
  })
}
async function paintTilesTrace(page, cells, isMobile) {
  const GRID = 14
  for (const [col, row] of cells) {
    let box = await getCanvasBoxRaw(page)
    if (!box) return false
    const TILE = box.w / GRID
    let x = box.left + col * TILE + TILE / 2
    let y = box.top + row * TILE + TILE / 2
    if (isMobile) {
      // mobile pan-window gotcha (AGENT_MEMORY: .assayBoardScroll) — scroll
      // the wrapper to center the target tile's LOCAL coords first.
      await page.evaluate((tx, ty) => {
        const scroller = document.querySelector('.assayBoardScroll')
        if (scroller) {
          scroller.scrollLeft = Math.max(0, tx - scroller.clientWidth / 2)
          scroller.scrollTop = Math.max(0, ty - scroller.clientHeight / 2)
        }
      }, col * TILE + TILE / 2, row * TILE + TILE / 2)
      await wait(20)
      box = await getCanvasBoxRaw(page)
      const geo = await page.evaluate(() => {
        const scroller = document.querySelector('.assayBoardScroll')
        if (!scroller) return null
        const r = scroller.getBoundingClientRect()
        return { left: r.left, top: r.top, w: r.width, h: r.height }
      })
      x = box.left + (col * TILE + TILE / 2)
      y = box.top + (row * TILE + TILE / 2)
      if (geo) {
        x = Math.min(Math.max(x, geo.left + 2), geo.left + geo.w - 2)
        y = Math.min(Math.max(y, geo.top + 2), geo.top + geo.h - 2)
      }
    }
    await page.mouse.click(x, y)
    await wait(35)
  }
  return true
}

const LINE8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

async function overlapSweep(page, tag, isMobile, results) {
  const info = await measureRect(page, 'infoTrigger')
  const targets = ['canvas', 'diveDepth', 'haul', 'toWin', 'yourBet', 'balance', 'playSafe', 'settledReceipt']
  const out = { tag, infoRect: info, overlaps: {} }
  for (const t of targets) {
    const r = await measureRect(page, t)
    out.overlaps[t] = { rect: r, ...rectsOverlap(info, r) }
  }
  results.push(out)
  return out
}

async function run(vp) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = await browser.newPage()
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch })
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const res = { viewport: vp.name, phases: {}, overlapSweeps: [], claimLinePreservation: null, restartLoop: null, consoleErrors: null }

  const httpResp = await page.goto(URL, { waitUntil: 'load' })
  res.httpStatus = httpResp.status()
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(500)

  // ══════════════════ PHASE: LOBBY ══════════════════
  {
    const p = { triggerPresent: false, triggerClickable: false, openClose: {} }
    p.triggerPresent = await page.evaluate((sel) => !!document.querySelector(sel), INFO_SEL)
    const rect = await measureRect(page, 'infoTrigger')
    p.triggerRect = rect
    p.triggerClickable = !!(rect && rect.right - rect.left >= 40 && rect.bottom - rect.top >= 40)
    await overlapSweep(page, 'lobby', vp.isMobile, res.overlapSweeps)

    // open via button
    p.openClose.openedByButton = await clickInfoTrigger(page)
    await wait(300)
    p.openClose.dialogOpenAfterButton = await dialogOpen(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby-open.png` })
    // close via top "x"
    p.openClose.closedViaX = (await closeViaX(page)) && (await wait(250), !(await dialogOpen(page)))
    // dead-end check: lobby still interactive (ENTER THE DIVE clickable)
    p.deadEndCheckAfterX = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('ENTER THE DIVE'))
      return !!(b && !b.disabled)
    })

    // reopen, close via Esc
    await clickInfoTrigger(page)
    await wait(250)
    p.openClose.reopenedForEsc = await dialogOpen(page)
    await closeViaEsc(page)
    await wait(250)
    p.openClose.closedViaEsc = !(await dialogOpen(page))

    // reopen, close via bottom CLOSE button
    await clickInfoTrigger(page)
    await wait(250)
    p.openClose.reopenedForCloseBtn = await dialogOpen(page)
    p.openClose.closedViaCloseButton = (await closeViaCloseButton(page)) && (await wait(250), !(await dialogOpen(page)))

    p.deadEndCheckFinal = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('ENTER THE DIVE'))
      return !!(b && !b.disabled)
    })
    res.phases.lobby = p
  }

  // ══════════════════ ENTER PLANNING ══════════════════
  await clickText(page, 'ENTER THE DIVE')
  await wait(400)

  {
    const p = { triggerPresent: false, triggerClickable: false, openClose: {} }
    p.triggerPresent = await page.evaluate((sel) => !!document.querySelector(sel), INFO_SEL)
    const rect = await measureRect(page, 'infoTrigger')
    p.triggerRect = rect
    p.triggerClickable = !!(rect && rect.right - rect.left >= 40 && rect.bottom - rect.top >= 40)
    await overlapSweep(page, 'planning-unarmed', vp.isMobile, res.overlapSweeps)
    res.phases.planningUnarmed = p
  }

  // Paint a partial claim line (5 of the eventual 8) to simulate an
  // in-progress line, THEN open the info panel mid-plan.
  await paintTilesTrace(page, LINE8.slice(0, 5), vp.isMobile)
  await wait(150)
  const claimBefore = await readClaimLineCount(page)

  {
    const cl = { before: claimBefore }
    await page.screenshot({ path: `${OUT}/${vp.name}-planning-armed-before-open.png` })

    // open via button, close via X — verify claim line intact
    await clickInfoTrigger(page)
    await wait(300)
    cl.dialogOpenedMidPlan = await dialogOpen(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-planning-info-open.png` })
    await closeViaX(page)
    await wait(250)
    cl.afterCloseX = await readClaimLineCount(page)

    // open via button, close via Esc
    await clickInfoTrigger(page)
    await wait(250)
    await closeViaEsc(page)
    await wait(250)
    cl.afterCloseEsc = await readClaimLineCount(page)

    // open via button, close via CLOSE button
    await clickInfoTrigger(page)
    await wait(250)
    await closeViaCloseButton(page)
    await wait(250)
    cl.afterCloseButton = await readClaimLineCount(page)

    cl.preserved = cl.before === cl.afterCloseX && cl.afterCloseX === cl.afterCloseEsc && cl.afterCloseEsc === cl.afterCloseButton
    res.claimLinePreservation = cl
  }

  // Finish arming the line (paint the remaining 3) and RUN THE LINE (forced
  // win: REEF SHELF is the default tier already unless changed — confirm).
  await paintTilesTrace(page, LINE8.slice(5), vp.isMobile)
  await wait(150)
  const claimFinal = await readClaimLineCount(page)
  await page.screenshot({ path: `${OUT}/${vp.name}-planning-armed-full.png` })

  const committed = await clickText(page, 'RUN THE LINE')
  let settledText = null
  for (let i = 0; i < 60 && !settledText; i++) {
    await wait(120)
    const t = await bodyText(page)
    if ((/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) && /WRECK RECKONING/.test(t)) settledText = t
  }
  res.committed = committed
  res.claimLineAtCommit = claimFinal
  res.settledReached = !!settledText
  res.settledOutcome = settledText ? (/SECURED THE HAUL/.test(settledText) ? 'WIN' : 'BUST') : null

  // ══════════════════ PHASE: SETTLED ══════════════════
  {
    const p = { triggerPresent: false, triggerClickable: false, openClose: {} }
    p.triggerPresent = await page.evaluate((sel) => !!document.querySelector(sel), INFO_SEL)
    const rect = await measureRect(page, 'infoTrigger')
    p.triggerRect = rect
    p.triggerClickable = !!(rect && rect.right - rect.left >= 40 && rect.bottom - rect.top >= 40)
    await overlapSweep(page, 'settled', vp.isMobile, res.overlapSweeps)
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

    // open at settled, close via each method in turn
    await clickInfoTrigger(page)
    await wait(300)
    p.openClose.dialogOpenAtSettled = await dialogOpen(page)
    await page.screenshot({ path: `${OUT}/${vp.name}-settled-info-open.png` })
    await closeViaEsc(page)
    await wait(250)
    p.openClose.closedViaEscAtSettled = !(await dialogOpen(page))

    // dead-end check: DIVE AGAIN / restart still clickable
    p.deadEndCheckAfterSettledClose = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => /DIVE AGAIN|ASSAY AGAIN/i.test(x.textContent || ''))
      return !!(b && !b.disabled)
    })
    res.phases.settled = p
  }

  // ══════════════════ RESTART LOOP ══════════════════
  {
    const rl = {}
    const t0 = Date.now()
    rl.diveAgainClicked = await clickText(page, 'DIVE AGAIN')
    await wait(500)
    rl.msToReplanning = Date.now() - t0
    const txt = await bodyText(page)
    rl.backInPlanning = /CLAIM LINE/.test(txt) && /RUN THE LINE/.test(txt)
    rl.noStaleSettledOverlay = !(await dialogOpen(page)) && !/WRECK RECKONING/.test(txt.split('CLAIM LINE')[1] || '')
    // trigger still present + clickable after restart
    rl.triggerStillPresentAfterRestart = await page.evaluate((sel) => !!document.querySelector(sel), INFO_SEL)
    // full second commit to prove the loop is genuinely alive, not just visually reset
    await paintTilesTrace(page, LINE8, vp.isMobile)
    await wait(150)
    rl.secondCommitClicked = await clickText(page, 'RUN THE LINE')
    let settled2 = null
    for (let i = 0; i < 60 && !settled2; i++) {
      await wait(120)
      const t = await bodyText(page)
      if ((/SECURED THE HAUL|RUGGED BY THE DEEP/.test(t)) && /WRECK RECKONING/.test(t)) settled2 = t
    }
    rl.secondRoundSettled = !!settled2
    res.restartLoop = rl
  }

  res.consoleErrors = consoleErrors
  await browser.close()
  return res
}

async function main() {
  const all = []
  for (const vp of VIEWPORTS) {
    console.log(`\n=== ${vp.name} ===`)
    const r = await run(vp)
    all.push(r)
    console.log(JSON.stringify(r, (k, v) => (k === 'rect' && v && typeof v === 'object' ? v : v), 2))
  }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(all, null, 2))
  console.log('\n\nDONE ->', `${OUT}/results.json`)
}
main().catch((e) => { console.error(e); process.exit(1) })
