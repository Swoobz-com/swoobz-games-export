import puppeteer from 'puppeteer-core';
import {PNG} from 'pngjs';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5666';
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/autisk-shots';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t){
  const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},t);
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function clickSel(page,sel){const h=await page.$(sel);if(!h)return false;try{await h.click();}catch(e){return false;}return true;}
async function dismiss(page){await clickText(page,'got it');await clickText(page,'skip');await wait(150);}
function cropPNG(inPath,outPath,x,y,w,h){
  const src=PNG.sync.read(fs.readFileSync(inPath));
  x=Math.max(0,Math.min(x,src.width-1));y=Math.max(0,Math.min(y,src.height-1));
  w=Math.min(w,src.width-x);h=Math.min(h,src.height-y);
  const dst=new PNG({width:w,height:h});
  for(let ry=0;ry<h;ry++)for(let rx=0;rx<w;rx++){const si=((y+ry)*src.width+(x+rx))<<2;const di=(ry*w+rx)<<2;dst.data[di]=src.data[si];dst.data[di+1]=src.data[si+1];dst.data[di+2]=src.data[si+2];dst.data[di+3]=src.data[si+3];}
  fs.writeFileSync(outPath,PNG.sync.write(dst));
}
async function probeRugs(page){
  return await page.evaluate(()=>{
    const dump=e=>{if(!e)return null;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();return {bg:cs.backgroundImage!=='none'?cs.backgroundImage:cs.backgroundColor,bc:cs.borderTopColor,bw:cs.borderTopWidth,brad:cs.borderTopLeftRadius,shadow:cs.boxShadow,opacity:cs.opacity,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};};
    // rugsTuner = parent of span 'RUGS'
    const rugsLbl=[...document.querySelectorAll('span')].find(s=>s.textContent.trim()==='RUGS');
    const rugsTuner=rugsLbl?rugsLbl.parentElement.parentElement:null;
    const wagerPanel=document.querySelector('[data-testid="vault-ctl-wager"]');
    return {rugsTuner:dump(rugsTuner),wagerPanelSibling:dump(wagerPanel)};
  });
}
async function probeLocked(page){
  return await page.evaluate(()=>{
    const dump=e=>{if(!e)return null;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();return {opacity:cs.opacity,color:cs.color,fs:cs.fontSize,text:(e.textContent||'').trim().slice(0,40),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],bg:cs.backgroundImage!=='none'?cs.backgroundImage.slice(0,50):cs.backgroundColor,shadow:cs.boxShadow.slice(0,90),brad:cs.borderTopLeftRadius,bc:cs.borderTopColor};};
    const card=document.querySelector('[data-testid="vault-ctl-wager-locked"]');
    if(!card)return {found:false};
    const label=card.querySelector('span');
    const btns=[...card.querySelectorAll('button')];
    const valEl=[...card.querySelectorAll('*')].find(e=>/USDC|\d/.test(e.textContent)&&e.children.length<=2&&e.tagName!=='BUTTON');
    return {found:true,card:dump(card),label:dump(label),btnMinus:dump(btns[0]),btnPlus:dump(btns[1]),value:dump(valEl)};
  });
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1500,980']});
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const report={};
  for(const world of ['bluechips','altseason']){
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
    await dismiss(page);
    await clickText(page,'ape in');await wait(900);
    await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
    const pr=await probeRugs(page);
    const full=OUT+'/'+world+'-lobby-full.png';
    await page.screenshot({path:full});
    if(pr.rugsTuner){const[x,y,w,h]=pr.rugsTuner.rect;cropPNG(full,OUT+'/'+world+'-RUGScard.png',x-14,y-16,w+28,h+40);}
    report[world+'_lobby']=pr;
    // playing → locked card
    await clickText(page,'send it');await wait(1400);
    const pl=await probeLocked(page);
    const fullP=OUT+'/'+world+'-playing-full.png';
    await page.screenshot({path:fullP});
    if(pl.found&&pl.card){const[x,y,w,h]=pl.card.rect;cropPNG(fullP,OUT+'/'+world+'-LOCKEDcard.png',x-14,y-16,w+28,h+44);}
    report[world+'_locked']=pl;
    console.log('=== '+world+' ===');
    console.log('RUGS  shadow:',pr.rugsTuner&&pr.rugsTuner.shadow);
    console.log('RUGS  bg/border/rad:',pr.rugsTuner&&(pr.rugsTuner.bg+' | '+pr.rugsTuner.bc+' | '+pr.rugsTuner.brad));
    console.log('SIB   shadow:',pr.wagerPanelSibling&&pr.wagerPanelSibling.shadow);
    console.log('LOCKED found:',pl.found,'cardOpacity:',pl.card&&pl.card.opacity,'labelOpacity/color:',pl.label&&(pl.label.opacity+'/'+pl.label.color),'label:',pl.label&&pl.label.text);
    console.log('LOCKED btnMinus opacity:',pl.btnMinus&&pl.btnMinus.opacity,'btnPlus opacity:',pl.btnPlus&&pl.btnPlus.opacity);
    console.log('LOCKED value opacity/color/text:',pl.value&&(pl.value.opacity+'/'+pl.value.color+'/'+pl.value.text));
    console.log('LOCKED card bg/rad/border/shadow:',pl.card&&(pl.card.bg+' | '+pl.card.brad+' | '+pl.card.bc+' | '+pl.card.shadow));
  }
  fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2));
  console.log('DONE');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
