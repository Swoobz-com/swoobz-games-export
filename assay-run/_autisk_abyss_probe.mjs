import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL=process.env.URL||'http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE, headless:false, args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'], defaultViewport:null})
const p=await b.newPage()
await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
await p.goto(URL,{waitUntil:'load',timeout:60000})
await wait(1500)
const info=await p.evaluate(()=>{
  const txt=(document.body.innerText||'').replace(/\n+/g,' | ').slice(0,1200)
  // sample scene bg via a canvas readback of the page? just report presence of canvas/svg
  const cvs=[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,cw:c.clientWidth,ch:c.clientHeight}))
  const svgs=document.querySelectorAll('svg').length
  const imgs=[...document.querySelectorAll('img')].map(i=>i.src).slice(0,8)
  const vids=document.querySelectorAll('video').length
  // top-left corner bg color
  const bg=getComputedStyle(document.body).backgroundColor
  return {txt, canvases:cvs, svgs, imgs, vids, bodyBg:bg}
})
console.log('URL',URL)
console.log('BODYBG',info.bodyBg,'CANVAS',JSON.stringify(info.canvases),'SVGS',info.svgs,'VIDS',info.vids)
console.log('IMGS',JSON.stringify(info.imgs))
console.log('TEXT>>>',info.txt)
await p.screenshot({path:'_autisk_abyss_entry_probe.png'})
await b.close()
console.log('done')
