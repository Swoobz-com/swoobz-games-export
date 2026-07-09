import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { return false; }
  await el.click();
  return true;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [w,h,tag] of [[1920,1080,'D1920'],[390,844,'M390']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1200);
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    const rect = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="bet-console"]');
      const r = p.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    });
    console.log(tag, JSON.stringify(rect));
    await page.screenshot({ path: `shots/panel-only-${tag}.png`, clip: { x: rect.left, y: rect.top, width: Math.min(rect.width, w - rect.left - 1), height: Math.min(rect.height, h - rect.top - 1) } });
    await page.close();
  }
  await browser.close();
})();
