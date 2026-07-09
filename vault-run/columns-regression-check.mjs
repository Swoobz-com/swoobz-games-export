import puppeteer from 'puppeteer-core';
import fs from 'fs';

const PORT = process.argv[2] || '5182';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, text) {
  return await page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((x) => !x.disabled && (x.textContent || '').toLowerCase().includes(t.toLowerCase()));
    if (b) { b.click(); return true; }
    return false;
  }, text);
}

async function settledNow(page) {
  return await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
}

async function getCanvasCenter(page) {
  return await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r };
  });
}

async function playToOutcome(page, wantOutcome, maxRounds = 6) {
  // Retry-until-observed (crypto RNG per round, cannot force a specific
  // outcome deterministically — see AGENT_MEMORY vault-run gotcha).
  for (let round = 0; round < maxRounds; round++) {
    await clickText(page, 'SEND IT');
    await wait(500);
    let settled = await settledNow(page);
    let taps = 0;
    while (!settled && taps < 30) {
      const c = await getCanvasCenter(page);
      if (!c) break;
      // tap slightly different tiles each time (spiral-ish offsets)
      const ox = ((taps % 5) - 2) * 40;
      const oy = ((Math.floor(taps / 5) % 5) - 2) * 40;
      await page.mouse.click(c.x + ox, c.y + oy);
      await wait(180);
      settled = await settledNow(page);
      taps++;
      if (!settled && taps === 4) {
        // try take profit early to bias toward a WIN outcome
        if (wantOutcome === 'win') { await clickText(page, 'take profit'); await wait(700); settled = await settledNow(page); }
      }
    }
    if (!settled) continue;
    const label = await page.evaluate(() => {
      const el = document.querySelector('div[aria-live="polite"][aria-label]');
      return el ? el.getAttribute('aria-label') : '';
    });
    const isWin = /took profit|secured|won/i.test(label || '');
    const isRug = /rugged|rekt/i.test(label || '');
    if ((wantOutcome === 'win' && isWin) || (wantOutcome === 'rug' && isRug)) {
      return { ok: true, label, round };
    }
    // reset for next round attempt: bet again
    await clickText(page, 'bet again');
    await wait(500);
  }
  return { ok: false };
}

async function run(vp, tag) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);

  fs.mkdirSync('shots', { recursive: true });

  // 1. Lobby
  await page.screenshot({ path: `shots/regress-${tag}-1-lobby.png` });

  // 2. Bet-entry
  await clickText(page, 'ape in');
  await wait(500);
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="bet-console"]');
    if (el) el.scrollIntoView({ block: 'end' });
  });
  await wait(300);
  await page.screenshot({ path: `shots/regress-${tag}-2-betentry.png` });

  // 3. Playing (mid-round, before settling)
  await clickText(page, 'SEND IT');
  await wait(400);
  await page.screenshot({ path: `shots/regress-${tag}-3-playing.png` });

  // 4. Settled WIN
  const win = await playToOutcome(page, 'win');
  await page.screenshot({ path: `shots/regress-${tag}-4-settled-win.png` });

  // 5. Settled RUG
  const rug = await playToOutcome(page, 'rug');
  await page.screenshot({ path: `shots/regress-${tag}-5-settled-rug.png` });

  await browser.close();
  return { vp: vp.name, win, rug };
}

(async () => {
  const results = [];
  results.push(await run({ name: '1440', width: 1440, height: 900 }, 'D1440'));
  results.push(await run({ name: '390', width: 390, height: 844 }, 'M390'));
  fs.writeFileSync('columns-regression-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
