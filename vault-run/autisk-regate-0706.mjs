import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6207'
const OUT = process.argv[3] || `shots-autisk-regate-${Date.now()}`
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
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas'); if (!c) return null
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
const phaseText = (page) => page.evaluate(() => document.querySelector('[data-testid="vault-grid-topbar"]')?.textContent || '')
const rect = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel); if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } }, sel)
const textOf = (page, sel) => page.evaluate((sel) => document.querySelector(sel)?.textContent?.trim() || null, sel)
const opacityOf = (page, sel) => page.evaluate((sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).opacity : null }, sel)
const scrollInfo = (page) => page.evaluate(() => ({ sH: document.documentElement.scrollHeight, iH: window.innerHeight,
  sW: document.documentElement.scrollWidth, iW: window.innerWidth,
  pageScroll: document.documentElement.scrollHeight > window.innerHeight + 1 }))
const controlColScroll = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="DesktopControlColumn"]'); if (!el) return null
  return { sH: el.scrollHeight, cH: el.clientHeight, hasScroll: el.scrollHeight > el.clientHeight + 1 } })
const scrollerTrap = (page) => page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el)
    const sY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
    const sX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1
    if (sY || sX) out.push({ tid: el.getAttribute('data-testid') || String(el.className||'').slice(0,24) || el.tagName,
      sH: el.scrollHeight, cH: el.clientHeight, sW: el.scrollWidth, cW: el.clientWidth }) }
  return out })
const ctaButton = (page) => page.evaluate(() => {
  const cta = document.querySelector('[data-testid="vault-ctl-cta"]'); if (!cta) return null
  const btns = [...cta.querySelectorAll('button')]
  const primary = btns.find(b => /send it|go|take profit|bet again|ape in/i.test(b.textContent||'')) || btns[btns.length-1]
  if (!primary) return null
  const r = primary.getBoundingClientRect()
  return { text: (primary.textContent||'').replace(/\s+/g,' ').trim(), top: Math.round(r.top), bottom: Math.round(r.bottom),
    belowFold: r.bottom > window.innerHeight, visibleInViewport: r.top >= 0 && r.bottom <= window.innerHeight } })
function gap(a, b) { if (!a || !b) return null; return Math.round(b.top - a.bottom) }
const results = { port: PORT, viewports: {} }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERR', m.text()) })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  results.title = await page.title(); console.log('TITLE', results.title)
  for (const vp of [{ name: '1440x900', width: 1440, height: 900 }, { name: '1920x1080', width: 1920, height: 1080 }]) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(800); await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(300)
    const R = {}
    R.lobby = { phase: await phaseText(page), board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'), cta: await ctaButton(page),
      colScroll: await controlColScroll(page), scroll: await scrollInfo(page), scrollers: await scrollerTrap(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-lobby.png` })
    await clickText(page, 'ape in'); await wait(600)
    const beWager = await rect(page, '[data-testid="vault-ctl-wager"]')
    const beCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    R.betEntry = { phase: await phaseText(page), board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'), wager: beWager, cta: beCta,
      gapWagerToCta: gap(beWager, beCta), ctaBtn: await ctaButton(page), colScroll: await controlColScroll(page),
      scroll: await scrollInfo(page), scrollers: await scrollerTrap(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-betentry.png` })
    await clickText(page, 'bluechips'); await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
    await clickCell(page, 1, 1, 5, 5); await wait(500)
    await clickText(page, 'take profit'); await wait(900)
    await clickText(page, 'bet again'); await wait(1000)
    const pLocked = await rect(page, '[data-testid="vault-ctl-wager-locked"]')
    const pCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    const pTrailing = await rect(page, '[data-testid="vault-ctl-trailing"]')
    const pPath = await rect(page, '[data-testid="vault-ctl-path"]')
    const pSession = await rect(page, '[data-testid="vault-ctl-session"]')
    R.playing = { phase: await phaseText(page), board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'), lockedWager: pLocked,
      lockedText: await textOf(page, '[data-testid="vault-ctl-wager-locked"] span'),
      lockedOpacity: await opacityOf(page, '[data-testid="vault-ctl-wager-locked"]'),
      lockedBtns: await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-ctl-wager-locked"]')
        if (!el) return null; const b = [...el.querySelectorAll('button')]; return { count: b.length, allDisabled: b.every(x=>x.disabled) } }),
      cta: pCta, ctaBtn: await ctaButton(page), gapLockedToCta: gap(pLocked, pCta),
      trailing: pTrailing, path: pPath, session: pSession, gapCtaToTrailingChild: gap(pCta, pPath || pSession),
      colScroll: await controlColScroll(page), scroll: await scrollInfo(page), scrollers: await scrollerTrap(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-playing.png` })
    await clickCell(page, 1, 1, 5, 5); await wait(500)
    await clickText(page, 'take profit'); await wait(1000)
    const sCta = await rect(page, '[data-testid="vault-ctl-cta"]')
    R.settled = { phase: await phaseText(page), board: await rect(page, '[data-testid="vault-canvas-shell"]'),
      control: await rect(page, '[data-testid="DesktopControlColumn"]'), cta: sCta, ctaBtn: await ctaButton(page),
      trailing: await rect(page, '[data-testid="vault-ctl-trailing"]'),
      colScroll: await controlColScroll(page), scroll: await scrollInfo(page), scrollers: await scrollerTrap(page) }
    await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })
    results.viewports[vp.name] = R
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
