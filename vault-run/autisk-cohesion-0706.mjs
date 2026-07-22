import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5666';
const OUT='shots-cohesion-0706';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const WORLDS=['bluechips','altseason','shitcoin'];
async function clickText(page,t){
  const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},t);
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function clickSel(page,sel){const h=await page.$(sel);if(!h)return false;try{await h.click();}catch(e){return false;}return true;}
async function dismiss(page){await clickText(page,'got it');await clickText(page,'skip');await wait(150);}
async function probe(page){
  return await page.evaluate(()=>{
    const bd=document.querySelector('.vault-grid-backdrop')||document.querySelector('[class*="backdrop"]');
    const bdImg=bd?getComputedStyle(bd).backgroundImage.slice(0,120):null;
    const ids=['vault-betentry-world','vault-betentry-yourbet','vault-betentry-confirm','vault-board-worldpicker','vault-ctl-wager-locked','vault-ctl-path','vault-ctl-session','vault-ctl-style','vault-settled-result','vault-settled-meta','vault-settled-next','vault-settled-receipt-card','vault-settledpanel'];
    const out={};
    for(const id of ids){const e=document.querySelector('[data-testid="'+id+'"]');if(!e)continue;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();out[id]={bg:cs.backgroundImage!=='none'?cs.backgroundImage.slice(0,90):cs.backgroundColor,border:cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor,brad:cs.borderTopLeftRadius,shadow:cs.boxShadow.slice(0,110),blur:cs.backdropFilter,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};}
    // world cards + actionbar
    const wc=document.querySelector('.vault-world-card');if(wc){const cs=getComputedStyle(wc);out['world-card(sel/first)']={bg:cs.backgroundColor,border:cs.borderTopWidth+' '+cs.borderTopColor,brad:cs.borderTopLeftRadius,shadow:cs.boxShadow.slice(0,80)};}
    const ab=document.querySelector('.vault-actionbar');if(ab){const cs=getComputedStyle(ab);const r=ab.getBoundingClientRect();out['actionBar']={bg:cs.backgroundImage.slice(0,90),border:cs.borderTopWidth+' '+cs.borderTopColor,brad:cs.borderTopLeftRadius,shadow:cs.boxShadow.slice(0,110),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};}
    return {bdImg,panels:out,mode:(document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/)||[])[0]};
  });
}
async function run(page,vw,vh,tag,doMobile){
  const results={};
  for(const world of WORLDS){
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(700);
    await dismiss(page);
    await clickText(page,'ape in');await wait(900);
    // switch world
    await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
    // LOBBY / bet-entry shot
    const pL=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-lobby-'+tag+'.png'});
    // PLAYING
    await clickText(page,'send it');await wait(1100);
    const pP=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-playing-'+tag+'.png'});
    // reveal a couple tiles on the board (left region), then take profit
    const bx=Math.round(vw*0.30), by=Math.round(vh*0.42);
    try{await page.mouse.click(bx,by);}catch(e){}
    await wait(700);
    try{await page.mouse.click(Math.round(vw*0.38),Math.round(vh*0.50));}catch(e){}
    await wait(700);
    // try take profit; if busted it's already settled
    await clickText(page,'take profit');await wait(1200);
    const pS=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-settled-'+tag+'.png'});
    results[world]={lobby:pL,playing:pP,settled:pS};
    console.log('=== '+tag+' '+world+' mode='+pL.mode+' bd='+(pL.bdImg||'').slice(0,60));
  }
  return results;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1500,960']});
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const desk=await run(page,1440,900,'desktop');
  console.log('DESKTOP_PROBE='+JSON.stringify(desk));
  // mobile — altseason all 3 phases at least
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  const mob={};
  for(const world of ['altseason']){
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(700);
    await dismiss(page);
    await clickText(page,'ape in');await wait(900);
    await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
    await page.screenshot({path:OUT+'/'+world+'-lobby-mobile.png'});
    const m1=await probe(page);
    await clickText(page,'send it');await wait(1100);
    await page.screenshot({path:OUT+'/'+world+'-playing-mobile.png'});
    try{await page.mouse.click(Math.round(390*0.5),Math.round(844*0.42));}catch(e){}
    await wait(700);
    try{await page.mouse.click(Math.round(390*0.5),Math.round(844*0.55));}catch(e){}
    await wait(700);
    await clickText(page,'take profit');await wait(1200);
    await page.screenshot({path:OUT+'/'+world+'-settled-mobile.png'});
    const m3=await probe(page);
    mob[world]={lobby:m1,settled:m3};
  }
  console.log('MOBILE_PROBE='+JSON.stringify(mob));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
