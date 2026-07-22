// autisk-reverify-fix1fix2.mjs — INDEPENDENT headed re-verify of FIX1 (session
// pulse de-dup + hide-until-data) and FIX2 (NEW SETUP rename). HEADED chrome
// per AGENT_MEMORY L1. Own OUT dir, own census, own element crops.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5196';
const OUT = process.argv[3] || 'shots-autisk-reverify';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

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
async function isSettled(page) {
  return await page.evaluate(() =>
    !!document.querySelector('[data-testid="vault-settled-betagain"]') ||
    !!document.querySelector('[data-testid="vault-settledpanel"]'));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((b) => b.textContent.toLowerCase().includes('take profit') && !b.disabled);
    if (b) { b.click(); return true; } return false;
  });
}
async function startRound(page) {
  await clickText(page, 'ape in'); await wait(600);
  const scoped = await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  if (!scoped) await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL'); await wait(300);
}
async function census(page) {
  return await page.evaluate(() => {
    const q = (s) => document.querySelectorAll(s).length;
    const btns = [...document.querySelectorAll('button')];
    const setupBtns = btns.filter((b) => /new setup/i.test(b.textContent));
    return {
      gutterLeft: q('[data-testid="vault-gutter-left"]'),
      gutterRight: q('[data-testid="vault-gutter-right"]'),
      gutterCardA: q('[data-testid="vault-gutter-card-a"]'),
      gutterCardARight: q('[data-testid="vault-gutter-card-a-right"]'),
      sessionPulseHeaders: (document.body.innerText.match(/SESSION PULSE/g) || []).length,
      emptyPlaceholder: document.body.innerText.includes('no rounds yet this session'),
      newSetupCount: setupBtns.length,
      newSetupTexts: setupBtns.map((b) => JSON.stringify(b.textContent.trim())),
      newSetupStyles: setupBtns.map((b) => {
        const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
        return { text: b.textContent.trim(), h: Math.round(r.height), w: Math.round(r.width),
          font: cs.fontFamily.split(',')[0], size: cs.fontSize, weight: cs.fontWeight,
          letterSpacing: cs.letterSpacing, transform: cs.textTransform,
          border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
          radius: cs.borderTopLeftRadius, whiteSpace: cs.whiteSpace,
          overflow: b.scrollWidth > b.clientWidth + 1 ? 'TRUNCATED' : 'ok' };
      }),
      changeModeCount: btns.filter((b) => /change mode/i.test(b.textContent)).length,
    };
  });
}
async function cropTestid(page, testid, path) {
  const box = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null; const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: Math.round(Math.max(0, r.x - 8)), y: Math.round(Math.max(0, r.y - 8)), w: Math.round(r.width + 16), h: Math.round(r.height + 16) };
  }, testid);
  if (!box) return false;
  try { await page.screenshot({ path, clip: { x: box.x, y: box.y, width: box.w, height: box.h } }); } catch (e) { return false; }
  return true;
}
async function cropSetupButton(page, path) {
  const box = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((b) => /new setup/i.test(b.textContent) && b.offsetParent !== null);
    if (!b) return null; const r = b.getBoundingClientRect();
    return { x: Math.round(Math.max(0, r.x - 30)), y: Math.round(Math.max(0, r.y - 20)), w: Math.round(Math.min(600, r.width + 260)), h: Math.round(r.height + 40) };
  });
  if (!box) return false;
  try { await page.screenshot({ path, clip: { x: box.x, y: box.y, width: box.w, height: box.h } }); } catch (e) { return false; }
  return true;
}

async function runViewport(browser, viewport, tag) {
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewport(viewport);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);

  await startRound(page); await wait(500);
  const c0 = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-01-zero-rounds.png` });

  outer: for (let gx = 1; gx <= 9; gx++) for (let gy = 1; gy <= 9; gy++) {
    if (await isSettled(page)) break outer;
    await clickCanvasFraction(page, gx / 10, gy / 10); await wait(160);
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(1000);
  const settled = await isSettled(page);
  const c1 = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-02-settled.png` });
  await cropSetupButton(page, `${OUT}/${tag}-02b-newsetup-crop.png`);

  await clickText(page, 'bet again'); await wait(900);
  const c2 = await census(page);
  await page.screenshot({ path: `${OUT}/${tag}-03-one-round.png` });
  await cropTestid(page, 'vault-gutter-card-a', `${OUT}/${tag}-03b-pulse-crop.png`);

  await page.close();
  return { tag, settled, c0_zeroRounds: c0, c1_settled: c1, c2_oneRound: c2, errs };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: false,
    args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1500,980'],
  });
  const desktop = await runViewport(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop');
  const mobile = await runViewport(browser, { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mobile');
  console.log(JSON.stringify({ desktop, mobile }, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
