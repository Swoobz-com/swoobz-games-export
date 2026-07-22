import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5666';
const OUT='shots-cohesion-0706-after-v2';
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
    const bd=document.querySelector('[data-testid="vault-grid-backdrop"]');
    const bdImg=bd?getComputedStyle(bd).backgroundImage.slice(0,140):null;
    const root=document.querySelector('[data-vault-root]')||document.documentElement;
    const plateHi=getComputedStyle(document.body).getPropertyValue('--vault-plate-highlight')||getComputedStyle(document.documentElement).getPropertyValue('--vault-plate-highlight');
    // dump EVERY data-testid element + world cards + actionbar/settledpanel classes
    const seen=new Set();const out={};
    function rec(e,key){
      if(!e||seen.has(e))return;seen.add(e);
      const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
      if(r.width<2||r.height<2)return;
      out[key]={bg:cs.backgroundImage!=='none'?cs.backgroundImage.slice(0,70):cs.backgroundColor,bc:cs.borderTopColor,bw:cs.borderTopWidth,brad:cs.borderTopLeftRadius,shadow:cs.boxShadow.slice(0,130),blur:cs.backdropFilter,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
    }
    document.querySelectorAll('[data-testid]').forEach(e=>{const id=e.getAttribute('data-testid');if(id&&id.startsWith('vault-'))rec(e,id);});
    document.querySelectorAll('.vault-world-card').forEach((e,i)=>rec(e,'world-card-'+i));
    document.querySelectorAll('.vault-actionbar,.vault-settledpanel').forEach((e,i)=>rec(e,'bar-'+(e.className.includes('settled')?'settled':'action')));
    return {bdImg,plateHi:plateHi.trim(),panels:out,mode:(document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/)||[])[0]};
  });
}
async function run(page,vw,vh,tag){
  const results={};
  for(const world of WORLDS){
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
    await dismiss(page);
    await clickText(page,'ape in');await wait(900);
    await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
    const pL=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-lobby-'+tag+'.png'});
    await clickText(page,'send it');await wait(1200);
    const pP=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-playing-'+tag+'.png'});
    const bx=Math.round(vw*0.30), by=Math.round(vh*0.42);
    try{await page.mouse.click(bx,by);}catch(e){}
    await wait(700);
    try{await page.mouse.click(Math.round(vw*0.38),Math.round(vh*0.50));}catch(e){}
    await wait(700);
    await clickText(page,'take profit');await wait(1300);
    const pS=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-settled-'+tag+'.png'});
    results[world]={lobby:pL,playing:pP,settled:pS};
    console.log('=== '+tag+' '+world+' mode='+pL.mode+' plateHi='+pL.plateHi+' bd='+(pL.bdImg||'').slice(0,55));
  }
  return results;
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1500,980']});
  const page=await browser.newPage();
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  const desk=await run(page,1440,900,'desktop');
  console.log('DESKTOP_PROBE='+JSON.stringify(desk));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  const mob={};
  for(const world of ['altseason']){
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(800);
    await dismiss(page);
    await clickText(page,'ape in');await wait(900);
    await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
    const m1=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-lobby-mobile.png'});
    await clickText(page,'send it');await wait(1200);
    const m2=await probe(page);
    await page.screenshot({path:OUT+'/'+world+'-playing-mobile.png'});
    try{await page.mouse.click(Math.round(390*0.5),Math.round(844*0.42));}catch(e){}
    await wait(700);
    try{await page.mouse.click(Math.round(390*0.5),Math.round(844*0.55));}catch(e){}
    await wait(700);
    await clickText(page,'take profit');await wait(1300);
    await page.screenshot({path:OUT+'/'+world+'-settled-mobile.png'});
    const m3=await probe(page);
    mob[world]={lobby:m1,playing:m2,settled:m3};
    console.log('=== mobile '+world+' mode='+m1.mode+' plateHi='+m1.plateHi);
  }
  console.log('MOBILE_PROBE='+JSON.stringify(mob));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
