import puppeteer from 'puppeteer-core'
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=process.argv[2]||'5931'
const wait=ms=>new Promise(r=>setTimeout(r,ms))
async function clickText(page,t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button],a')];const n=e=>(e.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();return els.find(e=>e.offsetParent&&!e.disabled&&n(e).includes(t.toLowerCase()))||null},t);const el=h.asElement();if(!el)return false;try{await el.click()}catch{return false}return true}
const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required','--window-size=440,940']})
const page=await b.newPage();await page.setViewport({width:412,height:915,deviceScaleFactor:2})
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2'});await wait(600)
await clickText(page,'ape in')||await clickText(page,'got it')||await clickText(page,'skip');await wait(900)
const info=await page.evaluate(()=>{
  const bd=document.querySelector('[data-testid="vault-grid-backdrop"]')
  // the panel wrapper is the div with aria-live=polite; its child is PhaseSurface root
  const panel=document.querySelector('[aria-live="polite"]')
  const walk=(el,d=0,acc=[])=>{if(!el||d>3)return acc;for(const c of el.children){const cs=getComputedStyle(c);const r=c.getBoundingClientRect();acc.push({d,tag:c.tagName,tid:c.getAttribute('data-testid')||'',bg:cs.backgroundColor,bgImg:cs.backgroundImage.slice(0,30),bdf:cs.backdropFilter,op:cs.opacity,h:Math.round(r.height),w:Math.round(r.width)});walk(c,d+1,acc)}return acc}
  const rows=panel?walk(panel):[]
  // find any child with a non-transparent bg covering most of panel
  const opaque=rows.filter(r=>r.bg!=='rgba(0, 0, 0, 0)'&&r.h>100)
  return {panelBg:panel?getComputedStyle(panel).backgroundColor:null, firstChildren:rows.slice(0,14), opaqueBigCards:opaque.slice(0,10)}
})
console.log(JSON.stringify(info,null,1))
await b.close()
