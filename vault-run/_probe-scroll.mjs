import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5782';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function clickText(page,t,within){const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;}
async function probe(page,w){
  return page.evaluate((W)=>{
    const IW=window.innerWidth,IH=window.innerHeight;
    // find all scrolling elements
    const all=[...document.querySelectorAll('*')];
    const scrollers=all.filter(e=>{const cs=getComputedStyle(e);const oy=cs.overflowY,ox=cs.overflowX;const vy=(oy==='auto'||oy==='scroll')&&e.scrollHeight>e.clientHeight+1;const vx=(ox==='auto'||ox==='scroll')&&e.scrollWidth>e.clientWidth+1;return vy||vx;}).map(e=>{const r=e.getBoundingClientRect();const tid=e.getAttribute('data-testid')||e.className&&String(e.className).slice(0,30)||e.tagName;return{tid,x:Math.round(r.x),right:Math.round(r.right),y:Math.round(r.y),bottom:Math.round(r.bottom),clientH:e.clientHeight,scrollH:e.scrollHeight,clientW:e.clientWidth,scrollW:e.scrollWidth,ovY:getComputedStyle(e).overflowY,ovX:getComputedStyle(e).overflowX};});
    // SEND IT button position + whether inside a scroller & below fold
    const btns=[...document.querySelectorAll('button,[role=button]')];
    const send=btns.find(b=>/send it/i.test(b.textContent));
    let sendInfo=null;
    if(send){const r=send.getBoundingClientRect();
      // find nearest scrolling ancestor
      let anc=send.parentElement,clipAnc=null;
      while(anc){const cs=getComputedStyle(anc);if(((cs.overflowY==='auto'||cs.overflowY==='scroll')&&anc.scrollHeight>anc.clientHeight+1)||((cs.overflowX==='auto'||cs.overflowX==='scroll')&&anc.scrollWidth>anc.clientWidth+1)){clipAnc=anc;break;}anc=anc.parentElement;}
      let belowFold=false,rightOfFold=false;
      if(clipAnc){const ar=clipAnc.getBoundingClientRect();belowFold=r.bottom>ar.bottom+1||r.top>ar.bottom;rightOfFold=r.right>ar.right+1;}
      sendInfo={top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),visible:r.bottom<=IH&&r.top>=0&&r.right<=IW,inScroller:!!clipAnc,clipAncTid:clipAnc?(clipAnc.getAttribute('data-testid')||'?'):null,belowFold,rightOfFold};
    }
    return {W,IW,IH,scrollers,sendInfo};
  },w);
}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=1980,1200']});
  for(const w of [1440,1920,1000,1200,1100]){
    const page=await browser.newPage();await page.setViewport({width:w,height:900,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(900);
    await clickText(page,'got it');await clickText(page,'skip');await wait(150);
    await clickText(page,'ape in');await wait(700);
    const p=await probe(page,w);
    console.log('\n=== width '+w+' === SEND:',JSON.stringify(p.sendInfo));
    console.log('  scrollers:',p.scrollers.length);
    for(const s of p.scrollers)console.log('   ',JSON.stringify(s));
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
