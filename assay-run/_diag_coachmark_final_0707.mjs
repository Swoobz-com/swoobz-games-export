import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function check(vp, name) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear() } catch(e){} })
  await page.reload({ waitUntil: 'load' })
  await wait(600)
  const dump = await page.evaluate(() => {
    const key = localStorage.getItem('assay_coachmark_seen_v1')
    const bodyTxt = document.body.innerText
    return { seenKey: key, hasPaintCopy: /PAINT a line/i.test(bodyTxt), hasAllOrNothing: /ALL-OR-NOTHING/i.test(bodyTxt), hasRunLineCopy: /RUN THE LINE to commit/i.test(bodyTxt) }
  })
  console.log(name, JSON.stringify(dump))
  await page.screenshot({ path: `shots-coachmark-final-0707/${name}.png` })
  // try dismiss via any button whose text looks like a dismiss/got-it/skip control anywhere on page
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(t=>t.length && t.length<40))
  console.log(name, 'all short buttons:', JSON.stringify(btns))
  await browser.close()
}
import fs from 'fs'
fs.mkdirSync('shots-coachmark-final-0707', {recursive:true})
await check({width:1440,height:900,deviceScaleFactor:1}, 'desktop')
await check({width:412,height:915,deviceScaleFactor:2}, 'pixel7')
