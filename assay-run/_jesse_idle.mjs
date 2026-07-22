import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, rs) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button')].find(x => r.test((x.textContent||'').trim()))
  if (b){ b.click(); return {found:true, disabled:b.disabled} } return {found:false}
}, rs)
const browser = await puppeteer.launch({ executablePath: EXE, headless:'new', defaultViewport:null })
const page = await browser.newPage()
await page.setViewport({ width:1440, height:900, deviceScaleFactor:1 })
await page.goto(URL,{waitUntil:'load'})
await page.evaluate(()=>{try{localStorage.clear()}catch{}})
await page.reload({waitUntil:'load'}); await wait(700)
await page.screenshot({path:OUT+'j0_lobby.png'})
console.log('enter:', await clickText(page,'ENTER THE DIVE'))
await wait(700)
await page.screenshot({path:OUT+'j1_dive_idle.png'})
const geo = await page.evaluate(()=>{ const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left, top:r.top, w:r.width, h:r.height} })
console.log('geo', JSON.stringify(geo))
console.log('body', (await page.evaluate(()=>document.body.innerText)).slice(0,700))
await page.close(); await browser.close()
