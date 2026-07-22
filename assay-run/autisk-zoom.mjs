import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5192/'
const OUT = 'shots-autisk-hero-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null,
  args: ['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1'] })
const page = (await browser.pages())[0]
const clickText = async (txt) => { const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find(b=>b.textContent&&b.textContent.includes(t))||null, txt); const el=h.asElement(); if(!el) return false; await el.click(); return true }
await page.setViewport({width:1920,height:1080,deviceScaleFactor:2})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(700)
// coin alpha probe: find served URL from the img the app decodes — grab via performance entries after board draws
const coin = await page.evaluate(async ()=>{
  const entries = performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/coin-dormant-v2/.test(n))
  let url = entries[0]
  if(!url) return {err:'no url', entries: performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/\.png/.test(n)).slice(0,10)}
  const img = new Image(); img.crossOrigin='anonymous'; img.src=url
  try{ await img.decode() }catch(e){ return {err:String(e), url} }
  const cv=document.createElement('canvas'); cv.width=img.naturalWidth; cv.height=img.naturalHeight
  const cx=cv.getContext('2d'); cx.drawImage(img,0,0)
  const p=(x,y)=>{const d=cx.getImageData(x,y,1,1).data; return [d[0],d[1],d[2],d[3]]}
  const w=cv.width,h=cv.height
  return {url,w,h, corner_tl:p(3,3), corner_tr:p(w-4,3), mid_left:p(3,h>>1), center:p(w>>1,h>>1)}
})
fs.writeFileSync(`${OUT}/coin-alpha.json`, JSON.stringify(coin,null,2))
console.log('COIN', JSON.stringify(coin).slice(0,400))
// header numerals zoom (deviceScaleFactor 2 => clip in CSS px)
await page.screenshot({path:`${OUT}/header-zoom.png`, clip:{x:590,y:60,width:740,height:70}})
// lobby wordmark zoom
await page.screenshot({path:`${OUT}/wordmark-zoom.png`, clip:{x:820,y:880,width:290,height:70}})
// enter planning, grab THROW BREAKER button + status line zoom
await clickText('ENTER THE ASSAY LINE'); await wait(500)
await page.screenshot({path:`${OUT}/breaker-zoom.png`, clip:{x:590,y:865,width:740,height:80}})
await browser.close()
