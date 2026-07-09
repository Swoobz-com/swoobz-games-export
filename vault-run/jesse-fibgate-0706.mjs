// jesse-fibgate-0706.mjs — FRESH-PLAYER comprehension gate, vault round 2.
// Adds the overflow-ancestor scroll-walk (the internal-scroll trap the
// page-scroll check misses) + doc-wide stepper census + full zone text.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6014'
const OUT = process.argv[3] || `shots-jesse-${Date.now()}`
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
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas'); if (!c) return null
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}
async function txt(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null
    return (el.textContent || '').replace(/\s+/g, ' ').trim()
  }, sel)
}
// THE TRAP DETECTOR: is the CTA below the fold, and is it trapped by ANY
// scrolling ancestor (not just the page)? Walks every ancestor for overflow.
async function ctaFoldProbe(page) {
  return page.evaluate(() => {
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]')
    if (!cta) return { found: false }
    const r = cta.getBoundingClientRect()
    const vh = window.innerHeight
    // walk ancestors for a scrolling clipper
    let scrollers = []
    let node = cta.parentElement
    while (node && node !== document.documentElement) {
      const cs = getComputedStyle(node)
      const oy = cs.overflowY, ox = cs.overflowX
      const scrollsY = (oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1
      const scrollsX = (ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 1
      if (scrollsY || scrollsX) {
        const nr = node.getBoundingClientRect()
        scrollers.push({ testid: node.getAttribute('data-testid') || node.className || node.tagName, scrollsY, scrollsX, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, ctaBelowScrollerBottom: Math.round(r.bottom) > Math.round(nr.bottom) })
      }
      node = node.parentElement
    }
    return {
      found: true,
      ctaText: (cta.textContent || '').replace(/\s+/g, ' ').trim(),
      ctaBottom: Math.round(r.bottom), ctaTop: Math.round(r.top), vh,
      belowFold: Math.round(r.bottom) > vh + 1,
      visibleInViewport: r.top >= 0 && r.bottom <= vh + 1,
      scrollers,
      pageScrollY: document.documentElement.scrollHeight - window.innerHeight,
    }
  })
}
// doc-wide bet stepper census — catch a duplicate ANYWHERE (blocker #1)
async function stepperCensus(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[aria-label]')]
    const wager = btns.filter((b) => /wager|bet|inzet/i.test(b.getAttribute('aria-label') || ''))
    // also visible bet-amount labels a newcomer would read as a "field"
    const labelHits = [...document.querySelectorAll('*')].filter((e) => {
      if (e.children.length) return false
      const t = (e.textContent || '').trim().toUpperCase()
      return t === 'INZET' || t === 'YOUR BET' || t === 'BET' || /VERGRENDELD|LOCKED/.test(t)
    }).map((e) => (e.textContent || '').trim())
    return {
      wagerStepperCount: wager.length,
      wagerStepperLabels: wager.map((b) => ({ aria: b.getAttribute('aria-label'), disabled: b.disabled, visible: b.offsetParent !== null })),
      betFieldLabels: labelHits,
    }
  })
}

const R = { port: PORT, out: OUT }

async function drive(page, world, wantWin, tag) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(300)
  const out = { world, wantWin }
  // LOBBY
  out.lobby = { topbar: await txt(page, '[data-testid="vault-grid-topbar"]'), board: await rect(page, '[data-testid="vault-canvas-shell"]'), cta: await rect(page, '[data-testid="vault-ctl-cta"]'), ctaText: await txt(page, '[data-testid="vault-ctl-cta"]'), fold: await ctaFoldProbe(page), steppers: await stepperCensus(page) }
  await page.screenshot({ path: `${OUT}/${tag}-1-lobby.png` })
  // BET ENTRY
  await clickText(page, 'ape in'); await wait(600)
  out.betEntry = { topbar: await txt(page, '[data-testid="vault-grid-topbar"]'), board: await rect(page, '[data-testid="vault-canvas-shell"]'), cta: await rect(page, '[data-testid="vault-ctl-cta"]'), ctaText: await txt(page, '[data-testid="vault-ctl-cta"]'), worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'), worldpickerText: await txt(page, '[data-testid="vault-board-worldpicker"]'), wager: await rect(page, '[data-testid="vault-ctl-wager"]'), wagerText: await txt(page, '[data-testid="vault-ctl-wager"]'), fold: await ctaFoldProbe(page), steppers: await stepperCensus(page) }
  await page.screenshot({ path: `${OUT}/${tag}-2-betentry.png` })
  // pick world
  await clickText(page, world); await wait(300)
  await page.screenshot({ path: `${OUT}/${tag}-2b-betentry-${world}.png` })
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(1000)
  // PLAYING
  out.playing = { topbar: await txt(page, '[data-testid="vault-grid-topbar"]'), board: await rect(page, '[data-testid="vault-canvas-shell"]'), cta: await rect(page, '[data-testid="vault-ctl-cta"]'), ctaText: await txt(page, '[data-testid="vault-ctl-cta"]'), hud: await txt(page, '[data-testid="DesktopHudRow"]'), worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'), lockedWager: await rect(page, '[data-testid="vault-ctl-wager-locked"]'), lockedWagerText: await txt(page, '[data-testid="vault-ctl-wager-locked"]'), fold: await ctaFoldProbe(page), steppers: await stepperCensus(page) }
  out.playing.lockedDisabled = await page.evaluate(() => { const el = document.querySelector('[data-testid="vault-ctl-wager-locked"]'); if (!el) return null; const b = [...el.querySelectorAll('button')]; return { count: b.length, allDisabled: b.every((x) => x.disabled) } })
  await page.screenshot({ path: `${OUT}/${tag}-3-playing.png` })
  // WIN path or LOSS path
  if (wantWin) {
    await clickCell(page, 2, 2, 5, 5); await wait(500)
    out.playingAfterReveal = { hud: await txt(page, '[data-testid="DesktopHudRow"]'), cta: await txt(page, '[data-testid="vault-ctl-cta"]') }
    await page.screenshot({ path: `${OUT}/${tag}-3b-playing-reveal.png` })
    await clickText(page, 'take profit'); await wait(1000)
  } else {
    // sweep the whole board to guarantee a rug
    for (let rr = 0; rr < 5 && (await txt(page, '[data-testid="vault-grid-topbar"]')).toLowerCase().indexOf('settled') < 0; rr++) {
      for (let cc = 0; cc < 5; cc++) { await clickCell(page, cc, rr, 5, 5); await wait(120) }
    }
    await wait(800)
  }
  // SETTLED
  out.settled = { topbar: await txt(page, '[data-testid="vault-grid-topbar"]'), board: await rect(page, '[data-testid="vault-canvas-shell"]'), cta: await rect(page, '[data-testid="vault-ctl-cta"]'), ctaText: await txt(page, '[data-testid="vault-ctl-cta"]'), banner: await txt(page, '[data-testid="vault-settled-banner"]'), hud: await txt(page, '[data-testid="DesktopHudRow"]'), worldpicker: await rect(page, '[data-testid="vault-board-worldpicker"]'), session: await txt(page, '[data-testid="vault-ctl-session"]'), receipt: await txt(page, '[data-testid="vault-ctl-receipt"]'), fold: await ctaFoldProbe(page) }
  await page.screenshot({ path: `${OUT}/${tag}-4-settled.png` })
  // receipt one-click
  const beforeR = await txt(page, '[data-testid="vault-ctl-receipt"]')
  const clickedR = await clickText(page, 'view receipt')
  await wait(600)
  out.receiptToggle = { clicked: clickedR, before: (beforeR || '').slice(0, 40), after: (await txt(page, '[data-testid="vault-ctl-receipt"]') || '').slice(0, 400) }
  await page.screenshot({ path: `${OUT}/${tag}-4b-receipt.png` })
  return out
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  R.title = await page.title()
  console.log('TITLE', R.title)
  // WIN run (bluechips, few mines)
  R.win = await drive(page, 'bluechips', true, 'win-1440')
  // LOSS run (shitcoin, many mines)
  R.loss = await drive(page, 'shitcoin', false, 'loss-1440')
  // MOBILE sanity
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(700)
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(300)
  R.mobile = { hasDesktopGrid: await page.evaluate(() => !!document.querySelector('[data-testid="vault-grid-mainGrid"]')), lobbyScroll: await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, ih: window.innerHeight })) }
  await page.screenshot({ path: `${OUT}/mobile-1-lobby.png` })
  await clickText(page, 'ape in'); await wait(600)
  R.mobile.betEntryFold = await ctaFoldProbe(page)
  R.mobile.betEntrySteppers = await stepperCensus(page)
  await page.screenshot({ path: `${OUT}/mobile-2-betentry.png`, fullPage: true })
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2))
  console.log(JSON.stringify(R, null, 2))
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
