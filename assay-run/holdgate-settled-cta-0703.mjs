import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5401/'
const LABEL = process.argv[3] || 'baseline'
const OUT = `shots-holdgate-cta-${LABEL}`
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
]

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: null,
})
const page = (await browser.pages())[0]

const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
const canvasBox = () => page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paintSerpentine(n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 3; row < 30 && count < n; row += 2) {
    for (let col = 2; col < 30 && count < n; col += 3) {
      await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
      count++
      await wait(6)
    }
  }
}

const report = {}

for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)

  // Measure lobby/planning page overflow BEFORE settling
  await clickText('ENTER THE ASSAY LINE')
  await wait(300)
  const lobbyOverflow = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

  let box = await canvasBox()
  await paintSerpentine(10, box)
  await wait(200)
  const planningOverflow = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }))

  await clickText('PLUNGE')
  await wait(3200) // let it settle (10-tile trail, low bust risk but may bust; either way settled)

  const settledInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const cta = btns.find((b) => b.textContent && b.textContent.includes('ASSAY AGAIN'))
    if (!cta) return { found: false }
    const r = cta.getBoundingClientRect()
    return {
      found: true,
      rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height },
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      bodyText: document.body.innerText.slice(0, 200),
    }
  })

  const boardRect = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { w: r.width, h: r.height }
  })

  await page.screenshot({ path: `${OUT}/${vp.name}-settled.png` })

  report[vp.name] = {
    lobbyOverflow,
    planningOverflow,
    settledInfo,
    boardRect,
    ctaBelowFoldPx: settledInfo.found ? Math.max(0, settledInfo.rect.bottom - vp.height) : null,
  }
}

console.log(JSON.stringify(report, null, 2))
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
