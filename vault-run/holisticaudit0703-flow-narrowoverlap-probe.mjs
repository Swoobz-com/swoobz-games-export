import puppeteer from 'puppeteer-core';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5305;
const SHOTS = 'shots-holisticaudit0703/flow/';
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

async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
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

async function elementAt(page, x, y) {
  return await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const testidEl = el.closest('[data-testid]');
    return {
      tag: el.tagName,
      cls: (el.className || '').toString().slice(0, 60),
      closestTestid: testidEl ? testidEl.getAttribute('data-testid') : null,
      pointerEvents: getComputedStyle(el).pointerEvents,
      zIndex: getComputedStyle(el).zIndex,
    };
  }, { x, y });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE, headless: false, defaultViewport: null,
    args: ['--window-size=1044,800'],
  });
  const page = (await browser.pages())[0];
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(1200);

  await clickText(page, 'ape in');
  await wait(600);
  await clickText(page, 'SEND IT');
  await wait(800);

  // Tile index 0 (col0/row0) is where the geometry computation says
  // vault-playing-left overlaps the tile playfield at 1024x768.
  const c0 = await cellCenter(page, 0, 5);
  console.log('tile0 center:', JSON.stringify(c0));
  const hit = await elementAt(page, c0.cx, c0.cy);
  console.log('elementFromPoint at tile0 center BEFORE click:', JSON.stringify(hit));

  const revealedBefore = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-playing-status"]');
    return el ? el.innerText : null;
  });
  console.log('status card text BEFORE click:', JSON.stringify(revealedBefore));

  await page.screenshot({ path: SHOTS + 'narrow-overlap-01-before-tile0-click.png' });
  await page.mouse.click(c0.cx, c0.cy);
  await wait(500);

  const revealedAfter = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-playing-status"]');
    return el ? el.innerText : null;
  });
  console.log('status card text AFTER click at tile0 center:', JSON.stringify(revealedAfter));
  await page.screenshot({ path: SHOTS + 'narrow-overlap-02-after-tile0-click.png' });

  // Also probe tile index 5 (col0/row1), the other flagged overlap tile.
  const stillPlaying = await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-actions"]'));
  if (stillPlaying) {
    const c5 = await cellCenter(page, 5, 5);
    const hit5 = await elementAt(page, c5.cx, c5.cy);
    console.log('elementFromPoint at tile5 center:', JSON.stringify(hit5));
  }

  await browser.close();
})();
