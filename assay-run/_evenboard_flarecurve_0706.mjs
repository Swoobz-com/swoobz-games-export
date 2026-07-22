// Finer-grained timing probe to trace the SUB_FLARE curve precisely (desktop's
// single 70ms sample in the main driver landed on an ambiguous point relative
// to REVEAL_POP_MS=260 / REVEAL_POP_PEAK_T=0.6 -> peak ~156ms after the pop
// actually starts, which itself may lag the click by a React re-render tick).
import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
function luminance(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b }
async function sampleMean(page, x, y, w, h) {
  const buf = await page.screenshot({ type: 'png', clip: { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)), width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) } })
  const png = PNG.sync.read(Buffer.from(buf))
  let sum = 0, n = 0
  for (let i = 0; i < png.data.length; i += 4) { sum += luminance(png.data[i], png.data[i+1], png.data[i+2]); n++ }
  return +(sum / n).toFixed(2)
}
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find((x) => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, re.source)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await wait(700)
await page.evaluate(() => { try { localStorage.setItem('assay_coachmark_seen_v1', '1') } catch(e){} })
await page.reload({ waitUntil: 'load', timeout: 60000 })
await wait(700)
await clickText(page, /ENTER THE DIVE/)
await wait(400)
const g = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
const tile = g.w / 14
const col = 9, row = 9 // a different never-touched tile than the main driver's (7,7)
const cx = g.left + col*tile - tile*0.9
const cy = g.top + row*tile - tile*0.9
const w = tile*2.8, h = tile*2.8
const before = await sampleMean(page, cx, cy, w, h)
await page.mouse.click(g.left + col*tile + tile/2, g.top + row*tile + tile/2)
const t0 = Date.now()
const samples = []
for (const target of [0,20,40,60,90,120,150,180,220,260,320,400,550,800]) {
  const now = Date.now() - t0
  if (target > now) await wait(target - now)
  const v = await sampleMean(page, cx, cy, w, h)
  samples.push({ tMs: Date.now()-t0, lum: v })
}
console.log('before', before)
console.log(JSON.stringify(samples, null, 2))
await browser.close()
