import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch (e) {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE DIVE')); if(b) b.click() })
await wait(400)
const chips = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  return btns.map((b,i)=>({i, text: b.textContent.trim(), rect: (()=>{const r=b.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}})() })).filter(x=>x.text.length<8)
})
console.log(JSON.stringify(chips, null, 2))
// try clicking the button whose EXACT trimmed text is '5'
const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '5')
  if (b) { b.click(); return true }
  return false
})
await wait(150)
const betLabel = await page.evaluate(() => {
  const label = [...document.querySelectorAll('div')].find(d => d.children.length===0 && d.textContent === 'YOUR BET')
  return label && label.parentElement ? label.parentElement.textContent : null
})
console.log('clicked exact-5:', clicked, 'betLabel after:', betLabel)
await browser.close()
