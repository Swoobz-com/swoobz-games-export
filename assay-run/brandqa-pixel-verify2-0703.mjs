import puppeteer from 'puppeteer-core'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'shots-brandqa-0703'
fs.mkdirSync(OUT, { recursive: true })
const DPR = 4
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: DPR } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5399/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)

await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 150))

let won = false
for (let attempt = 0; attempt < 80 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const tile = box.w / 32
  for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
  await new Promise(r => setTimeout(r, 40))
  const pace = await bodyText()
  if (pace.includes('PACE: INSTANT')) { await clickText('PACE:'); await new Promise(r => setTimeout(r, 30)) }
  await clickText('PLUNGE')
  let maxWidthSeen = 0
  for (let t = 0; t < 30; t++) {
    await new Promise(r => setTimeout(r, 25))
    const info = await page.evaluate(() => {
      const spark = [...document.querySelectorAll('div')].find(d => {
        const cs = getComputedStyle(d)
        return cs.borderColor.includes('0, 240, 255') && d.style.position === 'absolute' && d.style.inset
      })
      const bezels = [...document.querySelectorAll('div')].filter(d => getComputedStyle(d).borderTopWidth === '3px')
      if (!spark || bezels.length === 0) return null
      const sr = spark.getBoundingClientRect()
      let best = null, bestD = Infinity
      for (const bz of bezels) {
        const br = bz.getBoundingClientRect()
        const cx = br.x + br.width / 2, cy = br.y + br.height / 2
        const scx = sr.x + sr.width / 2, scy = sr.y + sr.height / 2
        const d = Math.hypot(cx - scx, cy - scy)
        if (d < bestD) { bestD = d; best = br }
      }
      return { spark: { x: sr.x, y: sr.y, w: sr.width, h: sr.height }, bezel: { x: best.x, y: best.y, w: best.width, h: best.height } }
    })
    if (info && info.spark.w > maxWidthSeen) {
      maxWidthSeen = info.spark.w
      // Strip spanning the SPARK's own vertical range, full case width +/-margin
      const clip = {
        x: Math.max(0, info.bezel.x - 15),
        y: Math.max(0, info.spark.y - 3),
        width: info.bezel.w + 30,
        height: Math.max(10, info.spark.h + 6),
      }
      await page.screenshot({ path: `${OUT}/pv2-attempt${attempt}-t${t}-w${Math.round(info.spark.w)}.png`, clip })
      fs.writeFileSync(`${OUT}/pv2-attempt${attempt}-t${t}-w${Math.round(info.spark.w)}.json`, JSON.stringify({ info, clip }, null, 2))
    }
  }
  console.log('attempt', attempt, 'maxWidthSeen', maxWidthSeen)
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
  } else {
    await new Promise(r => setTimeout(r, 150))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 80))
  }
}
console.log('won', won)
await browser.close()
