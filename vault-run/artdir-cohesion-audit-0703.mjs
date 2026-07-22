import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5261';
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    const els = [...root.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, { t, within });
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
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

async function isPlaying(page) {
  return await page.evaluate(() => document.body.textContent.includes('PUMPING') || document.body.textContent.includes('TRAIL'));
}

async function revealOneTile(page) {
  const spots = [[0.5, 0.5], [0.45, 0.4], [0.55, 0.6], [0.4, 0.55], [0.6, 0.45], [0.5, 0.35]];
  for (const [fx, fy] of spots) {
    const stillPlaying = await isPlaying(page);
    if (!stillPlaying) return false;
    await clickCanvasFraction(page, fx, fy);
    await wait(500);
  }
  return true;
}

async function runViewport(browser, w, h, tag) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
  await wait(600);

  // 1. LOBBY
  await page.screenshot({ path: `${OUT}/${tag}-01-lobby.png` });

  // 2. BET-ENTRY (bluechips default)
  await clickText(page, 'ape in');
  await wait(600);
  await page.screenshot({ path: `${OUT}/${tag}-02-betentry-bluechips.png` });

  // altseason world for comparison
  await clickText(page, 'ALTSEASON', '[data-testid="vault-betentry-world"]');
  await wait(400);
  await page.screenshot({ path: `${OUT}/${tag}-02b-betentry-altseason.png` });
  await clickText(page, 'BLUECHIPS', '[data-testid="vault-betentry-world"]');
  await wait(400);

  // 3. PLAYING
  await clickText(page, 'SEND IT');
  await wait(900);
  await page.screenshot({ path: `${OUT}/${tag}-03-playing.png` });
  await revealOneTile(page);
  await page.screenshot({ path: `${OUT}/${tag}-03b-playing-revealed.png` });

  // 4a. SETTLED WIN (take profit)
  const clickedTP = await clickText(page, 'take profit', '[data-testid="vault-playing-actions"]');
  await wait(1200);
  await page.screenshot({ path: `${OUT}/${tag}-04-settled-win.png` });

  // reset for a rug run — bet again then keep revealing till rug
  const canBetAgain = await clickText(page, 'bet again');
  await wait(700);
  if (canBetAgain) {
    // stay in bet-entry? Actually bet again returns to playing directly in vault. Check.
  }
  await page.screenshot({ path: `${OUT}/${tag}-05-postbetagain.png` });

  await browser2Rug(page, tag, OUT);

  await page.close();
  return { errors, clickedTP, canBetAgain };
}

async function browser2Rug(page, tag, OUT) {
  // Try to reveal tiles repeatedly until either settled (rug) or 20 attempts
  for (let i = 0; i < 25; i++) {
    const playing = await isPlaying(page);
    if (!playing) break;
    const fx = 0.1 + (i % 9) * 0.1;
    const fy = 0.1 + (Math.floor(i / 9) % 9) * 0.1;
    await clickCanvasFraction(page, fx, fy);
    await wait(350);
  }
  await wait(800);
  await page.screenshot({ path: `${OUT}/${tag}-06-settled-rug-attempt.png` });
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = {};
  results.v1440 = await runViewport(browser, 1440, 900, '1440x900');
  results.v1920 = await runViewport(browser, 1920, 1080, '1920x1080');
  await browser.close();
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
