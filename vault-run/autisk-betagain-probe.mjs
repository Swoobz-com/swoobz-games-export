import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5187';
const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(t.toLowerCase()));},{t,within});const el=h.asElement();if(!el)return false;await el.click();return true;}
const isSettled=(p)=>p.evaluate(()=>!!document.querySelector('[data-testid="vault-settled-betagain"]'));
(async()=>{
  const b=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--no-sandbox']});
  const page=await b.newPage(); await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  let done=false;
  for(let a=0;a<12&&!done;a++){
    await page.goto(`http://localhost:${PORT}/`,{waitUntil:'networkidle0'});await wait(500);
    await clickText(page,'ape in');await wait(500);
    await clickText(page,'SEND IT','[data-testid="vault-betentry-confirm"]');await wait(700);
    const box=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
    await page.mouse.click(box.x+box.w*0.5,box.y+box.h*0.5);await wait(600);
    if(await isSettled(page)) continue;
    await page.evaluate(()=>{const btn=[...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find(x=>/take profit/i.test(x.textContent));if(btn&&!btn.disabled)btn.click();});
    await wait(900);
    if(await isSettled(page)) done=true;
  }
  const info=await page.evaluate(()=>{
    const btns=[...document.querySelectorAll('button')].filter(b=>/bet again/i.test(b.textContent)&&b.offsetParent!==null);
    return btns.map(b=>{const r=b.getBoundingClientRect();const cs=getComputedStyle(b);
      // find nearest ancestor with data-testid
      let a=b,tid=null;while(a&&a!==document.body){if(a.dataset&&a.dataset.testid){tid=a.dataset.testid;break;}a=a.parentElement;}
      return{text:b.textContent.trim(),x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bg:cs.backgroundColor,ancestorTestid:tid};});
  });
  console.log('SETTLED?',await isSettled(page));
  console.log(JSON.stringify(info,null,2));
  await b.close();
})();
