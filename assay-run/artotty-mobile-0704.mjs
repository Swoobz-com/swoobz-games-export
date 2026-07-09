import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5191/'
const OUT = 'shots-rescore-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const geom = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const r = c.getBoundingClientRect()
  // find the scroll container (nearest ancestor with overflow auto)
  let el = c.parentElement, sc = null
  while (el) { const s = getComputedStyle(el); if (s.overflow === 'auto' || s.overflowX === 'auto') { sc = el; break } el = el.parentElement }
  const sr = sc ? sc.getBoundingClientRect() : r
  return { canvas: { x: r.x, y: r.y, w: r.width, h: r.height }, scroll: { x: sr.x, y: sr.y, w: sr.width, h: sr.height } }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
page.on('pageerror', (e) => console.log('PAGEERR', e.message))

let won = false
for (let attempt = 0; attempt < 16 && !won; attempt++) {
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(500)
  const g = await geom(page)
  if (!g) { console.log('no canvas'); continue }
  const tile = g.canvas.w / 20
  // visible region intersection of canvas and scroll window
  const vx0 = Math.max(g.canvas.x, g.scroll.x), vy0 = Math.max(g.canvas.y, g.scroll.y)
  const vx1 = Math.min(g.canvas.x + g.canvas.w, g.scroll.x + g.scroll.w)
  const vy1 = Math.min(g.canvas.y + g.canvas.h, g.scroll.y + g.scroll.h)
  // start column/row inside visible region, a bit in
  const startCol = Math.floor((vx0 - g.canvas.x) / tile) + 1
  const startRow = Math.floor((vy0 - g.canvas.y) / tile) + 1
  const tileCenter = (col, row) => ({ x: g.canvas.x + col * tile + tile / 2, y: g.canvas.y + row * tile + tile / 2 })
  // paint an 8-tile connected snake within the visible window
  let col = startCol, row = startRow, placed = 0
  for (let i = 0; i < 8; i++) {
    const p = tileCenter(col, row)
    if (p.x > vx1 - 4 || p.y > vy1 - 4) break
    await page.mouse.click(p.x, p.y)
    placed++
    await wait(40)
    if (i % 2 === 0) col += 1; else row += 1
  }
  if (attempt === 0) { await page.screenshot({ path: `${OUT}/m412-03-armed.png` }); console.log('tile', tile.toFixed(1), 'placed', placed, 'geom', JSON.stringify(g)) }
  await wait(150)
  await clickText(page, 'THROW BREAKER')
  const shots = []
  for (let i = 0; i < 14; i++) { await wait(150); const p = `${OUT}/m412-04-assay-${String(i).padStart(2,'0')}.png`; await page.screenshot({ path: p }); shots.push(p) }
  await wait(800)
  const st = await page.evaluate(() => ({ won: /CLAIM PROVEN/.test(document.body.innerText), bust: /BUSTED|BAD VEIN/.test(document.body.innerText) }))
  console.log('attempt', attempt, st.won ? 'WON' : st.bust ? 'BUST' : '?')
  if (st.won) { for (let i = 0; i < 6; i++) { await page.screenshot({ path: `${OUT}/m412-05-WIN-${String(i).padStart(2,'0')}.png` }); await wait(170) } won = true }
}
console.log('mobile won =', won)
await browser.close()
