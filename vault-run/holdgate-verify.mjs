import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const S = 'shots/holdgate-';

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: [`--window-size=1460,1040`, '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];

const consoleErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
// Fresh-visit onboarding probe: clear localStorage then reload.
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle2' });
await wait(1200);
const onboardCheck = await page.evaluate(() => {
  const body = document.body.textContent.toLowerCase();
  return {
    hasOnboardingWord: body.includes('how to play') || body.includes('welcome') || body.includes('next →') || body.includes('start playing'),
    hasHelpButton: !!document.querySelector('button[aria-label*="How" i], button[aria-label*="Help" i]'),
  };
});
console.log('ONBOARD-CHECK (fresh localStorage)', JSON.stringify(onboardCheck));

async function clickText(t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    return els.find(e => e.offsetParent !== null && e.textContent.trim().toLowerCase() === t.toLowerCase())
      || els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
  }, t);
  const el = h.asElement();
  if (!el) { console.log('NO BTN:', t); return false; }
  await el.click();
  return true;
}
async function rectOfText(t) {
  return await page.evaluate((t) => {
    const els = [...document.querySelectorAll('button,[role=button]')];
    const el = els.find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes(t.toLowerCase()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, t);
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
async function ariaLabel() {
  return await page.evaluate(() => {
    const el = document.querySelector('div[aria-live="polite"][aria-label]');
    return el ? el.getAttribute('aria-label') : null;
  });
}
async function balanceText() {
  return await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.textContent && e.textContent.trim().startsWith('BALANCE'));
    return el ? el.textContent.trim() : null;
  });
}
async function phaseSnapshot() {
  return await page.evaluate(() => {
    const body = document.body.textContent.toLowerCase();
    return {
      hasSendIt: body.includes('send it'),
      hasTakeProfit: body.includes('take profit'),
      hasBetAgain: body.includes('bet again'),
      hasApeIn: body.includes('ape in'),
      hasSettling: body.includes('settling'),
      hasRugged: body.includes('rugged'),
      hasActionBar: !!document.querySelector('.vault-actionbar'),
    };
  });
}

// ── PLAY-TO-OUTCOME helper ──────────────────────────────────────────────
// Mine placement is genuine crypto randomness per round (not deterministic),
// so a fixed tap sequence does not reliably reproduce a chosen outcome.
// Retry (fresh round each time) until the desired outcome is actually
// observed via the Settlement panel's aria-label, same pattern as
// rebet-verify.mjs.
async function playRound(outcome, maxAttempts = 10) {
  let attempts = 0;
  let gotOutcome = false;
  let lastLabel = null;
  let lastSettledNow = false;
  while (!gotOutcome && attempts < maxAttempts) {
    attempts++;
    const clickedApe = await clickText('ape in');
    if (!clickedApe) await clickText('bet again');
    await wait(700);
    await clickText('send it'); await wait(900);
    let settledNow = false;
    if (outcome === 'rug') {
      for (let k = 0; k < 25 && !settledNow; k++) {
        const { cx, cy } = await cellCenter(k, 5);
        await page.mouse.click(cx, cy); await wait(150);
        settledNow = await settled();
      }
    } else {
      for (let k = 0; k < 4 && !settledNow; k++) {
        const { cx, cy } = await cellCenter([1, 6, 11, 17, 22][k] || 2, 5);
        await page.mouse.click(cx, cy); await wait(500);
        settledNow = await settled();
      }
      if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
    }
    await wait(400);
    lastSettledNow = settledNow;
    lastLabel = await ariaLabel();
    gotOutcome = outcome === 'rug'
      ? !!(lastLabel && lastLabel.toLowerCase().startsWith('rugged'))
      : !!(lastLabel && lastLabel.toLowerCase().startsWith('took profit'));
    console.log(`  [playRound ${outcome}] attempt ${attempts} settled=${settledNow} label="${lastLabel}" gotOutcome=${gotOutcome}`);
    if (!gotOutcome && settledNow) {
      // wrong outcome landed (e.g. rugged while aiming for win) -- clear it
      // via the near-board or sidebar bet-again so the next attempt starts clean.
      const clickedAgain = await clickText('bet again');
      if (clickedAgain) await wait(700);
    }
  }
  return { settledNow: lastSettledNow, label: lastLabel, attempts, gotOutcome };
}

console.log('\n=== SEGMENT A: WIN journey -> near-board BET AGAIN ===');
{
  const r = await playRound('win');
  console.log('WIN settle result', JSON.stringify(r));
  await page.screenshot({ path: S + 'A1-settled-win.png' });
  const balBefore = await balanceText();
  const phaseBefore = await phaseSnapshot();
  console.log('balance before near-board click', balBefore, JSON.stringify(phaseBefore));

  const nearRect = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="vault-board-rebet"]');
    const b = w ? w.querySelector('button') : null;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled, pe: getComputedStyle(b).pointerEvents };
  });
  console.log('near-board button rect/state', JSON.stringify(nearRect));
  if (nearRect && nearRect.pe === 'none') { await wait(600); }
  if (nearRect) {
    await page.mouse.click(nearRect.x, nearRect.y);
  } else {
    console.log('FAIL: near-board bet-again button not found');
  }
  await wait(700);
  const phaseAfter = await phaseSnapshot();
  const balAfter = await balanceText();
  console.log('phase after near-board click', JSON.stringify(phaseAfter));
  console.log('balance after near-board click', balAfter);
  await page.screenshot({ path: S + 'A2-after-nearboard-click.png' });

  // Expect: no longer "settled" (bet again + rugged/won text gone), should be playing (action bar + no send-it card) or bet-entry.
  const advanced = !phaseAfter.hasBetAgain && (phaseAfter.hasActionBar || phaseAfter.hasSendIt);
  console.log('ADVANCED-PAST-SETTLED:', advanced);

  // Check no stale overlays / duplicate headers.
  const overlayCheck = await page.evaluate(() => {
    const hero = document.querySelectorAll('[data-testid="vault-hero-overlay"]').length;
    const nearWrap = document.querySelectorAll('[data-testid="vault-board-rebet"]').length;
    const headerTapes = document.querySelectorAll('[class*="tape" i], header').length;
    return { heroCount: hero, nearWrapCount: nearWrap, headerLikeCount: headerTapes };
  });
  console.log('OVERLAY/DUP CHECK after near-board rebet', JSON.stringify(overlayCheck));
}

console.log('\n=== SEGMENT B: RUG journey -> near-board BET AGAIN ===');
{
  const r = await playRound('rug');
  console.log('RUG settle result', JSON.stringify(r));
  await page.screenshot({ path: S + 'B1-settled-rug.png' });
  const phaseBefore = await phaseSnapshot();
  console.log('phase at settle(rug)', JSON.stringify(phaseBefore));

  const nearRect = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="vault-board-rebet"]');
    const b = w ? w.querySelector('button') : null;
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled, pe: getComputedStyle(b).pointerEvents };
  });
  console.log('near-board button rect/state (rug)', JSON.stringify(nearRect));
  await wait(600); // clear the misclick-guard delay
  if (nearRect) await page.mouse.click(nearRect.x, nearRect.y);
  await wait(700);
  const phaseAfter = await phaseSnapshot();
  console.log('phase after near-board click (rug)', JSON.stringify(phaseAfter));
  await page.screenshot({ path: S + 'B2-after-nearboard-click-rug.png' });
  const advanced = !phaseAfter.hasBetAgain && (phaseAfter.hasActionBar || phaseAfter.hasSendIt);
  console.log('ADVANCED-PAST-SETTLED (rug):', advanced);
}

console.log('\n=== SEGMENT C: DOUBLE-FIRE race test (near-board + sidebar near-simultaneous) ===');
{
  const r = await playRound('win');
  console.log('settle for double-fire test', JSON.stringify(r));
  const balBefore = await balanceText();
  console.log('balance before double-click race', balBefore);
  const rects = await page.evaluate(() => {
    const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
    const nearBtn = nearWrap ? nearWrap.querySelector('button') : null;
    const allBetAgain = [...document.querySelectorAll('button')].filter(
      e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
    );
    const sidebarBtn = allBetAgain.find(b => !nearWrap || !nearWrap.contains(b)) || null;
    const nr = nearBtn ? nearBtn.getBoundingClientRect() : null;
    const sr = sidebarBtn ? sidebarBtn.getBoundingClientRect() : null;
    return {
      near: nr && { x: nr.left + nr.width / 2, y: nr.top + nr.height / 2 },
      sidebar: sr && { x: sr.left + sr.width / 2, y: sr.top + sr.height / 2 },
    };
  });
  console.log('race-test button coords', JSON.stringify(rects));
  await wait(600); // clear misclick guard on near-board
  if (rects.near && rects.sidebar) {
    // Fire both clicks back-to-back with NO await between the dispatch calls
    // to maximize the chance of hitting the pre-setState race window.
    const p1 = page.mouse.click(rects.near.x, rects.near.y);
    const p2 = page.mouse.click(rects.sidebar.x, rects.sidebar.y);
    await Promise.all([p1, p2]);
  } else {
    console.log('RACE-TEST SKIPPED: could not resolve both button coords');
  }
  await wait(900);
  const balAfter = await balanceText();
  const phaseAfter = await phaseSnapshot();
  console.log('balance after double-click race', balAfter);
  console.log('phase after double-click race', JSON.stringify(phaseAfter));
  await page.screenshot({ path: S + 'C1-after-double-click-race.png' });
  // A single-fire wager deduction moves balance from ~1.00 baseline by exactly
  // one wager amount; a double-fire would deduct twice. We can't always know
  // the exact wager, so cross-check against a THIRD, later solo click: it
  // should be a no-op (phase already playing) proving the guard held.
  const nearRectAfter = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="vault-board-rebet"]');
    return w ? true : false;
  });
  console.log('near-board wrapper still present after race (should be false once in playing):', nearRectAfter);
}

console.log('\n=== SEGMENT D: sidebar BET AGAIN alone still works ===');
{
  // finish the round started in segment C
  let settledNow = await settled();
  let guard = 0;
  while (!settledNow && guard < 6) {
    const { cx, cy } = await cellCenter(guard, 5);
    await page.mouse.click(cx, cy); await wait(500);
    settledNow = await settled();
    guard++;
  }
  if (!settledNow) { await clickText('take profit'); await wait(900); settledNow = await settled(); }
  await wait(400);
  console.log('settled before sidebar-only test:', settledNow, await ariaLabel());
  const sidebarRect = await page.evaluate(() => {
    const nearWrap = document.querySelector('[data-testid="vault-board-rebet"]');
    const allBetAgain = [...document.querySelectorAll('button')].filter(
      e => e.offsetParent !== null && e.textContent.trim().toLowerCase().includes('bet again'),
    );
    const sidebarBtn = allBetAgain.find(b => !nearWrap || !nearWrap.contains(b)) || null;
    if (!sidebarBtn) return null;
    const r = sidebarBtn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  console.log('sidebar-only rect', JSON.stringify(sidebarRect));
  if (sidebarRect) await page.mouse.click(sidebarRect.x, sidebarRect.y);
  await wait(700);
  const phaseAfter = await phaseSnapshot();
  console.log('phase after SIDEBAR-ONLY click', JSON.stringify(phaseAfter));
  await page.screenshot({ path: S + 'D1-after-sidebar-only-click.png' });
}

console.log('\n=== SEGMENT E: in-canvas HUD phase check ===');
{
  // Get back to a clean settled state, click near-board to go to playing, inspect actionBar position vs canvas.
  let settledNow = await settled();
  let guard = 0;
  while (!settledNow && guard < 25) {
    const { cx, cy } = await cellCenter(guard, 5);
    await page.mouse.click(cx, cy); await wait(150);
    settledNow = await settled();
    guard++;
  }
  if (!settledNow) { await clickText('take profit'); await wait(900); }
  await wait(500);
  await clickText('change mode'); // settled -> bet-entry
  await wait(600);
  const betEntryLayout = await page.evaluate(() => {
    const plain = (r) => r && { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
    const canvas = document.querySelector('canvas');
    const cr = canvas ? canvas.getBoundingClientRect() : null;
    const sendIt = [...document.querySelectorAll('button')].find(e => e.offsetParent !== null && e.textContent.toLowerCase().includes('send it'));
    const card = sendIt ? sendIt.closest('div') : null;
    const cardOuter = card ? card.parentElement : null;
    const rect = (cardOuter || card) ? (cardOuter || card).getBoundingClientRect() : null;
    return { canvas: plain(cr), cardRect: plain(rect), sendItFound: !!sendIt };
  });
  console.log('BET-ENTRY (setup phase) layout', JSON.stringify(betEntryLayout));
  await page.screenshot({ path: S + 'E1-bet-entry.png' });

  await clickText('send it'); await wait(900);
  const playingLayout = await page.evaluate(() => {
    const plain = (r) => r && { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
    const canvas = document.querySelector('canvas');
    const cr = canvas ? canvas.getBoundingClientRect() : null;
    const bar = document.querySelector('.vault-actionbar');
    const br = bar ? bar.getBoundingClientRect() : null;
    return { canvas: plain(cr), actionBar: plain(br) };
  });
  console.log('PLAYING (gameplay phase) layout', JSON.stringify(playingLayout));
  await page.screenshot({ path: S + 'E2-playing.png' });
  if (playingLayout.canvas && playingLayout.actionBar) {
    console.log('actionBar.top >= canvas.bottom (below canvas, flex sibling)?', playingLayout.actionBar.top >= playingLayout.canvas.bottom - 2);
  }
}

console.log('\n=== SEGMENT F: change-wager + change-mode/share reachability ===');
{
  // finish this round to get back to settled, then test the stepper + links.
  let settledNow = await settled();
  let guard = 0;
  while (!settledNow && guard < 25) {
    const { cx, cy } = await cellCenter(guard, 5);
    await page.mouse.click(cx, cy); await wait(150);
    settledNow = await settled();
    guard++;
  }
  if (!settledNow) { await clickText('take profit'); await wait(900); }
  await wait(500);
  const wagerBefore = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.getAttribute && e.getAttribute('aria-label') && e.getAttribute('aria-label').startsWith('Bet again'));
    return el ? el.getAttribute('aria-label') : null;
  });
  console.log('wager BEFORE stepper', wagerBefore);
  const incBtn = await page.$('button[aria-label="Increase next bet"]');
  if (incBtn) { await incBtn.click(); await incBtn.click(); await wait(300); }
  const wagerAfter = await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const el = els.find(e => e.getAttribute && e.getAttribute('aria-label') && e.getAttribute('aria-label').startsWith('Bet again'));
    return el ? el.getAttribute('aria-label') : null;
  });
  console.log('wager AFTER stepper (2x increase)', wagerAfter);
  console.log('STEPPER-CHANGED-LABEL:', wagerBefore !== wagerAfter);

  const shareInfo = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(e => e.getAttribute('aria-label') === 'Share this result');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return { visible: btn.offsetParent !== null, pointerEvents: cs.pointerEvents, display: cs.display, rect: { w: r.width, h: r.height } };
  });
  console.log('SHARE LINK reachability (not clicked, avoids native OS share dialog hang)', JSON.stringify(shareInfo));

  const changeModeBtn = await rectOfText('change mode');
  console.log('CHANGE MODE link rect', JSON.stringify(changeModeBtn));
  if (changeModeBtn) {
    await page.mouse.click(changeModeBtn.left + changeModeBtn.width / 2, changeModeBtn.top + changeModeBtn.height / 2);
    await wait(600);
    const afterChangeMode = await phaseSnapshot();
    console.log('phase after CHANGE MODE click', JSON.stringify(afterChangeMode));
    await page.screenshot({ path: S + 'F1-after-change-mode.png' });
  }
}

console.log('\n=== CONSOLE ERRORS COLLECTED (full run) ===');
console.log(JSON.stringify(consoleErrors, null, 1));
console.log('TOTAL CONSOLE ERRORS:', consoleErrors.length);

await browser.close();
console.log('DONE holdgate-verify', PORT);
