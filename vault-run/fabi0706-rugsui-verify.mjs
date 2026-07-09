// fabi0706-rugsui-verify.mjs — verifies the rugsui fix-spec (scrim / panel
// token / win-banner / single-CTA / board-plate+dim) across desktop
// (1440x900, 1920x1080) and mobile (Pixel 7, iPhone 14 Pro), win + loss.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-fabi0706-rugsui'
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

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }
  }, sel)
}
async function countBetAgain(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('button')]
    return els.filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length
  })
}
async function findByTestId(page, id) { return rect(page, `[data-testid="${id}"]`) }

async function forceSettle(page, { win }) {
  // Win path: BLUECHIPS (5x5, only 3/25 rugs) — reveal ONE low-risk corner
  // tile, then TAKE PROFIT. Loss path: SHITCOIN (7x7, 24/49 rugs) — hammer
  // the board until a rug fires.
  if (win) {
    await clickText(page, 'bluechips')
    await wait(200)
    await clickText(page, 'send it')
    await wait(900)
    let settled = false
    const cellSeq = [[0,0],[4,4],[0,4],[4,0],[2,2],[1,1],[3,3],[1,3],[3,1]]
    for (const [cx, cy] of cellSeq) {
      const isSettled = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (isSettled) { settled = true; break }
      const takeProfitVisible = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase().includes('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (takeProfitVisible) { await clickText(page, 'take profit'); await wait(1000); settled = true; break }
      const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
      if (box) {
        const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
        const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      }
      await wait(400)
    }
    if (!settled) { await clickText(page, 'take profit'); await wait(1000) }
    return
  } else {
    await clickText(page, 'shitcoin')
    await wait(200)
    await clickText(page, 'send it')
    await wait(900)
    const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3],[6,1],[1,6],[2,5],[5,2]]
    for (const [cx, cy] of cellSeq) {
      const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
      if (settledNow) break
      const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
      if (box) {
        const fx = 0.05 + ((cx + 0.5) / 7) * 0.9
        const fy = 0.06 + ((cy + 0.5) / 7) * 0.82
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      }
      await wait(300)
    }
    await wait(600)
  }
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const desktopViewports = [
    { name: 'd1440x900', w: 1440, h: 900 },
    { name: 'd1920x1080', w: 1920, h: 1080 },
  ]
  const mobileViewports = [
    { name: 'pixel7', w: 412, h: 915 },
    { name: 'iphone14pro', w: 393, h: 852 },
  ]

  const results = {}

  for (const v of desktopViewports) {
    for (const outcome of ['win', 'loss']) {
      await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
      await wait(600)
      await dismiss(page)
      await forceSettle(page, { win: outcome === 'win' })
      const key = `${v.name}-${outcome}`
      results[key] = {}
      results[key].betAgainCount = await countBetAgain(page)
      results[key].control = await rect(page, '[data-testid="DesktopControlColumn"]')
      results[key].mainGrid = await rect(page, '[data-testid="vault-grid-mainGrid"]')
      results[key].board = await rect(page, '[data-testid="vault-canvas-shell"]')
      results[key].scrim = await rect(page, '[data-testid="vault-scene-edge-scrim"]')
      results[key].banner = await rect(page, '[data-testid="vault-settled-banner"]')
      results[key].caption = await rect(page, '[data-testid="vault-settled-board-caption"]')
      results[key].ctaWrap = await rect(page, '[data-testid="vault-ctl-cta"]')
      const ctaRect = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
        if (!btn) return null
        const r = btn.getBoundingClientRect()
        return { bottom: Math.round(r.bottom), top: Math.round(r.top) }
      })
      results[key].ctaButtonRect = ctaRect
      results[key].ctaAboveFold = ctaRect ? ctaRect.bottom <= v.h : null
      results[key].controlRightMarginFromViewport = results[key].control ? (v.w - results[key].control.right) : null
      results[key].boardVaultRebetPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]'))
      // banner background check (win/loss tint)
      results[key].bannerBg = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-banner"]')
        return el ? getComputedStyle(el).background : null
      })
      await page.screenshot({ path: `${OUT}/${key}.png`, fullPage: false })
    }
  }

  for (const v of mobileViewports) {
    for (const outcome of ['win', 'loss']) {
      await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
      await wait(600)
      await dismiss(page)
      await forceSettle(page, { win: outcome === 'win' })
      const key = `${v.name}-${outcome}`
      results[key] = {}
      results[key].betAgainCount = await countBetAgain(page)
      results[key].boardVaultRebetPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]'))
      results[key].caption = await rect(page, '[data-testid="vault-settled-board-caption"]')
      const ctaRect = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
        if (!btn) return null
        const r = btn.getBoundingClientRect()
        return { bottom: Math.round(r.bottom), top: Math.round(r.top) }
      })
      results[key].ctaButtonRect = ctaRect
      results[key].ctaAboveFold = ctaRect ? ctaRect.bottom <= v.h : null
      await page.screenshot({ path: `${OUT}/${key}.png`, fullPage: false })
    }
  }

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
