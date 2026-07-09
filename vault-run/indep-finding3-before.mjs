import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickButtonText(page, matcher) {
  const h = await page.evaluateHandle((m) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const visible = els.filter((e) => e.offsetParent !== null);
    return visible.find((e) => e.textContent.trim().toLowerCase() === m.toLowerCase()) ||
      visible.find((e) => e.textContent.toLowerCase().includes(m.toLowerCase()));
  }, matcher);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const out = {};
  for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(700);
    await clickButtonText(page, 'ape in');
    await wait(600);
    await page.evaluate(() => window.scrollTo(0, 0));
    const fold = await page.evaluate((vh) => {
      const btn = [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || ''));
      const r = btn ? btn.getBoundingClientRect() : null;
      return r ? { bottom: Math.round(r.bottom), vh, overBy: Math.max(0, Math.round(r.bottom - vh)) } : null;
    }, vp.h);
    out[`${vp.w}x${vp.h}`] = fold;
    await page.close();
  }
  await browser.close();
  fs.writeFileSync('indep-finding3-before-results.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
