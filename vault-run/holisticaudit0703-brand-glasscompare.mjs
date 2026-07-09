import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const SHOTS = 'shots-holisticaudit0703/brand';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cardClip(page, testid, pad = 10) {
  return await page.evaluate(({ testid, pad }) => {
    const el = document.querySelector(`[data-testid="${testid}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: r.width + pad * 2, height: r.height + pad * 2 };
  }, { testid, pad });
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, defaultViewport: { width: 1440, height: 900 }, args: ['--window-size=1460,1040'] });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  // Lobby: HERO card (base GLASS) vs APE IN card (GLASS_CTA)
  let clip = await cardClip(page, 'vault-lobby-hero'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-lobby-hero-GLASS.png`, clip });
  clip = await cardClip(page, 'vault-lobby-apein'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-lobby-apein-GLASS_CTA.png`, clip });

  await clickText(page, 'ape in', '[data-testid="vault-lobby-apein"]');
  await wait(400);
  await clickText(page, 'bluechips', '[data-testid="vault-betentry-world"]');
  await wait(200);
  clip = await cardClip(page, 'vault-betentry-world'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-betentry-world-GLASS.png`, clip });
  clip = await cardClip(page, 'vault-betentry-confirm'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-betentry-confirm-GLASS_CTA.png`, clip });
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(700);
  clip = await cardClip(page, 'vault-playing-status'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-playing-status-GLASS.png`, clip });
  clip = await cardClip(page, 'vault-playing-actions'); if (clip) await page.screenshot({ path: `${SHOTS}/cmp-playing-actions-GLASS_CTA.png`, clip });

  await browser.close();
  console.log('done');
})();
