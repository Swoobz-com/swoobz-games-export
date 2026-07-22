import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1440'), H=parseInt(process.argv[3]||'900'), TAG=process.argv[4]||'D1440';
const PORT=process.argv[5]||'5182';
const S='shots/fix-';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle2',timeout:60000});
await wait(1500);

async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}

async function cellCenter(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}

async function settled(){return await page.evaluate(()=>document.body.textContent.toLowerCase().includes('bet again'));}

async function playOneRound(){
  const clickedApe = await clickText('ape in');
  if(!clickedApe) await clickText('bet again');
  await wait(700);
  await clickText('send it');await wait(900);
  let settledNow=false;
  for(let k=0;k<4&&!settledNow;k++){
    const {cx,cy}=await cellCenter([1,6,11,17,22][k]||2,5);
    await page.mouse.click(cx,cy);await wait(500);
    settledNow=await settled();
  }
  if(!settledNow){await clickText('take profit');await wait(900);}
  await wait(400);
}

// Play 6 rounds to build up session history / rug trail chips (matches original verifier)
for(let i=0;i<6;i++){
  await playOneRound();
  console.log('round',i+1,'done');
}
await page.screenshot({path:S+`${TAG}-settled-multiround.png`});

// ── FIX 1 re-sample: BET AGAIN button live pixel color ──
const betAgainPixel = await page.evaluate(async () => {
  const els=[...document.querySelectorAll('button')];
  const btn = els.find(e=>e.offsetParent!==null && e.textContent.trim().toLowerCase().includes('bet again'));
  if(!btn) return null;
  const r = btn.getBoundingClientRect();
  const cs = getComputedStyle(btn);
  return { rect:{x:r.x,y:r.y,w:r.width,h:r.height}, background: cs.backgroundImage || cs.backgroundColor };
});
console.log('BET AGAIN computed background:', JSON.stringify(betAgainPixel));

// Screenshot-crop-sample the actual rendered pixel near the top of the button (the lighter gradient stop = accentSolid green, sampled near bottom = the #00a85a stop)
if (betAgainPixel) {
  const { x, y, w, h } = betAgainPixel.rect;
  const clip = { x: Math.max(0,x+w*0.5-2), y: Math.max(0,y+h*0.8-2), width: 4, height: 4 };
  const buf = await page.screenshot({ clip });
  const fs = await import('fs');
  fs.writeFileSync(S+`${TAG}-betagain-pixel-crop.png`, buf);
}

// ── FIX 2 measurement: sidebarPulse module fill ratio inside its own bordered card, and overall panel void ──
const panelInfo = await page.evaluate(() => {
  function findByText(txt){
    const all=[...document.querySelectorAll('span,div')];
    return all.find(e=>e.textContent && e.textContent.trim().toUpperCase()===txt);
  }
  const label = findByText('SESSION PULSE');
  if(!label) return { found:false };
  // sidebarPulse card = label's closest ancestor with the bordered-card look — walk up to parent whose parentElement contains the CTA sibling
  let card = label.parentElement; // sidebarPulseHead
  card = card.parentElement; // sidebarPulse
  const cardRect = card.getBoundingClientRect();
  const cs = getComputedStyle(card);
  // content = last child's bottom minus card top
  const kids = [...card.children];
  const lastKid = kids[kids.length-1];
  const lastRect = lastKid.getBoundingClientRect();
  const contentBottom = lastRect.bottom;
  const contentHeight = contentBottom - cardRect.top;
  const fillRatio = contentHeight / cardRect.height;
  return {
    found: true,
    cardHeight: cardRect.height,
    contentHeight,
    fillRatio,
    blankPct: (1 - fillRatio) * 100,
    cardBg: cs.backgroundColor,
  };
});
console.log('SIDEBAR PULSE PANEL INFO:', JSON.stringify(panelInfo));

// header cyan probe (regression check on FIX 1 - no other cyan crept in)
const cyanInfo = await page.evaluate(() => {
  const all = [...document.querySelectorAll('body *')];
  const cyanish = [];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.borderTopColor, cs.borderBottomColor];
    for (const p of props) {
      const m = p.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (m) {
        const r=+m[1], g=+m[2], b=+m[3];
        if (r < 100 && g > 150 && b > 150 && Math.abs(g-b) < 60) {
          cyanish.push({ tag: el.tagName, cls: el.className && el.className.toString().slice(0,50), color: p });
        }
      }
    }
  }
  return cyanish;
});
console.log('CYAN-ISH ELEMENTS FOUND:', cyanInfo.length);
console.log(JSON.stringify(cyanInfo, null, 1));

// Go to playing phase (mid-round) for panel check
const clickedApe2 = await clickText('ape in');
if (!clickedApe2) await clickText('bet again');
await wait(700);
await clickText('send it'); await wait(900);
const {cx:cx1,cy:cy1}=await cellCenter(0,5);
await page.mouse.click(cx1,cy1); await wait(500);
await page.screenshot({path:S+`${TAG}-playing-multiround.png`});

const playingPanelInfo = await page.evaluate(() => {
  function findByText(txt){
    const all=[...document.querySelectorAll('span,div')];
    return all.find(e=>e.textContent && e.textContent.trim().toUpperCase()===txt);
  }
  const label = findByText('SESSION PULSE');
  if(!label) return { found:false };
  let card = label.parentElement;
  card = card.parentElement;
  const cardRect = card.getBoundingClientRect();
  const kids = [...card.children];
  const lastKid = kids[kids.length-1];
  const lastRect = lastKid.getBoundingClientRect();
  const contentHeight = lastRect.bottom - cardRect.top;
  const fillRatio = contentHeight / cardRect.height;
  return { found:true, cardHeight: cardRect.height, contentHeight, fillRatio, blankPct: (1-fillRatio)*100 };
});
console.log('PLAYING SIDEBAR PULSE PANEL INFO:', JSON.stringify(playingPanelInfo));

await browser.close();
console.log('DONE', TAG);
