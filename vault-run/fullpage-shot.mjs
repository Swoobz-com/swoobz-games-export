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
  for (const [w,h,tag] of [[1440,900,'D1440'],[1920,1080,'D1920']]) {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1200);
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    await page.screenshot({ path: `shots/fullpage-${tag}-betentry.png`, fullPage: true });
    await page.close();
  }
  await browser.close();
})();
