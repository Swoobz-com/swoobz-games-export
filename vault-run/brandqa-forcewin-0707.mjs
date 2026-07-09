import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5286'
const OUT = 'shots-brandqa-forcewin-0707'
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
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function boardBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
function cellSeqFor(gridSize) {
  const seq = []
  for (let cy = 0; cy < gridSize; cy++) for (let cx = 0; cx < gridSize; cx++) seq.push([cx, cy])
  return seq
}
async function tapCell(page, box, gridSize, idx) {
  const seq = cellSeqFor(gridSize)
  const [cx, cy] = seq[idx]
  const fx = 0.06 + ((cx + 0.5) / gridSize) * 0.88
  const fy = 0.08 + ((cy + 0.5) / gridSize) * 0.8
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
}
const statusText = (page) => page.evaluate(() => document.querySelector('[data-testid="vault-grid-status"]')?.textContent?.trim() || 'NONE')
const isSettled = (page) => page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'))

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
await page.reload({ waitUntil: 'networkidle0' })
await wait(600)
await clickText(page, 'ape in')
await wait(500)
await clickText(page, 'send it')
await wait(700)

let revealed = false
for (let attempt = 0; attempt < 25 && !revealed; attempt++) {
  const box = await boardBox(page)
  await tapCell(page, box, 5, attempt)
  await wait(250)
  const st = await statusText(page)
  const settled = await isSettled(page)
  console.log('attempt', attempt, 'status:', st, 'settled:', settled)
  if (settled) { console.log('HIT A RUG (loss) on attempt', attempt); break }
  if (/open\s+(\d+)/i.test(st)) {
    const m = st.match(/open\s+(\d+)/i)
    if (m && Number(m[1]) >= 1) { revealed = true }
  }
}
if (revealed) {
  await wait(300)
  const clicked = await clickText(page, 'take profit')
  console.log('clicked take profit:', clicked)
  await wait(700)
}
await page.screenshot({ path: `${OUT}/bluechips-settled-outcome.png` })
const bodyText = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))
const safeOpenedMatch = bodyText.match(/\d+\s+SAFES?\s+OPENED/i)
console.log('SAFES OPENED text found:', safeOpenedMatch ? safeOpenedMatch[0] : 'NONE FOUND')
await b.close()
