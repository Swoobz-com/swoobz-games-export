import puppeteer from 'puppeteer-core'
import { PNG } from 'pngjs'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const OUT = 'shots-artotty-evenlight-0706'
fs.mkdirSync(OUT, { recursive: true })

function stats(png, x0, y0, w, h) {
  const Ls = []
  const X1 = Math.min(png.width, x0 + w), Y1 = Math.min(png.height, y0 + h)
  for (let y = Math.max(0, y0); y < Y1; y++)
    for (let x = Math.max(0, x0); x < X1; x++) {
      const i = (y * png.width + x) * 4
      Ls.push((0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2]) / 255)
    }
  Ls.sort((a, b) => a - b)
  const n = Ls.length
  const mean = Ls.reduce((s, v) => s + v, 0) / n
  const coin = Ls.slice(Math.floor(n * 0.8)).reduce((s, v) => s + v, 0) / (n - Math.floor(n * 0.8))
  const bed = Ls.slice(0, Math.floor(n * 0.2)).reduce((s, v) => s + v, 0) / Math.floor(n * 0.2)
  return { mean: +mean.toFixed(4), coin: +coin.toFixed(4), bed: +bed.toFixed(4) }
}
function crop(png, x0, y0, w, h, name) {
  x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0))
  w = Math.min(png.width - x0, Math.round(w)); h = Math.min(png.height - y0, Math.round(h))
  if (w <= 0 || h <= 0) { console.log(`  (skip crop ${name}: off-canvas ${w}x${h})`); return }
  const out = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = ((y0 + y) * png.width + (x0 + x)) * 4, d = (y * w + x) * 4
    out.data[d] = png.data[s]; out.data[d + 1] = png.data[s + 1]; out.data[d + 2] = png.data[s + 2]; out.data[d + 3] = png.data[s + 3]
  }
  fs.writeFileSync(`${OUT}/${name}.png`, PNG.sync.write(out))
}

async function shoot(label, vw, vh, dsf) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required', `--window-size=${vw + 20},${vh + 120}`] })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: dsf })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(1800)
  // dismiss coachmark if present
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /×|✕|close|got it|dismiss/i.test(x.textContent || x.getAttribute('aria-label') || '')); if (b) b.click() }).catch(() => {})
  await wait(500)
  const b = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height } })
  const buf = await page.screenshot({ type: 'png' })
  const png = PNG.sync.read(Buffer.from(buf))
  fs.writeFileSync(`${OUT}/${label}-full.png`, buf)
  // board rect in device px, clamped to the actual screenshot bounds (mobile
  // canvas is a panning loupe window that can exceed the viewport)
  const bl = Math.max(0, b.left * dsf), bt = Math.max(0, b.top * dsf)
  const br = Math.min(png.width, b.right * dsf), bb = Math.min(png.height, b.bottom * dsf)
  const bw = br - bl, bh = bb - bt
  const pw = Math.round(bw * 0.24), ph = Math.round(bh * 0.24)
  const ins = Math.round(bw * 0.04)
  const cx = Math.round((bl + br) / 2 - pw / 2), cy = Math.round((bt + bb) / 2 - ph / 2)
  const pts = {
    'TL': [bl + ins, bt + ins],
    'TR': [br - ins - pw, bt + ins],
    'BL': [bl + ins, bb - ins - ph],
    'BR_wasdark': [br - ins - pw, bb - ins - ph],
    'CENTER': [cx, cy],
  }
  console.log(`\n=== ${label} board quadrant luminance (mean|coin=top20%|bed=bot20%) ===`)
  const R = {}
  for (const [k, [x, y]] of Object.entries(pts)) { R[k] = stats(png, x, y, pw, ph); console.log(`  ${k.padEnd(11)} mean=${R[k].mean} coin=${R[k].coin} bed=${R[k].bed}`); crop(png, x, y, pw, ph, `${label}-q-${k}`) }
  const C = R.CENTER
  console.log(`  --- ratio vs center (1.0=equal) ---`)
  for (const k of ['TL', 'TR', 'BL', 'BR_wasdark']) console.log(`  ${k.padEnd(11)} mean=${(R[k].mean / C.mean).toFixed(3)} coin=${(R[k].coin / C.coin).toFixed(3)} bed=${(R[k].bed / C.bed).toFixed(3)}`)
  // whole-board crop for viewing
  crop(png, bl, bt, bw, bh, `${label}-board`)
  await browser.close()
  return R
}

await shoot('desktop', 1440, 900, 2)
await shoot('mobile', 412, 915, 3)
console.log('\nDONE ->', OUT)
