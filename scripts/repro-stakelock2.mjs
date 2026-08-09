// REPRO 2 — the mechanism behind Tim's report: the lock ADOPTS the current stake whenever progress
// is empty (`!hasProgress` in applyCampaignStakeLock). So one commit made at a LOWER stake while the
// run happens to be empty silently re-bases the run, and returning to your normal stake then wipes it.
// Seeds the "played at $10 before" state honestly via real play, then walks the trap.
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
const click = async (n, w = 900) => { const ok = await page.evaluate((x) => { const el = [...document.querySelectorAll('button,[role=button],.fr-btn,.fr-map-node')].filter((e) => e.offsetParent !== null).find((e) => ((e.getAttribute('aria-label') || e.textContent || '')).toUpperCase().includes(x.toUpperCase())); if (el) { el.click(); return true; } return false; }, n); await sleep(w); return ok; };
const setStake = async (l) => { await page.evaluate((x) => { const bb = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null).find((e) => (e.textContent || '').trim() === x); if (bb) bb.click(); }, l); await sleep(450); };

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
const st = async (label) => {
  const s = await page.evaluate(() => { let c = null; try { c = JSON.parse(localStorage.getItem('frozen-requiem.campaign.v1') || 'null'); } catch { /* */ }
    return { lock: c ? c.lockStake : null, beaten: c ? c.beaten.map((x) => (x ? 1 : 0)).join('') : null,
      warn: document.querySelectorAll('.fr-stake-wipewarn').length,
      warnText: (document.querySelector('.fr-stake-wipewarn')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96) }; });
  console.log(`${label.padEnd(44)} lock=${String(s.lock).padStart(9)} beaten=${s.beaten} warn=${s.warn}${s.warn ? ' :: ' + s.warnText : ''}`);
  return s;
};
const playOut = async (max = 60) => { const M = ['STRIKE', 'THROW', 'BLOCK'];
  for (let i = 0; i < max; i++) { const r = await page.evaluate(() => { const o = [...document.querySelectorAll('.fr-overlay')].find((x) => x.querySelector('.fr-campaign-node-line')); if (!o) return null; return (o.querySelector('.fr-receipt-victory, .fr-receipt-defeat')?.textContent || '').trim(); });
    if (r) return r; await click(M[i % 3], 1150); for (const n of ['NEXT ROUND', 'CONTINUE', 'FIGHT ON']) await click(n, 400); } return null; };
const winNode = async (nodeNeedle, stakeLabel, firstEntry = true) => {
  for (let a = 1; a <= 8; a++) {
    if (a === 1 && firstEntry) await click(nodeNeedle); else await click('RETRY', 1100);
    await setStake(stakeLabel);
    await commit(3200);
    const r = await playOut();
    if (r === 'VICTORY') return true;
  }
  return false;
};

await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle2' });
await sleep(1000);
await click('PRESS TO BEGIN'); await click('CONQUEST MAP');

console.log('\n=== A. the player establishes a $10 run ===');
await winNode('KUROHAMA', '$10');
await click('MAP', 1200);
await st('A1. node 1 won at $10');

console.log('\n=== B. they raise to $25 once (warned) — run wipes, EXPECTED ===');
await click('KUROHAMA', 1000);
await setStake('$25');
await st('B1. armed at $25 over a $10 lock');
await commit(2600);
await st('B2. after the $25 commit');
await click('MAP', 900);

console.log('\n=== C. they rebuild at $5 — and the lock SILENTLY RE-BASES to $5 ===');
await winNode('KUROHAMA', '$5');
await click('MAP', 1200);
const c1 = await st('C1. rebuilt node 1 at $5');
await click('ASHEN', 1000);
await setStake('$5'); await commit(3200); await playOut(); await click('MAP', 1200);
const c2 = await st('C2. and node 2 at $5');

console.log('\n=== D. THE SYMPTOM: go back to the $10 they started at ===');
await click('KUROHAMA', 1000);
await setStake('$10');
const d1 = await st('D1. armed at $10 (pre-commit)');
await commit(2600);
const d2 = await st('D2. after committing $10');

console.log('\n================ VERDICT ================');
console.log(`lock after the original $10 run : 10000000`);
console.log(`lock after rebuilding at $5     : ${c2.lock}   <-- silently re-based`);
console.log(`beaten before returning to $10  : ${d1.beaten}`);
console.log(`beaten after  returning to $10  : ${d2.beaten}`);
console.log(`was the player warned first?    : ${d1.warn === 1 ? 'YES' : 'NO'}`);
console.log(d2.beaten === '0000000000' && d1.beaten !== '0000000000'
  ? '>>> REPRODUCED: returning to the ORIGINAL stake wiped the rebuilt run.'
  : '>>> not reproduced.');
await b.close();
