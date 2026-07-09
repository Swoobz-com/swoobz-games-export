import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickTextGlobal(page, t) {
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
  const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}; });
  await page.mouse.click(box.x + box.w*fx, box.y + box.h*fy);
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent!==null && !b.disabled && b.textContent.toLowerCase().includes('take profit')); if(b){b.click();return true;} return false; });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5837/', { waitUntil: 'networkidle0' });
  await wait(600);
  await clickTextGlobal(page, 'ape in'); await wait(600);
  await clickTextGlobal(page, 'SEND IT'); await wait(800);
  await clickCanvasFraction(page, 0.5, 0.35); await wait(400);
  await takeProfitIfEnabled(page); await wait(900);
  const rect = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(b => /change mode/i.test(b.textContent));
    const btn = btns[btns.length-1];
    const row = btn.closest('div');
    const r = row.getBoundingClientRect();
    return { x: r.x-16, y: r.y-16, width: r.width+32, height: r.height+32 };
  });
  await page.screenshot({ path: 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/changemode-indep/final/M412-linkstier-crop.png', clip: rect });
  await browser.close();
})();
