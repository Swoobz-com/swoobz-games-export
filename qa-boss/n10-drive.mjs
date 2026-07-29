// NODE 10 live-drive: ir48-hex-paper-lord (ZERO CITADEL, the FINAL BOSS). Conquer 1-9 -> node 10,
// fight it out, and probe that ir48's OWN clips mount + play (not volta's, which node 10 used as the
// in-fight stand-in until this wire). Model: n8-drive.mjs.
//
// The failure this exists to catch: a manifest can typecheck, pass every unit test and still ship a
// clip that NEVER PLAYS, because clip resolution is exact-match on the state name with no fallback.
// The only proof is probing the live <video> elements' currentSrc during a real fight.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = join(HERE, 'n10-shots'); mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:5340/?dev=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function clickByText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)]
    .find((e) => (e.textContent || '').toUpperCase().includes(text.toUpperCase())) || null, sel, text);
  const el = h.asElement(); if (!el) throw new Error('no ' + sel + ' :: ' + text); await el.click(); return el;
}
const shot = (page, n) => page.screenshot({ path: join(SHOTS, n + '.png') });
function probe(page) {
  return page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].map((v) => ({
      src: (v.currentSrc || v.src || '').split('/assets/')[1] || '',
      playing: !v.paused && !v.ended && v.readyState >= 2,
      w: v.getBoundingClientRect().width,
    }));
    const np = document.querySelector('.fr-nameplate-p2 .fr-nameplate-name');
    return { vids, p2Name: np ? np.textContent.trim() : null };
  });
}
const outcome = (page) => page.evaluate(() => { const m = document.body.textContent.match(/(VICTORY|DEFEAT|WIN|LOSS)/i); return m ? m[0].toUpperCase() : null; });
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1360, height: 860 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => { if (/\.webm|\.webp/.test(r.url())) errs.push('ASSET FAIL ' + r.url().split('/assets/')[1]); });
  await page.goto(URL, { waitUntil: 'networkidle2' }); await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1200);
  await clickByText(page, 'button', 'PRESS TO BEGIN'); await sleep(1200);
  await clickByText(page, 'button', 'CONQUEST'); await sleep(1500);
  for (let i = 0; i < 9; i++) { try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) { /* frontier already there */ } await sleep(700); }
  await sleep(700); await shot(page, 'n10-map');
  await clickByText(page, 'button', 'ZERO CITADEL'); await sleep(900); await shot(page, 'n10-nodecard');
  await clickByText(page, 'button', 'FIGHT'); await sleep(3500); await shot(page, 'n10-intro');
  const probes = []; let settled = false;
  for (let i = 0; i < 60 && !settled; i++) {
    if (await page.$('.fr-pickbar')) {
      probes.push(await probe(page));
      await page.evaluate(() => { const p = [...document.querySelectorAll('.fr-pick:not([disabled])')]; if (p.length) p[Math.floor(Math.random() * p.length)].click(); });
      await sleep(1300);
      probes.push(await probe(page)); // mid-resolve: catches the attack/hit clips, not just idle
      await shot(page, 'n10-beat' + probes.length);
      await sleep(1400);
    } else { const oc = await outcome(page); if (oc) { settled = true; break; } await sleep(1500); }
  }
  await shot(page, 'n10-end');
  const srcs = [...new Set(probes.flatMap((p) => p.vids.map((v) => v.src).filter(Boolean)))];
  const own = srcs.filter((s) => s.includes('characters/ir48-hex-paper-lord/'));
  const volta = srcs.filter((s) => s.includes('characters/volta/'));
  console.log('=== NODE 10 ZERO CITADEL (final boss) ===');
  console.log('p2 names:', JSON.stringify([...new Set(probes.map((p) => p.p2Name).filter(Boolean))]));
  console.log('OWN ir48 clips played (' + own.length + '):');
  own.forEach((s) => console.log('   ' + s));
  console.log('volta clips still playing (must be 0 for the boss slot):', JSON.stringify(volta));
  console.log('outcome:', await outcome(page));
  console.log('console errors / asset failures (' + errs.length + '):');
  [...new Set(errs)].slice(0, 12).forEach((e) => console.log('   ' + e));
  await browser.close();
})();
