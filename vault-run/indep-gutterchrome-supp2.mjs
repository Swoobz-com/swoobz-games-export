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
async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const tR = H * (wide ? 0.12 : 0.15);
    const bR = H * (wide ? 0.14 : 0.18);
    const sF = 0.08;
    const sW = W * (1 - sF * 2);
    const sH = (H - tR - bR) * 0.96;
    const av = Math.min(sW, sH);
    const gap = Math.max(6, av * 0.026);
    const tile = (av - gap * (g - 1)) / g;
    const full = tile * g + gap * (g - 1);
    const x0 = (W - full) / 2;
    const by = tR + (H - tR - bR) / 2;
    const y0 = by - full / 2;
    const col = idx % g, row = Math.floor(idx / g);
    return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
  }, { idx, g });
}
async function settledNow(page) { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
function rectOf(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}
async function gridEdges(page) {
  return await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const r = shell.getBoundingClientRect();
    const W = r.width, H = r.height;
    const wide = W / H > 1.2;
    const top = wide ? H * 0.12 : H * 0.15;
    const bottom = wide ? H * 0.14 : H * 0.18;
    const safeW = W * 0.84;
    const safeH = (H - top - bottom) * 0.96;
    const available = Math.min(safeW, safeH);
    const gridLeft = r.left + (W - available) / 2;
    const gridRight = r.left + W - (W - available) / 2;
    return { gridLeft, gridRight };
  });
}
async function runRound(page, idxSet) {
  let done = false;
  for (let k = 0; k < 12 && !done; k++) {
    const idx = idxSet[k] || 2;
    const { cx, cy } = await cellCenter(page, idx, 5);
    await page.mouse.click(cx, cy);
    await wait(400);
    done = await settledNow(page);
  }
  if (!done) { await clickText(page, 'take profit'); await wait(800); done = await settledNow(page); }
  await wait(600);
  return done;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const R = {};

  // Card B height at 1440x1920 (need 2 settled rounds first)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1920, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in'); await wait(400);
    await clickText(page, 'send it'); await wait(700);
    await runRound(page, [1,6,11,17,22,3,8,14,0,24,4,20]);
    await clickText(page, 'bet again'); await wait(600);
    await clickText(page, 'send it'); await wait(700);
    await runRound(page, [2,7,12,18,23,5,9,15,0,24,4,20]);
    R.tall1920_gutterB = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-b"]');
    await page.screenshot({ path: 'shots/indep-1440x1920-settled2-cardB.png' });
    await page.close();
  }

  // Containment for Card A + Card C at 1920x1080 (settled)
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(500);
    await clickText(page, 'ape in'); await wait(400);
    await clickText(page, 'send it'); await wait(700);
    await runRound(page, [1,6,11,17,22,3,8,14,0,24,4,20]);
    R.wide1920_gutterC = await page.evaluate(rectOf, '[data-testid="vault-gutter-card-c"]');
    R.wide1920_edges_settled = await gridEdges(page);
    await page.screenshot({ path: 'shots/indep-1920x1080-settled.png' });
    await page.close();
  }

  fs.writeFileSync('indep-gutterchrome-supp2-results.json', JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})();
