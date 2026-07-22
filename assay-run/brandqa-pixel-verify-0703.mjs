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
  // Poll every 30ms for up to 900ms, screenshotting the specimen-case bezel region
  // EVERY time a spark-ring element (rgba(0,240,255,...) border) is present in the DOM,
  // so we capture the exact frame(s) where the spark ring is at max extent.
  let captured = 0
  for (let t = 0; t < 30 && captured < 6; t++) {
    await new Promise(r => setTimeout(r, 30))
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
    if (info) {
      captured++
      const clip = { x: Math.max(0, info.bezel.x - 5), y: Math.max(0, info.bezel.y - 5), width: 60, height: 90 }
      // clip around the TOP portion of the bezel (where TallyDial+spark sit, nearest the top border)
      const clipTop = { x: Math.max(0, info.spark.x - 20), y: Math.max(0, Math.min(info.spark.y, info.bezel.y) - 15), width: info.spark.w + 40, height: 60 }
      await page.screenshot({ path: `${OUT}/pxverify-attempt${attempt}-t${t}.png`, clip: clipTop })
      fs.writeFileSync(`${OUT}/pxverify-attempt${attempt}-t${t}.json`, JSON.stringify({ info, clipTop }, null, 2))
      console.log('captured', attempt, t, JSON.stringify(info))
    }
  }
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r => setTimeout(r, 150))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 80))
  } else {
    await new Promise(r => setTimeout(r, 150))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 80))
  }
}
console.log('won', won)
await browser.close()
