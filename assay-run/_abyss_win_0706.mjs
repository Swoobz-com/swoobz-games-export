import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-abyss-win-0706'
fs.mkdirSync(OUT, { recursive: true })
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, re.source)
async function boardGeo(page){ return page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width } }) }
async function trace(page, cells){
  const geo = await boardGeo(page); const TILE = geo.w/14
  for(const [col,row] of cells){ await page.mouse.click(geo.left+col*TILE+TILE/2, geo.top+row*TILE+TILE/2); await wait(25) }
}
const line8 = [[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3]]

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

let won=false
for(let a=0; a<12 && !won; a++){
  await page.goto(URL, { waitUntil: 'load' }); await wait(600)
  await clickText(page, /ENTER THE DIVE/); await wait(300)
  await clickText(page, /REEF/); await wait(200) // fewest bombs = 6
  await trace(page, line8); await wait(150)
  // keep DISC-BY-DISC pace so the run plays out and we can watch the settle bloom
  await clickText(page, /^RUN THE LINE/); await wait(80)
  // dense capture the whole run+settle
  const frames=[]
  for(let i=0;i<28;i++){ await page.screenshot({ path: `${OUT}/a${a}-f${String(i).padStart(2,'0')}.png` }); await wait(90) }
  const txt = await page.evaluate(()=>document.body.innerText)
  const res = /SECURED THE HAUL/i.test(txt)?'WON':/RUGGED/i.test(txt)?'BUST':'?'
  console.log('attempt',a,res)
  if(res==='WON'){ won=true; console.log('WON on attempt',a) }
  else { // clear frames of a failed attempt to save space
    for(let i=0;i<28;i++){ try{ fs.unlinkSync(`${OUT}/a${a}-f${String(i).padStart(2,'0')}.png`) }catch(e){} }
  }
}
console.log('done win, won=',won)
await browser.close()
