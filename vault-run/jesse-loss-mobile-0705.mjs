// jesse-loss-mobile-0705.mjs — capture a RUG (loss) on desktop for Q4,
// then a mobile 390x844 sanity pass on the two suspects.
import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5402';
const OUT = process.argv[3] || 'shots-jesse-lossmob-0705';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement(); if (!el) return false; await el.click(); return true;
}
async function isSettled(page) {
  return page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]') || !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function settledText(page) {
  return page.evaluate(() => {
    const t = ['vault-settled-banner','vault-settledpanel'].map(id=>document.querySelector(`[data-testid="${id}"]`)).find(Boolean);
    const top = document.querySelector('body')?.innerText.split('\n').slice(0,2).join(' ');
    return { banner: t ? t.textContent.replace(/\s+/g,' ').trim().slice(0,140) : null, topbar: (top||'').slice(0,80) };
  });
}
async function clickCanvas(page, fx, fy) {
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};});
  if(!box) return; await page.mouse.click(box.x+box.w*fx, box.y+box.h*fy);
}

async function run() {
  // ── DESKTOP LOSS ─────────────────────────────────────────────
  const b1 = await puppeteer.launch({ executablePath: CHROME, headless:false, args:['--window-size=1500,1000'] });
  const p = await b1.newPage(); await p.setViewport({width:1440,height:900});
  await p.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle2'}); await wait(600);
  await clickText(p,'ape in'); await wait(500);
  await clickText(p,'SEND IT'); await wait(700);
  await clickText(p,'MANUAL'); await wait(300);
  // crack many tiles WITHOUT taking profit until it rugs
  const cells = []; for(let gy=1;gy<=5;gy++) for(let gx=1;gx<=5;gx++) cells.push([gx/6, gy/6]);
  for (const [fx,fy] of cells) { if(await isSettled(p)) break; await clickCanvas(p,fx,fy); await wait(300); }
  await wait(600);
  await p.screenshot({ path: `${OUT}/desktop-loss.png` });
  const loss = await settledText(p);
  await b1.close();

  // ── MOBILE 390x844 suspects ─────────────────────────────────
  const b2 = await puppeteer.launch({ executablePath: CHROME, headless:false, args:['--window-size=430,900'] });
  const m = await b2.newPage(); await m.setViewport({width:390,height:844});
  await m.goto(`http://localhost:${PORT}/`, {waitUntil:'networkidle2'}); await wait(600);
  await m.screenshot({ path: `${OUT}/mobile-01-lobby.png` });
  await clickText(m,'ape in'); await wait(600);
  await m.screenshot({ path: `${OUT}/mobile-02-betentry.png` });
  const mprobe = await m.evaluate(() => {
    const vh = window.innerHeight;
    const btns=[...document.querySelectorAll('button,[role=button]')];
    const send = btns.find(b=>/send it/i.test(b.textContent||''));
    let sendInfo=null;
    if(send){const r=send.getBoundingClientRect(); sendInfo={top:Math.round(r.top),bottom:Math.round(r.bottom),belowFold:r.top>vh,visible:send.offsetParent!==null};}
    const steppers=[...document.querySelectorAll('*')].filter(e=>/USDC/.test(e.textContent||'')&&e.querySelectorAll('button').length>=2&&e.children.length<8);
    const col=document.querySelector('[data-testid="vault-control-column"]');
    return { vh, sendInfo, colScrolls: col? col.scrollHeight>col.clientHeight+1:null, colScrollH: col?col.scrollHeight:null, colClientH: col?col.clientHeight:null };
  });
  await b2.close();
  const R = { desktopLoss: loss, mobile: mprobe };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R,null,2));
  console.log(JSON.stringify(R,null,2));
}
run().catch(e=>{console.error(e);process.exit(1);});
