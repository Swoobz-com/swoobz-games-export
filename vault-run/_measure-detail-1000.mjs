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
  function h(sel){const el=document.querySelector(sel); return el? Math.round(el.getBoundingClientRect().height): null}
  const world = document.querySelector('[data-testid="vault-betentry-world"]')
  const modeRow = world.querySelector('.vault-mode-row')
  const modeCards = [...modeRow.children].map(c=>Math.round(c.getBoundingClientRect().height))
  const rugsTuner = world.querySelector('[class]') // fallback
  return {
    worldH: h('[data-testid="vault-betentry-world"]'),
    gridHeaderH: (()=>{const g=world.querySelector('div'); return null})(),
    modeCardHeights: modeCards,
    modeRowH: Math.round(modeRow.getBoundingClientRect().height),
    yourbetH: h('[data-testid="vault-betentry-yourbet"]'),
    confirmH: h('[data-testid="vault-betentry-confirm"]'),
    rightH: h('[data-testid="vault-betentry-right"]'),
  }
})
console.log(JSON.stringify(data,null,2))
await browser.close()
