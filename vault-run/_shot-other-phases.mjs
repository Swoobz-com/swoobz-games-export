import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = ms => new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false};return true}
const browser = await puppeteer.launch({executablePath:CHROME, headless:'new'})
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto('http://localhost:5181/', {waitUntil:'networkidle0'})
await wait(600)
await clickText(page,'got it'); await clickText(page,'skip'); await wait(150)
await page.screenshot({path:'shots-fix-0705-lobby-1440.png'})
await clickText(page,'ape in'); await wait(700)
await clickText(page,'send it'); await wait(1500)
await page.screenshot({path:'shots-fix-0705-playing-1440.png'})
console.log('console errors:', JSON.stringify(errors))
await browser.close()
