import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-jesse-abyss-0706'
const clickText = (page, rs) => page.evaluate((s) => {
  const r = new RegExp(s, 'i')
  const b = [...document.querySelectorAll('button, div, span')].find(x => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return true } return false
}, rs)
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage()
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await page.goto(URL, { waitUntil: 'load', timeout: 60000 }); await wait(800)
await clickText(page, 'ENTER THE DIVE'); await wait(500)
await page.evaluate(() => { const x=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='×'); if(x)x.click() }); await wait(300)
// canvas geometry on mobile
const geo = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {left:r.left,top:r.top,w:r.width,h:r.height} })
console.log('mobile canvas', JSON.stringify(geo))
// tap a snake through the visible window: 4 cols x 4 rows within the canvas top area
const cols = [0.18,0.38,0.58,0.78].map(f=>geo.left+f*geo.w)
const rowsY = [0.13,0.26,0.39,0.52].map(f=>geo.top+f*geo.h)
const order = []
for (let ri=0; ri<rowsY.length; ri++){ const cc = ri%2? [...cols].reverse():cols; for(const cx of cc) order.push([cx, rowsY[ri]]) }
for (let i=0;i<8 && i<order.length;i++){ await page.touchscreen.tap(order[i][0], order[i][1]); await wait(120) }
await wait(400)
await page.screenshot({ path: OUT + '/m-armed.png' })
const t = await page.evaluate(()=>{ let b=''; for(const e of document.querySelectorAll('*')){ if((e.textContent||'').trim().startsWith('TO WIN')&&e.getBoundingClientRect().width<360){b=e.textContent.trim().replace(/\s+/g,' ');break} } const cta=[...document.querySelectorAll('button')].map(x=>x.textContent.trim()).find(x=>/RUN THE LINE|SECURED/i.test(x)); return {toWin:b, cta} })
console.log('MOBILE ARMED:', JSON.stringify(t))
await browser.close(); console.log('done')
