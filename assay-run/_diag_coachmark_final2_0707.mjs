import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, txt) { return page.evaluate((t) => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes(t)); if(b&&!b.disabled){b.click();return true} return false }, txt) }
async function check(vp, name) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear() } catch(e){} })
  await page.reload({ waitUntil: 'load' })
  await wait(500)
  const t0 = Date.now()
  await clickText(page, 'ENTER THE DIVE')
  await wait(400)
  const withinMs = Date.now() - t0
  const dump = await page.evaluate(() => {
    const bodyTxt = document.body.innerText
    return { hasPaintCopy: /PAINT a line/i.test(bodyTxt) || /tap any tiles/i.test(bodyTxt), hasAllOrNothing: /ALL-OR-NOTHING/i.test(bodyTxt), hasRunLineCopy: /RUN THE LINE to commit/i.test(bodyTxt) }
  })
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b=>({text:b.textContent.trim().slice(0,50), rect:(()=>{const r=b.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}})()})).filter(x=>/got it|dismiss|close|skip|next|ok/i.test(x.text)))
  console.log(name, 'withinMs:', withinMs, JSON.stringify(dump), 'dismiss-like buttons:', JSON.stringify(btns))
  await page.screenshot({ path: `shots-coachmark-final-0707/${name}-planning.png` })
  if (btns.length) {
    await page.evaluate((t) => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===t); if(b) b.click() }, btns[0].text)
    await wait(200)
    const after = await page.evaluate(() => document.body.innerText.includes('ENTER THE DIVE') === false)
    console.log(name, 'dismissed, still in planning (no ENTER THE DIVE text):', after)
  }
  await browser.close()
}
await check({width:1440,height:900,deviceScaleFactor:1}, 'desktop')
await check({width:412,height:915,deviceScaleFactor:2}, 'pixel7')
