// INDEPENDENT verifier driver — swoobz-mobile-touch-qa, fibgate.
// Deliberately fresh (not a copy of the maker's _maker-blockers-verify-0709.mjs)
// and deliberately uses REAL page.touchscreen events (not page.mouse / .click())
// so a mouse-only handler that silently no-ops on touch would be caught.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const OUT = '_fibgate-mobiletouchqa-0709'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const DEVICES = {
  Pixel7: { width: 412, height: 915 },
  iPhone14Pro: { width: 393, height: 852 },
}

function computeGridLayout(W, H, gridSize, minimalBands) {
  const wide = W / H > 1.2
  const topReserved = minimalBands ? H * 0.035 : H * (wide ? 0.12 : 0.15)
  const bottomReserved = minimalBands ? H * 0.035 : H * (wide ? 0.14 : 0.18)
  const sideFrac = minimalBands ? 0.04 : 0.08
  const safeW = W * (1 - sideFrac * 2)
  const safeH = (H - topReserved - bottomReserved) * 0.96
  const available = Math.min(safeW, safeH)
  const FIXED_TILE = 96, FIXED_GAP = 16
  const fixedFull = FIXED_TILE * gridSize + FIXED_GAP * (gridSize - 1)
  if (minimalBands && fixedFull <= available + 0.5) {
    const x = (W - fixedFull) / 2
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
    const y = bandCenterY - fixedFull / 2
    return { x, y, tile: FIXED_TILE, gap: FIXED_GAP, full: fixedFull }
  }
  const gap = Math.max(6, available * 0.026)
  const tile = (available - gap * (gridSize - 1)) / gridSize
  const full = tile * gridSize + gap * (gridSize - 1)
  const x = (W - full) / 2
  const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2
  const y = bandCenterY - full / 2
  return { x, y, tile, gap, full }
}
function interiorCells(n) {
  const out = []
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) out.push([c, r])
  return out
}

async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}

async function touchCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.touchscreen.tap(cx, cy)
}

// Find a clickable element by visible text, return its live rect + computed
// touch-action + tag, WITHOUT clicking it — used for hit-target/thumb-zone
// probes independent of whether the tap succeeds.
async function findByText(p, t, within) {
  return p.evaluate(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    // Interactive elements ONLY (button/[role=button]/a) — deliberately
    // excludes bare `div[data-testid]` wrapper containers (e.g.
    // `vault-ctl-cta` is a CONTAINER around the real button on this game;
    // matching the container gives a wrong, oversized rect and a tap at its
    // center can miss the real control entirely).
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    const visible = (e) => e.offsetParent !== null && !e.disabled
    const exact = els.filter((e) => visible(e) && norm(e) === lc)
    const partial = els.filter((e) => visible(e) && norm(e).includes(lc))
    // Prefer exact text match; among partial matches prefer the smallest
    // area (most specific / deepest leaf) so a big ancestor never wins.
    const pool = exact.length ? exact : partial
    const el = pool.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      return ra.width * ra.height - rb.width * rb.height
    })[0]
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      testid: el.getAttribute('data-testid'),
      rect: { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, bottom: r.bottom },
      touchAction: cs.touchAction,
    }
  }, { t, within })
}

async function touchTapText(p, t, within) {
  const info = await findByText(p, t, within)
  if (!info) return false
  const cx = info.rect.x + info.rect.width / 2
  const cy = info.rect.y + info.rect.height / 2
  await p.touchscreen.tap(cx, cy)
  return true
}

async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
}

const bodyText = (p) => p.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const tag = node.parentElement?.tagName
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let text = ''
  while (walker.nextNode()) text += walker.currentNode.data
  return text
})

async function consoleErrorTracker(p) {
  const errors = []
  p.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  p.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

async function measureCore(p) {
  return p.evaluate(() => {
    const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
    const panel = document.querySelector('[data-testid="vault-settledpanel"]')
    const hud = document.querySelector('[data-testid="vault-mobile-hud-band"]')
    const canvas = document.querySelector('canvas')
    const out = {}
    if (cap) out.captionRect = cap.getBoundingClientRect().toJSON()
    if (panel) out.panelRect = panel.getBoundingClientRect().toJSON()
    if (hud) out.hudRect = hud.getBoundingClientRect().toJSON()
    if (canvas) out.canvasRect = canvas.getBoundingClientRect().toJSON()
    if (cap && panel) out.verticalGap = panel.getBoundingClientRect().top - cap.getBoundingClientRect().bottom
    out.bodyHasMixerWord = /\bmixer\b/i.test(document.body.innerText || '')
    out.docScrollHeight = document.documentElement.scrollHeight
    out.viewportH = window.innerHeight
    return out
  })
}

async function runJourney(devName, vp, outcome) {
  const errors = []
  const b = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'],
  })
  const p = await b.newPage()
  await p.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  p.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  p.on('pageerror', (err) => errors.push(String(err)))

  const journal = { devName, outcome, steps: [] }
  await clearAndGo(p)

  // ── Step 1: bet-entry / "lobby+wager" combined screen ──
  // NB: `[data-testid="vault-ctl-cta"]` is DESKTOP-ONLY (per prior-round
  // memory) — mobile's CTA has no such wrapper testid, so search unscoped.
  const ctaBefore = await findByText(p, 'send it')
  journal.betEntryCta = ctaBefore
  const wagerPlus = await findByText(p, '+')
  journal.wagerPlusBtn = wagerPlus

  if (outcome === 'LOSS') {
    // real touch on the SHITCOIN world-picker chip
    const ok = await touchTapText(p, 'shitcoin')
    journal.steps.push({ step: 'select-shitcoin-touch', ok })
    await wait(300)
  }

  // real touch on the wager "+" stepper (exercises a real CTA, not just SEND IT)
  if (wagerPlus) {
    await p.touchscreen.tap(wagerPlus.rect.x + wagerPlus.rect.width / 2, wagerPlus.rect.y + wagerPlus.rect.height / 2)
    await wait(150)
    journal.steps.push({ step: 'wager-plus-touch', firedAt: wagerPlus.rect })
  }

  const ctaBeforeInfo = ctaBefore
  const ctaOk = await touchTapText(p, 'send it')
  journal.sendItTapTarget = ctaBeforeInfo // hit-target + thumb-zone evidence
  journal.steps.push({ step: 'send-it-touch', ok: ctaOk })
  if (!ctaOk) { journal.deadEnd = 'SEND IT not tappable via touchscreen'; await b.close(); return journal }
  await wait(900)

  // Robust phase confirmation: header LIVE badge only renders when
  // `state.phase.kind === 'playing'` (VaultExperience.tsx:1064).
  journal.enteredPlaying = await p.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    return spans.some((s) => (s.textContent || '').trim() === 'LIVE')
  })
  const cta2 = await p.evaluate(() => !!document.querySelector('[data-testid="vault-mobile-hud-band"]'))
  journal.hudBandPresentAtPlaying = cta2

  // ── Step 2: playing — real touchscreen taps on the canvas ──
  const cols = outcome === 'LOSS' ? 7 : 5
  const cells = interiorCells(cols)
  let settledTestid = false
  for (let step = 0; step < cells.length; step++) {
    const box = await boardBox(p)
    if (!box) { journal.deadEnd = 'canvas missing mid-playing'; break }
    const [c, r] = cells[step]
    await touchCell(p, box, c, r, cols, true)
    await wait(500)
    settledTestid = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
    if (settledTestid) { journal.steps.push({ step: `board-touch-${step}`, settledAfter: true }); break }
    if (outcome === 'WIN' && step >= 2) {
      // attempt real touch cash-out
      const cashed = await touchTapText(p, 'take profit')
      journal.steps.push({ step: 'take-profit-touch', ok: cashed })
      if (cashed) { await wait(900); settledTestid = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]')); if (settledTestid) break }
    }
    const bt = await bodyText(p)
    if (/RUGGED/i.test(bt) && outcome === 'LOSS') { await wait(600); settledTestid = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]')); break }
  }
  journal.reachedSettled = settledTestid
  if (!settledTestid) { journal.deadEnd = `never reached settled panel for ${outcome} after ${cells.length} touches`; await b.close(); return journal }

  await wait(2200) // let transient hero overlay auto-dismiss, measure steady state
  journal.measured = await measureCore(p)

  // settled thumb-zone + hit-target on BET AGAIN / next action (mobile settled CTA)
  const betAgain = await findByText(p, 'bet again') || await findByText(p, 'play again') || await findByText(p, 'new bet')
  journal.settledCta = betAgain

  await p.screenshot({ path: `${OUT}/${devName}-${outcome}-settled.png` }).catch(() => {})
  journal.consoleErrors = errors
  await b.close()
  return journal
}

const results = {}
for (const [devName, vp] of Object.entries(DEVICES)) {
  for (const outcome of ['WIN', 'LOSS']) {
    console.log(`\n=== ${devName} / ${outcome} ===`)
    const j = await runJourney(devName, vp, outcome)
    results[`${devName}-${outcome}`] = j
    console.log(JSON.stringify(j, null, 2))
  }
}
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log('\n===== DONE =====')
