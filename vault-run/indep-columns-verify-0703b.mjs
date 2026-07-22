import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indepcolB0703-';

const results = {};

async function newPage(browser, w, h) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(1200);
  return page;
}

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

async function cellCenter(page, idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas');
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

async function settled(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}
async function panelAriaLabel(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}

async function robustFooter(page) {
  return await page.evaluate(() => {
    const toRect = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    const panel = document.querySelector('[data-testid="bet-console"]');
    if (!panel) return { error: 'no panel' };
    // find the exact span with textContent 'BALANCE'
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_ELEMENT);
    let balanceLabelEl = null;
    let node;
    while ((node = walker.nextNode())) {
      if (node.children.length === 0 && node.textContent.trim() === 'BALANCE') { balanceLabelEl = node; break; }
    }
    const balanceDiv = balanceLabelEl ? balanceLabelEl.parentElement : null; // s.balance
    const footerDiv = balanceDiv ? balanceDiv.parentElement : null; // s.footer
    const sendItBtn = [...panel.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('send it'));
    const footerCS = footerDiv ? getComputedStyle(footerDiv) : null;
    return {
      panelWidth: toRect(panel),
      balanceRect: toRect(balanceDiv),
      footerRect: toRect(footerDiv),
      footerJustifyContent: footerCS ? footerCS.justifyContent : null,
      footerDisplay: footerCS ? footerCS.display : null,
      sendItRect: toRect(sendItBtn),
    };
  });
}

function toR(r) {
  if (!r) return null;
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
}

async function measurePhase(page, tag, name) {
  await page.screenshot({ path: `${S}${tag}-${name}.png` });
  const rects = await page.evaluate(() => {
    const board = document.querySelector('[data-testid="vault-canvas-shell"]');
    const panel = document.querySelector('[data-testid="bet-console"]')
      || document.querySelector('div[aria-live="polite"]');
    const toRect = (el) => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
    return { board: toRect(board), panel: toRect(panel) };
  });
  return rects;
}

async function retryUntilOutcome(page, wantRug, maxAttempts) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await clickText(page, 'send it');
    await wait(900);
    let isSettled = await settled(page);
    if (wantRug) {
      for (let k = 0; k < 25 && !isSettled; k++) {
        const c = await cellCenter(page, k, 5);
        await page.mouse.click(c.cx, c.cy);
        await wait(150);
        isSettled = await settled(page);
      }
    } else {
      const tryIdx = [1, 6, 11, 17, 22];
      for (let k = 0; k < tryIdx.length && !isSettled; k++) {
        const c = await cellCenter(page, tryIdx[k], 5);
        await page.mouse.click(c.cx, c.cy);
        await wait(500);
        isSettled = await settled(page);
      }
      if (!isSettled) { await clickText(page, 'take profit'); await wait(700); isSettled = await settled(page); }
    }
    await wait(400);
    const label = await panelAriaLabel(page);
    const isRug = label && label.toLowerCase().startsWith('rugged');
    if ((wantRug && isRug) || (!wantRug && !isRug && isSettled)) {
      return { attempt: attempt + 1, label, isSettled };
    }
    // reset for next attempt
    await clickText(page, 'bet again');
    await wait(600);
  }
  const label = await panelAriaLabel(page);
  return { attempt: maxAttempts, label, isSettled: await settled(page), gaveUp: true };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  // ===== 1440: force a genuine WIN this time (RUG already captured) =====
  {
    const page = await newPage(browser, 1440, 900);
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.D1440_footer_robust = await robustFooter(page);
    await page.screenshot({ path: `${S}D1440-betentry.png` });

    const winOutcome = await retryUntilOutcome(page, false, 8);
    results.D1440_win_attempt = winOutcome;
    results.D1440_win_phase = await measurePhase(page, 'D1440', `settled-WIN-attempt${winOutcome.attempt}`);
    await page.close();
  }

  // ===== 1920: robust footer check =====
  {
    const page = await newPage(browser, 1920, 1080);
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.D1920_footer_robust = await robustFooter(page);
    await page.screenshot({ path: `${S}D1920-betentry.png` });
    await page.close();
  }

  // ===== Mobile 390: robust footer + touch targets =====
  {
    const page = await newPage(browser, 390, 844);
    await clickText(page, 'ape in') || await clickText(page, 'bet again');
    await wait(700);
    results.M390_footer_robust = await robustFooter(page);
    await page.screenshot({ path: `${S}M390-betentry.png` });

    results.M390_touchTargets = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      const stepBtns = [...panel.querySelectorAll('button')].filter(b => b.textContent.trim() === '−' || b.textContent.trim() === '+');
      const sendIt = [...panel.querySelectorAll('button')].find(b => b.textContent.toLowerCase().includes('send it'));
      const toRect = (el) => el ? (({ width, height }) => ({ width, height }))(el.getBoundingClientRect()) : null;
      return { stepBtns: stepBtns.map(toRect), sendIt: toRect(sendIt) };
    });

    // confirm mobile columns mode is false structurally (no columnsRow flex-row w/ 3 children as direct child)
    results.M390_isColumnsMode = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      const kids = [...panel.children];
      return { childCount: kids.length, childTags: kids.map(k => k.tagName), childDisplay: kids.map(k => getComputedStyle(k).display) };
    });

    await page.close();
  }

  await browser.close();
  fs.writeFileSync('indep-columns-verify-0703b-results.json', JSON.stringify(results, null, 2));
  console.log('DONE');
})();
