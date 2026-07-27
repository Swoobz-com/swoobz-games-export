// PHASE 31 live-drive: prove ECLIPSE OFUDA's restored finishers actually MOUNT AND PLAY on a
// round-ending win at node 6 (HOLLOW SHRINE). Model: qa-boss/wire3-drive.mjs.
//
// A special fires for the WINNER of a round-ending exchange, so eclipse's finishers only play when
// SHE closes the match — i.e. when the player LOSES. The pick is uniform-random RPS, so this drives
// repeated matches until both takes (special.webm = OFUDA RITE, special-c.webm = JUDGEMENT PLUNGE)
// have been observed, screenshotting each one live.
//
// A 2.6s-per-exchange poll would step straight over a 4s clip's mount, so instead a page-side
// 120ms sampler records EVERY <video> src it ever sees, and the driver screenshots the frame a
// special is first seen on.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = join(HERE, 'n6-shots');
mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:5340/?dev=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickByText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)]
    .find((e) => (e.textContent || '').toUpperCase().includes(text.toUpperCase())) || null, sel, text);
  const el = h.asElement();
  if (!el) throw new Error('no ' + sel + ' :: ' + text);
  await el.click();
  return el;
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, name + '.png') });

// Page-side sampler: every 120ms, record each <video>'s src + whether it is actually decoding.
async function installSampler(page) {
  await page.evaluate(() => {
    window.__seen = new Map();
    if (window.__samp) clearInterval(window.__samp);
    window.__samp = setInterval(() => {
      for (const v of document.querySelectorAll('video')) {
        const src = (v.currentSrc || v.src || '').split('/assets/')[1] || '';
        if (!src) continue;
        const rec = window.__seen.get(src) || { hits: 0, played: false, w: 0 };
        rec.hits += 1;
        if (!v.paused && !v.ended && v.readyState >= 2) rec.played = true;
        rec.w = Math.max(rec.w, v.videoWidth || 0);
        window.__seen.set(src, rec);
      }
    }, 120);
  });
}
const readSeen = (page) => page.evaluate(() => Object.fromEntries(window.__seen));
// EVERY take of a state is mounted as a SIBLING <video> at once, so a probe that returns the FIRST
// match reports take A forever and take B looks like it never plays (that exact bug cost a 14-match
// run). Enumerate ALL of them and report which one is VISIBLE and ADVANCING.
const liveSpecials = (page) => page.evaluate(() => {
  const out = [];
  for (const v of document.querySelectorAll('video')) {
    const s = (v.currentSrc || v.src || '');
    if (!/eclipse-ofuda\/special/.test(s)) continue;
    const cs = getComputedStyle(v);
    out.push({
      src: s.split('/assets/')[1],
      playing: !v.paused && !v.ended && v.readyState >= 2,
      t: v.currentTime,
      opacity: Number(cs.opacity),
      shown: cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05,
    });
  }
  return out;
});

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 860 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(1200);
  await clickByText(page, 'button', 'PRESS TO BEGIN');
  await sleep(1200);
  await clickByText(page, 'button', 'CONQUEST');
  await sleep(1500);
  for (let i = 0; i < 5; i++) { try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) { /* already there */ } await sleep(700); }
  await sleep(700);

  const caught = new Set();
  for (let match = 0; match < 14 && caught.size < 2; match += 1) {
    try { await clickByText(page, 'button', 'HOLLOW SHRINE'); } catch (e) { await sleep(600); continue; }
    await sleep(900);
    if (match === 0) await shot(page, 'n6-nodecard');
    try { await clickByText(page, 'button', 'FIGHT'); } catch (e) { await sleep(600); continue; }
    await sleep(3500);
    await installSampler(page);
    if (match === 0) await shot(page, 'n6-intro');

    for (let i = 0; i < 60; i += 1) {
      if (await page.$('.fr-pickbar')) {
        await page.evaluate(() => { const p = [...document.querySelectorAll('.fr-pick:not([disabled])')]; if (p.length) p[Math.floor(Math.random() * p.length)].click(); });
        // fine-grained watch across the whole resolve window
        for (let k = 0; k < 26; k += 1) {
          for (const ls of await liveSpecials(page)) {
            if (!ls.playing || !ls.shown || ls.t < 0.05 || caught.has(ls.src)) continue;
            caught.add(ls.src);
            await shot(page, 'n6-SPECIAL-' + ls.src.replace(/[^a-z0-9]+/gi, '_'));
            console.log('CAUGHT LIVE', ls.src, 'shown+playing at t=' + ls.t.toFixed(2) + 's opacity=' + ls.opacity);
          }
          await sleep(120);
        }
      } else {
        await sleep(700);
        const done = await page.evaluate(() => /VICTORY|DEFEAT|CONQUERED/i.test(document.body.textContent || ''));
        if (done) break;
      }
    }
    const seen = await readSeen(page);
    console.log('match ' + match + ' srcs:', JSON.stringify(Object.keys(seen).filter((s) => s.includes('eclipse'))));
    await shot(page, 'n6-end-' + match);
    // back to the map for another match
    try { await clickByText(page, 'button', 'MAP'); } catch (e) {
      try { await clickByText(page, 'button', 'CONQUEST'); } catch (e2) {
        await page.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1000);
        try { await clickByText(page, 'button', 'PRESS TO BEGIN'); } catch (e3) {}
        await sleep(900); try { await clickByText(page, 'button', 'CONQUEST'); } catch (e3) {}
      }
    }
    await sleep(1400);
  }
  console.log('\nCAUGHT LIVE + SCREENSHOTTED:', JSON.stringify([...caught]));
  await browser.close();
})();
