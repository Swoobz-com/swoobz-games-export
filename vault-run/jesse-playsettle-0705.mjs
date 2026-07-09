import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5971';
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{
    const root=within?document.querySelector(within):document;if(!root)return null;
    const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)
      ||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;
  },{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function shot(page,name){await page.screenshot({path:OUT+'/'+name+'.png'});}
async function skipIntro(page){for(const t of ['got it','skip','continue']){await clickText(page,t);await wait(120);}}
function bodyText(page){return page.evaluate(()=>document.body.innerText.slice(0,900).replace(/\n+/g,' | '));}

// probe the "IF NEXT IS SAFE" reward readout + trail toggle + globe positions and overlap
async function playProbe(page){
  return page.evaluate(()=>{
    const IW=window.innerWidth,IH=window.innerHeight;
    const all=[...document.querySelectorAll('*')];
    function findText(re){return all.filter(e=>e.children.length===0 && re.test((e.textContent||'').trim())).map(e=>{const r=e.getBoundingClientRect();return{txt:e.textContent.trim().slice(0,40),x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),bottom:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height),vis:r.width>0&&r.right<=IW+1&&r.left>=-1&&r.bottom<=IH+1};});}
    const ifnext=findText(/IF NEXT|if next|→\s*[\d.]+x|next is safe/i);
    // globe + toggle buttons
    const btns=[...document.querySelectorAll('button,[role=button]')].map(b=>{const r=b.getBoundingClientRect();return{txt:b.textContent.trim().slice(0,28),x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),bottom:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height)};}).filter(b=>b.w>0);
    const toggle=btns.filter(b=>/MANUAL|TRAIL|AUTO/i.test(b.txt));
    // overlap test: does any ifnext readout rect intersect a toggle/globe button rect?
    function overlap(a,b){return !(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y);}
    const occl=[];
    for(const t of ifnext){for(const b of toggle){if(overlap(t,b))occl.push({read:t.txt,by:b.txt});}}
    const topText=document.body.innerText.slice(0,500).replace(/\n+/g,' | ');
    return {IW,IH,ifnext,toggle,occl,topText};
  });
}
// settled probe: NEXT BET + VIEW RECEIPT single-line + receipt reachable
async function settleProbe(page){
  return page.evaluate(()=>{
    const IW=window.innerWidth,IH=window.innerHeight;
    const all=[...document.querySelectorAll('*')];
    function leaf(re){return all.filter(e=>e.children.length===0 && re.test((e.textContent||'').trim())).map(e=>{const cs=getComputedStyle(e);const r=e.getBoundingClientRect();return{txt:e.textContent.trim().slice(0,44),x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),fs:parseFloat(cs.fontSize),twoLine:r.height>parseFloat(cs.fontSize)*1.8,ws:cs.whiteSpace,vis:r.width>0&&r.right<=IW+1&&r.left>=-1};});}
    const nextBet=leaf(/NEXT BET/i);
    const receipt=leaf(/VIEW RECEIPT|RECEIPT/i);
    const bag=leaf(/SECURED THE BAG|GOT SBF|RUGGED|SECURED|SBF/i);
    const topText=document.body.innerText.slice(0,600).replace(/\n+/g,' | ');
    return {IW,IH,nextBet,receipt,bag,topText};
  });
}
// click a grid cell by row/col (0-based) assuming board region — 5x5 or 7x7
async function crackCell(page,r,c,dim){
  return page.evaluate(({r,c,dim})=>{
    const cvs=document.querySelector('canvas');if(!cvs)return null;
    const rect=cvs.getBoundingClientRect();
    // board occupies roughly center-left; empirically x 0.30-0.70 of canvas, y 0.20-0.82
    const gx0=rect.left+rect.width*0.30, gx1=rect.left+rect.width*0.70;
    const gy0=rect.top+rect.height*0.20, gy1=rect.top+rect.height*0.82;
    const x=gx0+(gx1-gx0)*((c+0.5)/dim);
    const y=gy0+(gy1-gy0)*((r+0.5)/dim);
    const el=document.elementFromPoint(x,y)||cvs;
    for(const type of ['pointerdown','mousedown','mouseup','click']){
      el.dispatchEvent(new MouseEvent(type,{clientX:x,clientY:y,bubbles:true}));
    }
    return {x:Math.round(x),y:Math.round(y)};
  },{r,c,dim});
}

(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=2000,1200']});

  // ===== PART B: PLAYING 1440 — WIN path (NORMAL world default) =====
  {
    const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(1000);
    await skipIntro(page);await clickText(page,'ape in');await wait(700);
    await clickText(page,'send it');await wait(900);
    await shot(page,'playing-1440-fresh');
    let pp=await playProbe(page);
    console.log('\n===== PLAYING 1440 (pre-crack) =====');
    console.log('topText:',pp.topText);
    console.log('ifnext readouts:',JSON.stringify(pp.ifnext));
    console.log('toggle btns:',JSON.stringify(pp.toggle));
    console.log('OCCLUSIONS:',JSON.stringify(pp.occl));
    // crack 2 interior cells to build a multiplier
    await crackCell(page,2,1,5);await wait(700);
    await crackCell(page,2,3,5);await wait(700);
    await shot(page,'playing-1440-cracked');
    pp=await playProbe(page);
    console.log('\n--- PLAYING 1440 (after 2 cracks) ---');
    console.log('topText:',pp.topText);
    console.log('ifnext readouts:',JSON.stringify(pp.ifnext));
    console.log('OCCLUSIONS:',JSON.stringify(pp.occl));
    const bt=await bodyText(page);console.log('bodyText:',bt.slice(0,300));
    // take profit -> WIN settle
    await clickText(page,'take profit');await wait(1100);
    await shot(page,'settled-WIN-1440');
    const sp=await settleProbe(page);
    console.log('\n===== SETTLED WIN 1440 =====');
    console.log('topText:',sp.topText);
    console.log('bag:',JSON.stringify(sp.bag));
    console.log('nextBet:',JSON.stringify(sp.nextBet));
    console.log('receipt:',JSON.stringify(sp.receipt));
    // click view receipt
    const rok=await clickText(page,'view receipt');await wait(600);
    await shot(page,'receipt-open-1440');
    console.log('view-receipt click ok:',rok);
    await page.close();
  }

  // ===== PART C: LOSS path — CRAZY world (dense rugs) =====
  {
    const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(1000);
    await skipIntro(page);await clickText(page,'ape in');await wait(700);
    await clickText(page,'shitcoin');await wait(200); // pick CRAZY world (dense rugs)
    await clickText(page,'send it');await wait(900);
    // crack many cells on 7x7 until rugged
    let rugged=false;
    outer:for(let r=0;r<7;r++){for(let c=0;c<7;c++){
      await crackCell(page,r,c,7);await wait(450);
      const bt=await bodyText(page);
      if(/rugged|GOT SBF|SBF|busted/i.test(bt)){rugged=true;break outer;}
    }}
    await wait(900);
    await shot(page,'settled-LOSS-1440');
    const sp=await settleProbe(page);
    console.log('\n===== SETTLED LOSS 1440 (rugged='+rugged+') =====');
    console.log('topText:',sp.topText);
    console.log('bag:',JSON.stringify(sp.bag));
    console.log('nextBet:',JSON.stringify(sp.nextBet));
    console.log('receipt:',JSON.stringify(sp.receipt));
    await page.close();
  }

  await browser.close();
  console.log('\nDONE-PART-BC');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
