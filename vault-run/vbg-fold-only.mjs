import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5181';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const VIEWPORTS = [
  { name: 'D1440', width: 1440, height: 900 },
  { name: 'D1920', width: 1920, height: 1080 },
];

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(600);
    await clickText(page, 'ape in');
    await wait(500);
    const fold = await page.evaluate((vh) => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      const r = panel.getBoundingClientRect();
      const btn = [...document.querySelectorAll('button')].find((b) => /send it/i.test(b.textContent || ''));
      const toWin = [...document.querySelectorAll('span')].find((s) => /^to win$/i.test(s.textContent || ''));
      const btnR = btn ? btn.getBoundingClientRect() : null;
      const toWinR = toWin ? toWin.closest('div').getBoundingClientRect() : null;
      return {
        panelBottom: Math.round(r.bottom),
        viewportHeight: vh,
        sendItBottom: btnR ? Math.round(btnR.bottom) : null,
        sendItAboveFold: btnR ? btnR.bottom <= vh : null,
        toWinBottom: toWinR ? Math.round(toWinR.bottom) : null,
      };
    }, vp.height);
    console.log(vp.name, JSON.stringify(fold));
    await page.close();
  }
  await browser.close();
})();
