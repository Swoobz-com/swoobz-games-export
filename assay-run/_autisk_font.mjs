import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'],defaultViewport:null})
const p=await b.newPage();await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
await p.goto(URL,{waitUntil:'load'});await wait(1400)
const d=await p.evaluate(()=>{
  // walk to the deepest element whose OWN text (not children) contains 'claim line'
  const all=[...document.querySelectorAll('body *')]
  const hit=all.filter(e=>{
    const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('')
    return /Trace a claim line|runs ducat-to-ducat/i.test(own)
  }).map(e=>{const cs=getComputedStyle(e);return {tag:e.tagName,cls:(e.className||'').toString().slice(0,40),ff:cs.fontFamily,fs:cs.fontSize,own:[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim().slice(0,50)}})
  // also check a known-good label font for comparison
  const bal=all.find(e=>{const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');return /^BALANCE$/i.test(own.trim())})
  const balf=bal?getComputedStyle(bal).fontFamily:null
  // document.fonts loaded?
  const loaded=[...document.fonts].map(f=>f.family+':'+f.status)
  return {hit,balf,loaded:loaded.slice(0,12)}
})
console.log(JSON.stringify(d,null,1))
await b.close()
