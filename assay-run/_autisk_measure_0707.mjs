import puppeteer from "puppeteer-core"
const EXE = "C:/Program Files/Google/Chrome/Application/chrome.exe"
const URL = "http://localhost:5182/"
const wait = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, re) => page.evaluate(rs => { const r=new RegExp(rs,"i"); const b=[...document.querySelectorAll("button,div,span")].find(x=>r.test((x.textContent||"").trim())&&(x.tagName==="BUTTON"||getComputedStyle(x).cursor==="pointer")); if(b){b.click();return b.textContent.trim()} return null }, re.source)
const b=await puppeteer.launch({executablePath:EXE,headless:false,args:["--autoplay-policy=no-user-gesture-required"],defaultViewport:null})
const page=await b.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1}); await page.goto(URL,{waitUntil:"load"}); await page.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await page.reload({waitUntil:"load"}); await wait(600)
await clickText(page,/ENTER THE DIVE/); await wait(600)
const r=await page.evaluate(()=>{
  // depth cards: find elements whose text starts with a depth name and are clipped
  const out=[]
  const names=[...document.querySelectorAll("div,span,button")].filter(x=>/^(REEF SHELF|MIDNIGHT ZO|HADAL TREN)/.test((x.textContent||"").trim()) && x.children.length<=1)
  const seen=new Set()
  for(const el of names){ const t=(el.textContent||"").trim().slice(0,40); const cs=getComputedStyle(el); const key=t+cs.textOverflow; if(seen.has(t))continue; seen.add(t); out.push({t, sw:el.scrollWidth, cw:el.clientWidth, clipped:el.scrollWidth>el.clientWidth+1, textOverflow:cs.textOverflow, whiteSpace:cs.whiteSpace, ellipsis:/…|\.\.\./.test(t)}) }
  // tooltip overlap with board canvas
  const tip=[...document.querySelectorAll("div")].find(d=>/TRACE a claim line of ducats/.test(d.textContent||"")&&d.children.length<=4)
  const canvas=document.querySelector("canvas")
  const R=e=>{const r=e.getBoundingClientRect();return{l:+r.left.toFixed(0),t:+r.top.toFixed(0),r:+r.right.toFixed(0),b:+r.bottom.toFixed(0)}}
  let ov=null,tr=null,cr=null
  if(tip&&canvas){tr=R(tip);cr=R(canvas);const ix=Math.max(0,Math.min(tr.r,cr.r)-Math.max(tr.l,cr.l));const iy=Math.max(0,Math.min(tr.b,cr.b)-Math.max(tr.t,cr.t));ov=+(ix*iy).toFixed(0)}
  return {depthCards:out, tipRect:tr, canvasRect:cr, tipBoardOverlapPx2:ov}
})
console.log(JSON.stringify(r,null,2))
await b.close()
