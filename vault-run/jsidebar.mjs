import puppeteer from 'puppeteer-core';
const EXE='C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const W=parseInt(process.argv[2]||'1920'), H=parseInt(process.argv[3]||'1000'), TAG=process.argv[4]||'D', DSF=parseInt(process.argv[5]||'2');
const S='shots/';
const browser=await puppeteer.launch({executablePath:EXE,headless:false,defaultViewport:{width:W,height:H,deviceScaleFactor:DSF},args:[`--window-size=${W+20},${H+120}`,'--autoplay-policy=no-user-gesture-required']});
const page=(await browser.pages())[0];
await page.goto('http://localhost:5184/',{waitUntil:'networkidle2',timeout:60000});
await wait(3000);
async function clickText(t){const h=await page.evaluateHandle((t)=>{const els=[...document.querySelectorAll('button,[role=button]')];return els.find(e=>e.offsetParent!==null&&e.textContent.trim().toLowerCase()===t.toLowerCase())||els.find(e=>e.offsetParent!==null&&e.textContent.toLowerCase().includes(t.toLowerCase()));},t);const el=h.asElement();if(!el){console.log('NO BTN:',t);return false;}await el.click();return true;}

await clickText('ape in');await wait(1600);

// Measure the bet-console panel and every key inner element vs the panel content box.
const report=await page.evaluate(()=>{
  const panel=document.querySelector('[data-testid="bet-console"]');
  if(!panel) return {error:'no bet-console panel found'};
  const pr=panel.getBoundingClientRect();
  const cs=getComputedStyle(panel);
  const padL=parseFloat(cs.paddingLeft), padR=parseFloat(cs.paddingRight);
  const contentL=pr.left+padL, contentR=pr.right-padR;
  const out={panel:{x:Math.round(pr.x),y:Math.round(pr.y),w:Math.round(pr.width),h:Math.round(pr.height),padL,padR,boxSizing:cs.boxSizing,overflowX:cs.overflowX},contentL:Math.round(contentL),contentR:Math.round(contentR),items:[]};
  // find text nodes / elements by their visible text
  const wanted=['your bag','BLUECHIPS','ALTSEASON','SHITCOIN','YOUR BEST','PICK YOUR WORLD','more rugs','RUGS','per tap starts','TO WIN','max ','BALANCE','AUTO-EXIT','cancel','SEND IT'];
  const all=[...panel.querySelectorAll('*')];
  const seen=new Set();
  for(const w of wanted){
    // pick the deepest/smallest element whose OWN text (direct) contains the phrase
    let best=null;
    for(const el of all){
      if(el.offsetParent===null && el.getClientRects().length===0) continue;
      const direct=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
      if(direct.toLowerCase().includes(w.toLowerCase())){
        if(!best || el.getBoundingClientRect().width<best.getBoundingClientRect().width) best=el;
      }
    }
    if(!best){
      // fallback: any element containing it
      for(const el of all){ if(el.textContent.toLowerCase().includes(w.toLowerCase())){best=el;break;} }
    }
    if(best){
      const r=best.getBoundingClientRect();
      const rightOverflow=Math.round(r.right-contentR);
      const leftUnder=Math.round(r.left-contentL);
      const clippedRight=r.right>pr.right-0.5; // past panel outer edge
      out.items.push({label:w,x:Math.round(r.x),right:Math.round(r.right),w:Math.round(r.width),rightVsContent:rightOverflow,leftVsContent:leftUnder,pastPanelEdge:clippedRight});
    } else {
      out.items.push({label:w,MISSING:true});
    }
  }
  // world card row
  const row=panel.querySelector('.vault-mode-row');
  if(row){const rr=row.getBoundingClientRect();const rc=getComputedStyle(row);out.modeRow={cols:rc.gridTemplateColumns,x:Math.round(rr.x),w:Math.round(rr.width),right:Math.round(rr.right),rightVsContent:Math.round(rr.right-contentR)};
    // count card children widths
    out.cards=[...row.children].map(c=>{const cr=c.getBoundingClientRect();return {x:Math.round(cr.x),w:Math.round(cr.width),right:Math.round(cr.right),txt:c.textContent.replace(/\s+/g,' ').trim().slice(0,40)};});
  }
  // any element inside panel that overflows the panel right edge
  out.overflowers=[];
  for(const el of all){
    const r=el.getBoundingClientRect();
    if(r.width>0 && r.right>pr.right+0.5 && (el.offsetParent!==null)){
      out.overflowers.push({tag:el.tagName,cls:(el.className||'').toString().slice(0,30),right:Math.round(r.right),over:Math.round(r.right-pr.right),txt:el.textContent.replace(/\s+/g,' ').trim().slice(0,30)});
    }
  }
  return out;
});
console.log('=== TAG',TAG,W+'x'+H,'DSF'+DSF,'===');
console.log(JSON.stringify(report,null,1));

// hi-DPI crop of the sidebar region. Clip is in CSS px; use panel rect + margin.
const pr=report.panel;
if(pr){
  const clip={x:Math.max(0,pr.x-16),y:Math.max(0,pr.y-16),width:Math.min(W-(pr.x-16),pr.w+40),height:Math.min(H-(pr.y-16),pr.h+40)};
  await page.screenshot({path:S+`SIDE-${TAG}-betentry.png`,clip});
  console.log('CROP saved SIDE-'+TAG+'-betentry.png clip',JSON.stringify(clip));
}
await page.screenshot({path:S+`SIDE-${TAG}-full.png`});
await browser.close();
console.log('DONE',TAG);
