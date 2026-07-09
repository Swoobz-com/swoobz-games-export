import puppeteer from 'puppeteer-core';
import fs from 'fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTDIR = 'shots-brandcohesion-0707b';
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);
const EMDASH = '—';

async function scanEmdash(page) {
  return await page.evaluate((EMDASH) => {
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const p = n.parentElement;
      if (!p) continue;
      if (p.tagName === 'STYLE' || p.tagName === 'SCRIPT') continue;
      if (n.textContent.includes(EMDASH)) {
        hits.push({ kind: 'text', text: n.textContent.trim().slice(0,140), testid: p.closest('[data-testid]')?.getAttribute('data-testid') || null });
      }
    }
    document.querySelectorAll('[aria-label]').forEach((el) => {
      const v = el.getAttribute('aria-label');
      if (v && v.includes(EMDASH)) hits.push({ kind: 'aria-label', text: v, testid: el.closest('[data-testid]')?.getAttribute('data-testid') || null });
    });
    return hits;
  }, EMDASH);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url() + ' :: ' + r.failure()?.errorText));
  page.on('response', (r) => { if (r.status() === 404) failed.push('404: ' + r.url()); });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e){} });
  await page.goto('http://localhost:5390/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);

  // ── Switch to SHITCOIN (high risk, quick loss) and place bet ──
  const shitBtn = await page.$('[data-testid="vault-world-card-shitcoin"]');
  await shitBtn.click();
  await wait(300);
  await page.screenshot({ path: `${OUTDIR}/01-betentry-shitcoin.png` });

  const sendIt = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('SEND IT')));
  await sendIt.asElement().click();
  await wait(600);

  const bodyTxt1 = await page.evaluate(() => document.body.innerText);
  console.log('BODY TEXT PLAYING (search for subtext):', bodyTxt1.split('\n').filter(l => /crack a compartment|running your trail|hold \+ drag/i.test(l)).join(' | '));

  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();

  // Tap many tiles fast across the 7x7 shitcoin board (24/49 mines -> high chance of a rug quickly)
  let settled = false;
  let lastResultText = null;
  for (let row = 0; row < 7 && !settled; row++) {
    for (let col = 0; col < 7 && !settled; col++) {
      const x = box.x + (col + 0.5) * (box.width / 7);
      const y = box.y + (row + 0.5) * (box.height / 7);
      await page.mouse.click(x, y);
      await wait(180);
      const phaseNow = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]') ? 'settled' : (document.body.innerText.includes('RUGGED') ? 'maybe-settling' : 'playing'));
      if (phaseNow === 'settled') { settled = true; break; }
    }
  }
  console.log('SETTLED (rug hit) after tapping:', settled);
  await wait(150); // capture WHILE hero overlay still visible (HERO_VISIBLE_MS=2000)
  await page.screenshot({ path: `${OUTDIR}/02-settled-LOSS-hero-visible.png` });
  const heroTextLoss = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]')?.innerText || null);
  console.log('HERO OVERLAY TEXT (LOSS):', heroTextLoss);
  const captionLoss = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || null);
  console.log('BOARD CAPTION (LOSS):', captionLoss);
  const emdashLoss = await scanEmdash(page);
  console.log('EMDASH settled-loss:', JSON.stringify(emdashLoss, null, 2));

  // Let hero overlay auto-dismiss, then screenshot the settled receipt/state
  await wait(2200);
  await page.screenshot({ path: `${OUTDIR}/03-settled-LOSS-after-dismiss.png` });

  // ── BET AGAIN -> try for exactly 1-safe WIN scenario on bluechips (low risk) ──
  const allButtonTexts = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()));
  console.log('ALL BUTTONS after loss dismiss:', JSON.stringify(allButtonTexts));
  const betAgainBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /bet again/i.test(b.textContent)));
  console.log('betAgainBtn found:', !!(betAgainBtn && betAgainBtn.asElement()));
  if (betAgainBtn && betAgainBtn.asElement()) {
    await betAgainBtn.asElement().click();
    await wait(500);
  }
  const allButtonTexts2 = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()));
  console.log('ALL BUTTONS after betAgain click:', JSON.stringify(allButtonTexts2));
  // Already in Playing (bet-again re-placed a bet directly, "bet again · same trail" preset).
  // Tap ONE tile (top-left corner region, lower mine density visually) then cash out for the 1-safe WIN case.
  {
    const canvas2 = await page.$('canvas');
    const box2 = await canvas2.boundingBox();
    let won1Safe = false;
    for (let row = 0; row < 7 && !won1Safe; row++) {
      for (let col = 0; col < 7 && !won1Safe; col++) {
        const stillPlaying = await page.evaluate(() => !document.querySelector('[data-testid="vault-hero-overlay"]'));
        if (!stillPlaying) { won1Safe = true; break; }
        const x = box2.x + (col + 0.5) * (box2.width / 7);
        const y = box2.y + (row + 0.5) * (box2.height / 7);
        await page.mouse.click(x, y);
        await wait(200);
        const settledNow = await page.evaluate(() => !!document.querySelector('[data-testid="vault-hero-overlay"]'));
        if (settledNow) { won1Safe = true; break; }
        // try cash out after first successful safe reveal
        const cashOutBtn = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(b => /take profit/i.test(b.textContent) && !b.disabled));
        if (cashOutBtn && cashOutBtn.asElement()) {
          await cashOutBtn.asElement().click();
          await wait(150);
          won1Safe = true;
          break;
        }
      }
    }
    {
      await page.screenshot({ path: `${OUTDIR}/04-settled-WIN-hero-visible.png` });
      const heroTextWin = await page.evaluate(() => document.querySelector('[data-testid="vault-hero-overlay"]')?.innerText || null);
      console.log('HERO OVERLAY TEXT (WIN):', heroTextWin);
      const captionWin = await page.evaluate(() => document.querySelector('[data-testid="vault-settled-board-caption"]')?.textContent || null);
      console.log('BOARD CAPTION (WIN, should be 1 SAFE OPENED singular if exactly 1):', captionWin);
      // Pixel-sample the hero overlay bounding box position to describe occlusion vs canvas center
      const heroBox = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="vault-hero-overlay"]');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      const boardBox = await page.evaluate(() => {
        const el = document.querySelector('canvas');
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
      console.log('HERO BOX:', JSON.stringify(heroBox));
      console.log('BOARD BOX:', JSON.stringify(boardBox));
    }
  }

  console.log('FAILED/404 REQUESTS:', JSON.stringify([...new Set(failed)], null, 2));

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
