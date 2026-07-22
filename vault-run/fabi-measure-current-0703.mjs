// fabi FEASIBILITY MEASUREMENT (current unchanged build). Measures content-sized
// heights of the 3 BetEntry gutter cards + right-gutter horizontal slack vs the
// canvas grid, at 1440x900 / 1440x1920 / 1920x1080. READ ONLY. Grounds the
// decision on whether YOUR BET + BALANCE can physically move fully right.
import puppeteer from 'puppeteer-core';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5207';
const BASE = `http://localhost:${PORT}/`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickButtonContaining(page, needle) {
  const handle = await page.evaluateHandle((n) => {
    const els = [...document.querySelectorAll('button, [role=button], a')];
    return els.find((e) => (e.textContent || '').toLowerCase().includes(n)) || null;
  }, needle.toLowerCase());
  const el = handle.asElement();
  if (!el) throw new Error('no button containing: ' + needle);
  await el.click();
}

const rect = (sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, right: r.right, w: r.width, h: r.height, top: r.top, bottom: r.bottom };
};

async function measure(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);
  await clickButtonContaining(page, 'ape in');
  await wait(500);
  const out = await page.evaluate((rectStr) => {
    const rect = eval('(' + rectStr + ')');
    const shell = document.querySelector('.vault-canvas-shell') || document.querySelector('[class*="canvas-shell"]');
    const canvas = document.querySelector('canvas');
    const gridRect = canvas ? canvas.getBoundingClientRect() : null;
    const shellRect = shell ? shell.getBoundingClientRect() : null;
    const yourbet = rect('[data-testid="vault-betentry-yourbet"]');
    const confirm = rect('[data-testid="vault-betentry-confirm"]');
    const world = rect('[data-testid="vault-betentry-world"]');
    const rightStack = rect('[data-testid="vault-betentry-right"]');
    const leftStack = rect('[data-testid="vault-betentry-left"]');
    // horizontal slack = gap between right stack's left edge and canvas right edge
    let rightSlack = null;
    if (rightStack && gridRect) rightSlack = rightStack.x - gridRect.right;
    return {
      shell: shellRect ? { w: shellRect.width, h: shellRect.height, top: shellRect.top } : null,
      grid: gridRect ? { x: gridRect.x, right: gridRect.right, w: gridRect.width } : null,
      yourbet, confirm, world, rightStack, leftStack, rightSlack,
    };
  }, rect.toString());
  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const vps = [ [1440,900], [1440,1920], [1920,1080] ];
  const R = {};
  for (const [w,h] of vps) {
    R[`${w}x${h}`] = await measure(browser, w, h);
  }
  await browser.close();
  console.log(JSON.stringify(R, null, 2));
})();
