import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  await page.mouse.click(box.x + box.w*fx, box.y + box.h*fy);
}
async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await clickText(page, 'ape in'); await wait(500);
  await clickText(page, 'SEND IT'); await wait(700);
  await clickText(page, 'MANUAL'); await wait(300);
  let taps=0;
  const isSettled = async () => page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-banner"]'));
  for (let gx=1; gx<=9 && !(await isSettled()); gx++) {
    for (let gy=1; gy<=9; gy++) {
      if (await isSettled()) break;
      await clickCanvasFraction(page, gx/10, gy/10); taps++; await wait(220);
      if (taps>=3) { const t = await clickText(page,'take profit'); if (t) await wait(900); }
      if (await isSettled()) break;
    }
  }
  await wait(1800); // let the transient hero overlay fade so it doesn't cover the receipt toggle
  await clickText(page, 'view receipt');
  await wait(400);
  const info = await page.evaluate(() => {
    const body = document.getElementById('vault-settled-receipt');
    const panel = document.querySelector('[data-testid="vault-ctl-receipt"]');
    if (!body || !panel) return { found: false };
    const b = body.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const cs = getComputedStyle(body);
    return {
      found: true,
      bodyRect: { top: b.top, bottom: b.bottom, height: b.height },
      panelRect: { top: p.top, bottom: p.bottom },
      overflowY: cs.overflowY,
      maxHeight: cs.maxHeight,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
      isScrollable: body.scrollHeight > body.clientHeight,
      rowCount: body.querySelectorAll('dt').length,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'shots-gridrefactor-0705b/d1440-05-receipt-expanded.png' });
  await browser.close();
}
run().catch((e)=>{console.error(e);process.exit(1)});
