import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5971';
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t){
  const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},t);
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function shot(page,name){await page.screenshot({path:OUT+'/'+name+'.png'});}
async function skipIntro(page){for(const t of ['got it','skip','continue']){await clickText(page,t);await wait(120);}}
async function crackCell(page,r,c,dim){return page.evaluate(({r,c,dim})=>{const cvs=document.querySelector('canvas');if(!cvs)return null;const rect=cvs.getBoundingClientRect();
  const gx0=rect.left+rect.width*0.10,gx1=rect.left+rect.width*0.90,gy0=rect.top+rect.height*0.28,gy1=rect.top+rect.height*0.80;
  const x=gx0+(gx1-gx0)*((c+0.5)/dim),y=gy0+(gy1-gy0)*((r+0.5)/dim);const el=document.elementFromPoint(x,y)||cvs;
  for(const t of ['pointerdown','mousedown','mouseup','click'])el.dispatchEvent(new MouseEvent(t,{clientX:x,clientY:y,bubbles:true}));return{x:Math.round(x),y:Math.round(y)};},{r,c,dim});}
async function sendVisible(page){return page.evaluate(()=>{const b=[...document.querySelectorAll('button,[role=button]')].find(x=>/send it/i.test(x.textContent));if(!b)return null;const r=b.getBoundingClientRect();
  // find scrolling ancestor
  let a=b.parentElement,sc=null;while(a){const cs=getComputedStyle(a);if(((cs.overflowY==='auto'||cs.overflowY==='scroll')&&a.scrollHeight>a.clientHeight+1)){sc=a;break;}a=a.parentElement;}
  return{top:Math.round(r.top),bottom:Math.round(r.bottom),h:Math.round(r.height),reachableInDoc:r.top>=0,pageScrolls:document.documentElement.scrollHeight>window.innerHeight+2,docSH:document.documentElement.scrollHeight,iw:window.innerWidth,ih:window.innerHeight};});}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=520,1000']});
  const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(1000);
  await shot(page,'m-lobby');
  await skipIntro(page);await clickText(page,'ape in');await wait(700);
  await shot(page,'m-betentry');
  const sv=await sendVisible(page);console.log('MOBILE betentry SEND:',JSON.stringify(sv));
  const bt1=await page.evaluate(()=>document.body.innerText.slice(0,400).replace(/\n+/g,' | '));console.log('betentry txt:',bt1);
  await clickText(page,'send it');await wait(900);
  await shot(page,'m-playing');
  const bt2=await page.evaluate(()=>document.body.innerText.slice(0,400).replace(/\n+/g,' | '));console.log('playing txt:',bt2);
  await crackCell(page,2,1,5);await wait(700);await crackCell(page,2,3,5);await wait(700);
  await shot(page,'m-playing-cracked');
  await clickText(page,'take profit');await wait(1000);
  await shot(page,'m-settled-win');
  const bt3=await page.evaluate(()=>document.body.innerText.slice(0,500).replace(/\n+/g,' | '));console.log('settled txt:',bt3);
  await page.close();await browser.close();console.log('DONE-MOBILE');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
