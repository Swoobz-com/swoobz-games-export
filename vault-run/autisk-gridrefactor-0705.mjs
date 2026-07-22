import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5401';
const OUT = process.argv[3] || 'shots-autisk-grid-0705';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    const lc = t.toLowerCase();
    return els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === lc)
      || els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(lc)) || null;
  }, { t, within });
  const el = h.asElement(); if (!el) return false;
  try { await el.click(); } catch (e) { return false; } return true;
}
async function canvasBox(page) { return page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }); }
async function paintTrail(page) {
  const box = await canvasBox(page); if (!box) return false;
  const pts = [[0.3, 0.3], [0.5, 0.3], [0.5, 0.5], [0.35, 0.5]].map(([fx, fy]) => ({ x: box.x + box.w * fx, y: box.y + box.h * fy }));
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (const p of pts.slice(1)) { await page.mouse.move(p.x, p.y, { steps: 3 }); await wait(90); }
  await page.mouse.up(); await wait(300); return true;
}
async function census(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), top: Math.round(r.top) }; };
    const grid = q('[data-testid="vault-main-grid"]');
    const col = q('[data-testid="vault-control-column"]');
    const panels = [...document.querySelectorAll('[data-testid^="vault-ctl-"]')].map(p => ({ id: p.getAttribute('data-testid'), ...rect(p) }));
    const cta = q('[data-testid="vault-ctl-cta"]');
    let ctaBtns = [];
    if (cta) { ctaBtns = [...cta.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => ({ label: b.textContent.trim().slice(0, 30), ...rect(b), disabled: b.disabled })); }
    const primKey = /send it|ape in|bet again|^go|stop|run your|clear/i;
    let primary = ctaBtns.find(b => primKey.test(b.label)) || ctaBtns[ctaBtns.length - 1] || null;
    let stepMinus = 0, stepPlus = 0, betLabels = [], moneySpans = [];
    if (col) {
      const btns = [...col.querySelectorAll('button')];
      stepMinus = btns.filter(b => /decrease/i.test(b.getAttribute('aria-label') || '')).length;
      stepPlus = btns.filter(b => /increase/i.test(b.getAttribute('aria-label') || '')).length;
      betLabels = [...col.querySelectorAll('span,div')].map(e => (e.childElementCount === 0 ? e.textContent.trim() : '')).filter(t => /^(INZET|YOUR BET|WAGER)$/i.test(t));
      moneySpans = [...col.querySelectorAll('*')].map(e => (e.childElementCount === 0 ? e.textContent.trim() : '')).filter(t => /^\$?\d[\d.,]*\s*(USDC)?$/i.test(t) && /\d/.test(t)).slice(0, 12);
    }
    const hud = q('[data-testid="vault-hud-row"]');
    const banner = q('[data-testid="vault-settled-banner"]');
    const bodyText = document.body.innerText;
    const gridTemplate = grid ? getComputedStyle(grid).gridTemplateColumns : null;
    const colStyle = col ? { maxHeight: getComputedStyle(col).maxHeight, overflowY: getComputedStyle(col).overflowY, scrollHeight: col.scrollHeight, clientHeight: col.clientHeight, scrollTop: col.scrollTop } : null;
    let hudCols = null;
    if (hud) { const c = [...hud.children]; hudCols = c.map(ch => { const r = ch.getBoundingClientRect(); return { text: ch.innerText.replace(/\n/g, ' | ').slice(0, 60), align: getComputedStyle(ch).alignItems, x: Math.round(r.x), right: Math.round(r.right) }; }); }
    return {
      innerH: window.innerHeight, innerW: window.innerWidth,
      docScrollH: document.documentElement.scrollHeight,
      pageScrolls: document.documentElement.scrollHeight > window.innerHeight + 1,
      gridTemplate, gridRect: rect(grid), colRect: rect(col), colStyle,
      panels, panelOrder: panels.map(p => p.id), panelWidths: panels.map(p => p.w),
      ctaBtns, primary,
      wager: { stepMinus, stepPlus, betLabels, betLabelCount: betLabels.length, moneySpans },
      hudPresent: !!hud, hudRect: rect(hud), hudCols,
      bannerText: banner ? banner.textContent.trim() : null, bannerRect: rect(banner),
      canvasRect: rect(document.querySelector('canvas')),
      gutters: {
        gl: document.querySelectorAll('[data-testid="vault-gutter-left"]').length,
        gr: document.querySelectorAll('[data-testid="vault-gutter-right"]').length,
        ca: document.querySelectorAll('[data-testid="vault-gutter-card-a"]').length,
        car: document.querySelectorAll('[data-testid="vault-gutter-card-a-right"]').length,
      },
      sessionPulseCount: (bodyText.match(/SESSION PULSE/g) || []).length,
    };
  });
}
async function shot(page, name) { try { await page.screenshot({ path: `${OUT}/${name}.png` }); } catch (e) { } }
async function run(browser, vp, tag, isMobile) {
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.setViewport(vp);
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(900);
  await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(200);
  const res = { tag, phases: {}, errs };
  if (isMobile) { res.phases.mobile_lobby = await census(page); await shot(page, `${tag}-lobby`); await page.close(); return res; }
  res.phases.lobby = await census(page); await shot(page, `${tag}-1-lobby`);
  await clickText(page, 'ape in'); await wait(700);
  await page.evaluate(() => { const c = document.querySelector('[data-testid="vault-control-column"]'); if (c) c.scrollTop = 0; }); await wait(150);
  res.phases.betentry = await census(page); await shot(page, `${tag}-2-betentry`);
  let sent = await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]');
  if (!sent) sent = await clickText(page, 'send it');
  res.sentSendIt = sent; await wait(800);
  await clickText(page, 'TRAIL'); await wait(300);
  res.phases.playing = await census(page); await shot(page, `${tag}-3-playing`);
  await paintTrail(page); await wait(300);
  res.phases.trailready = await census(page); await shot(page, `${tag}-3b-trailready`);
  let go = await clickText(page, 'go', '[data-testid="vault-ctl-cta"]');
  res.clickedGo = go; await wait(1800);
  res.phases.settled = await census(page); await shot(page, `${tag}-4-settled`);
  await clickText(page, 'view receipt'); await wait(400);
  res.phases.settled_receipt = await census(page); await shot(page, `${tag}-4b-receipt`);
  await page.close(); return res;
}
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1980,1200'] });
  const r1440 = await run(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'd1440', false);
  const r1920 = await run(browser, { width: 1920, height: 1080, deviceScaleFactor: 1 }, 'd1920', false);
  const rmob = await run(browser, { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mob', true);
  fs.writeFileSync(`${OUT}/census.json`, JSON.stringify({ r1440, r1920, rmob }, null, 2));
  console.log('DONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
