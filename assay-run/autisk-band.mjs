import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null,args:['--force-device-scale-factor=1']})
const page=(await b.pages())[0]
await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
await page.goto('http://localhost:5192/',{waitUntil:'networkidle2'}); await wait(700)
await (await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')))).asElement().click()
await wait(600)
// screenshot then read pixels from the PNG via canvas in-page: draw full viewport? Instead use page.screenshot to buffer and decode in-page.
const shot = await page.screenshot({encoding:'base64'})
const res = await page.evaluate(async(b64)=>{
  const img=new Image(); img.src='data:image/png;base64,'+b64; await img.decode()
  const cv=document.createElement('canvas'); cv.width=img.width; cv.height=img.height
  const cx=cv.getContext('2d'); cx.drawImage(img,0,0)
  function scan(x0,y0,dx,dy,n){ const out=[]; for(let i=0;i<n;i++){const d=cx.getImageData(x0+dx*i,y0+dy*i,1,1).data; out.push([d[0],d[1],d[2]])} return out }
  // backdrop diagonal: from far dark corner (60,900) toward center panel edge (560,400)
  const backdrop = scan(60,940,3,-3,160)
  // board bg between coins: horizontal scan across board at a gap row. board approx x 600..1320 y~ pick a gap between rows. Use y=250 (a row gap)
  const boardrow = scan(605,250,4,0,170)
  // measure run-length banding on a single channel (blue) for backdrop
  function bandStats(arr,ch){ let runs=[],cur=1; for(let i=1;i<arr.length;i++){ if(arr[i][ch]===arr[i-1][ch])cur++; else {runs.push(cur);cur=1} } runs.push(cur); const max=Math.max(...runs); const long=runs.filter(r=>r>=4).length; return {maxRun:max,runsGE4:long,distinct:new Set(arr.map(a=>a[ch])).size,n:arr.length} }
  return { backdropSample:backdrop.filter((_,i)=>i%20===0), backdropBandB:bandStats(backdrop,2), backdropBandR:bandStats(backdrop,0), boardBandB:bandStats(boardrow,2), boardSample:boardrow.filter((_,i)=>i%20===0) }
}, shot)
console.log(JSON.stringify(res,null,2))
fs.writeFileSync('shots-autisk-hero-0704/banding.json',JSON.stringify(res,null,2))
await b.close()
