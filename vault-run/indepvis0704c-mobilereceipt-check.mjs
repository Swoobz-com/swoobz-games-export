// indepvis0704c-mobilereceipt-check.mjs — supplementary independent check:
// confirms the mobile Settlement() receipt's own row grid
// (`settlementReceiptRows`, via the shared `Row` primitive) is untouched by
// the LOOP 3 desktop-gutter-only fork (ReceiptRowStacked +
// settlementReceiptRowsStacked). Opens the mobile receipt drawer for real via
// a real mouse click and reads its own dl's computed gridTemplateColumns.
import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5511';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'),
    );
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
}
async function isSettledMobile(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(700);

  const spots = [];
  for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) spots.push([gx / 10, gy / 10]);
  let safeReveals = 0;
  for (const [fx, fy] of spots) {
    if (await isSettledMobile(page)) break;
    await clickCanvasFraction(page, fx, fy);
    await wait(280);
    if (await isSettledMobile(page)) break;
    safeReveals += 1;
    if (safeReveals >= 2 && (await takeProfitIfEnabled(page))) { await wait(900); break; }
  }
  await wait(1200);

  // real mouse click on the mobile "view receipt" toggle
  const toggleBox = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /view receipt/i.test(b.textContent));
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  let result;
  if (!toggleBox) {
    result = { FAIL: 'mobile view-receipt toggle not found' };
  } else {
    await page.mouse.click(toggleBox.x, toggleBox.y);
    await wait(400);
    result = await page.evaluate(() => {
      const dls = [...document.querySelectorAll('dl')];
      const receiptDl = dls.find((d) => d.querySelector('dt') && /round id/i.test(d.querySelector('dt').textContent));
      if (!receiptDl) return { FAIL: 'no mobile receipt dl found after real-mouse open' };
      const cs = getComputedStyle(receiptDl);
      const desktopGutterPresent = !!document.querySelector('[data-testid="vault-gutter-left"],[data-testid="vault-gutter-right"],[data-testid="vault-settled-receipt-gutter"]');
      const dd = receiptDl.querySelector('dd');
      const ddCs = dd ? getComputedStyle(dd) : null;
      return {
        gridTemplateColumns: cs.gridTemplateColumns,
        columnCount: cs.gridTemplateColumns.split(' ').length,
        isAuto1fr: /^auto\s/.test(cs.gridTemplateColumns) || cs.gridTemplateColumns.split(' ').length === 2,
        ddOverflow: ddCs ? ddCs.overflow : null,
        ddTextOverflow: ddCs ? ddCs.textOverflow : null,
        desktopGutterPresentOnMobile: desktopGutterPresent,
      };
    });
  }
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
