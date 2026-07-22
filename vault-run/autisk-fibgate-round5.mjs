import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6473'
const OUT = process.argv[3] || 'shots-autisk-fibgate-round5'
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
async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel); if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), w: Math.round(r.width) }
  }, sel)
}
async function scrollInfo(page) {
  return page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, innerHeight: window.innerHeight, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
}
async function ctaReachable(page) {
  return page.evaluate(() => {
    const cta = document.querySelector('[data-testid="vault-ctl-cta"]'); if (!cta) return null
    const r = cta.getBoundingClientRect(); const belowFold = r.bottom > window.innerHeight
    const scrollers = []; let n = cta.parentElement
    while (n) { const cs = getComputedStyle(n); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) scrollers.push(n.getAttribute('data-testid') || n.tagName); n = n.parentElement }
    return { belowFold, top: Math.round(r.top), bottom: Math.round(r.bottom), scrollers }
  })
}
async function worldRows(page) {
  return page.evaluate(() => {
    const wp = document.querySelector('[data-testid="vault-board-worldpicker"]'); if (!wp) return null
    const WORLDS = ['BLUECHIPS', 'ALTSEASON', 'SHITCOIN']
    return [...wp.querySelectorAll('button')].filter((b) => WORLDS.some((w) => (b.textContent || '').includes(w))).map((b) => {
      const r = b.getBoundingClientRect(); const cs = getComputedStyle(b)
      const nameSpan = b.querySelector('span')
      return {
        text: (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
        top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), h: Math.round(r.height),
        selected: b.getAttribute('aria-pressed') === 'true',
        padding: cs.padding, gap: cs.gap, borderColor: cs.borderColor,
        nameLeft: nameSpan ? Math.round(nameSpan.getBoundingClientRect().left) : null,
        nameFontSize: nameSpan ? getComputedStyle(nameSpan).fontSize : null,
        hasBestPill: /BEST/.test(b.textContent || ''),
      }
    })
  })
}
function worldGaps(rows) { if (!rows) return null; const g = []; for (let i = 1; i < rows.length; i++) g.push(Math.round(rows[i].top - rows[i - 1].bottom)); return g }
const results = { port: PORT, heights: {} }
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERR', m.text()) })
  for (const h of [900, 1000, 1080, 1118]) {
    await page.setViewport({ width: 1440, height: h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600); await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(250)
    await clickText(page, 'ape in'); await wait(900)
    const R = { scroll: await scrollInfo(page), cta: await ctaReachable(page) }
    let rows = await worldRows(page)
    R.rowsDefault = rows
    R.worldGapsDefault = worldGaps(rows)
    const ctrlBox = await rect(page, '[data-testid="DesktopControlColumn"]')
    if (ctrlBox) await page.screenshot({ path: `${OUT}/h${h}-betentry-control.png`, clip: { x: Math.max(0, ctrlBox.left - 4), y: Math.max(0, ctrlBox.top - 4), width: ctrlBox.w + 8, height: ctrlBox.h + 8 } }).catch(() => {})
    const shift = {}
    for (const w of ['bluechips', 'altseason', 'shitcoin']) {
      await clickText(page, w); await wait(180)
      const rr = await worldRows(page)
      const sel = rr.find((x) => x.selected)
      shift[w] = { nameLeft: sel ? sel.nameLeft : null, selText: sel ? sel.text.slice(0, 9) : null, selH: sel ? sel.h : null }
    }
    R.horizontalShift = shift
    await clickText(page, 'bluechips'); await wait(150)
    await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]'); await wait(900)
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) { const fx = 0.05 + ((1 + 0.5) / 5) * 0.9, fy = 0.06 + ((1 + 0.5) / 5) * 0.82; await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy); await wait(500) }
    await clickText(page, 'take profit'); await wait(900)
    await clickText(page, 'bet again'); await wait(700)
    await clickText(page, 'bluechips'); await wait(200)
    const rowsPill = await worldRows(page)
    R.rowsWithPill = rowsPill
    R.worldGapsWithPill = worldGaps(rowsPill)
    R.scrollAfter = await scrollInfo(page)
    const ctrlBox2 = await rect(page, '[data-testid="DesktopControlColumn"]')
    if (ctrlBox2) await page.screenshot({ path: `${OUT}/h${h}-betentry-control-pill.png`, clip: { x: Math.max(0, ctrlBox2.left - 4), y: Math.max(0, ctrlBox2.top - 4), width: ctrlBox2.w + 8, height: ctrlBox2.h + 8 } }).catch(() => {})
    results.heights[h] = R
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  for (const h of Object.keys(results.heights)) {
    const R = results.heights[h]
    const dsel = ((R.rowsDefault||[]).find((x) => x.selected) || {})
    const dpln = ((R.rowsDefault||[]).find((x) => !x.selected) || {})
    const psel = ((R.rowsWithPill||[]).find((x) => x.selected) || {})
    console.log(`h${h}: DEFAULT sel=${dsel.h}(pill:${dsel.hasBestPill}) plain=${dpln.h} gaps=${JSON.stringify(R.worldGapsDefault)} | WITHPILL sel=${psel.h}(pill:${psel.hasBestPill}) gaps=${JSON.stringify(R.worldGapsWithPill)} | scroll ${R.scroll.scrollHeight}v${R.scroll.innerHeight} belowFold=${R.cta && R.cta.belowFold} scrollers=${JSON.stringify(R.cta && R.cta.scrollers)}`)
    console.log(`      pad-sel=${dsel.padding} gap-sel=${dsel.gap} pad-plain=${dpln.padding} nameFS-sel=${dsel.nameFontSize}`)
    console.log(`      shift: ${JSON.stringify(R.horizontalShift)}`)
  }
  console.log('OUT', OUT)
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
