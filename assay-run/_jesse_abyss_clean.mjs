import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-jesse-abyss-0706'
const clickText = (page, rs) => page.evaluate((s) => {
  const r = new RegExp(s, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, rs)
const dismissCoach = (page) => page.evaluate(() => {
  // find the × close button on the coachmark
  const x = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '×')
  if (x) { x.click(); return true } return false
})
async function trace(page, n) {
  const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } })
  const TILE = geo.w / 14; const cells = []
  for (let row = 3; row <= 8; row++) { const cols = row % 2 ? [3,4,5,6,7,8,9] : [9,8,7,6,5,4,3]; for (const col of cols) cells.push([col, row]) }
  for (let i = 0; i < n && i < cells.length; i++) { const [c,r]=cells[i]; await page.mouse.click(geo.left+c*TILE+TILE/2, geo.top+r*TILE+TILE/2); await wait(70) }
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })

// DESKTOP clean TO WIN
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 }); await wait(800)
  await clickText(page, 'ENTER THE DIVE'); await wait(500)
  const dismissed = await dismissCoach(page); await wait(300)
  console.log('coach dismissed:', dismissed)
  await trace(page, 8); await wait(400)
  await page.screenshot({ path: OUT + '/h-towin-clean.png' })
  // crop TO WIN panel region (board header right side)
  await page.screenshot({ path: OUT + '/h-towin-crop.png', clip: { x: 560, y: 150, width: 640, height: 180 } })
  // reload to check coachmark reappears
  await page.reload({ waitUntil: 'load' }); await wait(800)
  await clickText(page, 'ENTER THE DIVE'); await wait(600)
  const coachBack = await page.evaluate(() => /TRACE a claim line/i.test(document.body.innerText))
  console.log('coach reappears after reload:', coachBack)
  await page.close()
}
// MOBILE
{
  const page = await browser.newPage()
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'load', timeout: 60000 }); await wait(800)
  await page.screenshot({ path: OUT + '/m-entry.png' })
  await clickText(page, 'ENTER THE DIVE'); await wait(500)
  await page.screenshot({ path: OUT + '/m-idle.png' })
  await dismissCoach(page); await wait(300)
  // trace 8 on mobile board (may be scaled/pan)
  await trace(page, 8); await wait(400)
  await page.screenshot({ path: OUT + '/m-plot8.png' })
  console.log('MOBILE body:', await page.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,300)))
  await page.close()
}
await browser.close(); console.log('done')
