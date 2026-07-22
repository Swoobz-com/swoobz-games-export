import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=1920,H=1000,S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:2},args:[`--window-size=${W+20},${H+120}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3000);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
await clickText('ape in');await wait(1400);
await clickText('send it');await wait(1600);
// In playing phase, find the right-sidebar control panel and any element overflowing the viewport right edge or its own container.
const r=await page.evaluate(()=>{
  const vw=window.innerWidth;
  // find elements whose right edge exceeds viewport (horizontal clip off-screen)
  const off=[];
  for(const el of document.querySelectorAll('*')){
    if(el.offsetParent===null) continue;
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>vw+0.5){off.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,26),right:Math.round(r.right),over:Math.round(r.right-vw),txt:el.textContent.replace(/\s+/g,' ').trim().slice(0,26)});}
  }
  // the right-side control column: elements starting past x=1180
  const side=[...document.querySelectorAll('button,div')].filter(e=>{const b=e.getBoundingClientRect();return e.offsetParent&&b.x>1150&&b.width>40&&b.width<420&&b.height>18;}).slice(0,0);
  return {vw,offscreen:off.slice(0,12),phaseText:document.body.textContent.replace(/\s+/g,' ').slice(0,120)};
});
console.log(JSON.stringify(r,null,1));
await page.screenshot({path:S+'SIDE-P-playing-full.png'});
// crop right column
await page.screenshot({path:S+'SIDE-P-playing-side.png',clip:{x:1170,y:60,width:430,height:800}});
await browser.close();
console.log('DONE play');
