import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:5184/';
const OUT = 'shots';
const wait = ms => new Promise(r=>setTimeout(r,ms));

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1360, height: 900, deviceScaleFactor: 1 },
  args: ['--window-size=1400,980','--autoplay-policy=no-user-gesture-required']
});
const page = (await browser.pages())[0];
page.on('console', m => { const t=m.text(); if(/error|fail|warn/i.test(t)) console.log('PAGE>',t.slice(0,200)); });
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(3500);
await page.screenshot({ path: OUT+'/01-coldopen.png' });
// dump visible text nodes for transcript
const txt = await page.evaluate(()=>{
  const out=[];
  const walk=el=>{
    for(const n of el.childNodes){
      if(n.nodeType===3){ const t=n.textContent.trim(); if(t) out.push(t); }
      else if(n.nodeType===1){ const s=getComputedStyle(n); if(s.display!=='none'&&s.visibility!=='hidden') walk(n); }
    }
  };
  walk(document.body);
  return out;
});
console.log('VISIBLE TEXT:\n'+txt.join(' | '));
// dump clickable elements with positions
const btns = await page.evaluate(()=>{
  const els=[...document.querySelectorAll('button,[role=button],canvas')];
  return els.map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,txt:(e.textContent||'').trim().slice(0,40),x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}}).filter(e=>e.w>0);
});
console.log('CLICKABLES:\n'+JSON.stringify(btns,null,1));
await browser.close();
