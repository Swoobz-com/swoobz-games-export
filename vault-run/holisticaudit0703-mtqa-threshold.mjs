// Bisect the width where the Playing-phase gutter-card / canvas overlap
// (found at 992/1024) actually clears, to hand the design team a concrete
// safe-width number rather than just "somewhere above 1024".
import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = '5301';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function findButtonByText(page, t) {
  return await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
}

async function measure(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);
  const apeH = await findButtonByText(page, 'ape in'); await apeH.asElement().click(); await wait(400);
  const sendH = await findButtonByText(page, 'send it'); await sendH.asElement().click(); await wait(600);
  const data = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const canvasRect = c ? c.getBoundingClientRect().toJSON() : null;
    const left = document.querySelector('[data-testid="vault-playing-left"]');
    const right = document.querySelector('[data-testid="vault-playing-right"]');
    const cardA = document.querySelector('[data-testid="vault-gutter-card-a"]');
    const cardAR = document.querySelector('[data-testid="vault-gutter-card-a-right"]');
    const r = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
    return { canvasRect, left: r(left), right: r(right), cardA: r(cardA), cardAR: r(cardAR) };
  });
  function overlapOf(g, canvasRect) {
    if (!g || !canvasRect) return 0;
    const ix = Math.max(0, Math.min(g.right, canvasRect.right) - Math.max(g.left, canvasRect.left));
    return ix;
  }
  const ov = {
    left: overlapOf(data.left, data.canvasRect),
    right: overlapOf(data.right, data.canvasRect),
    cardA: overlapOf(data.cardA, data.canvasRect),
    cardAR: overlapOf(data.cardAR, data.canvasRect),
  };
  await page.close();
  return { width, height, ov, raw: data };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const widths = [992, 1024, 1080, 1150, 1200, 1280, 1360, 1440];
  for (const w of widths) {
    const res = await measure(browser, w, 800);
    console.log(`${w}px -> overlapPx: left=${res.ov.left.toFixed(1)} right=${res.ov.right.toFixed(1)} cardA=${res.ov.cardA.toFixed(1)} cardAR=${res.ov.cardAR.toFixed(1)} | canvasRight=${res.raw.canvasRect?.right?.toFixed(1)}`);
  }
  await browser.close();
})();
