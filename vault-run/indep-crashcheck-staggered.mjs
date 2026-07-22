import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
const consoleErrors = [];
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));
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
  if (!el) { console.log('NO BTN:', t); return false; }
  await el.click();
  return true;
}
async function cc(idx, g) {
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
function snake(n, g = 5) {
  const out = [];
  for (let row = 0; row < g && out.length < n; row++) {
    const cols = row % 2 === 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    for (const col of cols) { if (out.length >= n) break; out.push(row * g + col); }
  }
  return out;
}
async function paintTrail(indices, g) {
  const first = await cc(indices[0], g);
  if (!first) return 0;
  await page.mouse.move(first.cx, first.cy);
  await page.mouse.down();
  await wait(40);
  for (const idx of indices.slice(1)) {
    const c = await cc(idx, g);
    if (!c) continue;
    await page.mouse.move(c.cx, c.cy, { steps: 3 });
    await wait(10);
  }
  await page.mouse.up();
  await wait(300);
}
async function trailLength() {
  return await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null);
    for (const b of btns) {
      const al = b.getAttribute('aria-label') || '';
      const m = al.match(/Run your trail of (\d+) tiles/);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  });
}
async function buttons() {
  return await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent !== null).map(b => b.textContent.trim()));
}

await clickText('ape in');
await wait(700);
await clickText('send it');
await wait(900);
await clickText('TRAIL');
await wait(300);

// STAGGERED is the default pace — do NOT touch the pill.
await paintTrail(snake(20, 5), 5);
console.log('registered trail length:', await trailLength());
console.log('buttons before GO:', await buttons());

await clickText('GO');
console.log('GO clicked (STAGGERED, 20-tile trail) — polling for crash / settle...');
for (let i = 0; i < 30; i++) {
  await wait(200);
  const b = await buttons();
  console.log(`t=${(i + 1) * 200}ms buttons=${JSON.stringify(b)}`);
  if (b.length === 0) { console.log('>>> COMPONENT TREE WENT BLANK (crash) at', (i + 1) * 200, 'ms'); break; }
  if (b.some(x => x.toLowerCase().includes('bet again'))) { console.log('>>> SETTLED cleanly at', (i + 1) * 200, 'ms'); break; }
}
console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrors, null, 2));
await browser.close();
console.log('DONE');
