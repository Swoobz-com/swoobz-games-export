import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const S='shots/wide-390x844-';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true},args:['--window-size=410,980','--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5181/',{waitUntil:'networkidle2',timeout:60000});
await wait(1500);
await page.screenshot({path:S+'01-lobby.png'});
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}
await clickText('ape in'); await wait(700);
await page.screenshot({path:S+'02-bet-entry.png'});
await clickText('send it'); await wait(900);
await page.screenshot({path:S+'03-playing.png'});
const m = await page.evaluate(()=>{
  const board = document.querySelector('[data-testid="vault-canvas-shell"]');
  const canvas = document.querySelector('canvas');
  const r = canvas.getBoundingClientRect();
  return { vw: window.innerWidth, vh: window.innerHeight, cssW: r.width, cssH: r.height, backingW: canvas.width, backingH: canvas.height };
});
console.log('MOBILE MEASURE', JSON.stringify(m));
await browser.close();
