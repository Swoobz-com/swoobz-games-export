import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function status(page){ return page.evaluate(()=>({settled:!!document.querySelector('[data-testid="vault-settledpanel"]'),playing:!!document.querySelector('[data-testid="vault-ctl-wager-locked"]'),testids:[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')),body:(document.body.innerText||'').slice(0,200)})); }
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:'new'});
  let ok=false, attempt=0, page;
  while(!ok && attempt<8){
    attempt++;
    if(page) await page.close();
    page=await browser.newPage();
    await page.setViewport({width:1440,height:900,deviceScaleFactor:2});
    await page.evaluateOnNewDocument(()=>{localStorage.clear();sessionStorage.clear();});
    await page.goto('http://localhost:5390/',{waitUntil:'networkidle2',timeout:60000});
    await wait(1000);
    await page.evaluate(()=>{document.querySelector('[data-testid="vault-world-card-bluechips"]').click();});
    await wait(300);
    await page.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/send it/i.test(b.textContent)).click();});
    let s=await status(page);
    for(let i=0;i<10 && !s.playing;i++){await wait(200); s=await status(page);}
    if(!s.playing) continue;
    const c=await page.evaluate(({idx,g})=>{const cv=document.querySelector('canvas');const r=cv.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2),sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return{cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx:attempt,g:5});
    await page.mouse.click(c.cx,c.cy);
    let s2; for(let i=0;i<13;i++){await wait(200); s2=await status(page); if(s2.settled) break; const om=(s2.body.match(/OPEN (\d+)/)); if(om && parseInt(om[1])>0 && !s2.settled) break;}
    console.log('attempt',attempt, s2.playing, s2.settled, s2.body.slice(0,60));
    if(s2.playing && !s2.settled) ok=true;
  }
  if(!ok){console.log('gave up'); await browser.close(); return;}
  await page.evaluate(()=>{if(document.activeElement) document.activeElement.blur();});
  for(let i=0;i<4;i++){ await page.keyboard.press('Tab'); await wait(120); }
  const focused = await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent.trim().slice(0,30)}));
  console.log('focused before Enter:', JSON.stringify(focused));
  await page.keyboard.press('Enter');
  for(let i=0;i<10;i++){
    await wait(300);
    const s = await status(page);
    console.log(`+${(i+1)*300}ms`, 'playing',s.playing,'settled',s.settled,'body:',s.body.slice(0,80));
  }
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
