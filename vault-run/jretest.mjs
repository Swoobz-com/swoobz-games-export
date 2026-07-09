import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1360,height:900,deviceScaleFactor:1},args:['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2'});
await wait(3000);

const S='shots/';
async function texts(){return await page.evaluate(()=>{const o=[];const w=e=>{for(const n of e.childNodes){if(n.nodeType===3){const t=n.textContent.trim();if(t)o.push(t);}else if(n.nodeType===1){const s=getComputedStyle(n);if(s.display!=='none'&&s.visibility!=='hidden')w(n);}}};w(document.body);return o;});}
async function shot(name){await page.screenshot({path:S+name+'.png'});}
async function dump(name){await shot(name);const t=await texts();console.log('\n=== ['+name+'] ===\n'+t.join(' | '));}
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function cellCenter(idx){return await page.evaluate((idx)=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const gridSize=5;const topReserved=H*0.15,bottomReserved=H*0.18,sideFrac=0.08;const safeW=W*(1-sideFrac*2);const safeH=(H-topReserved-bottomReserved)*0.96;const available=Math.min(safeW,safeH);const gap=Math.max(6,available*0.026);const tile=(available-gap*(gridSize-1))/gridSize;const full=tile*gridSize+gap*(gridSize-1);const x0=(W-full)/2;const bandCenterY=topReserved+(H-topReserved-bottomReserved)/2;const y0=bandCenterY-full/2;const col=idx%gridSize,row=Math.floor(idx/gridSize);const cx=r.left+x0+col*(tile+gap)+tile/2;const cy=r.top+y0+row*(tile+gap)+tile/2;return {cx,cy};},idx);}
async function tapCell(idx){const {cx,cy}=await cellCenter(idx);await page.mouse.click(cx,cy);}
async function endedRug(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bust')||t.includes('before the rug');}
async function isSettled(){const t=(await texts()).join(' ').toLowerCase();return t.includes('bet again')||t.includes('ownership points');}

// 1. COLD
await dump('R-01-cold');
// 2. HELP overlay
if(await clickText('?')){await wait(700);await dump('R-02-help');
  // capture the TRAIL paragraph specifically
  const trail=await page.evaluate(()=>{const el=[...document.querySelectorAll('p')].find(p=>/TRAIL|drag/i.test(p.textContent));return el?el.textContent.trim():'(not found)';});
  console.log('\n>>> TRAIL HELP COPY:\n'+trail+'\n');
  const banks=await page.evaluate(()=>document.body.innerText.toLowerCase().includes('banks automatically'));
  console.log('>>> contains "banks automatically"? '+banks);
  await clickText('close')||await page.keyboard.press('Escape');await wait(500);
}
// 3. APE IN -> bet entry
await clickText('ape in');await wait(900);await dump('R-03-betentry');
// place bet
await clickText('ape in')||await clickText('place')||await clickText('confirm')||await clickText('deal');
await wait(1400);await dump('R-04-playing');
// 4. First tap -> NEXT SAFE preview
await tapCell(12);await wait(700);await dump('R-05-firsttap');
// keep tapping until rug (settled)
let ended=false;
for(let i=0;i<25 && !ended;i++){ if(i===12)continue; await tapCell(i);await wait(450); if(await isSettled()){ended=true;} }
await wait(700);
await dump('R-06-settlement');
const rug=await endedRug();
// read the big multiplier / delta region text near settlement
console.log('>>> settlement shows BUST region? '+rug);
await browser.close();
console.log('\nDONE');
