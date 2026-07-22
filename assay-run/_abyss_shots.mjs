import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5186/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)

async function traceLine(page, n) {
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 8 && cells.length < n; row++) { const cols = row % 2 ? [3,4,5,6,7,8] : [8,7,6,5,4,3]; for (const col of cols) { if (cells.length < n) cells.push([col, row]) } }
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(40) }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ---------- DESKTOP 1440 ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: 'abyss-desktop-entry.png' })
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)
  await traceLine(page, 12)
  await wait(300)
  await page.screenshot({ path: 'abyss-desktop-plot.png' })
  // switch to HADAL TRENCH to show bg recolor
  await clickText(page, /HADAL TRENCH/)
  await wait(300)
  await page.screenshot({ path: 'abyss-desktop-hadal.png' })
  // switch to REEF SHELF
  await clickText(page, /REEF SHELF/)
  await wait(300)
  await page.screenshot({ path: 'abyss-desktop-reef.png' })
  // run the line
  await clickText(page, /^RUN THE LINE/)
  await wait(600)
  await page.screenshot({ path: 'abyss-desktop-reveal.png' })
  await wait(4000)
  const res = await page.evaluate(() => /SECURED/i.test(document.body.innerText) ? 'WON' : /RUGGED/i.test(document.body.innerText) ? 'BUST' : '?')
  await page.screenshot({ path: 'abyss-desktop-settled.png' })
  console.log('desktop settle:', res)
  await page.close()
}

// ---------- MOBILE 412 ----------
{
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(600)
  await page.screenshot({ path: 'abyss-mobile-entry.png' })
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)
  await traceLine(page, 10)
  await wait(300)
  await page.screenshot({ path: 'abyss-mobile-plot.png', fullPage: true })
  await page.close()
}

await browser.close()
console.log('done')
