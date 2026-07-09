import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-artotty-diag-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

async function paintTrail(page, box, n) {
  const tile = box.w / 10
  let r = 8, c = 4
  for (let i = 0; i < n; i++) {
    await page.mouse.click(box.x + c * tile + tile / 2, box.y + r * tile + tile / 2)
    await wait(40)
    r -= 1
    if (i % 3 === 2) c += 1
    if (r < 0) { r = 8; c += 1 }
  }
}

async function round(page, vp, label, trailLen) {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-01-lobby.png` })
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(500)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-02-planning.png` })
  const box = await canvasBox(page)
  if (!box) return { error: 'no canvas' }
  await paintTrail(page, box, trailLen)
  await wait(250)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-03-trail.png` })
  await clickText(page, 'RUN THE LINE')
  const burst = []
  for (let i = 0; i < 14; i++) {
    await wait(110)
    const p = `${OUT}/${vp}-${label}-04-reveal-${String(i).padStart(2, '0')}.png`
    await page.screenshot({ path: p })
    burst.push(p)
  }
  await wait(700)
  await page.screenshot({ path: `${OUT}/${vp}-${label}-05-settled.png` })
  const info = await page.evaluate(() => {
    const t = document.body.innerText
    return {
      won: /CLAIM PROVEN|PROVEN|SECURED/.test(t),
      bust: /BAD VEIN|BUSTED/.test(t),
      snippet: t.slice(0, 200).replace(/\s+/g, ' '),
    }
  })
  return info
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()) })

const rep = {}
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
// play a few rounds until we catch both a win and a bust
rep.d1 = await round(page, 'd1440', 'A', 5)
rep.d2 = await round(page, 'd1440', 'B', 14)
rep.d3 = await round(page, 'd1440', 'C', 20)

await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
rep.m1 = await round(page, 'm412', 'A', 5)
rep.m2 = await round(page, 'm412', 'B', 12)

rep.errs = errs
console.log(JSON.stringify(rep, null, 2))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(rep, null, 2))
await browser.close()
