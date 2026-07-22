// Follow-up: reach the 'insufficient' (not enough bag) disabled SEND IT state
// on the relocated gutter CONFIRM card and prove the disabled styling.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5199';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cellCenter(page, idx, gridSize) {
  return await page.evaluate(({ idx, gridSize }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const topReserved = H * 0.15, bottomReserved = H * 0.18, sideFrac = 0.08;
    const safeW = W * (1 - sideFrac * 2);
    const safeH = (H - topReserved - bottomReserved) * 0.96;
    const available = Math.min(safeW, safeH);
    const gap = Math.max(6, available * 0.026);
    const tile = (available - gap * (gridSize - 1)) / gridSize;
    const full = tile * gridSize + gap * (gridSize - 1);
    const x0 = (W - full) / 2;
    const bandCenterY = topReserved + (H - topReserved - bottomReserved) / 2;
    const y0 = bandCenterY - full / 2;
    const col = idx % gridSize, row = Math.floor(idx / gridSize);
    const cx = r.left + x0 + col * (tile + gap) + tile / 2;
    const cy = r.top + y0 + row * (tile + gap) + tile / 2;
    return { cx, cy };
  }, { idx, gridSize });
}
async function sendItStyle(page) {
  return await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!card) return { cardFound: false };
    const btn = [...card.querySelectorAll('button')][0];
    if (!btn) return { cardFound: true, btnFound: false };
    const cs = getComputedStyle(btn);
    return {
      cardFound: true,
      btnFound: true,
      text: btn.textContent.trim(),
      disabled: btn.disabled,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      cursor: cs.cursor,
      border: cs.border,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  const R = {};

  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'shitcoin', '[data-testid="vault-betentry-world"]');
  await wait(300);
  for (let i = 0; i < 400; i++) {
    const clicked = await clickText(page, '+', '[data-testid="vault-betentry-yourbet"]');
    if (!clicked) break;
  }
  await wait(300);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(700);

  let settled = false;
  for (let i = 0; i < 30 && !settled; i++) {
    const { cx, cy } = await cellCenter(page, i, 7);
    await page.mouse.click(cx, cy);
    await wait(350);
    const txt = await page.evaluate(() => document.body.textContent);
    if (/BET AGAIN/i.test(txt)) settled = true;
  }
  R.settled = settled;
  R.bodyTextSnippet = await page.evaluate(() => document.body.textContent.slice(0, 0));
  R.balanceAfter = await page.evaluate(() => document.body.textContent.match(/BALANCE ·\s*([\d.,]+)/)?.[1]);
  await page.screenshot({ path: 'shots/rgqa-settled-1440.png' });

  // list all visible buttons for debugging (INCLUDING disabled state)
  R.visibleButtons = await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => ({ text: b.textContent.trim(), disabled: b.disabled })).slice(0, 30),
  );

  await wait(500);
  // BET AGAIN is disabled (balance=0 insufficient-guard also applies to it,
  // shared closure per the code comment) -> use "change mode" to route back
  // to bet-entry so the wager can be adjusted down.
  const wentBack = await clickText(page, 'change mode');
  R.clickedBackToBetEntry = wentBack;
  await wait(700);

  R.phaseAfterBack_hasWorldCard = await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-world"]'));
  R.sendIt_disabled_state = await sendItStyle(page);
  R.balanceAtBetEntry = await page.evaluate(() => document.body.textContent.match(/BALANCE ·\s*([\d.,]+)/)?.[1]);
  await page.screenshot({ path: 'shots/rgqa-backat-betentry-1440.png' });
  if (R.phaseAfterBack_hasWorldCard) {
    await page.screenshot({
      path: 'shots/rgqa-confirm-disabled-card.png',
      clip: await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-betentry-confirm"]');
        const r = el.getBoundingClientRect();
        return { x: Math.max(0, r.left - 20), y: Math.max(0, r.top - 20), width: r.width + 40, height: r.height + 40 };
      }),
    });
  }

  await browser.close();
  fs.writeFileSync('rgqa-indep-insufficient-0703-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
