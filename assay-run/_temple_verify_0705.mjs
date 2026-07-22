import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const OUT='assay-run/shots-temple-fix-0705'
fs.mkdirSync(OUT,{recursive:true})
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=async(page,txt)=>{const h=await page.evaluateHandle(t=>{const b=[...document.querySelectorAll('button')];return b.find(x=>x.textContent&&x.textContent.includes(t))||null},txt);const el=h.asElement();if(!el)return false;await el.click();return true}
const census=page=>page.evaluate(()=>{const vw=innerWidth,vh=innerHeight;const sw=document.documentElement.scrollWidth,sh=document.documentElement.scrollHeight;return{vw,vh,sw,sh,overflowX:sw>vw+1}})

const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required',`--window-size=432,1055`]})
const page=(await browser.pages())[0]
await page.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000})
await wait(1200)
console.log('lobby census',JSON.stringify(await census(page)))
// full strip context + tight crop of the visible band above the card (card top y=33)
await page.screenshot({path:`${OUT}/lobby-top120.png`,clip:{x:0,y:0,width:412,height:120}})
await page.screenshot({path:`${OUT}/lobby-strip.png`,clip:{x:0,y:0,width:412,height:40}})
// measure occlusion: does any tower poke into PLAY SAFE region within visible strip?
const geo=await page.evaluate(()=>{
  const svg=[...document.querySelectorAll('svg')].find(s=>s.getAttribute('viewBox')==='0 0 412 158')
  const paths=svg?[...svg.querySelectorAll('path[fill]')].filter(p=>p.getAttribute('fill')&&p.getAttribute('fill')!=='none').map(p=>{const b=p.getBBox();return{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),top:Math.round(b.y),right:Math.round(b.x+b.width)}}):[]
  const ps=[...document.querySelectorAll('*')].find(e=>{const t=e.textContent&&e.textContent.trim();return t==='PLAY SAFE'&&e.children.length===0})
  const psr=ps?ps.getBoundingClientRect():null
  return {towerBBoxes:paths,playsafe:psr?{left:Math.round(psr.left),right:Math.round(psr.right),top:Math.round(psr.top),bottom:Math.round(psr.bottom)}:null}
})
console.log('geometry',JSON.stringify(geo,null,2))
await clickText(page,'ENTER THE ASSAY LINE')
await wait(1000)
console.log('planning census',JSON.stringify(await census(page)))
await page.screenshot({path:`${OUT}/planning-strip.png`,clip:{x:0,y:0,width:412,height:40}})
await browser.close()
console.log('DONE')
