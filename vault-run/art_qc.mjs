import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1920'), H=parseInt(process.argv[3]||'1000'), TAG=process.argv[4]||'QD';
const DSF=parseInt(process.argv[5]||'1');
const S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:DSF},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3200);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
async function texts(){return await page.evaluate(()=>document.body.textContent.replace(/\s+/g,' ').trim().slice(0,200));}
async function cc(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
async function tap(idx,g){const{cx,cy}=await cc(idx,g);await page.mouse.click(cx,cy);}
function isBust(t){t=t.toLowerCase();return t.includes('bust')||t.includes('rugged')||t.includes('sbf')||t.includes('horrendous');}

console.log('=== TAG',TAG,W,'x',H,'dsf',DSF,'===');
await page.screenshot({path:S+`${TAG}-1lobby.png`});
console.log('LOBBY:',await texts());

await clickText('ape in');await wait(1500);
await page.screenshot({path:S+`${TAG}-2betentry.png`});
console.log('BETENTRY:',await texts());

await clickText('send it');await wait(1600);
// reveal several coins
for(const idx of [12,6,18,8,16]){await tap(idx,5);await wait(700);const t=await texts();if(isBust(t)){console.log('early bust at',idx);break;}}
await page.screenshot({path:S+`${TAG}-3playing-reveals.png`});
console.log('PLAYING:',await texts());

// take profit if still alive
let t=await texts();
if(!isBust(t)){await clickText('take profit');await wait(1800);await page.screenshot({path:S+`${TAG}-4takeprofit.png`});console.log('TAKEPROFIT:',await texts());}
else {await page.screenshot({path:S+`${TAG}-4bust-fromplay.png`});}

// force a rug: new round, tap until bust
await clickText('bet again')||await clickText('ape in');await wait(1200);
await clickText('send it');await wait(1400);
let busted=false;
for(let k=0;k<25&&!busted;k++){await tap(k,5);await wait(520);busted=isBust(await texts());}
await wait(900);
await page.screenshot({path:S+`${TAG}-5rughit.png`});
console.log('RUGHIT:',await texts(),'busted=',busted);

await browser.close();
console.log('DONE',TAG);
