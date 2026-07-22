import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => { try { localStorage.clear() } catch (e) {} })
await page.reload({ waitUntil: 'load' })
await wait(500)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE DIVE')); if(b) b.click() })
await wait(400)
const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const tile = box.w/14
for (let row=0; row<14; row++) {
  const x = box.x + 3*tile + tile/2
  const y = box.y + row*tile + tile/2
  const el = await page.evaluate((x,y) => { const e=document.elementFromPoint(x,y); return e? e.tagName+ (e.className? '.'+e.className:'') : null }, x, y)
  console.log('row',row,'y',Math.round(y),'el:',el)
}
// Now paint 8 tiles across cols 2-9 at row 5, slower cadence, verify each click's incremental effect
console.log('--- painting row5 cols2-9 at 80ms cadence ---')
for (const col of [2,3,4,5,6,7,8,9]) {
  const x = box.x + col*tile + tile/2
  const y = box.y + 5*tile + tile/2
  await page.mouse.click(x,y)
  await wait(80)
  const more = await page.evaluate(() => document.body.innerText.match(/Select\s+(\d+)\s+more/)?.[1] ?? 'ARMED/gone')
  console.log('after col',col,'more-remaining:',more)
}
await browser.close()
