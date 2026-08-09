// REPRO — Tim, 2026-08-09: "i finished my 10 dollar stack to max and switched to 5,
// now my progress is done when i click 10 again."
// Plays the real game and prints the PERSISTED lock after every commit, so we can see
// exactly which step moves it. Usage: node scripts/repro-stakelock.mjs --port 5340
import puppeteer from 'puppeteer-core';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const PORT = opt('port', '5340');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Commit the wager. ⚠ Must match BOTH labels: since phase 296 the button reads
// "RESTART THE RUN AT $X" instead of "STAKE $X + FIGHT" whenever the stake would wipe the run,
// so a needle of "STAKE" silently fails to click exactly on the path under test.


const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await b.newPage();
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

const commit = async (wait = 3000) => {
  const ok = await page.evaluate(() => {
    const el = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null && !e.disabled)
      .find((e) => /STAKE \$|RESTART THE RUN AT/.test((e.textContent || '').trim()));
    if (el) { el.click(); return (el.textContent || '').trim(); }
    return null;
  });
  await new Promise((r) => setTimeout(r, wait));
  if (!ok) console.log('   !! commit button NOT FOUND');
  return ok;
};
const state = async (label) => {
  const s = await page.evaluate(() => {
    let c = null;
    try { c = JSON.parse(localStorage.getItem('frozen-requiem.campaign.v1') || 'null'); } catch { /* */ }
    return {
      lock: c ? c.lockStake : null,
      beaten: c ? c.beaten.map((x) => (x ? 1 : 0)).join('') : null,
      bank: localStorage.getItem('frozen-requiem.balance.v1'),
      stakeShown: (document.querySelector('.fr-bet-wager, [class*="wager"]')?.textContent || '').trim(),
      resetPlate: document.querySelectorAll('.fr-map-reset').length,
      warn: document.querySelectorAll('.fr-stake-wipewarn').length,
    };
  });
  console.log(`${label.padEnd(46)} lock=${String(s.lock).padStart(9)} beaten=${s.beaten} bank=${s.bank} resetPlate=${s.resetPlate} wipeWarn=${s.warn}`);
  return s;
};
// Set the stake by clicking a preset chip ($1/$5/$10/$25).
const setStake = async (label) => {
  const ok = await page.evaluate((l) => {
    const b2 = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null)
      .find((e) => (e.textContent || '').trim() === l);
    if (b2) { b2.click(); return true; }
    return false;
  }, label);
  await sleep(500);
  return ok;
};
// Play the current fight to its end; returns 'VICTORY' | 'DEFEAT' | null.
const playOut = async (maxPicks = 60) => {
  const MOVES = ['STRIKE', 'THROW', 'BLOCK'];
  for (let i = 0; i < maxPicks; i++) {
    const r = await page.evaluate(() => {
      const o = [...document.querySelectorAll('.fr-overlay')].find((x) => x.querySelector('.fr-campaign-node-line'));
      if (!o) return null;
      return (o.querySelector('.fr-receipt-victory, .fr-receipt-defeat')?.textContent || '').trim();
    });
    if (r) return r;
    await click(MOVES[i % 3], 1150);
    for (const n of ['NEXT ROUND', 'CONTINUE', 'FIGHT ON']) await click(n, 400);
  }
  return null;
};

await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1000);
console.log('\n=== FRESH PROFILE ===');
await click('PRESS TO BEGIN');
await click('CONQUEST MAP');
await state('0. fresh, on the map');

// ---- STEP 1: play node 1 at $10 until won -----------------------------------------------
console.log('\n=== STEP 1: play at $10 until node 1 is won ===');
for (let attempt = 1; attempt <= 8; attempt++) {
  if (attempt === 1) await click('KUROHAMA'); else await click('RETRY', 1100);
  await setStake('$10');
  await state(`  1.${attempt} armed at $10 (pre-commit)`);
  await commit(3200);
  const r = await playOut();
  console.log(`  attempt ${attempt}: ${r}`);
  await state(`  1.${attempt} after settle`);
  if (r === 'VICTORY') break;
}
await click('MAP', 1200);
const afterTen = await state('2. node 1 conquered at $10, on the map');

// ---- STEP 2: drop to $5 and play a node --------------------------------------------------
console.log('\n=== STEP 2: switch to $5 and play ===');
await click('ASHEN', 1000);
await setStake('$5');
await state('  3. armed at $5 on node 2 (pre-commit)');
await commit(3200);
const r2 = await playOut();
console.log(`  node 2 at $5: ${r2}`);
await state('  4. after the $5 settle');
await click('MAP', 1200);
const afterFive = await state('5. back on the map after playing at $5');

// ---- STEP 3: THE REPORTED BUG — go back to $10 -------------------------------------------
console.log('\n=== STEP 3: click $10 again (Tim says progress dies here) ===');
await click('KUROHAMA', 1000);
await setStake('$10');
const armed = await state('  6. armed at $10 again (pre-commit)');
await commit(3200);
const after = await state('  7. AFTER committing $10 again');

console.log('\n================ VERDICT ================');
console.log(`lock after playing at $10 : ${afterTen.lock}`);
console.log(`lock after playing at $5  : ${afterFive.lock}`);
console.log(`beaten before re-commit   : ${armed.beaten}`);
console.log(`beaten after  re-commit   : ${after.beaten}`);
console.log(`wipe warning shown first? : ${armed.warn === 1 ? 'YES' : 'NO'}`);
console.log(after.beaten === '0000000000' && armed.beaten !== '0000000000'
  ? '>>> REPRODUCED: returning to $10 WIPED the run.'
  : '>>> not reproduced on this path.');
await b.close();
