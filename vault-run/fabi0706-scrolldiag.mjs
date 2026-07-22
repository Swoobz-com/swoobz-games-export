import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
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
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(500)
  await dismiss(page)
  await clickText(page, 'bluechips')
  await wait(200)
  await clickText(page, 'send it')
  await wait(900)
  let settled = false
  const seq = []
  for (let cy=0;cy<5;cy++) for (let cx=0;cx<5;cx++) seq.push([cx,cy])
  for (const [cx,cy] of seq) {
    const isSet = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-board-caption"]'))
    if (isSet) { settled = true; break }
    const tpVisible = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((e) => (e.textContent||'').trim().toLowerCase().includes('take profit'))
      return !!btn && btn.offsetParent !== null && !btn.disabled
    })
    if (tpVisible) {
      const beforeScroll = await page.evaluate(() => window.scrollY)
      await clickText(page, 'take profit')
      await wait(300)
      const afterScrollImmediate = await page.evaluate(() => window.scrollY)
      await wait(1000)
      const afterScroll1s = await page.evaluate(() => window.scrollY)
      console.log(JSON.stringify({ beforeScroll, afterScrollImmediate, afterScroll1s }))
      settled = true
      break
    }
    await clickCell(page, cx, cy, 5)
    await wait(280)
  }
  const finalState = await page.evaluate(() => ({
    scrollY: window.scrollY,
    headerTapeText: document.querySelector('[data-testid="vault-settled-board-caption"]') ? 'settled-caption-present' : 'no-settled-caption',
    bodyHeight: document.body.scrollHeight,
    winHeaderText: (() => { const els=[...document.querySelectorAll('span')]; const brand = els.find(e=>e.textContent==='RUG OR RICHES'); return brand ? brand.getBoundingClientRect() : null })(),
  }))
  console.log('FINAL', JSON.stringify(finalState, null, 2))
  await page.screenshot({ path: 'shots-fabi0706-v2/iphone14pro-win-diag.png' })
  await browser.close()
}
run().catch((e)=>{console.error(e);process.exit(1)})
