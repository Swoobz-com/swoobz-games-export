import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t){const h=await page.evaluateHandle((t)=>{const e=[...document.querySelectorAll('button,[role=button]')];return e.find(x=>x.offsetParent!==null&&!x.disabled&&x.textContent.trim().toLowerCase()===t.toLowerCase())||e.find(x=>x.offsetParent!==null&&!x.disabled&&x.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el)return false;await el.click();return true;}
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--window-size=430,900']});
  const p=await b.newPage(); await p.setViewport({width:390,height:844});
  await p.goto('http://localhost:5411/',{waitUntil:'networkidle2'}); await wait(700);
  await clickText(p,'ape in'); await wait(600);
  // scroll to bottom of page to reveal SEND IT
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await wait(500);
  await p.screenshot({path:'shots-jesse-reverify-0705-mob/02c-betentry-scrolled.png'});
  const send=await p.evaluate(()=>{const e=[...document.querySelectorAll('button,[role=button]')].find(x=>/send it/i.test(x.textContent||'')&&x.offsetParent!==null);if(!e)return null;const r=e.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),inVP:r.top>=0&&r.bottom<=844,w:Math.round(r.width)};});
  console.log('SEND IT after scroll:',JSON.stringify(send));
  await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
