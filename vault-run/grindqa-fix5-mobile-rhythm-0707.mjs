import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5287'
const OUT = 'shots-grindqa-fix5-mobilecheck-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }

// Ported verbatim from VaultGridCanvas.tsx's computeGridLayout — the naive
// "divide the bounding box evenly" tap math silently misses interior cells
// on mobile because the canvas element is TALLER than the actual square
// grid it draws (extra vertical HUD-reserve space), so this replicates the
// real x/y/tile/gap math instead of guessing.
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
async function tapCell(p, box, col, row, cols) {
  const grid = computeGridLayout(box.w, box.h, cols, true) // mobile playing => domHudActive true (FIX #2)
  const cx = box.x + grid.x + col * (grid.tile + grid.gap) + grid.tile / 2
  const cy = box.y + grid.y + row * (grid.tile + grid.gap) + grid.tile / 2
  // move+down+wait+up (NOT the mouse.click() shorthand) — a bare .click()
  // with zero down/up delay intermittently failed to register as a reveal
  // in this driver (root-caused via a manual move/down/wait/up A-B test
  // that succeeded twice in a row on the identical coordinates/session).
  await p.mouse.move(cx, cy)
  await p.mouse.down()
  await wait(80)
  await p.mouse.up()
}
async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch(e){} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
}
// `vault-grid-status`/`vault-grid-topbar` testids are DESKTOP-ONLY
// (DesktopChassis) — mobile uses the `headerTape` row instead, which has no
// testid but renders "SAFE(S) LEFT NN" (styles.tapeTime) — use THAT as the
// reveal-count proxy on mobile, and the phase label span for rugged/settled.
// PLAIN document.body.textContent picks up injected <script>/HMR-overlay
// content (root-caused: it matched a JSDoc comment fragment "...Lobby/
// Playing/Settled" verbatim from the TSX source, giving a false-positive
// RUGGED/SETTLED read on every single poll) — walk only VISIBLE text nodes,
// excluding script/style, instead.
const topbar = (p) => p.evaluate(() => {
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
function safeLeftCount(bodyTxt) { const m = /SAFES? LEFT (\d+)/.exec(bodyTxt); return m ? parseInt(m[1], 10) : -1 }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })

const interior = [[1,1],[2,1],[3,1],[1,2],[2,2],[3,2],[1,3],[2,3]]
const badgeSeen = { rhythm: false, perfect: false }
for (let attempt = 0; attempt < 30 && !(badgeSeen.rhythm && badgeSeen.perfect); attempt++) {
  await clearAndGo(p)
  const sentIt = await clickText(p, 'send it')
  await wait(800)
  const box = await boardBox(p)
  if (attempt < 3) console.log(`attempt ${attempt}: sentIt=${sentIt} box=${JSON.stringify(box)}`)
  if (!box) continue
  let lastSafeLeft = safeLeftCount(await topbar(p)) // baseline BEFORE any tap
  if (attempt < 3) console.log(`  a${attempt} baseline safeLeft=${lastSafeLeft}`)
  for (let step = 0; step < interior.length; step++) {
    const [col, row] = interior[step]
    await tapCell(p, box, col, row, 5)
    let newSafeLeft = lastSafeLeft, rugged = false, changed = false
    for (let poll = 0; poll < 15; poll++) {
      await wait(40)
      const tb = await topbar(p)
      if (/RUGGED|SETTLED/i.test(tb)) { rugged = true; break }
      const sl = safeLeftCount(tb)
      if (sl >= 0 && sl < lastSafeLeft) { newSafeLeft = sl; changed = true; break }
    }
    if (rugged) { if (attempt < 3) console.log(`  a${attempt} s${step} RUGGED`); break }
    if (!changed) { if (attempt < 3) console.log(`  a${attempt} s${step} stuck@safeLeft=${lastSafeLeft}`); continue }
    lastSafeLeft = newSafeLeft
    if (attempt < 3) console.log(`  a${attempt} s${step} safeLeft=${newSafeLeft}`)
    const badgeInfo = await p.evaluate(() => {
      const el = document.querySelector('[data-testid="vault-rhythm-badge"]')
      const hud = document.querySelector('[data-testid="vault-grid-hud-inner"]')
      if (!el) return { present: false }
      const r = el.getBoundingClientRect()
      const hr = hud ? hud.getBoundingClientRect() : null
      const overlap = hr ? !(r.bottom < hr.top || r.top > hr.bottom) : false
      return { present: true, tier: el.getAttribute('data-tier'), rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, hudRect: hr, overlapsHud: overlap, visible: el.offsetParent !== null }
    })
    if (badgeInfo.present) {
      console.log(`attempt ${attempt} step ${step} safeLeft=${newSafeLeft}:`, JSON.stringify(badgeInfo))
      if (badgeInfo.tier === 'rhythm' && !badgeSeen.rhythm) {
        badgeSeen.rhythm = true
        await p.screenshot({ path: `${OUT}/mobile-iphone14pro-rhythm-badge-rhythm.png` })
      }
      if (badgeInfo.tier === 'perfect' && !badgeSeen.perfect) {
        badgeSeen.perfect = true
        await p.screenshot({ path: `${OUT}/mobile-iphone14pro-rhythm-badge-perfect.png` })
      }
    }
  }
}
console.log('FINAL badgeSeen:', JSON.stringify(badgeSeen))
await b.close()
