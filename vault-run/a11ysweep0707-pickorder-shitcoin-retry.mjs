import puppeteer from 'puppeteer-core';
import { PNG } from 'pngjs';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function luminance([r,g,b]){const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
function ratio(fg,bg){const L1=luminance(fg)+0.05,L2=luminance(bg)+0.05;return L1>L2?L1/L2:L2/L1;}
function px(png,x,y){const idx=(png.width*Math.min(Math.max(y,0),png.height-1)+Math.min(Math.max(x,0),png.width-1))<<2;return[png.data[idx],png.data[idx+1],png.data[idx+2]];}
function extremes(png){let minL=Infinity,maxL=-Infinity,minC=null,maxC=null;for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++){const c=px(png,x,y);const l=luminance(c);if(l<minL){minL=l;minC=c;}if(l>maxL){maxL=l;maxC=c;}}return{minC,maxC};}
(async()=>{
  const browser=await puppeteer.launch({executablePath:CHROME,headless:'new'});
  let attempt=0, ok=false;
  while(attempt<5 && !ok){
    attempt++;
    const page=await browser.newPage();
    await page.evaluateOnNewDocument(()=>{localStorage.clear();sessionStorage.clear();window.__log=[];const o=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,x,y){if(/^\d{1,3}$/.test(String(t))){window.__log.push({t:String(t),x,y,style:String(this.fillStyle),font:String(this.font)});}return o.apply(this,arguments);};});
    await page.setViewport({width:1440,height:900,deviceScaleFactor:3});
    await page.goto('http://localhost:5390/',{waitUntil:'networkidle2',timeout:60000});
    await wait(1200);
    await page.evaluate(()=>{document.querySelector('[data-testid="vault-world-card-shitcoin"]').click();});
    await wait(300);
    await page.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/send it/i.test(b.textContent)).click();});
    await wait(700);
    const g=7;
    for(let i=0;i<3;i++){
      const settled=await page.evaluate(()=>!!document.querySelector('[data-testid="vault-settledpanel"]'));
      if(settled) break;
      const c=await page.evaluate(({idx,g})=>{const cv=document.querySelector('canvas');const r=cv.getBoundingClientRect();const W=r.width,H=r.height;const tR=H*0.15,bR=H*0.18,sF=0.08;const sW=W*(1-sF*2);const sH=(H-tR-bR)*0.96;const av=Math.min(sW,sH);const gap=Math.max(6,av*0.026);const tile=(av-gap*(g-1))/g;const full=tile*g+gap*(g-1);const x0=(W-full)/2;const by=tR+(H-tR-bR)/2;const y0=by-full/2;const col=idx%g,row=Math.floor(idx/g);return{cx:r.left+x0+col*(tile+gap)+tile/2,cy:r.top+y0+row*(tile+gap)+tile/2};},{idx:i,g});
      await page.mouse.click(c.cx,c.cy);
      await wait(650);
    }
    const canvasRect=await page.evaluate(()=>{const c=document.querySelector('canvas');const r=c.getBoundingClientRect();return{left:r.left,top:r.top};});
    const log=await page.evaluate(()=>window.__log||[]);
    const cands=log.filter(e=>/^rgba\(255,\s*255,\s*255,/.test(e.style));
    const seen=new Map(); for(const e of cands) seen.set(`${e.t}@${Math.round(e.x)},${Math.round(e.y)}`,e);
    const uniq=[...seen.values()];
    console.log('attempt',attempt,'uniq count',uniq.length);
    if(uniq.length){
      ok=true;
      for(const e of uniq){
        const pageX=canvasRect.left+e.x, pageY=canvasRect.top+e.y;
        const m=/([\d.]+)px/.exec(e.font); const fontPx=m?parseFloat(m[1]):12;
        const halfW=Math.max(6,fontPx*0.55*e.t.length), halfH=Math.max(6,fontPx*0.62);
        const clip={x:Math.max(0,pageX-halfW),y:Math.max(0,pageY-halfH),width:halfW*2,height:halfH*2};
        const buf=await page.screenshot({clip}); fs.writeFileSync(`shots-a11ysweep-2026-07-07/pickorder-shitcoin-${e.t}-tight.png`,buf);
        const png=PNG.sync.read(Buffer.from(buf)); const {minC,maxC}=extremes(png);
        console.log(JSON.stringify({text:e.t,ratio:+ratio(maxC,minC).toFixed(2),fg:maxC,bg:minC}));
        const wide={x:Math.max(0,pageX-20),y:Math.max(0,pageY-20),width:40,height:40};
        const bufw=await page.screenshot({clip:wide}); fs.writeFileSync(`shots-a11ysweep-2026-07-07/pickorder-shitcoin-${e.t}-wide.png`,bufw);
      }
    }
    await page.close();
  }
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
