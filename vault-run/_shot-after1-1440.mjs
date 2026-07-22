import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = ms => new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false};return true}
const browser = await puppeteer.launch({executablePath:CHROME, headless:'new'})
const page = await browser.newPage()
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto('http://localhost:5181/', {waitUntil:'networkidle0'})
await wait(600)
await clickText(page,'got it'); await clickText(page,'skip'); await wait(150)
await clickText(page,'ape in'); await wait(700)
await page.screenshot({path:'shots-fix-0705-after1-1440.png'})
const data = await page.evaluate(() => {
  const yb = document.querySelector('[data-testid="vault-betentry-yourbet"]')
  const win = yb ? yb.querySelector('div') : null
  function info(sel){const el=document.querySelector(sel); if(!el) return null; const r=el.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}}
  return {
    world: info('[data-testid="vault-betentry-world"]'),
    yourbet: info('[data-testid="vault-betentry-yourbet"]'),
    confirm: info('[data-testid="vault-betentry-confirm"]'),
    right: info('[data-testid="vault-betentry-right"]'),
  }
})
console.log(JSON.stringify(data,null,2))
await browser.close()
