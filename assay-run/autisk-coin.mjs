import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null})
const page=(await b.pages())[0]
await page.goto('http://localhost:5192/',{waitUntil:'networkidle2'}); await wait(400)
const r=await page.evaluate(async()=>{
  const base='http://localhost:5192/@fs/C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/originals/assay/assets/coin-dormant-v2.png'
  const img=new Image(); img.src=base
  try{await img.decode()}catch(e){return{err:String(e)}}
  const cv=document.createElement('canvas'); cv.width=img.naturalWidth; cv.height=img.naturalHeight
  const cx=cv.getContext('2d'); cx.drawImage(img,0,0)
  const p=(x,y)=>{const d=cx.getImageData(x,y,1,1).data;return[d[0],d[1],d[2],d[3]]}
  const w=cv.width,h=cv.height
  // scan alpha histogram of corners region
  let transp=0,opaque=0,samp=0
  for(let y=0;y<40;y++)for(let x=0;x<40;x++){const a=cx.getImageData(x,y,1,1).data[3];samp++;if(a<16)transp++;else if(a>240)opaque++}
  return{w,h,tl:p(3,3),tr:p(w-4,3),bl:p(3,h-4),center:p(w>>1,h>>1),cornerTranspFrac:(transp/samp).toFixed(2),cornerOpaqueFrac:(opaque/samp).toFixed(2)}
})
console.log(JSON.stringify(r))
fs.writeFileSync('shots-autisk-hero-0704/coin-alpha.json',JSON.stringify(r,null,2))
await b.close()
