import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const OUT = '_indep-verifier-0709'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function freshLoad(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0', timeout: 30000 })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.reload({ waitUntil: 'networkidle0', timeout: 30000 })
  await wait(700)
}
async function boardBox(p) {
  return p.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
// Ported verbatim from VaultGridCanvas.tsx computeGridLayout (interior-cell tap math)
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
async function tapCell(p, box, col, row, cols, minimalBands) {
  const grid = computeGridLayout(box.w, box.h, cols, minimalBands)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  await p.mouse.move(cx, cy)
  await p.mouse.down()
  await wait(80)
  await p.mouse.up()
}
function interiorCells(n) {
  const out = []
  for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) out.push([c, r])
  return out
}
// Text-walker body text (excludes SCRIPT/STYLE) so injected HMR/JSDoc
// overlay text never false-positives a RUGGED/SETTLED read (documented
// gotcha from prior vault runs — plain document.body.textContent is unsafe).
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

// ── CHECK 1: RhythmBadge prefers-reduced-motion A/B, BLUECHIPS world (sparse
// mine density = reliable chain trigger per memory), desktop 1440x900.
// Independent variation from the maker's own script: click BLUECHIPS
// explicitly (not relying on default world), sample the badge's computed
// style repeatedly across its whole visible lifetime (not just first catch)
// to also confirm it STAYS animation:none for reduced (not just at t=0),
// and cross-check the source prop-threading via a live in-page introspection
// of the React fiber-free DOM (data-tier presence + aria-live attr).
async function check1() {
  console.log('\n===== CHECK 1: RhythmBadge reduced-motion gate =====')
  const results = {}
  for (const reduced of [false, true]) {
    const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
    const p = await b.newPage()
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }])
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    let samples = []
    let ariaLive = null
    for (let attempt = 0; attempt < 15 && samples.length === 0; attempt++) {
      await freshLoad(p)
      await clickText(p, 'bluechips')
      await wait(200)
      await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
      await wait(900)
      const cells = interiorCells(5)
      for (let step = 0; step < cells.length; step++) {
        const box = await boardBox(p)
        if (!box) break
        const [c, r] = cells[step]
        await tapCell(p, box, c, r, 5, true)
        // Poll repeatedly across the badge's lifetime (not just first tick)
        for (let poll = 0; poll < 10; poll++) {
          await wait(40)
          const info = await p.evaluate(() => {
            const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
            if (!el) return null
            const cs = getComputedStyle(el)
            return {
              tier: el.getAttribute('data-tier'),
              ariaLive: el.getAttribute('aria-live'),
              animationName: cs.animationName,
              animationDuration: cs.animationDuration,
              animationPlayState: cs.animationPlayState,
              opacity: cs.opacity,
            }
          })
          if (info) { samples.push(info); ariaLive = info.ariaLive }
        }
        const tb = await bodyText(p)
        if (/RUGGED/i.test(tb) && samples.length === 0) break
        if (samples.length > 0) break
      }
    }
    results[reduced ? 'reduced' : 'normal'] = { samples, ariaLive }
    await p.screenshot({ path: `${OUT}/check1-${reduced ? 'reduced' : 'normal'}.png` }).catch(() => {})
    await b.close()
  }
  fs.writeFileSync(`${OUT}/check1-results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  return results
}

// ── CHECK 1b: source-level prop-threading confirmation, done LIVE via the
// page's own module graph (not just static grep) — fetch the transformed
// module source for VaultExperience.tsx through vite's dev server and
// confirm the exact call site text is present in what the BROWSER actually
// received (rules out "file on disk differs from what's served").
async function check1b() {
  console.log('\n===== CHECK 1b: live-served module source spot-check =====')
  const fsPath = '/@fs/C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/originals/vault/VaultExperience.tsx'
  const res = await fetch(`http://localhost:${PORT}${fsPath}`)
  const text = await res.text()
  const hasCallSite = /RhythmBadge tier=\{rhythmTick\.badge\} reducedMotion=\{reducedMotion\}/.test(text)
  const hasOverride = /reducedMotion \? \{ \.\.\.baseStyle, animation: 'none' \} : baseStyle/.test(text)
  const out = { status: res.status, hasCallSite, hasOverride, byteLength: text.length }
  fs.writeFileSync(`${OUT}/check1b-live-source.json`, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
  return out
}

// ── CHECK 2: mobile settled overlap, WIN + LOSS x Pixel7 + iPhone14Pro.
// Independent variation: measure the gap TWICE per combo — immediately
// after the settled panel first appears (t~0, worst case for any slide-in
// transient) AND again after 2200ms (steady state) — and also confirm
// [data-testid="vault-hero-overlay"] is literally absent from the DOM on
// mobile (not just visually non-overlapping), across BOTH samples.
const DEVICES = {
  Pixel7: { width: 412, height: 915 },
  iPhone14Pro: { width: 393, height: 852 },
}
async function settleWin(p) {
  await clickText(p, 'send it')
  await wait(900)
  const cells = interiorCells(5)
  for (let step = 0; step < 3; step++) {
    const box = await boardBox(p)
    if (!box) return false
    const [c, r] = cells[step]
    await tapCell(p, box, c, r, 5, true)
    await wait(550)
    const txt = await bodyText(p)
    if (/RUGGED/i.test(txt)) return false
  }
  const clicked = await clickText(p, 'take profit')
  if (!clicked) return false
  await wait(400)
  return await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
}
async function settleLoss(p) {
  await clickText(p, 'shitcoin')
  await wait(250)
  await clickText(p, 'send it')
  await wait(900)
  const cells = interiorCells(7)
  for (let step = 0; step < cells.length; step++) {
    const box = await boardBox(p)
    if (!box) return false
    const [c, r] = cells[step]
    await tapCell(p, box, c, r, 7, true)
    await wait(500)
    const settled = await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
    if (settled) return true
  }
  return await p.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'))
}
async function measureOverlap(p) {
  return p.evaluate(() => {
    const cap = document.querySelector('[data-testid="vault-settled-board-caption"]')
    const panel = document.querySelector('[data-testid="vault-settledpanel"]')
    const hero = document.querySelector('[data-testid="vault-hero-overlay"]')
    if (!cap || !panel) return { error: 'missing element', hasCap: !!cap, hasPanel: !!panel, heroPresent: !!hero }
    const cr = cap.getBoundingClientRect().toJSON()
    const pr = panel.getBoundingClientRect().toJSON()
    const verticalGap = pr.top - cr.bottom
    const capVisible = cap.offsetParent !== null && getComputedStyle(cap).visibility !== 'hidden'
    return { captionRect: cr, panelRect: pr, verticalGap, capVisible, heroPresent: !!hero }
  })
}
async function check2() {
  console.log('\n===== CHECK 2: mobile settled overlap (t~0 AND steady-state) =====')
  const results = {}
  for (const [devName, vp] of Object.entries(DEVICES)) {
    for (const outcome of ['WIN', 'LOSS']) {
      const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
      const p = await b.newPage()
      await p.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      let ok = false
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        await freshLoad(p)
        ok = outcome === 'WIN' ? await settleWin(p) : await settleLoss(p)
      }
      const key = `${devName}-${outcome}`
      if (!ok) {
        results[key] = { error: 'could not reach settled state after retries' }
        await b.close()
        continue
      }
      const t0 = await measureOverlap(p)
      await wait(2200)
      const steady = await measureOverlap(p)
      results[key] = { t0, steady }
      await p.screenshot({ path: `${OUT}/check2-${key}.png`, fullPage: false }).catch(() => {})
      await b.close()
    }
  }
  fs.writeFileSync(`${OUT}/check2-results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  return results
}

const c1 = await check1()
const c1b = await check1b()
const c2 = await check2()
console.log('\n===== DONE =====')
