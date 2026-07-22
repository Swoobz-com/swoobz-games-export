import puppeteer from 'puppeteer-core';
import fs from 'fs';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5317';
const S = 'shots-holisticaudit0703/a11y/';
const browser = await puppeteer.launch({
  executablePath: EXE, headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ['--window-size=1460,1040'],
});
const page = (await browser.pages())[0];
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await wait(1200);

async function tabTo(matchFn, max = 20) {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    await wait(70);
    const info = await page.evaluate(() => ({
      text: (document.activeElement?.textContent || '').trim(),
      testid: document.activeElement?.closest('[data-testid]')?.getAttribute('data-testid'),
      isBody: document.activeElement === document.body,
    }));
    if (info.isBody) continue; // wrap-around transient, keep going
    if (matchFn(info)) return { step: i + 1, ...info };
  }
  return null;
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

const result = {};

// LOBBY -> BET-ENTRY, keyboard only
const apeIn = await tabTo((i) => i.testid === 'vault-lobby-apein');
result.apeInFocused = apeIn;
if (apeIn) {
  await page.keyboard.press('Enter');
  await wait(700);
  result.reachedBetEntryViaKeyboard = await page.evaluate(() => !!document.querySelector('[data-testid="vault-betentry-right"]'));
} else {
  result.reachedBetEntryViaKeyboard = false;
}
await page.screenshot({ path: S + 'fullloop-1-betentry.png' });

// BET-ENTRY -> PLAYING, keyboard only
const sendIt = await tabTo((i) => i.testid === 'vault-betentry-confirm' && /send it/i.test(i.text));
result.sendItFocused = sendIt;
if (sendIt) {
  await page.keyboard.press('Enter');
  await wait(900);
  result.reachedPlayingViaKeyboard = await page.evaluate(() => !!document.querySelector('[data-testid="vault-playing-actions"]'));
} else {
  result.reachedPlayingViaKeyboard = false;
}
await page.screenshot({ path: S + 'fullloop-2-playing.png' });

// PLAYING: attempt to crack a tile via KEYBOARD ONLY (no mouse) — canvas has
// no tabIndex/keydown handler per source read, so this should demonstrably
// fail. Try Tab-into-canvas + Enter/Space/Arrow keys as a real empirical
// check (not just a code-reading claim).
await page.evaluate(() => document.activeElement && document.activeElement.blur());
const canvasFocusAttempt = await tabTo((i) => /canvas|grid/i.test(i.text) || i.testid === null, 12);
result.canvasReachableByTabDirectly = canvasFocusAttempt;
const revealedBeforeKbdAttempt = await page.evaluate(() => document.body.textContent);
for (const key of ['Enter', 'Space', 'ArrowRight', 'ArrowDown']) {
  await page.keyboard.press(key);
  await wait(200);
}
const canCashOutAfterKbdAttempt = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /take profit/i.test(b.textContent));
  return btn ? !btn.disabled : null;
});
result.canCashOutAfterKeyboardOnlyAttempt = canCashOutAfterKbdAttempt; // expect false/null = keyboard cannot reveal tiles
result.keyboardCanvasRevealWorked = canCashOutAfterKbdAttempt === true;

// Now use mouse ONLY for the tile reveal (the one gesture with zero kbd
// equivalent), then resume pure keyboard for the rest of the loop.
{
  const { cx, cy } = await cellCenter(6, 5);
  await page.mouse.click(cx, cy);
  await wait(600);
}
result.canCashOutAfterMouseReveal = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /take profit/i.test(b.textContent));
  return btn ? !btn.disabled : null;
});

// PLAYING -> SETTLED via TAKE PROFIT, keyboard only
const takeProfit = await tabTo((i) => i.testid === 'vault-playing-actions' && /take profit/i.test(i.text));
result.takeProfitFocused = takeProfit;
if (takeProfit) {
  await page.keyboard.press('Enter');
  await wait(1200);
  result.reachedSettledViaKeyboard = await page.evaluate(() => !!document.querySelector('[data-testid="vault-settled-result"]'));
} else {
  result.reachedSettledViaKeyboard = false;
}
await page.screenshot({ path: S + 'fullloop-3-settled.png' });

// SETTLED -> PLAYING again via BET AGAIN, keyboard only (also checks whether
// focus lands anywhere meaningful post-transition).
const betAgain = await tabTo((i) => i.testid === 'vault-settled-betagain' && /^bet again/i.test(i.text));
result.betAgainFocused = betAgain;
if (betAgain) {
  await page.keyboard.press('Enter');
  await wait(1000);
  const after = await page.evaluate(() => ({
    hasPlayingActions: !!document.querySelector('[data-testid="vault-playing-actions"]'),
    activeElTag: document.activeElement?.tagName,
    activeElIsBody: document.activeElement === document.body,
  }));
  result.reachedPlayingAgainViaKeyboard = after.hasPlayingActions;
  result.focusAfterBetAgainTransition = after;
}
await page.screenshot({ path: S + 'fullloop-4-betagain-result.png' });

fs.writeFileSync(S + 'FULLLOOP-KEYBOARD-REPORT.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
