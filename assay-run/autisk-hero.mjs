import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5192/'
const OUT = 'shots-autisk-hero-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null,
  args: ['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1'] })
const page = (await browser.pages())[0]
const clickText = async (txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const bodyText = () => page.evaluate(()=>document.body.innerText)
const canvasBox = () => page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const rectOf = (needle) => page.evaluate((n)=>{ const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent&&e.textContent.trim()===n); if(!el) return null; let p=el; for(let i=0;i<4&&p;i++)p=p.parentElement; const r=(p||el).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} }, needle)

await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(700)

// zoom crops in lobby/planning first
await clickText('ENTER THE ASSAY LINE'); await wait(500)
// TallyDial crop: right plate upper area. Grab canvas box for reference; right plate is to the right of center panel.
await page.screenshot({path:`${OUT}/tallydial-region.png`, clip:{x:1355,y:380,width:290,height:220}})
// left plate texture crop
await page.screenshot({path:`${OUT}/leftplate-region.png`, clip:{x:270,y:118,width:290,height:400}})

let won=false
for(let attempt=0; attempt<8 && !won; attempt++){
  // ensure planning
  const bt = await bodyText()
  if(!/THROW BREAKER/.test(bt)){ await clickText('ENTER THE ASSAY LINE'); await wait(400) }
  // clear any existing trail
  await clickText('CLEAR'); await wait(150)
  const box = await canvasBox()
  const tile = box.w/20
  // 8 contiguous tiles, avoid re-toggle
  const cells = [[5,5],[6,5],[7,5],[7,6],[7,7],[8,7],[9,7],[9,8]]
  for(const [c,r] of cells){ await page.mouse.click(box.x+c*tile+tile/2, box.y+r*tile+tile/2); await wait(45) }
  await wait(150)
  await clickText('THROW BREAKER')
  // burst capture the reveal
  const frames=[]
  for(let i=0;i<20;i++){ const p=`${OUT}/a${attempt}-burst-${String(i).padStart(2,'0')}.png`; await page.screenshot({path:p}); frames.push(p); await wait(90) }
  await wait(1200)
  const settledText = await bodyText()
  const isWin = /SECURED|PROVEN|CLAIM SECURED|coins? (secured|proven)/i.test(settledText) && !/BUST|BAD VEIN|VEIN STRUCK/i.test(settledText)
  const isBust = /BUST|BAD VEIN|VEIN STRUCK|struck a bad/i.test(settledText)
  await page.screenshot({path:`${OUT}/a${attempt}-settled.png`})
  fs.writeFileSync(`${OUT}/a${attempt}-text.txt`, settledText)
  console.log('attempt',attempt,'win?',isWin,'bust?',isBust,'::', settledText.replace(/\n/g,' | ').slice(0,180))
  if(isWin){ won=true; break }
  // ASSAY AGAIN to reset
  await clickText('ASSAY AGAIN'); await wait(500)
}
console.log('WON:',won)
await browser.close()
