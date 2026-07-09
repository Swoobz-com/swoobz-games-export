// fabi-internalgap-check-0706.mjs — supplemental independent check: quantify
// the INTERNAL blank gaps left inside the stretched SESSION PULSE card
// (Playing/Settled) and inside the PICK YOUR WORLD mode-card list
// (BetEntry) at h900 vs h1118, since column-level voidPx=0 does not prove
// the interior itself reads clean — space-between/alignContent redistribution
// can relocate the blank band one level deeper instead of removing it.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6301'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(
    ({ t, within }) => {
      const root = within ? document.querySelector(within) : document
      if (!root) return null
      const els = [...root.querySelectorAll('button,[role=button],a')]
      const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
      const lc = t.toLowerCase()
      return (
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
        els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
        null
      )
    },
    { t, within },
  )
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function gapsInSessionCard(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="vault-ctl-session"]')
    if (!wrap) return null
    const inner = wrap.firstElementChild // the styles.sidebarPulse div
    if (!inner) return null
    const kids = [...inner.children].map((c) => {
      const r = c.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }
    })
    const gaps = []
    for (let i = 1; i < kids.length; i++) gaps.push(Math.round(kids[i].top - kids[i - 1].bottom))
    const wrapRect = wrap.getBoundingClientRect()
    return { cardHeight: Math.round(wrapRect.height), kids, gaps, maxGap: gaps.length ? Math.max(...gaps) : null }
  })
}

async function gapsInWorldpicker(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="vault-board-worldpicker"]')
    if (!wrap) return null
    const modeRow = wrap.querySelector('.vault-mode-row')
    if (!modeRow) return null
    const cards = [...modeRow.children].map((c) => {
      const r = c.getBoundingClientRect()
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }
    })
    const gaps = []
    for (let i = 1; i < cards.length; i++) gaps.push(Math.round(cards[i].top - cards[i - 1].bottom))
    const wrapRect = wrap.getBoundingClientRect()
    return { cardHeight: Math.round(wrapRect.height), cards, gaps, maxGap: gaps.length ? Math.max(...gaps) : null }
  })
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const out = {}
  for (const h of [900, 1118]) {
    await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)
    await clickText(page, 'ape in')
    await wait(500)
    out[`betEntry_h${h}_worldpickerGaps`] = await gapsInWorldpicker(page)
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    out[`playing_h${h}_sessionGaps`] = await gapsInSessionCard(page)
    await clickText(page, 'take profit')
    await wait(900)
    out[`settled_h${h}_sessionGaps`] = await gapsInSessionCard(page)
  }
  await browser.close()
  console.log(JSON.stringify(out, null, 2))
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
