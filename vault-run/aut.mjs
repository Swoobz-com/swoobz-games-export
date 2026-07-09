import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]), H=parseInt(process.argv[3]), TAG=process.argv[4], MODE=process.argv[5]||'bluechips';
const S='shots/autisk/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:1},args:[`--window-size=${W+16},${H+140}`,'--autoplay-policy=no-user-gesture-required','--force-prefers-reduced-motion=false']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(2800);

async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){return false;}await el.click();return true;}

// overflow + fitting probe
async function probe(label){return await page.evaluate((label)=>{
  const vw=window.innerWidth, vh=window.innerHeight;
  const out={label,vw,vh,vpOverflow:[],clip:[],edge:[],canvas:null,grid:null};
  const R=e=>e.getBoundingClientRect();
  const all=[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&e.offsetParent!==null;});
  // horizontal viewport overflow
  for(const e of all){const r=R(e);if(r.width===0||r.height===0)continue;
    if(r.right>vw+1||r.left<-1){const s=getComputedStyle(e);
      // skip if ancestor clips it (overflow hidden) & this is inside
      out.vpOverflow.push({t:e.tagName+'.'+(e.className||'').toString().split(' ')[0].slice(0,18),txt:(e.textContent||'').trim().slice(0,26),x:Math.round(r.left),r:Math.round(r.right),w:Math.round(r.width),ov:Math.round(Math.max(r.right-vw,-r.left))});}
  }
  // text clipping: scrollWidth>clientWidth with hidden/ellipsis OR scrollHeight>clientHeight
  for(const e of all){const s=getComputedStyle(e);
    if((s.overflow==='hidden'||s.overflowX==='hidden'||s.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&e.clientWidth>0&&e.children.length===0){
      out.clip.push({t:e.tagName,txt:(e.textContent||'').trim().slice(0,30),sw:e.scrollWidth,cw:e.clientWidth});}
    if(s.overflowY==='hidden'&&e.scrollHeight>e.clientHeight+2&&e.clientHeight>0&&(e.textContent||'').trim()){
      out.clip.push({t:e.tagName+'(V)',txt:(e.textContent||'').trim().slice(0,30),sh:e.scrollHeight,ch:e.clientHeight});}
  }
  // buttons touching their parent edge
  for(const b of document.querySelectorAll('button')){if(b.offsetParent===null)continue;const r=R(b);const p=b.parentElement;if(!p)continue;const pr=R(p);
    const gapL=r.left-pr.left, gapR=pr.right-r.right;
    if(gapL<1||gapR<1){out.edge.push({txt:(b.textContent||'').trim().slice(0,18),gapL:Math.round(gapL),gapR:Math.round(gapR),pw:Math.round(pr.width)});}
  }
  // canvas + grid math (mirror computeGridLayout)
  const c=document.querySelector('canvas');
  if(c){const r=R(c);out.canvas={x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};
    const CW=r.width,CH=r.height;
    for(const g of [5,7]){
      const topR=CH*0.15,botR=CH*0.18,sF=0.08;const safeW=CW*(1-sF*2);const safeH=(CH-topR-botR)*0.96;const av=Math.min(safeW,safeH);
      const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);
      const spriteHalf=tile*1.18/2; const pitch=tile+gap; const spriteEdgeGap=pitch-2*spriteHalf; // sealed lockbox=1.02 -> use 1.18*1.02
      const lockEdge=pitch-tile*1.18*1.02;
      out.grid=out.grid||{};out.grid['g'+g]={tile:+tile.toFixed(1),gap:+gap.toFixed(1),full:+full.toFixed(1),coinEdgeGap:+spriteEdgeGap.toFixed(1),lockEdgeGap:+lockEdge.toFixed(1),touchTargetPx:+pitch.toFixed(1)};
    }
  }
  return out;
},label);}

const rep={W,H,TAG,phases:{}};
// LOBBY
await page.screenshot({path:S+`${TAG}-1lobby.png`,fullPage:false});
rep.phases.lobby=await probe('lobby');
// HELP overlay
await clickText('?')||await clickText('help');await wait(700);
await page.screenshot({path:S+`${TAG}-5help.png`});
rep.phases.help=await probe('help');
// close help
await page.keyboard.press('Escape');await wait(400);
await clickText('close')||await clickText('got it');await wait(300);
// BET ENTRY
await clickText('ape in');await wait(1200);
// select mode
if(MODE!=='bluechips'){await clickText(MODE);await wait(600);}
await page.screenshot({path:S+`${TAG}-2betentry-${MODE}.png`});
rep.phases.betentry=await probe('betentry');
// PLAYING
await clickText('send it');await wait(1400);
await page.screenshot({path:S+`${TAG}-3playing-${MODE}.png`});
rep.phases.playing=await probe('playing');
// tap a few tiles (reveal green coins) using grid math
const taps=await page.evaluate((g)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const CW=r.width,CH=r.height;const topR=CH*0.15,botR=CH*0.18,sF=0.08;const safeW=CW*(1-sF*2);const safeH=(CH-topR-botR)*0.96;const av=Math.min(safeW,safeH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(CW-full)/2;const by=topR+(CH-topR-botR)/2;const y0=by-full/2;const pts=[];for(const idx of [0,1,2,6,g+3]){const col=idx%g,row=Math.floor(idx/g);pts.push([r.left+x0+col*(tile+gap)+tile/2,r.top+y0+row*(tile+gap)+tile/2]);}return pts;},MODE==='shitcoin'?7:5);
let settled=false;
for(const [cx,cy] of taps){await page.mouse.click(cx,cy);await wait(500);const t=(await page.evaluate(()=>document.body.innerText)).toLowerCase();if(t.includes('bust')||t.includes('bet again')){settled=true;break;}}
await page.screenshot({path:S+`${TAG}-3b-revealed-${MODE}.png`});
rep.phases.revealed=await probe('revealed');
// settle: take profit if available
if(!settled){await clickText('take profit');await wait(1600);}
await page.screenshot({path:S+`${TAG}-4settled-${MODE}.png`});
rep.phases.settled=await probe('settled');
// expand receipt
await clickText('view receipt');await wait(700);
await page.screenshot({path:S+`${TAG}-4b-receipt-${MODE}.png`});
rep.phases.receipt=await probe('receipt');

console.log(JSON.stringify(rep));
await browser.close();
