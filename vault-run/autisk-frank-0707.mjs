import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.env.PORT||'5390';
const OUT='shots-autisk-frank-0707';
if(!fs.existsSync(OUT))fs.mkdirSync(OUT);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const WORLDS=['bluechips','altseason','shitcoin'];
async function clickText(page,t){
  const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},t);
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function clickSel(page,sel){const h=await page.$(sel);if(!h)return false;try{await h.click();}catch(e){return false;}return true;}
async function fresh(page){
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});
  await page.evaluate(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){}});
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(900);
  await clickText(page,'got it');await wait(200);
}
async function probe(page){
  return await page.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const bd=q('[data-testid="vault-grid-backdrop"]');
    const cv=document.querySelector('canvas');
    const cr=cv?cv.getBoundingClientRect():null;
    const grab=id=>{const e=q('[data-testid="'+id+'"]');if(!e)return null;const c=getComputedStyle(e);const r=e.getBoundingClientRect();return{bg:c.backgroundImage!=='none'?c.backgroundImage.slice(0,60):c.backgroundColor,bc:c.borderTopColor,bw:c.borderTopWidth,brad:c.borderTopLeftRadius,shadow:c.boxShadow.slice(0,120),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};};
    const plates={};
    document.querySelectorAll('[data-testid^="vault-ctl-"]').forEach(e=>{const id=e.getAttribute('data-testid');const c=getComputedStyle(e);const r=e.getBoundingClientRect();if(r.width<2)return;plates[id]={bg:c.backgroundImage!=='none'?c.backgroundImage.slice(0,50):c.backgroundColor,bc:c.borderTopColor,bw:c.borderTopWidth,brad:c.borderTopLeftRadius,shadow:c.boxShadow.slice(0,120),rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};});
    return {
      mode:(document.body.textContent.match(/BLUECHIPS|ALTSEASON|SHITCOIN/)||[])[0],
      bdImg:bd?getComputedStyle(bd).backgroundImage.slice(0,90):null,
      canvasRect:cr?[Math.round(cr.x),Math.round(cr.y),Math.round(cr.width),Math.round(cr.height)]:null,
      plates,
      bannerTxt:(document.body.textContent.match(/\d+ SAFES OPENED[^\n]{0,40}/)||[])[0]||null,
    };
  });
}
function cells(){ // 5x5 centers @1440x900 per memory board rect
  const cx=[324,436,548,660,772], cy=[274,386,498,610,722];const out=[];
  for(const y of cy)for(const x of cx)out.push([x,y]);return out;
}
async function drive(page,vw,vh,world,tag,mode){ // mode 'win'|'loss'
  await fresh(page);
  await clickSel(page,'[data-testid="vault-world-card-'+world+'"]');await wait(500);
  const pBet=await probe(page);
  await page.screenshot({path:`${OUT}/${world}-betentry-${tag}.png`});
  await clickText(page,'send it');await wait(1200);
  const pPlay=await probe(page);
  await page.screenshot({path:`${OUT}/${world}-playing-${tag}.png`});
  const C=cells();
  const order = mode==='win'?[C[12]]:[C[0],C[24],C[4],C[20],C[12],C[6],C[18],C[8],C[16],C[2],C[22],C[10]];
  let rugged=false;
  for(const [x,y] of order){
    if(vw!==1440){break;}
    try{await page.mouse.click(x,y);}catch(e){}
    await wait(450);
    const rug=await page.evaluate(()=>/RUGGED/.test(document.body.textContent));
    if(rug){rugged=true;break;}
  }
  if(mode==='win'&&!rugged){await clickText(page,'take profit');await wait(300);await clickText(page,'take profit');}
  await wait(1400);
  const pSet=await probe(page);
  await page.screenshot({path:`${OUT}/${world}-settled-${tag}-${rugged?'RUG':'WIN'}.png`});
  console.log(`[${tag}] ${world} mode=${pBet.mode} bd=${(pBet.bdImg||'').slice(0,40)} banner=${pSet.bannerTxt} rugged=${rugged}`);
  return {bet:pBet,play:pPlay,set:pSet,rugged};
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1480,960']});
  const page=await browser.newPage();
  const errs=[];page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,160));});page.on('pageerror',e=>errs.push('PAGEERR '+e.message.slice(0,160)));
  const R={desktop1440:{},desktop1920:{}};
  await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
  for(const w of WORLDS){R.desktop1440[w+'-win']=await drive(page,1440,900,w,'d1440',(w==='bluechips')?'win':'win');}
  // loss runs at 1440 for scrim symmetry (all worlds)
  for(const w of WORLDS){R.desktop1440[w+'-loss']=await drive(page,1440,900,w,'d1440L','loss');}
  await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
  R.desktop1920['bluechips']=await drive(page,1920,1080,'bluechips','d1920','win');
  console.log('CONSOLE_ERRORS='+JSON.stringify([...new Set(errs)]));
  console.log('PROBE1440='+JSON.stringify(R.desktop1440));
  fs.writeFileSync(OUT+'/probe.json',JSON.stringify(R,null,1));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
