import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tapText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find((b)=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if(!el) return false
  const box = await el.evaluate((e)=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})
  await page.mouse.click(box.x, box.y); return true
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required','--window-size=1500,1000'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(500)
console.log('LOBBY:', JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent?.trim()).filter(Boolean))))
await tapText(page,'ENTER THE DIVE'); await wait(500)
console.log('AFTER DIVE:', JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.textContent?.trim()).filter(Boolean))))
const bodyText = await page.evaluate(()=>document.body.innerText)
console.log('COPY lines:', JSON.stringify(bodyText.split('\n').filter(l=>/connect|free|tap any/i.test(l))))
console.log('CANVAS:', JSON.stringify(await page.evaluate(()=>{const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,width:r.width,height:r.height,count:document.querySelectorAll('canvas').length}})))
await browser.close()
