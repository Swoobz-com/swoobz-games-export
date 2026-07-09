import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/indep-crash-';

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
async function trailLength() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    for (const b of btns) { const al = b.getAttribute('aria-label') || ''; const m = al.match(/Run your trail of (\d+) tiles/); if (m) return parseInt(m[1], 10); }
    return null;
  });
}
async function pillState() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    const instant = btns.find(b => b.textContent.trim().toLowerCase() === 'instant');
    return instant ? instant.getAttribute('aria-pressed') : null;
  });
}

await clickText('ape in');
await wait(700);
await clickText('send it');
await wait(900);
await clickText('TRAIL');
await wait(300);

const SIZE = 18; // within the brief's 15-20 tile spec
await tapTrail(snake(SIZE, 5), 5);
console.log('registered trail length:', await trailLength());
// STAGGERED (default) this time — confirm the crash is pace-INDEPENDENT.
console.log('pace state (should be staggered/default, untouched):', JSON.stringify(await pillState()));
console.log('buttons before GO:', JSON.stringify(await buttons()));

await clickText('GO');
console.log('GO clicked (STAGGERED, 18-tile trail) — watching for 8 seconds...');
for (let i = 0; i < 40; i++) {
  await wait(200);
  const b = await buttons();
  console.log(`t=${(i + 1) * 200}ms buttons=${JSON.stringify(b)}`);
}
await page.screenshot({ path: S + 'final-state.png' });
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
await browser.close();
console.log('DONE');
