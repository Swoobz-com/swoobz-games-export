// fabi0706-verify2b.mjs — targeted retry: force a genuine bluechips LOSS at
// 1440x900 (verify2.mjs's fixed row-major click order happened to full-clear
// the board instead of hitting a mine on this seed). Tries several click
// orders/attempts until vault-settled-banner + outcomeText === 'BUST'.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-fabi0706-v2'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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
async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}
async function gridAttrs(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-canvas-shell"]')
    if (!el) return null
    return { full: el.getAttribute('data-grid-full'), tile: el.getAttribute('data-grid-tile'), gap: el.getAttribute('data-grid-gap'), plate: el.getAttribute('data-grid-plate') }
  })
}
async function countBetAgain(page) { return page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length) }
async function plateBorderCheck(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return { borderColor: cs.borderColor, borderRadius: cs.borderRadius }
  }, sel)
}
async function isSettled(page) { return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }
async function outcomeText(page) { return page.evaluate(() => document.querySelector('[data-testid="vault-hud-pump-value"]')?.textContent || null) }

function orderVariants() {
  const rowMajor = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) rowMajor.push([cx, cy])
  const reverse = [...rowMajor].reverse()
  const diagFirst = [[0,0],[1,1],[2,2],[3,3],[4,4],[0,4],[4,0],[1,0],[0,1],[2,0],[0,2],[3,0],[0,3],[4,1],[1,4],[4,2],[2,4],[4,3],[3,4],[1,2],[2,1],[1,3],[3,1],[2,3],[3,2]]
  const colMajor = []
  for (let cx = 0; cx < 5; cx++) for (let cy = 0; cy < 5; cy++) colMajor.push([cx, cy])
  return [rowMajor, reverse, diagFirst, colMajor]
}

async function clickCell(page, cx, cy, n) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  if (!box) return
  const fx = 0.06 + ((cx + 0.5) / n) * 0.88
  const fy = 0.08 + ((cy + 0.5) / n) * 0.8
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

  let result = null
  const variants = orderVariants()
  for (let attempt = 0; attempt < variants.length && !result; attempt++) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(500)
    await dismiss(page)
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it')
    await wait(900)
    let settled = false
    for (const [cx, cy] of variants[attempt]) {
      if (await isSettled(page)) { settled = true; break }
      await clickCell(page, cx, cy, 5)
      await wait(280)
    }
    await wait(500)
    settled = settled || (await isSettled(page))
    const oc = await outcomeText(page)
    console.error(`attempt ${attempt}: settled=${settled} outcome=${oc}`)
    if (settled && oc === 'BUST') {
      result = {
        board: await rect(page, '[data-testid="vault-canvas-shell"]'),
        grid: await gridAttrs(page),
        control: await rect(page, '[data-testid="DesktopControlColumn"]'),
        banner: await rect(page, '[data-testid="vault-settled-banner"]'),
        scrim: await rect(page, '[data-testid="vault-scene-edge-scrim"]'),
        betAgainCount: await countBetAgain(page),
        boardVaultRebetPresent: await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]')),
        plateBorder: await plateBorderCheck(page, '[data-testid="DesktopControlColumn"] > *'),
        outcomeText: oc,
        attemptIndex: attempt,
      }
      await page.screenshot({ path: `${OUT}/d1440x900-settled-loss-retry.png`, fullPage: false })
    }
  }

  fs.writeFileSync(`${OUT}/d1440-loss-retry.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
