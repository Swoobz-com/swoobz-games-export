import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5412'; const OUT=process.argv[3]||'shots-autisk-reverify-4fix';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function cap(page){return page.evaluate(()=>{const c=document.querySelector('[data-testid="vault-board-caption"]');return c?c.textContent.trim():null;});}
async function paintTrail(page){
  const bx=await box(page); if(!bx)return false;
  const pts=[[0.3,0.3],[0.5,0.3],[0.5,0.5],[0.35,0.5]].map(([fx,fy])=>({x:bx.x+bx.w*fx,y:bx.y+bx.h*fy}));
  await page.mouse.move(pts[0].x,pts[0].y);await page.mouse.down();
  for(const p of pts.slice(1)){await page.mouse.move(p.x,p.y,{steps:3});await wait(90);}
  await page.mouse.up();await wait(300);return true;
}
async function census(page){
  return page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom),top:Math.round(r.top)};};
    const grid=q('[data-testid="vault-main-grid"]');
    const col=q('[data-testid="vault-control-column"]');
    const panels=[...document.querySelectorAll('[data-testid^="vault-ctl-"]')].map(p=>({id:p.getAttribute('data-testid'),...rect(p)}));
    const cta=q('[data-testid="vault-ctl-cta"]');
    let ctaBtns=[];
    if(cta){ctaBtns=[...cta.querySelectorAll('button')].filter(b=>b.offsetParent!==null).map(b=>({label:b.textContent.trim().slice(0,30),...rect(b),disabled:b.disabled}));}
    const primKey=/send it|ape in|bet again|^go|stop|run your|clear/i;
    let primary=ctaBtns.find(b=>primKey.test(b.label))||ctaBtns[ctaBtns.length-1]||null;
    const allBetLabels=[...document.querySelectorAll('span,div,label')].map(e=>(e.childElementCount===0?e.textContent.trim():'')).filter(t=>/^(INZET|YOUR BET|WAGER)$/i.test(t));
    const allSteppers={minus:[...document.querySelectorAll('button')].filter(b=>/decrease/i.test(b.getAttribute('aria-label')||'')).length,plus:[...document.querySelectorAll('button')].filter(b=>/increase/i.test(b.getAttribute('aria-label')||'')).length};
    const wp=q('[data-testid="vault-board-worldpicker"]');
    let wpStyle=null;
    if(wp){const cs=getComputedStyle(wp);wpStyle={bg:cs.backgroundColor,border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor,radius:cs.borderTopLeftRadius,overflow:cs.overflow,pad:cs.padding};}
    const capEl=q('[data-testid="vault-board-caption"]');
    let bcol=null;
    if(capEl){let n=capEl.parentElement;while(n&&n.parentElement!==grid)n=n.parentElement;bcol=(n&&n.parentElement===grid)?n:null;}
    let boardCol=null;
    if(bcol){const cs=getComputedStyle(bcol);const kids=[...bcol.children].filter(k=>k.getBoundingClientRect().height>0);const first=kids[0],last=kids[kids.length-1];const br=bcol.getBoundingClientRect();boardCol={rect:rect(bcol),justify:cs.justifyContent,alignSelf:cs.alignSelf,gap:cs.gap,marginTop:first?Math.round(first.getBoundingClientRect().top-br.top):null,marginBottom:last?Math.round(br.bottom-last.getBoundingClientRect().bottom):null,firstKid:first?(first.getAttribute('data-testid')||first.className.slice(0,24)):null,lastKid:last?(last.getAttribute('data-testid')||last.className.slice(0,24)):null,kids:kids.map(k=>({id:k.getAttribute('data-testid')||k.className.slice(0,20),...rect(k)}))};}
    const frame=q('[data-testid="vault-canvas-shell"]');
    let gapBelowFrame=null;
    if(frame&&capEl){gapBelowFrame=Math.round(capEl.getBoundingClientRect().top-frame.getBoundingClientRect().bottom);}
    const hud=q('[data-testid="vault-hud-row"]');
    let hudCols=null;
    if(hud){hudCols=[...hud.children].map(ch=>ch.innerText.replace(/\n/g,' | ').trim());}
    const banner=q('[data-testid="vault-settled-banner"]');
    const colStyle=col?{maxHeight:getComputedStyle(col).maxHeight,overflowY:getComputedStyle(col).overflowY,scrollHeight:col.scrollHeight,clientHeight:col.clientHeight}:null;
    return {
      innerH:window.innerHeight,innerW:window.innerWidth,
      docScrollH:document.documentElement.scrollHeight,
      pageScrolls:document.documentElement.scrollHeight>window.innerHeight+1,
      gridTemplate:grid?getComputedStyle(grid).gridTemplateColumns:null,
      colRect:rect(col),colStyle,
      panelOrder:panels.map(p=>p.id),panelWidths:panels.map(p=>p.w),
      primary,primaryBelowFold:primary?primary.bottom>window.innerHeight+1:null,
      d1:{allBetLabels,betLabelCount:allBetLabels.length,steppers:allSteppers},
      d2:{wpRect:rect(wp),wpStyle,frameRect:rect(frame)},
      d4:boardCol,gapBelowFrame,
      hudCols,
      bannerText:banner?banner.textContent.trim():null,
      gutters:{gl:document.querySelectorAll('[data-testid="vault-gutter-left"]').length,gr:document.querySelectorAll('[data-testid="vault-gutter-right"]').length},
      sessionPulseCount:(document.body.innerText.match(/SESSION PULSE/g)||[]).length,
      canvasRect:rect(document.querySelector('canvas')),
    };
  });
}
async function shot(page,n){try{await page.screenshot({path:`${OUT}/${n}.png`});}catch(e){}}
async function runDesktop(browser,vp,tag){
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.setViewport(vp);
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(200);
  const res={tag,phases:{},errs};
  res.phases.lobby=await census(page);await shot(page,`${tag}-1-lobby`);
  await clickText(page,'ape in');await wait(700);
  res.phases.betentry=await census(page);await shot(page,`${tag}-2-betentry`);
  let s=await clickText(page,'send it','[data-testid="vault-ctl-cta"]');if(!s)s=await clickText(page,'send it');
  res.sentSendIt=s;await wait(800);
  await clickText(page,'TRAIL');await wait(300);
  res.phases.playing=await census(page);await shot(page,`${tag}-3-playing`);
  await paintTrail(page);await wait(300);
  await clickText(page,'go','[data-testid="vault-ctl-cta"]');await wait(1800);
  res.phases.settled=await census(page);await shot(page,`${tag}-4-settled`);
  await page.close();return res;
}
async function runLoss(browser,vp,tag){
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.setViewport(vp);
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(200);
  await clickText(page,'ape in');await wait(700);
  let s=await clickText(page,'send it','[data-testid="vault-ctl-cta"]');if(!s)s=await clickText(page,'send it');await wait(800);
  const bx=await box(page);const res={tag,errs};
  if(bx){
    const fr=[0.1,0.3,0.5,0.7,0.9];
    outer: for(const fy of fr){for(const fx of fr){
      await page.mouse.click(bx.x+bx.w*fx,bx.y+bx.h*fy);await wait(430);
      const c=await cap(page);if(c&&/rug/i.test(c)){res.ruggedAtCaption=c;break outer;}
    }}
  }
  await wait(1500);
  res.capAfter=await cap(page);
  res.census=await census(page);
  await shot(page,`${tag}-loss`);
  await page.close();return res;
}
async function runMobile(browser,tag){
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await clickText(page,'skip');await wait(200);
  const res={tag,errs};res.lobby=await census(page);await shot(page,`${tag}-1-lobby`);
  await clickText(page,'ape in');await wait(700);
  res.betentry=await census(page);await shot(page,`${tag}-2-betentry`);
  await page.close();return res;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1220']});
  const r1440=await runDesktop(browser,{width:1440,height:900,deviceScaleFactor:1},'d1440');
  const r1920=await runDesktop(browser,{width:1920,height:1080,deviceScaleFactor:1},'d1920');
  const loss1440=await runLoss(browser,{width:1440,height:900,deviceScaleFactor:1},'loss1440');
  const loss1920=await runLoss(browser,{width:1920,height:1080,deviceScaleFactor:1},'loss1920');
  const mob=await runMobile(browser,'mob');
  fs.writeFileSync(`${OUT}/census.json`,JSON.stringify({r1440,r1920,loss1440,loss1920,mob},null,2));
  console.log('DONE');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
