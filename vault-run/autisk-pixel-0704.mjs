import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5187';
const OUT = process.argv[3] || 'shots-autisk-0704';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
  { name: '390', width: 390, height: 844 },
];

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
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-betagain"]'));
}
async function inBetEntry(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-confirm"]'));
}
async function inPlaying(page) {
  return await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-actions"]'));
}
async function clickCanvasFraction(page, fx, fy) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (!box) return false;
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy);
  return true;
}
async function takeProfitIfEnabled(page) {
  return await page.evaluate(() => {
    const btn = [...document.querySelectorAll('[data-testid="vault-playing-actions"] button')].find((b) =>
      b.textContent.toLowerCase().includes('take profit'));
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  });
}
async function settledOutcome(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText || '';
    return /rug|rekt|rugged/i.test(text) ? 'rug' : (/win|profit|bag|secured|riches/i.test(text) ? 'win' : 'unknown');
  });
}
async function gotoLobby(page) {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(700);
}
async function toBetEntry(page) {
  await gotoLobby(page);
  await clickText(page, 'ape in');
  await wait(700);
  return await inBetEntry(page);
}
async function toPlaying(page) {
  if (!(await inBetEntry(page))) await toBetEntry(page);
  await clickText(page, 'SEND IT', '[data-testid="vault-betentry-confirm"]');
  await wait(800);
  return await inPlaying(page);
}
async function measureCards(page) {
  return await page.evaluate(() => {
    const ids = ['vault-gutter-card-a','vault-gutter-card-a-right','vault-gutter-card-b','vault-gutter-card-c',
      'vault-lobby-hero','vault-lobby-apein','vault-betentry-confirm','vault-betentry-world',
      'vault-playing-status','vault-playing-actions','vault-settled-result','vault-settled-meta',
      'vault-settled-nextbet','vault-settled-betagain','vault-settled-receipt-gutter','vault-settled-right-new'];
    const out = {};
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      let headFont = null, headText = null;
      const kids = [...el.querySelectorAll('*')];
      for (const k of kids) {
        const kc = getComputedStyle(k);
        const t = (k.textContent||'').trim();
        if (t && parseFloat(kc.letterSpacing) > 0.5 && parseFloat(kc.fontSize) <= 14 && k.children.length === 0) {
          headFont = { fontSize: kc.fontSize, letterSpacing: kc.letterSpacing, weight: kc.fontWeight, family: kc.fontFamily.split(',')[0], color: kc.color };
          headText = t.slice(0, 24);
          break;
        }
      }
      out[id] = {
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        right: +(r.x + r.width).toFixed(1),
        radius: cs.borderRadius, padding: cs.padding, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
        bg: cs.backgroundImage.slice(0, 40), gap: cs.gap,
        head: headFont, headText,
      };
    }
    const c = document.querySelector('canvas');
    if (c) {
      const cr = c.getBoundingClientRect();
      out.__canvas = { x:+cr.x.toFixed(1), y:+cr.y.toFixed(1), w:+cr.width.toFixed(1), h:+cr.height.toFixed(1),
        attrW: c.width, attrH: c.height, dpr: window.devicePixelRatio, cssRatioW: +(c.width/cr.width).toFixed(3) };
    }
    out.__shell = (() => { const s=document.querySelector('[data-testid="vault-canvas-shell"]'); if(!s) return null; const r=s.getBoundingClientRect(); return {w:+r.width.toFixed(1),h:+r.height.toFixed(1), scrollLeft:s.scrollLeft}; })();
    return out;
  });
}
async function snap(page, tag) {
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
  const m = await measureCards(page);
  fs.writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(m, null, 2));
  return m;
}
async function driveToWin(page) {
  if (!(await toPlaying(page))) return false;
  for (let i = 0; i < 4; i++) {
    if (await isSettled(page)) break;
    await clickCanvasFraction(page, 0.12 + i * 0.12, 0.35 + (i%2)*0.15);
    await wait(400);
  }
  if (!(await isSettled(page))) await takeProfitIfEnabled(page);
  await wait(1100);
  return await isSettled(page);
}
async function driveToRug(page, maxAttempts = 8) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!(await toPlaying(page))) continue;
    const spots = [];
    for (let gx = 1; gx <= 5; gx++) for (let gy = 1; gy <= 5; gy++) spots.push([gx/6, gy/6]);
    for (const [fx, fy] of spots) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, fx, fy);
      await wait(230);
    }
    await wait(900);
    if (await isSettled(page)) {
      const outcome = await settledOutcome(page);
      if (outcome === 'rug') return 'rug';
      if (attempt === maxAttempts) return outcome;
    }
  }
  return await isSettled(page) ? 'settled-unknown' : 'not-settled';
}
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: false,
    args: ['--autoplay-policy=no-user-gesture-required','--no-sandbox','--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.name==='390'?2:1 });
    const p = `${vp.name}`;
    await gotoLobby(page);
    await snap(page, `${p}-lobby`);
    await toBetEntry(page);
    await snap(page, `${p}-betentry`);
    await toPlaying(page);
    await wait(500);
    await snap(page, `${p}-playing`);
    const w = await driveToWin(page);
    await snap(page, `${p}-settled-win`);
    const r = await driveToRug(page);
    await snap(page, `${p}-settled-rug`);
    console.log(`[${vp.name}] win=${w} rug=${r}`);
  }
  fs.writeFileSync(`${OUT}/_errors.json`, JSON.stringify(errs, null, 2));
  console.log('pageErrors:', errs.length);
  await browser.close();
})();
