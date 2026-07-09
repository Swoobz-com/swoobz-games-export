// INDEPENDENT LIVE-MEASURED holdgate for the BetEntry right-column
// consolidation (2026-07-03+3, vault-betentry-rightcol-migration).
// Fresh driver — own port, own selectors, own screenshots. Measure-only.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5225';
const OUT = 'shots-betentry-rightcol-holdgate-0703';
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

async function rectOf(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, selector);
}

async function measureViewport(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);

  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');
  const left = await rectOf(page, '[data-testid="vault-betentry-left"]');
  const world = await rectOf(page, '[data-testid="vault-betentry-world"]');
  const yourbet = await rectOf(page, '[data-testid="vault-betentry-yourbet"]');
  const confirm = await rectOf(page, '[data-testid="vault-betentry-confirm"]');

  const leftChildCount = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-betentry-left"]');
    return el ? el.childElementCount : null;
  });

  const order = await page.evaluate(() => {
    const right = document.querySelector('[data-testid="vault-betentry-right"]');
    if (!right) return null;
    return [...right.children].map((c) => c.getAttribute('data-testid'));
  });

  const sendItInfo = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="vault-betentry-confirm"]');
    if (!card) return null;
    const btn = [...card.querySelectorAll('button')][0];
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return {
      text: btn.textContent.trim(),
      rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height },
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      visibility: cs.visibility,
      display: cs.display,
    };
  });

  // clip the confirm card region within the shell for visual clip detection
  const usableGutterHeight = shell ? shell.bottom - (shell.top + 72) : null;
  const slack = shell && confirm ? shell.bottom - confirm.bottom : null;

  await page.screenshot({ path: `${OUT}/${label}-full.png` });
  if (shell) {
    await page.screenshot({
      path: `${OUT}/${label}-shell.png`,
      clip: { x: Math.max(0, shell.left), y: Math.max(0, shell.top), width: Math.min(w, shell.width), height: Math.min(h, shell.height) },
    });
  }
  if (confirm) {
    await page.screenshot({
      path: `${OUT}/${label}-confirm-card.png`,
      clip: { x: Math.max(0, confirm.left - 10), y: Math.max(0, confirm.top - 10), width: Math.min(w, confirm.width + 20), height: Math.min(h - Math.max(0, confirm.top - 10), confirm.height + 20) },
    });
  }

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const hasVScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);

  await page.close();

  return {
    viewport: { w, h },
    shell,
    usableGutterHeight,
    left,
    leftChildCount,
    world,
    yourbet,
    confirm,
    slack,
    order,
    sendItInfo,
    scrollHeight,
    hasVScroll,
    innerHeight: h,
  };
}

async function measureLetterbox(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);

  // The cabinet (round card) is the visible game panel; measure its rect vs viewport
  const cabinet = await page.evaluate(() => {
    // cabinet is the parent of vault-canvas-shell
    const shell = document.querySelector('[data-testid="vault-canvas-shell"]');
    if (!shell) return null;
    const cabinetEl = shell.parentElement;
    const r = cabinetEl.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  });
  const shell = await rectOf(page, '[data-testid="vault-canvas-shell"]');

  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const hasVScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);

  await page.screenshot({ path: `${OUT}/${label}-ultrawide-full.png` });

  const topLetterbox = cabinet ? cabinet.top : null;
  const bottomLetterbox = cabinet ? h - cabinet.bottom : null;

  await page.close();
  return { viewport: { w, h }, cabinet, shell, topLetterbox, bottomLetterbox, scrollHeight, hasVScroll, innerHeight: h };
}

async function measureMobile(browser, w, h, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(500);
  await clickText(page, 'ape in');
  await wait(700);

  const gutterDom = await page.evaluate(() => ({
    left: document.querySelectorAll('[data-testid="vault-betentry-left"]').length,
    right: document.querySelectorAll('[data-testid="vault-betentry-right"]').length,
    world: document.querySelectorAll('[data-testid="vault-betentry-world"]').length,
    yourbet: document.querySelectorAll('[data-testid="vault-betentry-yourbet"]').length,
    confirm: document.querySelectorAll('[data-testid="vault-betentry-confirm"]').length,
  }));
  const hasSetYourPlay = await page.evaluate(() => document.body.textContent.includes('SET YOUR PLAY'));
  const sendItPresent = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button')];
    const b = els.find((e) => e.textContent.toUpperCase().includes('SEND IT'));
    return b ? { text: b.textContent.trim(), disabled: b.disabled } : null;
  });

  await page.screenshot({ path: `${OUT}/${label}-mobile-full.png`, fullPage: true });
  await page.close();
  return { viewport: { w, h }, gutterDom, hasSetYourPlay, sendItPresent };
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  fs.mkdirSync(OUT, { recursive: true });
  const R = {};

  R.v_1440x900 = await measureViewport(browser, 1440, 900, '1440x900');
  R.v_1440x1920 = await measureViewport(browser, 1440, 1920, '1440x1920');
  R.v_1920x1080 = await measureViewport(browser, 1920, 1080, '1920x1080');

  R.letterbox_1920x1080 = await measureLetterbox(browser, 1920, 1080, '1920x1080');
  R.letterbox_2560x1440 = await measureLetterbox(browser, 2560, 1440, '2560x1440');

  R.mobile_390x844 = await measureMobile(browser, 390, 844, '390x844');
  R.mobile_412x915 = await measureMobile(browser, 412, 915, '412x915-pixel7');

  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
})();
