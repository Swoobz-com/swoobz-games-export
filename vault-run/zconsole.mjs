import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:1920,height:1080,deviceScaleFactor:1},args:['--window-size=1940,1220']});
const page=(await browser.pages())[0];
const msgs=[];
page.on('console', m => { if(['error','warning'].includes(m.type())) msgs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => msgs.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
await clickText('ape in');await wait(1000);
await clickText('send it');await wait(1000);
async function cellCenter(idx,g){return await page.evaluate(({idx,g})=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return {cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx,g});}
for (const idx of [1,6,11,16,21]) { const {cx,cy}=await cellCenter(idx,5); await page.mouse.click(cx,cy); await wait(500); }
await clickText('take profit'); await wait(1200);
await clickText('bet again'); await wait(1200);
console.log('CONSOLE MESSAGES:', msgs.length ? JSON.stringify(msgs,null,1) : 'none');
await browser.close();
