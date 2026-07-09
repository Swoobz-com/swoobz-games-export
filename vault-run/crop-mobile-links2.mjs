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
  const found = await page.evaluate(() => {
    const cm = [...document.querySelectorAll('button')].find(b => b.offsetParent !== null && /change mode/i.test(b.textContent));
    const sh = [...document.querySelectorAll('button')].find(b => b.offsetParent !== null && b.getAttribute('aria-label') === 'Share this result');
    if (!cm || !sh) return null;
    const rc = cm.getBoundingClientRect(); const rs = sh.getBoundingClientRect();
    const x = Math.min(rc.x, rs.x) - 16, y = Math.min(rc.y, rs.y) - 16;
    const x2 = Math.max(rc.right, rs.right) + 16, y2 = Math.max(rc.bottom, rs.bottom) + 16;
    return { x, y, width: x2-x, height: y2-y };
  });
  console.log('crop rect', found);
  if (found) await page.screenshot({ path: 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/changemode-indep/final/M412-linkstier-crop2.png', clip: found });
  await browser.close();
})();
