import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5190'
const OUT = 'shots-holdgate'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(t)) || null
  }, t.toLowerCase())
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--force-device-scale-factor=1'] })
const allErrors = []

function shellProbe() {
  return {
    __fn: (label) => {
      const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100 } }
      const q = (s) => document.querySelector(s)
      const board = q('[data-testid="vault-canvas-shell"]')
      const hud = q('[data-testid="vault-grid-hud-inner"]') || q('[data-testid="vault-settled-banner"]')
      const ctrl = q('[data-testid="DesktopControlColumn"]')
      const grid = q('[data-testid="vault-grid-mainGrid"]')
      const cs = grid ? getComputedStyle(grid) : null
      return {
        boardGridFull: board ? Number(board.dataset.gridFull) : null,
        boardTile: board ? Number(board.dataset.gridTile) : null,
        boardGap: board ? Number(board.dataset.gridGap) : null,
        boardPlate: board ? Number(board.dataset.gridPlate) : null,
        ctrlW: ctrl ? R(ctrl).w : null,
        hudW: hud ? R(hud).w : null,
        hudH: hud ? R(hud).h : null,
        hudY: hud ? R(hud).y : null,
        boardY: board ? R(board).y : null,
        colGap: cs?.columnGap, rowGap: cs?.rowGap,
        gridRows: cs?.gridTemplateRows,
      }
    },
  }
}

async function measure(page, label) {
  return await page.evaluate((label) => {
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100 } }
    const q = (s) => document.querySelector(s)
    const board = q('[data-testid="vault-canvas-shell"]')
    const hud = q('[data-testid="vault-grid-hud-inner"]') || q('[data-testid="vault-settled-banner"]')
    const ctrl = q('[data-testid="DesktopControlColumn"]')
    const grid = q('[data-testid="vault-grid-mainGrid"]')
    const cs = grid ? getComputedStyle(grid) : null
    return {
      phase: label,
      boardGridFull: board ? Number(board.dataset.gridFull) : null,
      boardTile: board ? Number(board.dataset.gridTile) : null,
      boardGap: board ? Number(board.dataset.gridGap) : null,
      boardPlate: board ? Number(board.dataset.gridPlate) : null,
      ctrlW: ctrl ? R(ctrl).w : null,
      hudW: hud ? R(hud).w : null,
      hudH: hud ? R(hud).h : null,
      hudY: hud ? R(hud).y : null,
      boardY: board ? R(board).y : null,
      colGap: cs?.columnGap, rowGap: cs?.rowGap,
      gridRows: cs?.gridTemplateRows,
    }
  }, label)
}

async function pickerProbe(page) {
  return await page.evaluate(() => {
    const cards = ['bluechips', 'altseason', 'shitcoin'].map((m) => {
      const el = document.querySelector(`[data-testid="vault-world-card-${m}"]`)
      if (!el) return { mode: m, present: false }
      const rr = el.getBoundingClientRect()
      const icon = el.children[0]
      const body = el.children[1]
      const tier = body?.querySelector('span span:nth-child(2)') || body?.children[0]?.children[1]
      const maxAnchor = el.children[2]
      const risk = el.children[3]
      const tierPill = [...el.querySelectorAll('span')].find((s) => ['NORMAL', 'HARD', 'CRAZY'].includes(s.textContent.trim()))
      const bestBadge = [...el.querySelectorAll('span')].find((s) => /^BEST/i.test(s.textContent.trim()))
      const cs = getComputedStyle(el)
      return {
        mode: m, present: true,
        h: Math.round(rr.height),
        borderRadius: cs.borderRadius,
        hasBorder: cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0,
        iconW: icon ? Math.round(icon.getBoundingClientRect().width) : null,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        tierPillRadius: tierPill ? getComputedStyle(tierPill).borderRadius : null,
        tierText: tierPill?.textContent.trim() || null,
        hasBest: !!bestBadge,
        hasMax: /MAX/.test(el.textContent),
        hasRisk: !!(risk && risk.children.length),
        maxAnchorRight: maxAnchor ? Math.round(maxAnchor.getBoundingClientRect().right) : null,
      }
    })
    // wrapper check: the picker group must have NO border/bg card around the 3 cards
    const wrap = document.querySelector('[data-testid="vault-board-worldpicker"]')
    const wcs = wrap ? getComputedStyle(wrap) : null
    const header = document.querySelector('[data-testid="vault-board-worldpicker"] span')
    const counter = wrap ? [...wrap.querySelectorAll('span')].map(s => s.textContent.trim()).find(t => /^\d\/\d$|^CUSTOM$/.test(t)) : null
    // balance box above CTA?
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]')
    const ctaHasBalance = cta ? /BALANCE/i.test(cta.textContent) : null
    const sendBtn = cta ? cta.querySelector('button') : null
    return {
      cards,
      wrapperBorder: wcs ? (wcs.borderStyle !== 'none' && parseFloat(wcs.borderWidth) > 0) : null,
      wrapperBg: wcs ? wcs.backgroundColor : null,
      counter,
      taglinePresent: wrap ? /more rugs/i.test(wrap.textContent) : null,
      ctaHasBalance,
      sendBtnH: sendBtn ? Math.round(sendBtn.getBoundingClientRect().height) : null,
      sendBtnRadius: sendBtn ? getComputedStyle(sendBtn).borderRadius : null,
    }
  })
}

// Click a canvas point relative to board center to reveal a tile.
async function clickBoardCenter(page, dx = 0, dy = 0) {
  const box = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }
  })
  if (!box) return
  await page.mouse.click(box.cx + dx, box.cy + dy)
}

for (const vp of [{ w: 1440, h: 900 }, { w: 1440, h: 1000 }, { w: 1600, h: 1080 }, { w: 1500, h: 1118 }]) {
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') allErrors.push(`[${vp.w}x${vp.h}] ${m.text()}`) })
  page.on('pageerror', (e) => allErrors.push(`[${vp.w}x${vp.h}] PAGEERROR ${e.message}`))
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
  await clickText(page, 'ape in'); await wait(600)
  const ready = await measure(page, 'READY')
  const picker = await pickerProbe(page)
  console.log(`\n========== ${vp.w}x${vp.h} ==========`)
  console.log('READY shell:', JSON.stringify(ready))
  if (vp.w === 1440 && vp.h === 900) {
    console.log('PICKER:', JSON.stringify(picker, null, 1))
    await page.screenshot({ path: `${OUT}/ready-${vp.w}x${vp.h}.png` })
  }
  // -> LIVE
  await clickText(page, 'send it'); await wait(600)
  const live = await measure(page, 'LIVE')
  console.log('LIVE shell: ', JSON.stringify(live))
  if (vp.w === 1440 && vp.h === 900) await page.screenshot({ path: `${OUT}/live-${vp.w}x${vp.h}.png` })
  // reveal a couple safe tiles then take profit -> RESULT
  await clickBoardCenter(page, -60, -60); await wait(400)
  await clickBoardCenter(page, 60, 60); await wait(400)
  await clickText(page, 'take profit'); await wait(300)
  await clickText(page, 'cash'); await wait(600)
  const settled = await measure(page, 'RESULT')
  console.log('RESULT shell:', JSON.stringify(settled))
  if (vp.w === 1440 && vp.h === 900) await page.screenshot({ path: `${OUT}/result-${vp.w}x${vp.h}.png` })
  // board-Y stability across phases
  const ys = [ready.boardY, live.boardY, settled.boardY].filter((v) => v != null)
  const hudHs = [ready.hudH, live.hudH, settled.hudH].filter((v) => v != null)
  console.log('BOARD-Y across phases:', JSON.stringify(ys), 'stable=', ys.every((v) => Math.abs(v - ys[0]) < 1))
  console.log('HUD-H across phases:', JSON.stringify(hudHs))
  await page.close()
}

// mobile
{
  const page = await browser.newPage()
  page.on('pageerror', (e) => allErrors.push(`[390] PAGEERROR ${e.message}`))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
  await clickText(page, 'ape in'); await wait(500)
  const mob = await page.evaluate(() => {
    const b = document.body
    return { scrollW: b.scrollWidth, clientW: document.documentElement.clientWidth, hasWorldRow: !!document.querySelector('.vault-mode-row') }
  })
  console.log('\nMOBILE 390:', JSON.stringify(mob))
  await page.screenshot({ path: `${OUT}/mobile-ready-390.png` })
  await page.close()
}

console.log('\n===== CONSOLE ERRORS:', allErrors.length ? '\n' + allErrors.join('\n') : 'none')
await browser.close()
