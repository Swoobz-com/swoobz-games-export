import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-fixpass0707'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
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
async function boardBox(p) { return p.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }) }
async function tapCell(p, box, col, row, cols) { await p.mouse.click(box.x + box.w * ((col + 0.5) / cols), box.y + box.h * ((row + 0.5) / cols)) }
async function clearAndGo(p, w, h) {
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(700)
}
async function isSettled(p) { return p.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]')) }
async function metaInfo(p) {
  return p.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-ctl-meta"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { text: el.textContent.replace(/\s+/g, ' ').trim(), rect: { top: r.top, left: r.left, width: r.width, height: r.height } }
  })
}

async function forceOutcome(page, width, height, wantWin) {
  for (let attempt = 0; attempt < 15; attempt++) {
    await clearAndGo(page, width, height)
    // shitcoin, 7x7, 24 rugs -> tap many cells fast to force a LOSS quickly;
    // bluechips, 5x5, 3 rugs, tap ONE corner + cash out via TAKE PROFIT -> WIN
    if (!wantWin) {
      await clickText(page, 'shitcoin')
      await wait(300)
      await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
      await wait(900)
      const box = await boardBox(page)
      let settled = false
      for (let row = 0; row < 7 && !settled; row++) {
        for (let col = 0; col < 7 && !settled; col++) {
          await tapCell(page, box, col, row, 7)
          await wait(500)
          settled = await isSettled(page)
        }
      }
      if (settled) {
        await wait(600)
        const won = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent.includes('SECURED'))
        if (!won) return true
      }
    } else {
      await clickText(page, 'bluechips')
      await wait(300)
      await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
      await wait(900)
      const box = await boardBox(page)
      await tapCell(page, box, 2, 2, 5)
      await wait(700)
      const settledEarly = await isSettled(page)
      if (settledEarly) continue // rugged, retry
      // survived -> take profit
      const clicked = await clickText(page, 'take profit')
      await wait(900)
      if (await isSettled(page)) {
        const won = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-banner"]')?.textContent.includes('SECURED'))
        if (won) return true
      }
    }
  }
  return false
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    for (const wantWin of [true, false]) {
      const ok = await forceOutcome(page, w, h, wantWin)
      await wait(500)
      const meta = await metaInfo(page)
      const tag = `${w}x${h}-${wantWin ? 'WIN' : 'LOSS'}`
      console.log(tag, 'forced:', ok, 'meta:', JSON.stringify(meta))
      await page.screenshot({ path: `${OUT}/fix1-${tag}.png` })
    }
  }
  await browser.close()
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
