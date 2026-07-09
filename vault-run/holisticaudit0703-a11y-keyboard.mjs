import puppeteer from 'puppeteer-core';
import fs from 'fs';

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = process.argv[2] || '5317';
const W = 1440, H = 900;
const S = 'shots-holisticaudit0703/a11y/';
if (!fs.existsSync(S)) fs.mkdirSync(S, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: [`--window-size=${W + 20},${H + 140}`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];

async function goto() {
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
}

async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return (
      els.find((e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase()) ||
      els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()))
    );
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
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

async function blurActive() {
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
}

async function describeActive() {
  return await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { isBody: true };
    const closestTestId = el.closest?.('[data-testid]');
    const r = el.getBoundingClientRect();
    // Detect visible focus indicator via computed outline/box-shadow.
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      type: el.getAttribute('type'),
      text: (el.textContent || '').trim().slice(0, 40),
      ariaLabel: el.getAttribute('aria-label'),
      ownTestId: el.getAttribute('data-testid'),
      closestTestId: closestTestId ? closestTestId.getAttribute('data-testid') : null,
      disabled: el.disabled === true,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      boxShadow: cs.boxShadow,
    };
  });
}

async function tabSequence(n, label) {
  const seq = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    await wait(60);
    const info = await describeActive();
    seq.push({ step: i + 1, ...info });
    if (info.isBody) break; // tab order exhausted / wrapped back to body
  }
  fs.writeFileSync(`${S}taborder-${label}.json`, JSON.stringify(seq, null, 2));
  return seq;
}

async function ariaLiveDump(label) {
  const dump = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('[aria-live]')];
    return nodes.map((n) => ({
      liveValue: n.getAttribute('aria-live'),
      testid: n.getAttribute('data-testid') || n.closest?.('[data-testid]')?.getAttribute('data-testid') || null,
      ariaLabel: n.getAttribute('aria-label'),
      childElementCount: n.childElementCount,
      textLen: (n.textContent || '').trim().length,
      textSample: (n.textContent || '').trim().slice(0, 80),
      visible: n.offsetParent !== null,
    }));
  });
  fs.writeFileSync(`${S}arialive-${label}.json`, JSON.stringify(dump, null, 2));
  return dump;
}

const report = {};

// ─────────────────────────────────────────────────────────────────────────
// PHASE 1: LOBBY — fresh load, tab order + aria-live
// ─────────────────────────────────────────────────────────────────────────
await goto();
await blurActive();
report.lobbyTabOrder = await tabSequence(20, 'lobby');
report.lobbyAriaLive = await ariaLiveDump('lobby');
await page.screenshot({ path: S + 'lobby-loaded.png' });

// find the APE IN focus step and screenshot it
{
  await goto();
  await blurActive();
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    await wait(60);
    const info = await describeActive();
    if (info.closestTestId === 'vault-lobby-apein') {
      found = true;
      await page.screenshot({ path: S + 'lobby-apein-focused.png' });
      report.lobbyApeInFocusStep = i + 1;
      report.lobbyApeInFocusInfo = info;
      break;
    }
  }
  report.lobbyApeInReachableByTab = found;
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 2: BET-ENTRY — reach via mouse click on APE IN, then fresh tab pass
// ─────────────────────────────────────────────────────────────────────────
await goto();
await clickText('ape in');
await wait(700);
await blurActive();
report.betEntryTabOrder = await tabSequence(20, 'betentry');
report.betEntryAriaLive = await ariaLiveDump('betentry');
await page.screenshot({ path: S + 'betentry-loaded.png' });

{
  await goto();
  await clickText('ape in');
  await wait(700);
  await blurActive();
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    await wait(60);
    const info = await describeActive();
    if (info.closestTestId === 'vault-betentry-confirm' && /send it/i.test(info.text)) {
      found = true;
      await page.screenshot({ path: S + 'betentry-sendit-focused.png' });
      report.betEntrySendItFocusStep = i + 1;
      report.betEntrySendItFocusInfo = info;
      break;
    }
  }
  report.betEntrySendItReachableByTab = found;
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 3: PLAYING — reach via APE IN + SEND IT, tab order BEFORE any tile
// reveal (canCashOut should be false -> TAKE PROFIT disabled/unfocusable)
// ─────────────────────────────────────────────────────────────────────────
await goto();
await clickText('ape in');
await wait(700);
await clickText('send it');
await wait(900);
await blurActive();
report.playingTabOrderPreReveal = await tabSequence(20, 'playing-prereveal');
report.playingAriaLivePreReveal = await ariaLiveDump('playing-prereveal');
await page.screenshot({ path: S + 'playing-prereveal.png' });

// Now reveal ONE tile via mouse (canvas has no keyboard equivalent — see
// finding below), then re-check tab order + look for TAKE PROFIT.
{
  const { cx, cy } = await cellCenter(6, 5);
  await page.mouse.click(cx, cy);
  await wait(600);
}
await blurActive();
report.playingTabOrderPostReveal = await tabSequence(20, 'playing-postreveal');
await page.screenshot({ path: S + 'playing-postreveal.png' });

{
  await blurActive();
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    await wait(60);
    const info = await describeActive();
    if (info.closestTestId === 'vault-playing-actions' && /take profit/i.test(info.text)) {
      found = true;
      await page.screenshot({ path: S + 'playing-takeprofit-focused.png' });
      report.playingTakeProfitFocusStep = i + 1;
      report.playingTakeProfitFocusInfo = info;
      break;
    }
  }
  report.playingTakeProfitReachableByTab = found;
  if (found) {
    // Confirm-in-passing check whether prefers-reduced-motion (real emulation,
    // not just static code reading) actually disables the dramatic breathing
    // glow when this button is in "dramatic" mode. Trigger dramatic by
    // revealing more tiles first would risk busting the round, so we just
    // record the current animation-name (still useful evidence either way).
    const anim = await page.evaluate(() => {
      const el = [...document.querySelectorAll('button')].find(
        (b) => b.offsetParent !== null && /take profit/i.test(b.textContent),
      );
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { animationName: cs.animationName, animationDuration: cs.animationDuration, className: el.className };
    });
    report.takeProfitAnimationNormal = anim;
  }
}

// Activate TAKE PROFIT via KEYBOARD ONLY (Enter) to settle, completing the
// keyboard-only loop test (mouse was only used for tile-reveal, which has
// zero keyboard equivalent at all — recorded as its own finding).
{
  // Tab is already sitting on TAKE PROFIT from the loop above if found.
  const before = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
  await page.keyboard.press('Enter');
  await wait(1200);
  const after = await page.evaluate(() => document.body.textContent.toLowerCase().includes('bet again'));
  report.keyboardOnlyCashOutFired = !before && after;
  await page.screenshot({ path: S + 'settled-after-keyboard-cashout.png' });
}

// ─────────────────────────────────────────────────────────────────────────
// PHASE 4: SETTLED — tab order + aria-live + BET AGAIN keyboard activation
// ─────────────────────────────────────────────────────────────────────────
await blurActive();
report.settledTabOrder = await tabSequence(20, 'settled');
report.settledAriaLive = await ariaLiveDump('settled');
await page.screenshot({ path: S + 'settled-loaded.png' });

{
  await blurActive();
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    await wait(60);
    const info = await describeActive();
    if (info.closestTestId === 'vault-settled-betagain' && /bet again/i.test(info.text)) {
      found = true;
      await page.screenshot({ path: S + 'settled-betagain-focused.png' });
      report.settledBetAgainFocusStep = i + 1;
      report.settledBetAgainFocusInfo = info;
      break;
    }
  }
  report.settledBetAgainReachableByTab = found;
  if (found) {
    await page.keyboard.press('Enter');
    await wait(700);
    const nowBetEntry = await page.evaluate(
      () => !!document.querySelector('[data-testid="vault-betentry-right"]'),
    );
    report.settledBetAgainKeyboardActivates = nowBetEntry;
    await page.screenshot({ path: S + 'after-betagain-keyboard.png' });
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SETTLED — force a RUG outcome too (bust), check aria-live + hero overlay
// flash timing, since win was captured above via TAKE PROFIT.
// ─────────────────────────────────────────────────────────────────────────
await goto();
await clickText('ape in');
await wait(700);
await clickText('send it');
await wait(900);
{
  // Reveal tiles until a bust (mine hit) or cap attempts.
  let busted = false;
  for (let k = 0; k < 24 && !busted; k++) {
    const { cx, cy } = await cellCenter(k, 5);
    await page.mouse.click(cx, cy);
    await wait(350);
    busted = await page.evaluate(() => document.body.textContent.toLowerCase().includes('rugged') || document.body.textContent.toLowerCase().includes('bust'));
  }
  report.reachedRugOutcome = busted;
}
await wait(800);
report.settledRugAriaLive = await ariaLiveDump('settled-rug');
await page.screenshot({ path: S + 'settled-rug.png' });

// Sample hero-overlay computed animation info right after settle (bust path)
report.rugHeroAnimation = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-hero-overlay"]');
  if (!el) return { present: false };
  const cs = getComputedStyle(el);
  return { present: true, animationName: cs.animationName, animationDuration: cs.animationDuration };
});

// ─────────────────────────────────────────────────────────────────────────
// PREFERS-REDUCED-MOTION emulation pass — re-run the WIN loop with the media
// feature forced, verify gutter-card-relevant elements collapse animation.
// ─────────────────────────────────────────────────────────────────────────
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await goto();
await clickText('ape in');
await wait(700);
await clickText('send it');
await wait(900);
{
  const { cx, cy } = await cellCenter(6, 5);
  await page.mouse.click(cx, cy);
  await wait(600);
}
report.reducedMotionMatches = await page.evaluate(
  () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
);
// Force dramatic register isn't guaranteed on 1 tile; just record whatever
// the current cash-out button's computed animation is under RM.
report.reducedMotionTakeProfitAnimation = await page.evaluate(() => {
  const el = [...document.querySelectorAll('button')].find(
    (b) => b.offsetParent !== null && /take profit/i.test(b.textContent),
  );
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { animationName: cs.animationName, className: el.className };
});
await page.keyboard.press('Tab'); // no-op, just settle focus state before shot
await page.screenshot({ path: S + 'reduced-motion-playing.png' });
// cash out to settled under RM and capture hero overlay animation state.
await clickText('take profit');
await wait(1200);
report.reducedMotionHeroAnimation = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="vault-hero-overlay"]');
  if (!el) return { present: false };
  const cs = getComputedStyle(el);
  return { present: true, animationName: cs.animationName };
});
await page.screenshot({ path: S + 'reduced-motion-settled.png' });

fs.writeFileSync(S + 'FULL-REPORT.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
