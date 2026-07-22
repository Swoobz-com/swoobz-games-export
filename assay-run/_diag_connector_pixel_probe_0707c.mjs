// Pixel-measurement re-check of the adjacency-gated route connector (recent
// change #1): sample along tile-center-to-tile-center segments for a KNOWN
// picked set [0,1,20,21,45,68,90,91] and assert cyan-thread presence only on
// the truly-adjacent pairs (0-1, 20-21, 90-91), absence on the jumps.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
import { PNG } from 'pngjs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, txt) {
  const rect = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (!b || b.disabled) return null
    b.scrollIntoView({ block: 'center' })
    const r = b.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, txt)
  if (!rect) return false
  await page.mouse.click(rect.x, rect.y)
  return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = await browser.newPage()
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch {} })
await page.reload({ waitUntil: 'networkidle0' })
await wait(200)
await clickText(page, 'ENTER THE DIVE')
await wait(150)
const box = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const dim = 14
const tile = box.w / dim
const trail = [0, 1, 20, 21, 45, 68, 90, 91]
for (const idx of trail) {
  const col = idx % dim, row = Math.floor(idx / dim)
  await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
  await wait(25)
}
await wait(150)
const shotPath = 'connector-probe-planning.png'
await page.screenshot({ path: shotPath })

function tileCenterPage(idx) {
  const col = idx % dim, row = Math.floor(idx / dim)
  return { x: box.x + col * tile + tile / 2, y: box.y + row * tile + tile / 2 }
}
const png = PNG.sync.read(fs.readFileSync(shotPath))
function sampleMidpoint(idxA, idxB) {
  const a = tileCenterPage(idxA), b = tileCenterPage(idxB)
  const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2)
  const i = (png.width * my + mx) << 2
  return { mx, my, r: png.data[i], g: png.data[i + 1], b: png.data[i + 2], hex: `#${[png.data[i], png.data[i+1], png.data[i+2]].map(v=>v.toString(16).padStart(2,'0')).join('')}` }
}
const pairs = [[0,1,'adjacent-expect-thread'], [1,20,'jump-expect-NO-thread'], [20,21,'adjacent-expect-thread'], [21,45,'jump-expect-NO-thread'], [45,68,'jump-expect-NO-thread'], [68,90,'jump-expect-NO-thread'], [90,91,'adjacent-expect-thread']]
console.log('box:', box, 'tile:', tile)
for (const [a,b,label] of pairs) {
  console.log(label, a, '->', b, JSON.stringify(sampleMidpoint(a,b)))
}
await browser.close()
