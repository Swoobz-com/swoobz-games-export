import puppeteer from 'puppeteer-core';
import fs from 'fs';

// INDEPENDENT regression sweep for the columnToWin alignItems:'flex-start' fix.
// Confirms: (1) Lobby/Playing/Settled at 1440 render fine and do NOT expose
// [data-testid="bet-console"] (BetConsole is BetEntry-only); (2) mobile 390
// BetEntry renders the old single-stack (columns=false) with NO 3-column row
// and NO stray alignItems side-effect.

const PORT = process.argv[2] || '5183';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = {};
  fs.mkdirSync('shots', { recursive: true });

  // ---- Desktop 1440: Lobby -> BetEntry -> Playing -> Settled ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));

    // LOBBY
    const lobbyHasConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    await page.screenshot({ path: 'shots/qaindep-regress-1440-lobby.png' });
    results.lobby_1440_hasConsole = lobbyHasConsole;

    // -> BET-ENTRY
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => /ape in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const betEntryHasConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    await page.screenshot({ path: 'shots/qaindep-regress-1440-betentry.png' });
    results.betentry_1440_hasConsole = betEntryHasConsole;

    // -> PLAYING (click SEND IT)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => /send it/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 900));
    const playingHasConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    await page.screenshot({ path: 'shots/qaindep-regress-1440-playing.png' });
    results.playing_1440_hasConsole = playingHasConsole;

    // reveal one tile (click canvas center-ish, a safe-odds click) then cash out
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (canvasBox) {
      await page.mouse.click(canvasBox.x + canvasBox.w * 0.3, canvasBox.y + canvasBox.h * 0.3);
      await new Promise((r) => setTimeout(r, 700));
    }
    // Try cash out via button text "cash" (case-insensitive) — else GO button.
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => /cash/i.test(x.textContent || ''));
      if (b && !b.disabled) b.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    const settledHasConsole = await page.evaluate(() => !!document.querySelector('[data-testid="bet-console"]'));
    await page.screenshot({ path: 'shots/qaindep-regress-1440-settled.png' });
    results.settled_1440_hasConsole = settledHasConsole;

    await page.close();
  }

  // ---- Mobile 390: BetEntry single-stack (columns=false path) ----
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => /ape in/i.test(x.textContent || ''));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    const mobileData = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="bet-console"]');
      if (!panel) return { error: 'no panel' };
      // Look for a 3-child columnsRow direct child (the columns=true branch).
      let columnsRow = null;
      for (const child of Array.from(panel.children)) {
        if (child.tagName === 'DIV' && child.children.length === 3) { columnsRow = child; break; }
      }
      const toWinLabel = Array.from(panel.querySelectorAll('span')).find((s) => /^TO WIN$/i.test((s.textContent || '').trim()));
      const toWinPill = toWinLabel ? toWinLabel.closest('div') : null;
      const r = toWinPill ? toWinPill.getBoundingClientRect() : null;
      const panelRect = panel.getBoundingClientRect();
      return {
        hasColumnsRow: !!columnsRow,
        panelWidth: panelRect.width,
        toWinPillWidth: r ? r.width : null,
      };
    });
    await page.screenshot({ path: 'shots/qaindep-regress-390-betentry.png' });
    results.mobile390 = mobileData;
    await page.close();
  }

  await browser.close();
  fs.writeFileSync('qaindep-towin-regress.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

run();
