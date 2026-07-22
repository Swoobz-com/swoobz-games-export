import puppeteer from 'puppeteer-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = ms => new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(lc))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch(e){return false};return true}
const browser = await puppeteer.launch({executablePath:CHROME, headless:'new'})
const page = await browser.newPage()
await page.setViewport({width:1000,height:900,deviceScaleFactor:1})
await page.goto('http://localhost:5181/', {waitUntil:'networkidle0'})
await wait(600)
await clickText(page,'got it'); await clickText(page,'skip'); await wait(150)
await clickText(page,'ape in'); await wait(700)
const data = await page.evaluate(() => {
  function r(el){ if(!el) return null; const rc=el.getBoundingClientRect(); return {w:Math.round(rc.width),h:Math.round(rc.height)} }
  const yb = document.querySelector('[data-testid="vault-betentry-yourbet"]')
  const window_ = yb.children[1]
  const btns = window_.querySelectorAll('button')
  const valueSpan = window_.children[1]
  return {
    yourbetRect: r(yb),
    windowRect: r(window_),
    btn1: r(btns[0]),
    btn2: r(btns[1]),
    valueRect: r(valueSpan),
    valueText: valueSpan.textContent,
    valueHTML: valueSpan.outerHTML.slice(0,300),
  }
})
console.log(JSON.stringify(data,null,2))
await browser.close()
