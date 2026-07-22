import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--window-size=1460,960'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
let done = false
for (let attempt = 0; attempt < 15 && !done; attempt++) {
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
  await wait(400)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /ENTER THE ASSAY LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(250)
  await page.evaluate(() => { const h = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /TEMPLE DEPTH/i.test(e.textContent || '')); let c = h?.parentElement; for (let i = 0; i < 4 && c; i++) { const btns = [...c.querySelectorAll('button')]; if (btns.length >= 2) { btns[0].click(); return } c = c.parentElement } })
  await wait(120)
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14
  const cells = []
  for (let row = 3; row <= 7; row++) { const cols = row % 2 ? [3,4,5,6,7] : [7,6,5,4,3]; for (const col of cols) cells.push([col, row]) }
  for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); await wait(30) }
  await wait(200)
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /RUN THE LINE/i.test(x.textContent || '')); b && b.click() })
  await wait(700) // mid-reveal
  await page.screenshot({ path: 'shots-codotty-midreveal.png' })
  await wait(3500) // settle
  const res = await page.evaluate(() => /CLAIMED/i.test(document.body.innerText) ? 'WON' : /BUST/i.test(document.body.innerText) ? 'BUST' : '?')
  await page.screenshot({ path: 'shots-codotty-settled.png' })
  console.log('attempt', attempt, res)
  if (res === 'WON') done = true
}
await browser.close()
