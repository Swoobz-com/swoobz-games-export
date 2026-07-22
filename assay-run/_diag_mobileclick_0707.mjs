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
console.log('box', JSON.stringify(box))
const tile = box.w/14
for (const row of [2,4,6,8]) {
  const x = box.x + 3*tile + tile/2
  const y = box.y + row*tile + tile/2
  const el = await page.evaluate((x,y) => { const e=document.elementFromPoint(x,y); return e? {tag:e.tagName, cls: e.className, id:e.id} : null }, x, y)
  console.log('row',row,'coord',Math.round(x),Math.round(y),'elementFromPoint:', JSON.stringify(el))
}
// now try a real click at row6 col3 and see trail state before/after
const before = await page.evaluate(() => document.body.innerText.match(/Select\s+(\d+)\s+more/)?.[1] ?? 'none')
await page.mouse.click(box.x+3*tile+tile/2, box.y+6*tile+tile/2)
await wait(150)
const after = await page.evaluate(() => document.body.innerText.match(/Select\s+(\d+)\s+more/)?.[1] ?? 'none')
console.log('before more-count:', before, 'after 1 click at row6 col3:', after)
await browser.close()
