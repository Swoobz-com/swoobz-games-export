// Independent RG-C5 verifier for the vault settled-screen rework.
// Clears storage between EVERY run so canReuseTrail/lastTrail never carries
// over between win/loss drives (the confound in the maker's own script) --
// isolates outcome (win vs loss) as the ONLY variable.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const OUT = 'shots-fabi-verify-rgc5-0706'
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

async function forceSettle(page, { win }) {
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(1200)
  const cellSeq = []
  for (let cy = 0; cy < 5; cy++) for (let cx = 0; cx < 5; cx++) cellSeq.push([cx, cy])
  for (const [cx, cy] of cellSeq) {
    const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))
    if (settledNow) break
    if (win) {
      const takeProfitReady = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim().toLowerCase().includes('take profit'))
        return !!btn && btn.offsetParent !== null && !btn.disabled
      })
      if (takeProfitReady) { await clickText(page, 'take profit'); await wait(900); break }
    }
    const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    if (box) {
      const fx = 0.06 + ((cx + 0.5) / 5) * 0.88
      const fy = 0.08 + ((cy + 0.5) / 5) * 0.8
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
    }
    await wait(400)
  }
  await wait(700)
}

async function loadFresh(page, v) {
  await page.setViewport({ width: v.w, height: v.h, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  const viewports = [
    { name: 'd1440x900', w: 1440, h: 900 },
    { name: 'pixel7', w: 412, h: 915 },
  ]

  const results = {}

  for (const v of viewports) {
    for (const outcome of ['win', 'loss']) {
      await loadFresh(page, v)
      await forceSettle(page, { win: outcome === 'win' })
      const key = `${v.name}-${outcome}`
      results[key] = {}
      results[key].betAgainCount = await page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => (e.textContent || '').trim().toLowerCase().startsWith('bet again')).length)
      results[key].sameTrailBtnPresent = await page.evaluate(() => [...document.querySelectorAll('button')].some((e) => (e.textContent||'').toLowerCase().includes('same trail')))
      results[key].banner = await rect(page, '[data-testid="vault-settled-banner"]')
      results[key].caption = await rect(page, '[data-testid="vault-settled-board-caption"]')
      results[key].boardVaultRebetPresent = await page.evaluate(() => !!document.querySelector('[data-testid="vault-board-rebet"]'))
      const ctaRect = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase() === 'bet again →')
        if (!btn) return null
        const r = btn.getBoundingClientRect()
        return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }
      })
      results[key].ctaButtonRect = ctaRect
      results[key].bannerBg = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-banner"]')
        return el ? getComputedStyle(el).backgroundImage : null
      })
      results[key].bannerBorder = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-settled-banner"]')
        return el ? getComputedStyle(el).border : null
      })
      results[key].verifiedChipPresent = await page.evaluate(() => document.body.innerText.toLowerCase().includes('verified'))
      results[key].viewReceiptPresent = await page.evaluate(() => [...document.querySelectorAll('button')].some((e) => (e.textContent||'').toLowerCase().includes('receipt')))
      results[key].bodyText = await page.evaluate(() => document.body.innerText)
      await page.screenshot({ path: `${OUT}/${key}.png`, fullPage: false })
    }
  }

  results.consoleErrors = consoleErrors
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('DONE. Wrote', `${OUT}/results.json`)
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
