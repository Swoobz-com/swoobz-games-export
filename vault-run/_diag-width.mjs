import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = ms => new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false};return true}
const browser = await puppeteer.launch({executablePath:CHROME, headless:false, args:['--window-size=1200,1100']})
const page = await browser.newPage()
await page.setViewport({width:1000,height:900,deviceScaleFactor:1})
await page.goto('http://localhost:5181/', {waitUntil:'networkidle0'})
await wait(600)
await clickText(page,'got it'); await clickText(page,'skip'); await wait(150)
await clickText(page,'ape in'); await wait(900)
const data = await page.evaluate(() => {
  const de = document.documentElement
  const body = document.body
  const root = document.getElementById('root')
  const right = document.querySelector('[data-testid="vault-betentry-right"]')
  const shell = document.querySelector('[data-testid="vault-canvas-shell"]') || document.querySelector('.vault-canvas-shell')
  function rectOf(el){ if(!el) return null; const r=el.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height),x:Math.round(r.x)} }
  return {
    innerWidth: window.innerWidth,
    deClientWidth: de.clientWidth,
    bodyClientWidth: body.clientWidth,
    deScrollHeight: de.scrollHeight,
    bodyScrollHeight: body.scrollHeight,
    innerHeight: window.innerHeight,
    rootRect: rectOf(root),
    rightRect: rectOf(right),
    shellFound: !!shell,
    shellRect: rectOf(shell),
  }
})
console.log(JSON.stringify(data,null,2))
await wait(120000)
await browser.close()
