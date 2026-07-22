import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const R=n=>Math.round(n)
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'],defaultViewport:null})
const p=await b.newPage();await p.setViewport({width:1440,height:900,deviceScaleFactor:2})
await p.goto(URL,{waitUntil:'load'});await wait(1400)
// sub region approx desktop (388,770) in css px -> crop a 220x180 box around it
await p.screenshot({path:'crop-sub.png',clip:{x:R(300),y:R(700),width:R(240),height:R(180)}})
// bottom treasure region
await p.screenshot({path:'crop-treasure.png',clip:{x:R(380),y:R(800),width:R(700),height:R(90)}})
await b.close();console.log('done')
