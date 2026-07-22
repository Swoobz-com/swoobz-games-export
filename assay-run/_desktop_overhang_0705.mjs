import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=(await browser.pages())[0]
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto('http://localhost:5182/',{waitUntil:'networkidle2'})
await new Promise(r=>setTimeout(r,600))
const m=await page.evaluate(()=>{
  const vw=innerWidth
  // desktop temple svgs use viewBox 0 0 1440 900
  const svgs=[...document.querySelectorAll('svg')].filter(s=>s.getAttribute('viewBox')==='0 0 1440 900')
  const paths=[]
  for(const s of svgs){for(const p of s.querySelectorAll('path')){const r=p.getBoundingClientRect();paths.push({left:Math.round(r.left),right:Math.round(r.right)})}}
  const maxRight=Math.max(...paths.map(p=>p.right))
  const minLeft=Math.min(...paths.map(p=>p.left))
  const sw=document.documentElement.scrollWidth
  return {vw,sw,overflowX:sw>vw+1,maxRight,minLeft,pastRight:maxRight-vw}
})
console.log(JSON.stringify(m))
await browser.close()
