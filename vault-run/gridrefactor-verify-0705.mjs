// gridrefactor-verify-0705.mjs — evidence driver for the CSS-grid layout
// refactor (game-art-director, 2026-07-05, task_category vault-css-grid-
// chassis). Drives desktop (1440x900) through all 4 phases, checks the grid
// structural assertions, then drives mobile (390x844) through all 4 phases
// for the regression check. Screenshots saved under OUT.
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.argv[2] || '5311';
const OUT = process.argv[3] || 'shots-gridrefactor-0705';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

async function isSettled(page) {
  return page.evaluate(
    () =>
      !!document.querySelector('[data-testid="vault-settled-banner"]') ||
      !!document.querySelector('[data-testid="vault-settledpanel"]'),
  );
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

async function startRound(page) {
  await clickText(page, 'ape in');
  await wait(500);
  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL');
  await wait(300);
}

async function driveToSettled(page) {
  await startRound(page);
  let taps = 0;
  for (let gx = 1; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      taps++;
      await wait(220);
      if (taps >= 3) {
        const took = await clickText(page, 'take profit');
        if (took) { await wait(700); }
      }
      if (await isSettled(page)) break;
    }
  }
}

async function gridAssertions(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="vault-main-grid"]');
    const col = document.querySelector('[data-testid="vault-control-column"]');
    const cs = grid ? getComputedStyle(grid) : null;
    const gutterTestids = [
      'vault-gutter-left', 'vault-gutter-right', 'vault-gutter-card-a', 'vault-gutter-card-a-right',
      'vault-gutter-card-b', 'vault-gutter-card-c', 'vault-settled-receipt-gutter', 'vault-settled-betagain',
      'vault-corner-gear-popover',
    ];
    const foundGutter = gutterTestids.filter((t) => !!document.querySelector(`[data-testid="${t}"]`));
    const panels = ['vault-ctl-wager', 'vault-ctl-mode', 'vault-ctl-cta', 'vault-ctl-takeprofit', 'vault-ctl-session', 'vault-ctl-receipt']
      .map((t) => !!document.querySelector(`[data-testid="${t}"]`));
    const topbarText = document.querySelector('body')?.innerText.slice(0, 0); // noop placeholder
    const headerTapeHasSession = !!document.querySelector('.sr-only') && false;
    return {
      display: cs ? cs.display : null,
      gridTemplateColumns: cs ? cs.gridTemplateColumns : null,
      colWidth: col ? col.getBoundingClientRect().width : null,
      foundGutter,
      panelsPresent: panels,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasHScroll: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] });
  const page = await browser.newPage();

  const results = { port: PORT };

  // ── DESKTOP 1440x900 — all 4 phases ──────────────────────────────────
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await page.screenshot({ path: `${OUT}/d1440-01-lobby.png` });
  results.lobby1440 = await gridAssertions(page);

  await clickText(page, 'ape in');
  await wait(500);
  await page.screenshot({ path: `${OUT}/d1440-02-betentry.png` });
  results.betentry1440 = await gridAssertions(page);

  await clickText(page, 'SEND IT');
  await wait(700);
  await clickText(page, 'MANUAL');
  await wait(300);
  await page.screenshot({ path: `${OUT}/d1440-03-playing.png` });
  results.playing1440 = await gridAssertions(page);

  // finish the round (tap toward settled, force take-profit after 3 taps)
  let taps = 0;
  for (let gx = 1; gx <= 9 && !(await isSettled(page)); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettled(page)) break;
      await clickCanvasFraction(page, gx / 10, gy / 10);
      taps++;
      await wait(220);
      if (taps >= 3) {
        const took = await clickText(page, 'take profit');
        if (took) await wait(900);
      }
      if (await isSettled(page)) break;
    }
  }
  await wait(500);
  await page.screenshot({ path: `${OUT}/d1440-04-settled.png` });
  results.settled1440 = await gridAssertions(page);

  // ── DESKTOP 1920x1080 — scroll check only ────────────────────────────
  await page.setViewport({ width: 1920, height: 1080 });
  await wait(400);
  results.scroll1920 = await gridAssertions(page);
  await page.screenshot({ path: `${OUT}/d1920-settled.png` });

  await browser.close();

  // ── MOBILE 390x844 — fresh page, all 4 phases ────────────────────────
  const browser2 = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=430,900'] });
  const mpage = await browser2.newPage();
  await mpage.setViewport({ width: 390, height: 844 });
  await mpage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2' });
  await wait(500);
  await mpage.screenshot({ path: `${OUT}/m390-01-lobby.png` });
  results.mobileLobby = await gridAssertions(mpage);

  await clickText(mpage, 'ape in');
  await wait(500);
  await mpage.screenshot({ path: `${OUT}/m390-02-betentry.png` });

  await clickText(mpage, 'SEND IT');
  await wait(700);
  await clickText(mpage, 'MANUAL');
  await wait(300);
  await mpage.screenshot({ path: `${OUT}/m390-03-playing.png` });

  let mtaps = 0;
  const isSettledM = async () => mpage.evaluate(() => !!document.querySelector('[data-testid="vault-settledpanel"]'));
  for (let gx = 1; gx <= 9 && !(await isSettledM()); gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      if (await isSettledM()) break;
      await clickCanvasFraction(mpage, gx / 10, gy / 10);
      mtaps++;
      await wait(220);
      if (mtaps >= 3) {
        const took = await clickText(mpage, 'take profit');
        if (took) await wait(900);
      }
      if (await isSettledM()) break;
    }
  }
  await wait(500);
  await mpage.screenshot({ path: `${OUT}/m390-04-settled.png` });
  results.mobileGutterCheck = await mpage.evaluate(() => {
    const gutterTestids = ['vault-gutter-left', 'vault-gutter-right', 'vault-corner-gear', 'vault-corner-world', 'vault-corner-help'];
    return gutterTestids.filter((t) => !!document.querySelector(`[data-testid="${t}"]`));
  });

  await browser2.close();

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => { console.error(e); process.exit(1); });
