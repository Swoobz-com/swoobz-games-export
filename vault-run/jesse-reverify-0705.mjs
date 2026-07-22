import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT='5971';
const OUT='C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad';
const wait=ms=>new Promise(r=>setTimeout(r,ms));

async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{
    const root=within?document.querySelector(within):document;if(!root)return null;
    const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();
    return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)
      ||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;
  },{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}

async function probe(page){
  return page.evaluate(()=>{
    const IW=window.innerWidth,IH=window.innerHeight;
    const all=[...document.querySelectorAll('*')];
    const scrollers=all.filter(e=>{const cs=getComputedStyle(e);const oy=cs.overflowY,ox=cs.overflowX;
      const vy=(oy==='auto'||oy==='scroll')&&e.scrollHeight>e.clientHeight+1;
      const vx=(ox==='auto'||ox==='scroll')&&e.scrollWidth>e.clientWidth+1;return vy||vx;})
      .map(e=>{const r=e.getBoundingClientRect();const tid=e.getAttribute('data-testid')||(e.className&&String(e.className).slice(0,26))||e.tagName;
        return{tid,x:Math.round(r.x),right:Math.round(r.right),y:Math.round(r.y),bottom:Math.round(r.bottom),
          clientH:e.clientHeight,scrollH:e.scrollHeight,clientW:e.clientWidth,scrollW:e.scrollWidth,
          ovY:getComputedStyle(e).overflowY,ovX:getComputedStyle(e).overflowX};});
    const btns=[...document.querySelectorAll('button,[role=button]')];
    const send=btns.find(b=>/send it/i.test(b.textContent));
    let sendInfo=null;
    if(send){const r=send.getBoundingClientRect();
      let anc=send.parentElement,clipAnc=null;
      while(anc){const cs=getComputedStyle(anc);
        if(((cs.overflowY==='auto'||cs.overflowY==='scroll')&&anc.scrollHeight>anc.clientHeight+1)||
           ((cs.overflowX==='auto'||cs.overflowX==='scroll')&&anc.scrollWidth>anc.clientWidth+1)){clipAnc=anc;break;}anc=anc.parentElement;}
      let belowFold=false,rightOfFold=false;
      if(clipAnc){const ar=clipAnc.getBoundingClientRect();belowFold=r.bottom>ar.bottom+1||r.top>ar.bottom;rightOfFold=r.right>ar.right+1;}
      sendInfo={text:send.textContent.trim().slice(0,40),top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right),h:Math.round(r.height),
        visibleInViewport:r.bottom<=IH&&r.top>=0&&r.right<=IW&&r.left>=0,inScroller:!!clipAnc,clipAncTid:clipAnc?(clipAnc.getAttribute('data-testid')||'?'):null,belowFold,rightOfFold};
    }
    const truncs=[];
    for(const e of all){
      const txt=(e.textContent||'').trim();
      if(!txt)continue;
      if(e.children.length>0)continue;
      if(!/NORMAL|HARD|CRAZY|RUGS|USDC|SEND IT|safe|YOUR BET|NEXT BET|VIEW RECEIPT|IF NEXT/i.test(txt))continue;
      const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
      if(r.width===0)continue;
      const clipped=e.scrollWidth>e.clientWidth+1;
      const offRight=r.right>IW+1;const offLeft=r.left<-1;
      const wraps=r.height>parseFloat(cs.fontSize)*1.8;
      truncs.push({txt:txt.slice(0,34),clipped,offRight,offLeft,wraps,x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),h:Math.round(r.height),ws:cs.whiteSpace});
    }
    const rg=document.querySelector('[data-testid=vault-betentry-right]')||document.querySelector('[data-testid=vault-play-right]');
    let rightGutter=null;
    if(rg){const r=rg.getBoundingClientRect();rightGutter={tid:rg.getAttribute('data-testid'),x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),clientW:rg.clientWidth,scrollW:rg.scrollWidth,offRight:r.right>IW+1,ovX:getComputedStyle(rg).overflowX,ovY:getComputedStyle(rg).overflowY};}
    const topText=document.body.innerText.slice(0,700).replace(/\n+/g,' | ');
    return {IW,IH,scrollers:scrollers.length,scrollerDetail:scrollers,sendInfo,truncs,rightGutter,topText};
  });
}

async function shot(page,name){await page.screenshot({path:OUT+'/'+name+'.png'});}
async function skipIntro(page){for(const t of ['got it','skip','continue']){await clickText(page,t);await wait(120);}}
async function driveToBetEntry(page){await skipIntro(page);await wait(200);await clickText(page,'ape in');await wait(800);}

(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:false,args:['--autoplay-policy=no-user-gesture-required','--window-size=2000,1200']});
  for(const w of [1000,1440]){
    const page=await browser.newPage();await page.setViewport({width:w,height:900,deviceScaleFactor:1});
    await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});await wait(1000);
    await shot(page,'lobby-'+w);
    await driveToBetEntry(page);await wait(500);
    await shot(page,'betentry-'+w);
    const p=await probe(page);
    console.log('\n===== BETENTRY width '+w+' =====');
    console.log('topText:',p.topText.slice(0,260));
    console.log('SEND:',JSON.stringify(p.sendInfo));
    console.log('rightGutter:',JSON.stringify(p.rightGutter));
    console.log('scrollers:',p.scrollers);
    for(const s of p.scrollerDetail)console.log('  SCROLLER',JSON.stringify(s));
    console.log('truncs:');for(const t of p.truncs)console.log('  ',JSON.stringify(t));
    await page.close();
  }
  await browser.close();
  console.log('\nDONE-PART-A');
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
