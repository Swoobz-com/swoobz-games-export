import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser=await puppeteer.launch({executablePath:EXE,headless:'new',defaultViewport:null,args:['--autoplay-policy=no-user-gesture-required']})
const page=(await browser.pages())[0]
await page.setViewport({width:1920,height:1080,deviceScaleFactor:1})
await page.goto('http://localhost:5182/',{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,700))
await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/ENTER THE ASSAY/.test(b.textContent||''));b&&b.click()})
await new Promise(r=>setTimeout(r,600))
const res=await page.evaluate(()=>{
  const c=document.querySelector('canvas'); const ctx=c.getContext('2d')
  const w=c.width,h=c.height; const d=ctx.getImageData(0,0,w,h).data
  let cyan=0, jade=0, warm=0, tot=0, bluedom=0
  for(let i=0;i<d.length;i+=16){ // sample every 4th px
    const r=d[i],g=d[i+1],b=d[i+2],a=d[i+3]; if(a<20)continue; tot++
    if(b>r && b>=g && b>120) bluedom++              // blue-dominant bright = cyan/blue signature
    if(b>r+30 && b>g+10 && b>140) cyan++            // true cyan (blue clearly top, bright)
    if(g>r && g>b && g>110 && (g-b)>20) jade++      // jade green-teal (green top, some blue)
    if(r>=g && r>90) warm++                         // warm gold/brown
  }
  return {tot,cyan,jade,warm,bluedom, cyanPct:(cyan/tot*100).toFixed(3), jadePct:(jade/tot*100).toFixed(2), warmPct:(warm/tot*100).toFixed(1)}
})
console.log(JSON.stringify(res))
await browser.close()
