import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const W = 1440, H = 900;
const PORT = process.argv[2] || '5183';
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];
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
async function cellCenter(idx, g) {
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
async function settled() { return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again')); }
const clickedApe = await clickText('ape in'); if (!clickedApe) await clickText('bet again');
await wait(700); await clickText('send it'); await wait(900);
let settledNow = false;
for (let k = 0; k < 3 && !settledNow; k++) { const { cx, cy } = await cellCenter([1, 6, 11][k], 5); await page.mouse.click(cx, cy); await wait(500); settledNow = await settled(); }
if (!settledNow) { await clickText('take profit'); await wait(900); }
await wait(1800);

const cyanHits = await page.evaluate(() => {
  function hueOf(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return h;
  }
  function parseColor(str) {
    if (!str) return null;
    const m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  }
  const hits = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const cs = getComputedStyle(el);
    for (const prop of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'boxShadow', 'fill', 'stroke']) {
      let val = cs[prop];
      if (!val) continue;
      // boxShadow may contain multiple colors; scan for rgb/rgba patterns
      const matches = val.match(/rgba?\([\d., ]+\)/g) || [];
      for (const mm of matches) {
        const c = parseColor(mm);
        if (!c || c.a === 0) continue;
        const h = hueOf(c.r, c.g, c.b);
        const sat = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
        // cyan hue range ~170-200deg, need decent saturation and brightness
        if (h >= 165 && h <= 205 && sat > 40 && Math.max(c.r, c.g, c.b) > 80) {
          hits.push({ tag: el.tagName, cls: el.className && el.className.toString().slice(0,40), prop, val: mm, hue: h.toFixed(0), text: el.textContent.slice(0,30) });
        }
      }
    }
  }
  return hits;
});
console.log('CYAN HITS (full page, computed style scan):', JSON.stringify(cyanHits, null, 1));
console.log('CYAN HIT COUNT:', cyanHits.length);
await page.screenshot({ path: 'shots/iv-cyanprobe-full.png' });
await browser.close();
console.log('DONE cyan probe');
