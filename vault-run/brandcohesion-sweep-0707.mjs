import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-brandcohesion-0707';
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

const EMDASH = '—';

async function scanEmdash(page) {
  return await page.evaluate((EMDASH) => {
    const hits = [];
    // 1. Visible text nodes (excluding style/script)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p) continue;
      const tag = p.tagName;
      if (tag === 'STYLE' || tag === 'SCRIPT') continue;
      if (n.textContent.includes(EMDASH)) {
        hits.push({ kind: 'text', text: n.textContent.trim().slice(0, 140), tag: p.tagName, testid: p.closest('[data-testid]')?.getAttribute('data-testid') || null, cls: p.className && p.className.toString().slice(0,60) });
      }
    }
    // 2. aria-label attributes
    document.querySelectorAll('[aria-label]').forEach((el) => {
      const v = el.getAttribute('aria-label');
      if (v && v.includes(EMDASH)) {
        hits.push({ kind: 'aria-label', text: v, tag: el.tagName, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null });
      }
    });
    // 3. title attributes
    document.querySelectorAll('[title]').forEach((el) => {
      const v = el.getAttribute('title');
      if (v && v.includes(EMDASH)) {
        hits.push({ kind: 'title', text: v, tag: el.tagName, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null });
      }
    });
    return hits;
  }, EMDASH);
}

async function scanCyan(page) {
  return await page.evaluate(() => {
    const targetRgbs = ['0, 240, 255', '41, 230, 255', '0, 208, 222'];
    const hits = [];
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'boxShadow']) {
        const v = cs[prop];
        if (v && targetRgbs.some((rgb) => v.includes(rgb))) {
          hits.push({ prop, value: v, tag: el.tagName, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null, cls: el.className && el.className.toString().slice(0,60) });
        }
      }
    });
    return hits;
  });
}

async function fontScan(page, selectorList) {
  return await page.evaluate((sel) => {
    const out = [];
    document.querySelectorAll(sel).forEach((el) => {
      if (el.children.length > 0) return; // leaves only
      const txt = el.textContent.trim();
      if (!txt) return;
      const cs = getComputedStyle(el);
      out.push({ text: txt.slice(0,40), fontFamily: cs.fontFamily, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null });
    });
    return out;
  }, selectorList);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR', m.text()); });

  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1500);

  console.log('=== PHASE: bet-entry, world=bluechips (default), 1440x900 ===');
  await page.screenshot({ path: `${OUTDIR}/01-betentry-bluechips-1440.png` });
  let hits = await scanEmdash(page);
  console.log('EMDASH betentry-bluechips:', JSON.stringify(hits, null, 2));
  let cyan = await scanCyan(page);
  console.log('CYAN betentry-bluechips count:', cyan.length, JSON.stringify(cyan.slice(0,10)));
  let bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log('BODY BG:', bg);

  // font scan on control column numeric vs prose
  const fonts = await fontScan(page, '[data-testid="vault-ctl-wager"] *, [data-testid="vault-betentry-yourbet"] *, [data-testid="vault-ctl-intro"] *, [data-testid="vault-betentry-world"] *, [data-testid="vault-board-worldpicker"] *');
  console.log('FONTS betentry:', JSON.stringify(fonts, null, 2));

  // Switch worlds: altseason, shitcoin
  for (const mode of ['altseason', 'shitcoin', 'bluechips']) {
    const sel = `[data-testid="vault-world-card-${mode}"]`;
    const el = await page.$(sel);
    if (el) {
      await el.click();
      await wait(400);
      await page.screenshot({ path: `${OUTDIR}/02-betentry-${mode}-1440.png` });
      const h = await scanEmdash(page);
      console.log(`EMDASH betentry-${mode}:`, JSON.stringify(h, null, 2));
    } else {
      console.log('WORLD CARD NOT FOUND', mode);
    }
  }

  console.log('=== HOW TO PLAY MODAL ===');
  const helpBtn = await page.$('[data-testid="vault-corner-help"]');
  if (helpBtn) {
    await helpBtn.click();
    await wait(300);
    await page.screenshot({ path: `${OUTDIR}/03-howtoplay-modal.png` });
    const h = await scanEmdash(page);
    console.log('EMDASH howtoplay-modal:', JSON.stringify(h, null, 2));
    // close
    const closeBtn = await page.$('[aria-label="Close"]');
    if (closeBtn) { await closeBtn.click(); await wait(200); }
  } else {
    console.log('HELP BUTTON NOT FOUND (vault-corner-help)');
  }

  console.log('=== PLACE BET -> PLAYING ===');
  // ensure bluechips selected already (loop above ended on bluechips)
  const sendItBtn = await page.evaluateHandle(() => {
    return [...document.querySelectorAll('button')].find(b => b.textContent.includes('SEND IT'));
  });
  if (sendItBtn && sendItBtn.asElement()) {
    await sendItBtn.asElement().click();
    await wait(600);
    await page.screenshot({ path: `${OUTDIR}/04-playing-fresh.png` });
    let h = await scanEmdash(page);
    console.log('EMDASH playing-fresh:', JSON.stringify(h, null, 2));

    // Click ONE tile (canvas), then immediately screenshot, then cash out.
    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    console.log('CANVAS BOX', JSON.stringify(box));
    // click near center-ish, offset slightly to avoid exact center overlay math; try a grid cell
    const clickX = box.x + box.width * 0.3;
    const clickY = box.y + box.height * 0.3;
    await page.mouse.click(clickX, clickY);
    await wait(900);
    await page.screenshot({ path: `${OUTDIR}/05-playing-after1tap.png` });
    let subtext = await page.evaluate(() => document.body.innerText.match(/running your trail[^\n]*|crack a compartment[^\n]*|hold \+ drag[^\n]*/g));
    console.log('SUBTEXT after tap:', JSON.stringify(subtext));

    const cashOutBtn = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('button')].find(b => /take profit/i.test(b.textContent));
    });
    if (cashOutBtn && cashOutBtn.asElement()) {
      await cashOutBtn.asElement().click();
      await wait(2200); // let hero overlay show + fade timer HERO_VISIBLE_MS=2000
      await page.screenshot({ path: `${OUTDIR}/06-settled-after1tap.png` });
      const captionText = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || null);
      console.log('SETTLED BOARD CAPTION (should be singular if 1 safe opened):', captionText);
      let h2 = await scanEmdash(page);
      console.log('EMDASH settled-after1tap:', JSON.stringify(h2, null, 2));
      const heroText = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]')?.innerText || null);
      console.log('HERO OVERLAY TEXT:', heroText);
    } else {
      console.log('CASH OUT / TAKE PROFIT BUTTON NOT FOUND');
    }
  } else {
    console.log('SEND IT BUTTON NOT FOUND');
  }

  await wait(2200); // let auto-return to bet-entry timer if any, or stay settled
  await page.screenshot({ path: `${OUTDIR}/07-post-settle-state.png` });
  cyan = await scanCyan(page);
  console.log('CYAN post-settle count:', cyan.length, JSON.stringify(cyan.slice(0,10)));

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
