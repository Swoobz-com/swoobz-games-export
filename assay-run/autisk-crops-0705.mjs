import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'shots-autisk-premium-0705'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => [...document.querySelectorAll('button')].find(x=>x.textContent&&x.textContent.includes(t))||null, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const R = (v)=>Math.round(v)
const browser = await puppeteer.launch({ executablePath: EXE, headless:false, defaultViewport:null,
  args:['--autoplay-policy=no-user-gesture-required','--window-size=1560,1020'] })
const page = (await browser.pages())[0]
await page.setViewport({ width:1440, height:900, deviceScaleFactor:2 })
await page.goto(URL, { waitUntil:'networkidle2', timeout:60000 })
await wait(900)
const clip=(x,y,w,h)=>({x:R(x),y:R(y),width:R(w),height:R(h)})
// lobby crops
await page.screenshot({ path:`${OUT}/crop-lobby-LEFTsconce.png`, clip:clip(360,80,140,140) })
await page.screenshot({ path:`${OUT}/crop-lobby-LEFTmargin-temple.png`, clip:clip(0,20,300,620) })
await page.screenshot({ path:`${OUT}/crop-lobby-LEFTdressing.png`, clip:clip(10,400,220,180) })
await page.screenshot({ path:`${OUT}/crop-lobby-RIGHTmargin.png`, clip:clip(1140,20,300,620) })
await page.screenshot({ path:`${OUT}/crop-lobby-topcorners.png`, clip:clip(300,20,880,120) })
// avg-RGB sampler over several boxes to judge tonal range + banding
const samp = await page.evaluate(()=>{
  return new Promise(res=>{
    const c=document.createElement('canvas');c.width=window.innerWidth;c.height=window.innerHeight
    // can't read cross to CSS bg easily; use html2canvas-free approach: sample via elementsFromPoint colors not possible.
    res('n/a')
  })
})
// planning crops
await clickText(page,'ENTER THE ASSAY LINE'); await wait(800)
await page.screenshot({ path:`${OUT}/crop-plan-DIAL.png`, clip:clip(895,340,240,180) })
await page.screenshot({ path:`${OUT}/crop-plan-RUNbtn.png`, clip:clip(895,705,235,70) })
await page.screenshot({ path:`${OUT}/crop-plan-board-TLvsBR.png`, clip:clip(300,95,540,560) })
await browser.close()
console.log('crops done')
