import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const OUT = '_maker-blockers-0709'
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
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
}
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }

// Ported verbatim from VaultGridCanvas.tsx's computeGridLayout (per the
// grindqa-fix5-mobile-rhythm-0707.mjs precedent) — naive even-division tap
// math misses interior cells when the canvas reserves HUD bands.
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
// Text-walker body text (excludes script/style so JSDoc/HMR-overlay text
// injected into the DOM never false-positives a RUGGED/SETTLED read).
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
function safeLeftCount(txt) { const m = /SAFES? LEFT (\d+)/.exec(txt); return m ? parseInt(m[1], 10) : -1 }

// ── PART A: RhythmBadge prefers-reduced-motion (desktop 1440x900) ──
async function partA() {
  console.log('\n===== PART A: RhythmBadge prefers-reduced-motion =====')
  const results = {}
  for (const reduced of [false, true]) {
    const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
    const p = await b.newPage()
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }])
    await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
    let found = null
    for (let attempt = 0; attempt < 12 && !found; attempt++) {
      await clearAndGo(p)
      await clickText(p, 'send it', '[data-testid="vault-ctl-cta"]')
      await wait(900)
      const cells = interiorCells(5)
      for (let step = 0; step < cells.length && !found; step++) {
        const box = await boardBox(p)
        if (!box) break
        const [c, r] = cells[step]
        await tapCell(p, box, c, r, 5, true)
        let settled = false
        for (let poll = 0; poll < 12; poll++) {
          await wait(45)
          const tb = await p.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
          if (/RUGGED|SETTLED/i.test(tb)) { settled = true; break }
          const info = await p.evaluate(() => {
            const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
            if (!el) return null
            const cs = getComputedStyle(el)
            return {
              tier: el.getAttribute('data-tier'),
              animationName: cs.animationName,
              animationDuration: cs.animationDuration,
              animationPlayState: cs.animationPlayState,
              transform: cs.transform,
            }
          })
          if (info) { found = info; break }
        }
        if (settled) break
      }
    }
    results[reduced ? 'reduced' : 'normal'] = found
    await p.screenshot({ path: `${OUT}/partA-${reduced ? 'reduced' : 'normal'}.png` }).catch(()=>{})
    await b.close()
  }
  console.log(JSON.stringify(results, null, 2))
  fs.writeFileSync(`${OUT}/partA-results.json`, JSON.stringify(results, null, 2))
  return results
}

// ── PART B: mobile settled overlap (Pixel 7 + iPhone 14 Pro, WIN + LOSS) ──
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
  await wait(900)
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
    const board = document.querySelector('[data-testid="vault-canvas-shell"]')
    const canvas = document.querySelector('canvas')
    if (!cap || !panel) return { error: 'missing element', hasCap: !!cap, hasPanel: !!panel }
    const cr = cap.getBoundingClientRect().toJSON()
    const pr = panel.getBoundingClientRect().toJSON()
    const br = board ? board.getBoundingClientRect().toJSON() : null
    const canvasR = canvas ? canvas.getBoundingClientRect().toJSON() : null
    const verticalGap = pr.top - cr.bottom // positive = clear gap; negative = rects overlap
    const capVisible = cap.offsetParent !== null && getComputedStyle(cap).visibility !== 'hidden'
    return { captionRect: cr, panelRect: pr, boardRect: br, canvasRect: canvasR, verticalGap, capVisible }
  })
}

async function partB() {
  console.log('\n===== PART B: mobile settled overlap (WIN + LOSS x Pixel7 + iPhone14Pro) =====')
  const results = {}
  for (const [devName, vp] of Object.entries(DEVICES)) {
    for (const outcome of ['WIN', 'LOSS']) {
      const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
      const p = await b.newPage()
      await p.setViewport({ ...vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      let ok = false
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        await clearAndGo(p)
        ok = outcome === 'WIN' ? await settleWin(p) : await settleLoss(p)
      }
      const key = `${devName}-${outcome}`
      if (!ok) {
        results[key] = { error: 'could not reach settled state after retries' }
        await b.close()
        continue
      }
      await wait(2200) // let the transient (hero overlay, if any) auto-dismiss; measure STEADY settled state
      const measured = await measureOverlap(p)
      results[key] = measured
      await p.screenshot({ path: `${OUT}/partB-${key}.png`, fullPage: false }).catch(()=>{})
      await b.close()
    }
  }
  console.log(JSON.stringify(results, null, 2))
  fs.writeFileSync(`${OUT}/partB-results.json`, JSON.stringify(results, null, 2))
  return results
}

const a = await partA()
const b = await partB()
console.log('\n===== DONE =====')
