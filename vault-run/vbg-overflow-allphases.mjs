import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5181';
const TAG = process.argv[3] || 'before';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: 'D1440', width: 1440, height: 900 },
  { name: 'D1920', width: 1920, height: 1080 },
  { name: 'M390', width: 390, height: 844 },
];

async function overflowWalk(page) {
  return await page.evaluate(() => {
    const doc = document.documentElement;
    const scrollWidth = doc.scrollWidth;
    const clientWidth = doc.clientWidth;
    const overflowing = [];
    const all = document.querySelectorAll('body *');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > clientWidth + 0.5 || r.left < -0.5) {
        overflowing.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 90),
          testid: el.getAttribute && el.getAttribute('data-testid'),
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflowRight: Math.round(r.right - clientWidth),
        });
      }
    }
    overflowing.sort((a, b) => b.overflowRight - a.overflowRight);
    return { scrollWidth, clientWidth, hasOverflow: scrollWidth > clientWidth + 1, topOffenders: overflowing.slice(0, 6) };
  });
}

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

async function cellCenter(page, idx, g) {
  return await page.evaluate(
    ({ idx, g }) => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      const W = r.width,
        H = r.height;
      const tR = H * 0.15,
        bR = H * 0.18,
        sF = 0.08;
      const sW = W * (1 - sF * 2);
      const sH = (H - tR - bR) * 0.96;
      const av = Math.min(sW, sH);
      const gap = Math.max(6, av * 0.026);
      const tile = (av - gap * (g - 1)) / g;
      const full = tile * g + gap * (g - 1);
      const x0 = (W - full) / 2;
      const by = tR + (H - tR - bR) / 2;
      const y0 = by - full / 2;
      const col = idx % g,
        row = Math.floor(idx / g);
      return { cx: r.left + x0 + col * (tile + gap) + tile / 2, cy: r.top + y0 + row * (tile + gap) + tile / 2 };
    },
    { idx, g }
  );
}

async function settledNow(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

async function runViewport(browser, vp) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);

  const out = { vp: vp.name };

  // LOBBY
  out.lobby = await overflowWalk(page);
  await page.screenshot({ path: `shots/vbgA-${TAG}-${vp.name}-lobby.png`, fullPage: true });

  // BET-ENTRY
  await clickText(page, 'ape in');
  await wait(500);
  out.betentry = await overflowWalk(page);
  await page.screenshot({ path: `shots/vbgA-${TAG}-${vp.name}-betentry.png`, fullPage: true });

  // BET-ENTRY with AUTO-EXIT options drawer open (a wider-content edge case)
  await clickText(page, 'auto-exit');
  await wait(400);
  out.betentryOptionsOpen = await overflowWalk(page);
  await page.screenshot({ path: `shots/vbgA-${TAG}-${vp.name}-betentry-options.png`, fullPage: true });
  await clickText(page, 'auto-exit'); // close it again
  await wait(200);

  // PLAYING
  await clickText(page, 'send it');
  await wait(800);
  out.playing = await overflowWalk(page);
  await page.screenshot({ path: `shots/vbgA-${TAG}-${vp.name}-playing.png`, fullPage: true });

  // SETTLED (click a bunch of tiles until settled, win or rug — whichever comes first)
  let done = false;
  for (let k = 0; k < 8 && !done; k++) {
    const idx = [1, 6, 11, 17, 22, 3, 8, 14][k] || 2;
    const { cx, cy } = await cellCenter(page, idx, 5);
    await page.mouse.click(cx, cy);
    await wait(450);
    done = await settledNow(page);
  }
  if (!done) {
    await clickText(page, 'take profit');
    await wait(800);
    done = await settledNow(page);
  }
  await wait(500);
  out.settled = await overflowWalk(page);
  out.settledReached = done;
  await page.screenshot({ path: `shots/vbgA-${TAG}-${vp.name}-settled.png`, fullPage: true });

  await page.close();
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];
  for (const vp of VIEWPORTS) {
    results.push(await runViewport(browser, vp));
  }
  await browser.close();
  fs.mkdirSync('shots', { recursive: true });
  fs.writeFileSync(`vbg-overflow-allphases-${TAG}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
