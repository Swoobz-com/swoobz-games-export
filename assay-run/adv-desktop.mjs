import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL=process.argv[2]||'http://localhost:5197/'
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
const browser=await puppeteer.launch({executablePath:EXE,headless:'new'})
const page=await browser.newPage()
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); page.on('pageerror',e=>errs.push('pageerror:'+e.message))
await page.setViewport({width:1440,height:900,deviceScaleFactor:1})
await page.goto(URL,{waitUntil:'networkidle2',timeout:60000}); await wait(600)
const wm=await page.evaluate(()=>{const el=[...document.querySelectorAll('span')].find(s=>s.textContent.trim()==='SWOOBZ');if(!el)return null;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),topClear:r.y>=0,leftClear:r.x>=0,rightClear:r.x+r.width<=innerWidth,overflow:cs.overflow,text:el.textContent}})
console.log('1440 SWOOBZ wordmark:',JSON.stringify(wm))
await page.screenshot({path:'shots-punchlist/verotty-1440-lobby.png'})
console.log('errors:',errs.length?errs.join('|'):'(none)')
await browser.close()
