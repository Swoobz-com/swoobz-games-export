import puppeteer from 'puppeteer-core'
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL='http://localhost:5182/'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
const clickText=(page,rs)=>page.evaluate((rs)=>{const r=new RegExp(rs,'i');const b=[...document.querySelectorAll('button,div,span')].find(x=>r.test((x.textContent||'').trim())&&(x.tagName==='BUTTON'||getComputedStyle(x).cursor==='pointer'));if(b){b.click();return true}return false},rs)
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox'],defaultViewport:null})
// DESKTOP overflow + wordmark
{
  const p=await b.newPage();await p.setViewport({width:1440,height:900,deviceScaleFactor:1})
  await p.goto(URL,{waitUntil:'load'});await wait(1200)
  const d=await p.evaluate(()=>{
    const de=document.documentElement
    const overflowX=de.scrollWidth-de.clientWidth
    // find wordmark: big element containing ABYSS and LINE spans
    const spans=[...document.querySelectorAll('*')].filter(e=>{const t=(e.textContent||'').trim();return /^(ABYSS|LINE)$/i.test(t)&&e.children.length===0})
    const wm=spans.map(e=>({t:e.textContent.trim(),color:getComputedStyle(e).color,fs:getComputedStyle(e).fontSize,ff:getComputedStyle(e).fontFamily.split(',')[0]}))
    // caption font
    const cap=[...document.querySelectorAll('*')].find(e=>/Trace a claim line/i.test(e.textContent||'')&&e.children.length<=3)
    const capf=cap?{ff:getComputedStyle(cap).fontFamily.split(',')[0],fs:getComputedStyle(cap).fontSize}:null
    return {overflowX,scrollW:de.scrollWidth,clientW:de.clientWidth,wm,capf}
  })
  console.log('DESKTOP',JSON.stringify(d,null,0))
  await p.close()
}
// MOBILE overflow + control-zone bg
{
  const p=await b.newPage();await p.setViewport({width:412,height:915,deviceScaleFactor:2,isMobile:true,hasTouch:true})
  await p.goto(URL,{waitUntil:'load'});await wait(1200)
  await clickText(p,'ENTER THE DIVE');await wait(600)
  const d=await p.evaluate(()=>{
    const de=document.documentElement
    const overflowX=de.scrollWidth-de.clientWidth
    // sample bg of the element behind DIVE DEPTH label
    const lbl=[...document.querySelectorAll('*')].find(e=>/^DIVE DEPTH$/i.test((e.textContent||'').trim())&&e.children.length===0)
    let chain=[]
    let n=lbl
    for(let i=0;i<6&&n;i++){const cs=getComputedStyle(n);chain.push({tag:n.tagName,bg:cs.backgroundColor,cls:(n.className||'').toString().slice(0,30)});n=n.parentElement}
    return {overflowX,scrollW:de.scrollWidth,clientW:de.clientWidth,chain}
  })
  console.log('MOBILE',JSON.stringify(d,null,0))
  await p.close()
}
await b.close();console.log('done')
