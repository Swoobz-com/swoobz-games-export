import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'autisk-reverify-0706'
mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, rs) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent||'').trim()) && (x.tagName==='BUTTON' || getComputedStyle(x).cursor==='pointer'))
  if (b) { b.click(); return true } return false
}, rs)
async function traceLine(page, n) {
  const geo = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,w:r.width} })
  const TILE = geo.w/14; const cells=[]
  for (let row=3; row<=9 && cells.length<n; row++){ const cols = row%2?[3,4,5,6,7,8]:[8,7,6,5,4,3]; for(const col of cols){ if(cells.length<n) cells.push([col,row]) } }
  for (const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(45) }
}
const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null,
  args:['--autoplay-policy=no-user-gesture-required','--window-size=1500,1000'] })

// DESKTOP
{
  const page = await browser.newPage()
  await page.setViewport({ width:1440, height:900, deviceScaleFactor:1 })
  await page.goto(URL, { waitUntil:'load', timeout:60000 })
  await wait(1200)
  await page.screenshot({ path:`${OUT}/d1-entry.png` })
  // sample entry text colors
  const entryTxt = await page.evaluate(() => document.body.innerText.slice(0,600))
  console.log('ENTRY TEXT:\n', entryTxt)
  await clickText(page, 'ENTER THE DIVE')
  await wait(500)
  // disabled CTA state: select just 1 cell
  await traceLine(page, 1)
  await wait(250)
  await page.screenshot({ path:`${OUT}/d2-plot-1cell-disabledCTA.png` })
  const ctaTxt = await page.evaluate(() => {
    const btns=[...document.querySelectorAll('button')].map(b=>({t:(b.textContent||'').trim(), dis:b.disabled, bg:getComputedStyle(b).backgroundColor})).filter(x=>x.t)
    return btns
  })
  console.log('CTA BUTTONS (1 cell):', JSON.stringify(ctaTxt))
  await traceLine(page, 12)
  await wait(300)
  await page.screenshot({ path:`${OUT}/d3-plot-12cell.png` })
  // run until a WON to see teal banner + secondary cta
  let res='?'
  for (let attempt=0; attempt<8 && res!=='WON'; attempt++){
    await clickText(page, '^RUN THE LINE')
    await wait(5000)
    res = await page.evaluate(() => /SECURED/i.test(document.body.innerText)?'WON':/RUGGED|RUG|BUST/i.test(document.body.innerText)?'BUST':'?')
    if (res==='WON'){ await page.screenshot({ path:`${OUT}/d4-settled-WON.png` }); break }
    else { await page.screenshot({ path:`${OUT}/d4-settled-${res}-a${attempt}.png` })
      // replay
      await clickText(page, 'SAME LINE|DIVE AGAIN|NEW LINE|PLAY AGAIN|AGAIN')
      await wait(600); await traceLine(page, 12); await wait(300) }
  }
  console.log('DESKTOP settle result:', res)
  // dump settled buttons + banner color
  const settled = await page.evaluate(() => {
    const btns=[...document.querySelectorAll('button')].map(b=>({t:(b.textContent||'').trim(),bg:getComputedStyle(b).backgroundColor,col:getComputedStyle(b).color})).filter(x=>x.t)
    return { txt: document.body.innerText.slice(0,400), btns }
  })
  console.log('SETTLED:', JSON.stringify(settled))
  await page.close()
}
// MOBILE pixel7 412
{
  const page = await browser.newPage()
  await page.setViewport({ width:412, height:915, deviceScaleFactor:2, isMobile:true, hasTouch:true })
  await page.goto(URL, { waitUntil:'load', timeout:60000 })
  await wait(1200)
  await page.screenshot({ path:`${OUT}/m1-entry.png` })
  await clickText(page, 'ENTER THE DIVE')
  await wait(500)
  await traceLine(page, 6)
  await wait(300)
  await page.screenshot({ path:`${OUT}/m2-plot.png`, fullPage:true })
  await page.close()
}
await browser.close()
console.log('done ->', OUT)
