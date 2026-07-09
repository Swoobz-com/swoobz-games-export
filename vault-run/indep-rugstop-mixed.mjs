import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indep-mixed-';

const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch {} });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1500);

async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function cc(idx, g) {
  return await page.evaluate(({ idx, g }) => {
    const c = document.querySelector('canvas'); if (!c) return null;
    const r = c.getBoundingClientRect();
    const W = r.width, H = r.height;
    const tR = H * 0.15, bR = H * 0.18, sF = 0.08;
    const sW = W * (1 - sF * 2), sH = (H - tR - bR) * 0.96;
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
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
  }
  return out;
}
async function tapTrail(indices, g) {
  for (const idx of indices) {
    const c = await cc(idx, g); if (!c) continue;
    await page.mouse.move(c.cx, c.cy);
    await page.mouse.down();
    await wait(30);
    await page.mouse.up();
    await wait(60);
  }
}
async function buttons() { return await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim())); }
async function settled() { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
async function panelText() { return await page.evaluate(() => { const p = document.querySelector('div[aria-live="polite"][aria-label]'); return p ? p.textContent : ''; }); }
async function pillState() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
}
async function freshRound() {
  const ok = await clickText('ape in');
  if (!ok) { await clickText('bet again'); await wait(900); }
  else { await wait(700); await clickText('send it'); await wait(900); }
}

let found = false;
for (let attempt = 1; attempt <= 25 && !found; attempt++) {
  await freshRound();
  await clickText('TRAIL');
  await wait(300);
  await tapTrail(snake(10, 5), 5);
  if (await pillState() !== 'true') { await clickText('instant'); await wait(150); }
  const t0 = Date.now();
  await clickText('GO');
  let outcome = 'timeout', stoppedAt = null;
  for (let i = 0; i < 100; i++) {
    await wait(50);
    const b = await buttons();
    if (await settled()) { outcome = 'rug-settled'; break; }
    const running = b.some(x => x === 'STOP ⚡');
    if (!running && stoppedAt === null) stoppedAt = Date.now() - t0;
    if (!running && stoppedAt !== null && Date.now() - t0 - stoppedAt > 1200) {
      outcome = b.length >= 3 ? 'completed-no-rug' : 'STUCK-BLANK';
      break;
    }
  }
  if (outcome === 'rug-settled') {
    await wait(1000);
    const pt = await panelText();
    const m = pt.match(/(\d+)\s+before the rug/i);
    const n = m ? parseInt(m[1], 10) : null;
    console.log(`attempt ${attempt}: rug-settled, revealedBeforeRug=${n}`);
    if (n !== null && n >= 2 && n <= 7) {
      found = true;
      console.log('MIXED SAMPLE FOUND. Full panel text:', pt);
      await page.screenshot({ path: S + 'settled-full.png' });
      const gridRect = await page.evaluate(() => {
        const c = document.querySelector('canvas'); if (!c) return null;
        const r = c.getBoundingClientRect();
        return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: r.width, height: r.height };
      });
      if (gridRect) await page.screenshot({ path: S + 'grid-crop.png', clip: gridRect });
      console.log('tiles left sealed (10 painted - revealedBeforeRug - 1 mine):', 10 - n - 1);
    }
  } else {
    console.log(`attempt ${attempt}: ${outcome}, retrying`);
    if (outcome === 'completed-no-rug' && !(await settled())) { await clickText('take profit'); await wait(900); }
  }
  await wait(400);
}
if (!found) console.log('Could not land a mixed (>=3 revealed) sample within budget.');
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors));
await browser.close();
console.log('DONE');
