// Follow-up: this sandbox's Chrome renders rAF at ~240fps uncapped (no real
// vsync/compositor throttle — confirmed by holisticaudit0703-scene-main.mjs
// showing near-identical ~236-240fps across all 3 worlds, which is NOT a
// realistic 60Hz-monitor number). Raw rAF-count fps is therefore not a
// meaningful absolute "60fps" comparison in this environment. Instead:
//   1) frame-delta jank analysis (max delta, % of frames > 33ms i.e. worse
//      than half of 60fps) — this DOES surface real main-thread stalls
//      regardless of vsync cap.
//   2) CDP CPU throttling (4x, the standard "mobile-chrome" simulation) on
//      SHITCOIN (largest 7x7/49-tile board) to see relative degradation.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5313';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}
async function clickTextWithin(page, selector, t) {
  const h = await page.evaluateHandle(({ selector, t }) => {
    const root = document.querySelector(selector);
    if (!root) return null;
    const els = [...root.querySelectorAll('button')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { selector, t });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function frameDeltaAnalysis(page, ms = 3000) {
  return await page.evaluate((durationMs) => new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const start = last;
    function measure() {
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      if (now - start < durationMs) {
        requestAnimationFrame(measure);
      } else {
        const n = deltas.length;
        const max = Math.max(...deltas);
        const over16 = deltas.filter((d) => d > 16.67).length;
        const over33 = deltas.filter((d) => d > 33.33).length;
        const over100 = deltas.filter((d) => d > 100).length;
        const avg = deltas.reduce((a, b) => a + b, 0) / n;
        resolve({ n, max, avg, over16pct: (100 * over16) / n, over33pct: (100 * over33) / n, over100count: over100 });
      }
    }
    requestAnimationFrame(measure);
  }), ms);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1440, height: 900 } });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(400);
  await clickTextWithin(page, '[data-testid="vault-betentry-world"]', 'SHITCOIN');
  await wait(300);
  await clickText(page, 'send it');
  await wait(900);

  console.log('--- SHITCOIN unthrottled frame-delta ---');
  const normal = await frameDeltaAnalysis(page, 3000);
  console.log(JSON.stringify(normal, null, 2));

  const client = await page.target().createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  console.log('--- SHITCOIN 4x CPU throttle frame-delta ---');
  const throttled4x = await frameDeltaAnalysis(page, 3000);
  console.log(JSON.stringify(throttled4x, null, 2));

  await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  console.log('--- SHITCOIN 6x CPU throttle frame-delta (low-end mobile) ---');
  const throttled6x = await frameDeltaAnalysis(page, 3000);
  console.log(JSON.stringify(throttled6x, null, 2));

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  // Also do bluechips + altseason 4x throttle for comparison (smaller boards).
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);
  await clickText(page, 'ape in');
  await wait(400);
  await clickText(page, 'send it');
  await wait(900);
  console.log('--- BLUECHIPS 4x CPU throttle frame-delta ---');
  const bluechips4x = await frameDeltaAnalysis(page, 3000);
  console.log(JSON.stringify(bluechips4x, null, 2));

  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
} finally {
  await browser.close();
}
