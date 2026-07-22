// fabi0706-verify3-mobile.mjs — corrected mobile CTA-fold measurement.
// verify2.mjs's numbers were confounded by puppeteer's ElementHandle.click()
// auto-scrolling the page to bring clicked buttons into view (confirmed via
// fabi0706-scrolldiag.mjs: page was scrolled ~57-61px by click-time, NOT
// caused by the app itself). This script force-resets window.scrollTo(0,0)
// immediately before every final measurement/screenshot so "below the fold"
// means what a real user sees on load, not an artifact of headless clicking.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-fabi0706-v3'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function dismiss(page) { await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200) }
async function resetScroll(page) { await page.evaluate(() => window.scrollTo(0, 0)); await wait(80) }
async function clickCell(page, cx, cy, n) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  if (!box) return
  const fx = 0.06 + ((cx + 0.5) / n) * 0.88
  const fy = 0.08 + ((cy + 0.5) / n) * 0.8
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
function seq5x5() { const s=[]; for (let cy=0;cy<5;cy++) for (let cx=0;cx<5;cx++) s.push([cx,cy]); return s }
async function isSettledCaption(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-board-caption"]')) }
async function countBetAgain(page) { return page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length) }

async function driveWin(page) {
  await clickText(page, 'bluechips'); await wait(200)
  await clickText(page, 'send it'); await wait(900)
  for (const [cx, cy] of seq5x5()) {
    if (await isSettledCaption(page)) return true
    const tp = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(e=>(e.textContent||'').toLowerCase().includes('take profit')); return !!b && b.offsetParent!==null && !b.disabled })
    if (tp) { await clickText(page, 'take profit'); await wait(1200); return true }
    await clickCell(page, cx, cy, 5); await wait(280)
  }
  if (!(await isSettledCaption(page))) { await clickText(page, 'take profit'); await wait(1200) }
  return isSettledCaption(page)
}
async function driveLoss(page, order) {
  await clickText(page, 'bluechips'); await wait(200)
  await clickText(page, 'send it'); await wait(900)
  for (const [cx, cy] of order) {
    if (await isSettledCaption(page)) break
    await clickCell(page, cx, cy, 5); await wait(280)
  }
  await wait(400)
  return isSettledCaption(page)
}
function orderVariants() {
  const rowMajor = seq5x5()
  const reverse = [...rowMajor].reverse()
  const colMajor = []
  for (let cx=0;cx<5;cx++) for (let cy=0;cy<5;cy++) colMajor.push([cx,cy])
  return [rowMajor, reverse, colMajor]
}
async function measure(page, v) {
  await resetScroll(page)
  const header = await page.evaluate(() => {
    const els=[...document.querySelectorAll('span')]
    const brand = els.find(e=>e.textContent==='RUG OR RICHES')
    return brand ? (() => { const r=brand.getBoundingClientRect(); return {top:Math.round(r.top),bottom:Math.round(r.bottom)} })() : null
  })
  const caption = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-board-caption"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), width: Math.round(r.width) }
  })
  const cta = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { top: Math.round(r.top), bottom: Math.round(r.bottom) }
  })
  const outcomeWordEl = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-settled-board-caption"]')
    return el ? el.textContent : null
  })
  return {
    scrollY: await page.evaluate(() => window.scrollY),
    header, caption, cta,
    ctaBelowFoldPx: cta ? Math.max(0, cta.bottom - v.h) : null,
    betAgainCount: await countBetAgain(page),
    boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
    captionText: outcomeWordEl,
  }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const viewports = [
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]
  const results = {}
  for (const v of viewports) {
    await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
    const r = {}

    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(500); await dismiss(page)
    await driveWin(page)
    r.win = await measure(page, v)
    await page.screenshot({ path: `${OUT}/${v.name}-win.png` })

    let lossOk = false
    for (const order of orderVariants()) {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(500); await dismiss(page)
      const settled = await driveLoss(page, order)
      if (settled) {
        const capText = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || '')
        if (/RUGGED/i.test(capText)) { lossOk = true; break }
      }
    }
    r.loss = await measure(page, v)
    r.lossForcedOk = lossOk
    await page.screenshot({ path: `${OUT}/${v.name}-loss.png` })

    results[v.name] = r
  }
  fs.writeFileSync(`${OUT}/results3.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
