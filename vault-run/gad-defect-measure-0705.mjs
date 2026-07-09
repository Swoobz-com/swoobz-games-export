import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT=process.argv[2]||'5960';
const OUT=process.argv[3]||'shots-gad-defect-0705';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
if(!fs.existsSync(OUT))fs.mkdirSync(OUT,{recursive:true});

async function clickText(page,t,within){
  const h=await page.evaluateHandle(({t,within})=>{const root=within?document.querySelector(within):document;if(!root)return null;const els=[...root.querySelectorAll('button,[role=button]')];const lc=t.toLowerCase();return els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.trim().toLowerCase()===lc)||els.find(e=>e.offsetParent!==null&&!e.disabled&&e.textContent.toLowerCase().includes(lc))||null;},{t,within});
  const el=h.asElement();if(!el)return false;try{await el.click();}catch(e){return false;}return true;
}
async function box(page){return page.evaluate(()=>{const c=document.querySelector('canvas');if(!c)return null;const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});}
async function skipIntro(page){await clickText(page,'got it');await clickText(page,'skip');await clickText(page,'tap');await wait(200);}

async function measurePlaying(page, vp, tag) {
  await page.setViewport(vp);
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});
  await wait(800);
  await skipIntro(page);
  await clickText(page,'ape in');await wait(700);
  let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)s=await clickText(page,'send it');
  await wait(900);
  await page.screenshot({path:`${OUT}/${tag}-playing-full.png`});
  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom), top: Math.round(r.top), left: Math.round(r.left) };
    };
    const canvas = document.querySelector('canvas');
    const canvasR = rect(canvas);
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]') || canvas?.parentElement;
    const shellR = rect(shell);
    const playingRight = rect(document.querySelector('[data-testid="vault-playing-right"]'));
    const globe = rect(document.querySelector('[data-testid="vault-corner-world"]'));
    return { canvasR, shellR, playingRight, globe, W: window.innerWidth, H: window.innerHeight };
  });
  // Crop top-right corner of the canvas for visual proof
  if (data.canvasR) {
    const cropW = 320, cropH = 220;
    await page.screenshot({
      path: `${OUT}/${tag}-topright-crop.png`,
      clip: { x: Math.max(0, data.canvasR.x + data.canvasR.w - cropW), y: data.canvasR.y, width: cropW, height: cropH },
    });
  }
  return data;
}

async function measureSettled(page, vp, tag, mode) {
  await page.setViewport(vp);
  await page.goto('http://localhost:'+PORT+'/',{waitUntil:'networkidle0'});
  await wait(800);
  await skipIntro(page);
  await clickText(page,'ape in');await wait(700);
  let s=await clickText(page,'send it','[data-testid="vault-betentry-confirm"]');if(!s)s=await clickText(page,'send it');
  await wait(900);
  const bx = await box(page);
  if (mode === 'win') {
    await page.mouse.click(bx.x + bx.w * 0.5, bx.y + bx.h * 0.5);
    await wait(600);
    await clickText(page, 'take profit');
    await wait(1500);
  } else {
    const cells=[[0.5,0.5],[0.3,0.3],[0.7,0.3],[0.3,0.7],[0.7,0.7],[0.5,0.3],[0.5,0.7],[0.3,0.5],[0.7,0.5]];
    for(const c of cells){await page.mouse.click(bx.x+bx.w*c[0],bx.y+bx.h*c[1]);await wait(450);}
    await wait(1200);
  }
  await page.screenshot({path:`${OUT}/${tag}-settled-full.png`});
  const data = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const settledRight = document.querySelector('[data-testid="vault-settled-right"]');
    const gutterRight = document.querySelector('[data-testid="vault-gutter-right"]');
    // find "NEXT BET" stepper value node + "VIEW RECEIPT" toggle
    const findByText = (root, needle) => {
      if (!root) return [];
      const all = [...root.querySelectorAll('*')].filter(e => e.childElementCount === 0 && e.textContent && e.textContent.trim());
      return all.filter(e => e.textContent.trim().toUpperCase().includes(needle));
    };
    const nextBetVal = findByText(settledRight, 'USDC').map(e => ({
      text: e.textContent.trim(), rect: rect(e), clientRects: e.getClientRects().length,
      lineHeight: getComputedStyle(e).lineHeight, fontSize: getComputedStyle(e).fontSize, whiteSpace: getComputedStyle(e).whiteSpace,
    }));
    const viewReceiptBtns = [...document.querySelectorAll('button')].filter(b => b.textContent.toUpperCase().includes('RECEIPT'));
    const receiptBtnInfo = viewReceiptBtns.map(b => ({
      text: b.textContent.trim(), rect: rect(b),
      clientRects: [...b.querySelectorAll('*')].concat([b]).map(n => n.getClientRects().length),
      whiteSpace: getComputedStyle(b).whiteSpace,
    }));
    return {
      settledRightRect: rect(settledRight),
      gutterRightRect: rect(gutterRight),
      nextBetVal,
      receiptBtnInfo,
      pageScrollY: document.documentElement.scrollHeight > window.innerHeight + 1,
      pageScrollX: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
  return data;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1980,1200'] });
  const out = {};

  const p1 = await browser.newPage();
  out.playing1440 = await measurePlaying(p1, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'd1440');
  await p1.close();

  const p2 = await browser.newPage();
  out.playing1920 = await measurePlaying(p2, { width: 1920, height: 1080, deviceScaleFactor: 1 }, 'd1920');
  await p2.close();

  const p3 = await browser.newPage();
  out.settled1440 = await measureSettled(p3, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'd1440', 'win');
  await p3.close();

  const p4 = await browser.newPage();
  out.settled1920 = await measureSettled(p4, { width: 1920, height: 1080, deviceScaleFactor: 1 }, 'd1920', 'win');
  await p4.close();

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
