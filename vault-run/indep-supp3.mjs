import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cyanProbe(page) {
  return await page.evaluate(() => {
    const bad = [];
    const sel = [
      '[data-testid="vault-gutter-left"]', '[data-testid="vault-gutter-right"]',
      '[data-testid="vault-corner-gear"]', '[data-testid="vault-corner-world"]', '[data-testid="vault-corner-help"]',
      '[data-testid="vault-corner-gear-popover"]',
    ];
    const cyanRe = /#00b8c4|#00d0de|#00f0ff|rgb\(\s*0,\s*184,\s*196\s*\)|rgb\(\s*0,\s*208,\s*222\s*\)|rgb\(\s*0,\s*240,\s*255\s*\)/i;
    for (const s of sel) {
      const root = document.querySelector(s);
      if (!root) continue;
      const all = [root, ...root.querySelectorAll('*')];
      for (const el of all) {
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderLeftColor', 'borderRightColor', 'borderBottomColor']) {
          const v = cs[prop];
          if (v && cyanRe.test(v)) bad.push({ sel: s, tag: el.tagName, prop, v });
        }
      }
    }
    return bad;
  });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  const R = {};
  R.lobby_cyan = await cyanProbe(page);

  await clickText(page, 'ape in');
  await wait(400);
  const gearClicked = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="vault-corner-gear"] button');
    if (b) { b.click(); return true; }
    return false;
  });
  await wait(200);
  R.gearClicked = gearClicked;
  await page.screenshot({ path: 'shots/indep-1440x900-gearopen.png' });
  R.betentry_cyan = await cyanProbe(page);
  await page.evaluate(() => { const b = document.querySelector('[data-testid="vault-corner-gear"] button'); if (b) b.click(); });
  await wait(150);

  // world icon should be a no-op mid-round: click SEND IT, then click world, confirm phase unchanged
  await clickText(page, 'send it');
  await wait(700);
  const phaseBefore = await page.evaluate(() => document.querySelector('[data-testid="vault-canvas-shell"]') ? document.body.textContent.slice(0,50) : null);
  await page.evaluate(() => { const b = document.querySelector('[data-testid="vault-corner-world"]'); if (b) b.click(); });
  await wait(300);
  const stillPlaying = await page.evaluate(() => !document.body.textContent.toLowerCase().includes('ape in'));
  R.worldIconNoopDuringPlaying = stillPlaying;
  R.playing_cyan = await cyanProbe(page);
  await page.screenshot({ path: 'shots/indep-1440x900-worldclick-noop.png' });

  fs.writeFileSync('indep-supp3-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})();
