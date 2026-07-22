import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5196'
const OUT = 'shots-r2'
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

async function measure(page, label) {
  return await page.evaluate((label) => {
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, x: Math.round(r.left * 100) / 100, y: Math.round(r.top * 100) / 100 } }
    const q = (s) => document.querySelector(s)
    const board = q('[data-testid="vault-canvas-shell"]')
    const hud = q('[data-testid="vault-grid-hud-inner"]') || q('[data-testid="vault-settled-banner"]')
    const ctrl = q('[data-testid="DesktopControlColumn"]')
    return {
      phase: label,
      boardGridFull: board ? Number(board.dataset.gridFull) : null,
      boardTile: board ? Number(board.dataset.gridTile) : null,
      boardGap: board ? Number(board.dataset.gridGap) : null,
      boardPlate: board ? Number(board.dataset.gridPlate) : null,
      ctrlW: ctrl ? R(ctrl).w : null,
      hudH: hud ? R(hud).h : null,
      boardY: board ? R(board).y : null,
    }
  }, label)
}

// largest live DOM text element on screen + the pump hero size
async function textHierarchy(page) {
  return await page.evaluate(() => {
    const pump = document.querySelector('[data-testid="vault-hud-pump-value"]')
    const pumpFs = pump ? parseFloat(getComputedStyle(pump).fontSize) : null
    // scan every visible element with its OWN direct text for font-size
    let max = 0, maxText = '', maxFs = 0
    const walk = (el) => {
      if (!(el instanceof HTMLElement)) return
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) return
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') return
      // direct text (not from children)
      const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('')
      if (direct.length) {
        const fs = parseFloat(cs.fontSize)
        if (fs > max) { max = fs; maxText = direct.slice(0, 24); maxFs = fs }
      }
      for (const c of el.children) walk(c)
    }
    walk(document.body)
    return { pumpFs, largestLiveFs: maxFs, largestLiveText: maxText }
  })
}

// desktop bet-entry panel value/label + chip gap
async function panelProbe(page) {
  return await page.evaluate(() => {
    const wagerPanel = document.querySelector('[data-testid="vault-ctl-wager"]')
    const label = wagerPanel ? wagerPanel.querySelector('span') : null
    const labelFs = label ? parseFloat(getComputedStyle(label).fontSize) : null
    // wager value = the animated usdc span inside the wager window
    let valueFs = null
    if (wagerPanel) {
      const spans = [...wagerPanel.querySelectorAll('span')]
      const val = spans.find((s) => /\d/.test(s.textContent) && parseFloat(getComputedStyle(s).fontSize) >= 16)
      valueFs = val ? parseFloat(getComputedStyle(val).fontSize) : null
    }
    const chipRow = wagerPanel ? [...wagerPanel.querySelectorAll('div')].find((d) => getComputedStyle(d).flexWrap === 'wrap' && d.querySelectorAll('button').length >= 2) : null
    const chipGap = chipRow ? getComputedStyle(chipRow).gap : null
    return { labelFs, valueFs, chipGap }
  })
}

// world-card anatomy probe (works desktop + mobile)
async function cardProbe(page) {
  return await page.evaluate(() => {
    const cards = ['bluechips', 'altseason', 'shitcoin'].map((m) => {
      const el = document.querySelector(`[data-testid="vault-world-card-${m}"]`)
      if (!el) return { mode: m, present: false }
      const rr = el.getBoundingClientRect()
      const icon = el.children[0]
      const tierPill = [...el.querySelectorAll('span')].find((s) => ['NORMAL', 'HARD', 'CRAZY'].includes(s.textContent.trim()))
      const maxAnchor = [...el.querySelectorAll('span')].find((s) => /MAX$/.test(s.textContent.trim()) === false && /MAX/.test(s.parentElement?.textContent || ''))
      const maxWrap = [...el.children].find((c) => /MAX/.test(c.textContent))
      const maxVal = maxWrap ? maxWrap.querySelector('span')?.textContent.trim() : null
      const riskLabel = [...el.querySelectorAll('span')].find((s) => s.textContent.trim() === 'RISK')
      const riskBar = [...el.querySelectorAll('span')].find((s) => getComputedStyle(s).position === 'absolute' && parseFloat(getComputedStyle(s).height) <= 6 && parseFloat(getComputedStyle(s).height) >= 3)
      return {
        mode: m, present: true,
        right: Math.round(rr.right),
        h: Math.round(rr.height),
        iconW: icon ? Math.round(icon.getBoundingClientRect().width) : null,
        tierText: tierPill?.textContent.trim() || null,
        maxVal,
        hasRiskLabel: !!riskLabel,
        riskBarH: riskBar ? getComputedStyle(riskBar).height : null,
        maxAnchorRight: maxWrap ? Math.round(maxWrap.getBoundingClientRect().right) : null,
      }
    })
    // header + banned content
    const row = document.querySelector('.vault-mode-row')
    const block = row ? row.parentElement : null
    const headerTxt = block ? block.textContent : ''
    return {
      cards,
      counter: block ? [...block.querySelectorAll('span')].map((s) => s.textContent.trim()).find((t) => /CHOOSE ONE|CUSTOM|^\d\/\d$/.test(t)) : null,
      taglinePresent: /more rugs/i.test(headerTxt),
      rtpJargonPresent: /RTP \d|edge \d/i.test(headerTxt),
      dotMeterPresent: !!(block && block.querySelector('span') && [...block.querySelectorAll('span')].some((s) => /rugs ·/.test(s.textContent) && /RTP/.test(block.textContent))),
    }
  })
}

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

// ---------- DESKTOP 1440x900 ----------
{
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') allErrors.push(`[desktop] ${m.text()}`) })
  page.on('pageerror', (e) => allErrors.push(`[desktop] PAGEERROR ${e.message}`))
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
  await clickText(page, 'ape in'); await wait(600)
  const ready = await measure(page, 'READY')
  const panel = await panelProbe(page)
  const cards = await cardProbe(page)
  console.log('\n===== DESKTOP 1440x900 =====')
  console.log('READY:', JSON.stringify(ready))
  console.log('PANEL (value/label/chipgap):', JSON.stringify(panel))
  console.log('CARDS desktop:', JSON.stringify(cards, null, 1))
  await page.screenshot({ path: `${OUT}/desktop-ready.png` })
  // LIVE
  await clickText(page, 'send it'); await wait(700)
  const live = await measure(page, 'LIVE')
  const hierLive = await textHierarchy(page)
  console.log('LIVE:', JSON.stringify(live))
  console.log('LIVE text-hierarchy:', JSON.stringify(hierLive))
  await page.screenshot({ path: `${OUT}/desktop-live.png` })
  // reveal tiles then take profit
  await clickBoardCenter(page, -60, -60); await wait(400)
  await clickBoardCenter(page, 60, 60); await wait(400)
  const hierLive2 = await textHierarchy(page)
  console.log('LIVE (after reveals) hierarchy:', JSON.stringify(hierLive2))
  await clickText(page, 'take profit'); await wait(300)
  await clickText(page, 'cash'); await wait(700)
  const settled = await measure(page, 'RESULT')
  const hierRes = await textHierarchy(page)
  console.log('RESULT:', JSON.stringify(settled))
  console.log('RESULT hierarchy:', JSON.stringify(hierRes))
  await page.screenshot({ path: `${OUT}/desktop-result.png` })
  // fold check: CTA bottom vs viewport 900
  const fold = await page.evaluate(() => {
    const cta = document.querySelector('[data-testid="vault-ctl-cta"] button') || [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent))
    return cta ? Math.round(cta.getBoundingClientRect().bottom) : null
  })
  const ys = [ready.boardY, live.boardY, settled.boardY]
  console.log('BOARD-Y across phases:', JSON.stringify(ys), 'stable=', ys.every((v) => v != null && Math.abs(v - ys[0]) < 1))
  console.log('CTA fold (bet-entry, must be <=900):', fold)
  await page.close()
}

// ---------- MOBILE 390 ----------
{
  const page = await browser.newPage()
  page.on('console', (m) => { if (m.type() === 'error') allErrors.push(`[mobile] ${m.text()}`) })
  page.on('pageerror', (e) => allErrors.push(`[mobile] PAGEERROR ${e.message}`))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200)
  await clickText(page, 'ape in'); await wait(700)
  const overflow = await page.evaluate(() => ({ scrollW: document.body.scrollWidth, clientW: document.documentElement.clientWidth }))
  const mcards = await cardProbe(page)
  const mbal = await page.evaluate(() => {
    // balance line above SEND IT (footer) — must be gone; topbar balance ok
    const send = [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent))
    const footer = send ? send.closest('div')?.parentElement : null
    const footerHasBalance = footer ? /BALANCE/i.test(footer.textContent) : null
    const anyFooterBalance = [...document.querySelectorAll('div')].some((d) => {
      const hasSend = /send it/i.test(d.textContent)
      const spans = [...d.querySelectorAll('span')]
      return hasSend && spans.some((s) => /^BALANCE/i.test(s.textContent.trim()) && s.children.length === 0 === false)
    })
    return { footerHasBalance, anyFooterBalance }
  })
  console.log('\n===== MOBILE 390 =====')
  console.log('OVERFLOW:', JSON.stringify(overflow), 'overflow=', overflow.scrollW > overflow.clientW + 1)
  console.log('CARDS mobile:', JSON.stringify(mcards, null, 1))
  console.log('MOBILE balance:', JSON.stringify(mbal))
  await page.screenshot({ path: `${OUT}/mobile-ready.png`, fullPage: false })
  // mobile live + result
  await clickText(page, 'send it'); await wait(700)
  await page.screenshot({ path: `${OUT}/mobile-live.png` })
  await clickBoardCenter(page, -50, -50); await wait(400)
  await clickText(page, 'take profit'); await wait(300)
  await clickText(page, 'cash'); await wait(700)
  await page.screenshot({ path: `${OUT}/mobile-result.png` })
  const overflow2 = await page.evaluate(() => ({ scrollW: document.body.scrollWidth, clientW: document.documentElement.clientWidth }))
  console.log('MOBILE overflow (result):', JSON.stringify(overflow2))
  await page.close()
}

console.log('\n===== CONSOLE ERRORS:', allErrors.length ? '\n' + allErrors.join('\n') : 'none')
await browser.close()
