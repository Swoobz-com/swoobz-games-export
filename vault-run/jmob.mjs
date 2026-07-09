import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=412,H=915,S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:2,isMobile:true,hasTouch:true},args:[`--window-size=${W+20},${H+140}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3000);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN',t);return false;}await el.click();return true;}
await clickText('ape in');await wait(1400);
await clickText('send it');await wait(1500);
const g=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return {vw:innerWidth,vh:innerHeight,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom)};});
console.log('MOB GEO',JSON.stringify(g));
await page.screenshot({path:S+'V-M0-playing-full.png'});
// top-left corner crop for PUMP x overlap
await page.screenshot({path:S+'V-M1-topleft.png',clip:{x:g.x,y:g.y,width:Math.round(g.w*0.6),height:Math.round(g.h*0.30)}});
// bottom hint crop
await page.screenshot({path:S+'V-M2-bottomhint.png',clip:{x:g.x,y:g.y+Math.round(g.h*0.78),width:g.w,height:Math.round(g.h*0.22)}});
await browser.close();
console.log('DONE MOB');
