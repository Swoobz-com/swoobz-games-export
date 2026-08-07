// PHASE 294 RECEIPT VERIFICATION — the two surfaces that only exist AFTER a real campaign win, so
// they cannot be reached by any dev hook (devConquerNext/All fill beaten[] without ever building a
// receipt). This driver PLAYS until it wins.
//
//   1. FIGHTER UNLOCKED card on a first clear of node 1 (unlocks SORA YARI).
//   2. THE REPLAY GUARD — the assertion that actually matters. Conquered nodes are replayable and
//      settleCampaign re-runs markBeaten on every win, so a receipt keyed on {met, nodeId} alone
//      would re-announce the unlock forever. Winning node 1 a SECOND time must render NO card.
//   3. VICTORY / ISLAND CONQUERED banner on node 10 (opt-in: --finale, needs a 2.4% win).
//
// Node 1 is a symmetric 50% fight, so a win arrives in a handful of attempts.
// Usage: node scripts/qa-phase294-receipt.mjs [--port 5342] [--attempts 14] [--finale]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);
const PORT = opt('port', '5342');
const ATTEMPTS = Number(opt('attempts', '14'));
const OUT = opt('out', 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export-swoobz-games-export-streetfighter/cb08ef98-4026-48bf-b316-8bfb9b1d58dd/scratchpad/shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (n, p, d) => { results.push({ n, p, d }); console.log(`${p ? '[ PASS ]' : '[ FAIL ]'} ${n} :: ${d}`); };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const click = async (needle, wait = 900) => {
  const ok = await page.evaluate((n) => {
    const el = [...document.querySelectorAll('button,[role=button],.fr-btn,.fr-map-node')]
      .filter((e) => e.offsetParent !== null)
      .find((e) => ((e.getAttribute('aria-label') || e.textContent || '')).toUpperCase().includes(n.toUpperCase()));
    if (el) { el.click(); return true; }
    return false;
  }, needle);
  await sleep(wait);
  return ok;
};

// Read the receipt overlay, whatever it says.
const readReceipt = () => page.evaluate(() => {
  const overlay = [...document.querySelectorAll('.fr-overlay')].find((o) => o.querySelector('.fr-campaign-node-line'));
  if (!overlay) return null;
  return {
    banner: (overlay.querySelector('.fr-banner')?.textContent || '').trim(),
    // innerText preserves the rendered line break from white-space: pre-line; textContent does not.
    bannerRendered: (overlay.querySelector('.fr-banner')?.innerText || '').trim(),
    node: (overlay.querySelector('.fr-campaign-node-line')?.textContent || '').replace(/\s+/g, ' ').trim(),
    unlockCards: overlay.querySelectorAll('.fr-unlock-card').length,
    unlockName: (overlay.querySelector('.fr-unlock-name')?.textContent || '').trim(),
    unlockEyebrow: (overlay.querySelector('.fr-unlock-eyebrow')?.textContent || '').trim(),
    result: (overlay.querySelector('.fr-receipt-victory, .fr-receipt-defeat')?.textContent || '').trim(),
  };
});

// Play the current fight to its end, cycling moves. Returns the receipt or null.
async function playToEnd(maxPicks = 60) {
  const MOVES = ['STRIKE', 'THROW', 'BLOCK'];
  for (let i = 0; i < maxPicks; i++) {
    const r = await readReceipt();
    if (r) return r;
    await click(MOVES[i % 3], 1250);
    for (const n of ['NEXT ROUND', 'CONTINUE', 'FIGHT ON']) await click(n, 500);
  }
  return await readReceipt();
}

await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
await sleep(1200);
await click('PRESS TO BEGIN');
await click('CONQUEST MAP');

// ---- 1. WIN NODE 1 (KUROHAMA DOCKS), a genuine 50% fight -------------------------------------
let won = null;
let tries = 0;
for (; tries < ATTEMPTS && !won; tries++) {
  if (tries === 0) {
    await click('KUROHAMA');
  } // else: we are already on the receipt, RETRY re-stakes the same node
  await click('STAKE', 3000);
  const r = await playToEnd();
  if (!r) { console.log(`  attempt ${tries + 1}: no receipt (inconclusive)`); break; }
  console.log(`  attempt ${tries + 1}: ${r.result || r.banner}`);
  if (/VICTORY/.test(r.result) || /VICTORY/.test(r.banner)) { won = r; break; }
  await click('RETRY', 1200);
}

if (!won) {
  rec('R1 win node 1 within the attempt budget', false, `no win in ${tries + 1} attempts — INCONCLUSIVE, not a pass`);
} else {
  rec('R1 win node 1', true, `won on attempt ${tries + 1}; node line = "${won.node}"`);
  rec('R2 FIGHTER UNLOCKED card renders on a first clear', won.unlockCards === 1, `cards = ${won.unlockCards}, eyebrow = "${won.unlockEyebrow}"`);
  rec('R3 the card names SORA YARI (node 1 fighterId), not the enemy id', /SORA YARI/i.test(won.unlockName), `name = "${won.unlockName}"`);
  await page.screenshot({ path: `${OUT}/G-receipt-unlock.png` });

  // ---- 2. THE REPLAY GUARD — win node 1 AGAIN; the card must be GONE -------------------------
  let replayWin = null;
  for (let i = 0; i < ATTEMPTS && !replayWin; i++) {
    await click('RETRY', 1200);
    await click('STAKE', 3000);
    const r = await playToEnd();
    if (!r) break;
    console.log(`  replay attempt ${i + 1}: ${r.result || r.banner}`);
    if (/VICTORY/.test(r.result) || /VICTORY/.test(r.banner)) replayWin = r;
  }
  if (!replayWin) {
    rec('R4 REPLAY GUARD: no unlock card on a re-win', false, 'never won the replay — INCONCLUSIVE, not a pass');
  } else {
    rec('R4 REPLAY GUARD: a re-win of an owned node announces NOTHING', replayWin.unlockCards === 0,
      `cards on replay = ${replayWin.unlockCards} (must be 0), name = "${replayWin.unlockName}"`);
    rec('R5 the replay still reads VICTORY (only the unlock is suppressed)', /VICTORY/.test(replayWin.result) || /VICTORY/.test(replayWin.banner), `result = "${replayWin.result}"`);
    await page.screenshot({ path: `${OUT}/H-receipt-replay-silent.png` });
  }
}

// ---- 3. OPTIONAL: the node-10 finale banner ---------------------------------------------------
if (has('finale')) {
  await click('MAP', 1200);
  // EIGHT, not nine. Node 1 is already genuinely won above (which is what stamps lockStake — a
  // purely dev-conquered ladder gets bounced by the stake lock), so devConquerNext walks the
  // frontier 2..9 and leaves node 10 UNBEATEN. Nine calls reach node 10 itself, firstClear is then
  // false and the finale banner correctly does not fire — which is the guard working, not a bug.
  for (let i = 0; i < 8; i++) await click('CONQUER NEXT', 350);
  const budget = Number(opt('finale-attempts', '60'));
  let fin = null;
  for (let i = 0; i < budget && !fin; i++) {
    if (i === 0) await click('ZERO CITADEL'); else await click('RETRY', 1200);
    await click('STAKE', 3000);
    const r = await playToEnd(120);
    if (!r) break;
    console.log(`  finale attempt ${i + 1}: ${r.result || r.banner}`);
    if (/VICTORY/.test(r.result) || /VICTORY/.test(r.banner)) fin = r;
  }
  if (!fin) rec('R6 node 10 finale banner', false, `no node-10 win in ${budget} attempts — INCONCLUSIVE, not a pass`);
  else {
    rec('R6 node 10 banner reads VICTORY / ISLAND CONQUERED', /ISLAND CONQUERED/.test(fin.bannerRendered), `banner = ${JSON.stringify(fin.bannerRendered)}`);
    await page.screenshot({ path: `${OUT}/I-receipt-finale.png` });
  }
}

await browser.close();
const failed = results.filter((r) => !r.p);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
if (failed.length) { failed.forEach((f) => console.log(' - ' + f.n + ' :: ' + f.d)); process.exit(1); }
