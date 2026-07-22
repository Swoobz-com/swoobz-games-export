import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5782';
const OUT=process.argv[3]||'shots-autisk-revert-0705';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function pstate(page){return page.evaluate(()=>{const t=document.body.innerText;return{secured:/SECURED|SECURED THE BAG/i.test(t),rugged:/RUGGED|GOT SBF|REKT/i.test(t),settled:!!document.querySelector('[data-testid="vault-settledpanel"]')};});}
function census(){
  const q=s=>document.querySelector(s);
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom),top:Math.round(r.top),left:Math.round(r.left)};};
  const IW=window.innerWidth,IH=window.innerHeight;
  const ids=['vault-canvas-shell','vault-gutter-left','vault-gutter-right','vault-gutter-card-a','vault-controlcard','vault-lobby-left','vault-lobby-right','vault-betentry-left','vault-betentry-right','vault-betentry-world','vault-betentry-yourbet','vault-betentry-confirm','vault-playing-left','vault-playing-right','vault-settled-left','vault-settled-right','vault-settledpanel','vault-settled-betagain','vault-settled-next','vault-board-rebet'];
  const el={};for(const id of ids){el[id]=rect(q('[data-testid="'+id+'"]'));}
  const canvas=rect(q('canvas'));
  const rg=q('[data-testid="vault-gutter-right"]')||q('[data-testid="vault-betentry-right"]');
  let clipped=[],truncated=[],offscreen=[];
  if(rg){
    const leaves=[...rg.querySelectorAll('*')].filter(e=>e.childElementCount===0&&e.textContent.trim());
    for(const e of leaves){
      const r=e.getBoundingClientRect();const txt=e.textContent.trim().slice(0,28);
      if(e.scrollWidth>e.clientWidth+1)truncated.push({txt,sw:e.scrollWidth,cw:e.clientWidth});
      if(r.right>IW+0.5)offscreen.push({txt,right:Math.round(r.right),over:Math.round(r.right-IW)});
      const cs=getComputedStyle(e);
      if((cs.overflow==='hidden'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1)clipped.push({txt,sw:e.scrollWidth,cw:e.clientWidth});
    }
  }
  let gapBoardToRight=null,rightCardRightEdge=null,rightMargin=null;
  const rgr=el['vault-gutter-right']||el['vault-betentry-right'];
  if(rgr&&canvas){gapBoardToRight=rgr.left-canvas.right;rightCardRightEdge=rgr.right;rightMargin=IW-rgr.right;}
  const bt=document.body.innerText;
  return {innerW:IW,innerH:IH,pageScrollX:document.documentElement.scrollWidth>IW+1,pageScrollY:document.documentElement.scrollHeight>IH+1,docScrollW:document.documentElement.scrollWidth,docScrollH:document.documentElement.scrollHeight,canvas,el,gapBoardToRight,rightCardRightEdge,rightMargin,truncated,offscreen,clipped,sessionPulseCount:(bt.match(/SESSION PULSE/g)||[]).length,newSetupCount:(bt.match(/new setup/gi)||[]).length,apeInCount:(bt.match(/APE IN/g)||[]).length,sendItCount:(bt.match(/SEND IT/g)||[]).length,betAgainCount:(bt.match(/BET AGAIN/g)||[]).length};
}
async function cen(page){return page.evaluate(census);}
async function shot(page,n){try{await page.screenshot({path:OUT+'/'+n+'.png'});}catch(e){}}
async function skipIntro(page){await clickText(page,'got it');await clickText(page,'skip');await clickText(page,'tap');await wait(200);}
async function run(browser,vp,tag,mode){
  const page=await browser.newPage();const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.setViewport(vp);
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(1000);
  await skipIntro(page);
  const res={tag,vp,phases:{},errs,mode};
  res.phases.lobby=await cen(page);await shot(page,tag+'-1-lobby');
  if(vp.width<=430){
    await clickText(page,'ape in');await wait(700);
    let s=await clickText(page,'send it');await wait(900);
    res.phases.playing=await cen(page);await shot(page,tag+'-3-playing');
    const bx=await box(page);if(bx){await page.mouse.click(bx.x+bx.w*0.5,bx.y+bx.h*0.5);await wait(600);}
    const st0=await pstate(page);if(!st0.settled)await clickText(page,'take profit');await wait(1500);
    res.phases.settled=await cen(page);await shot(page,tag+'-4-settled');
    await page.close();return res;
  }
  await clickText(page,'ape in');await wait(700);
  res.phases.betentry=await cen(page);await shot(page,tag+'-2-betentry');
  let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)s=await clickText(page,'send it');await wait(900);
  res.phases.playing=await cen(page);await shot(page,tag+'-3-playing');
  const bx=await box(page);
  if(mode==='loss'){
    const cells=[[0.5,0.5],[0.3,0.3],[0.7,0.3],[0.3,0.7],[0.7,0.7],[0.5,0.3],[0.5,0.7],[0.3,0.5],[0.7,0.5]];
    for(const c of cells){await page.mouse.click(bx.x+bx.w*c[0],bx.y+bx.h*c[1]);await wait(450);const st=await pstate(page);if(st.settled)break;}
    await wait(1200);
  }else{
    await page.mouse.click(bx.x+bx.w*0.5,bx.y+bx.h*0.5);await wait(600);
    const st=await pstate(page);if(!st.settled)await clickText(page,'take profit');await wait(1500);
  }
  res.phases.settled=await cen(page);res.settledState=await pstate(page);await shot(page,tag+'-4-settled');
  await page.close();return res;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  const out={};
  out.d1440win=await run(browser,{width:1440,height:900,deviceScaleFactor:1},'d1440-win','win');
  out.d1440loss=await run(browser,{width:1440,height:900,deviceScaleFactor:1},'d1440-loss','loss');
  out.d1920win=await run(browser,{width:1920,height:1080,deviceScaleFactor:1},'d1920-win','win');
  out.d1000win=await run(browser,{width:1000,height:900,deviceScaleFactor:1},'d1000-win','win');
  out.mob=await run(browser,{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},'mob','win');
  fs.writeFileSync(OUT+'/census.json',JSON.stringify(out,null,2));
  console.log('DONE');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
