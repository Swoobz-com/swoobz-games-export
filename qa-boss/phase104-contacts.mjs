// PHASE 104b — does the HITSPARK fire at the wired `contacts` value?
//
// `contacts` is CLIP-TIME ms: the engine fires the impact FX when the attack clip's playhead reaches
// it. So the test is exact: sample the attacker's <video>.currentTime densely and record the FIRST
// frame on which an .fr-hitspark / .fr-impact-ring exists. That currentTime must land on contacts[0].
//
// WHY IT MATTERS HERE. Phase 98 rewired all four swapped clips' contacts, and TWO of them are
// non-obvious: the motion-energy argmax was a FALSE PICK (it landed on the crouch-drop = the launch,
// not the impact), so the effect-strength peak was wired instead. Nothing else checks that call —
// tsc and the 157 tests never read a contact value.
//   eclipse attack-strike.webm  contacts [667]   (argmax, kept)
//   eclipse special.webm        contacts [875]   (effect-strength peak; argmax f8=333 rejected)
//   ir37   attack-strike-b.webm contacts [875]
//   ir37   special-c.webm       contacts [833]   (effect-strength peak; argmax f11 rejected)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = join(HERE, 'phase104-shots'); mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:5340/?dev=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TARGETS = [
  { node: 'HOLLOW SHRINE', conquer: 5, id: 'eclipse-ofuda' },
  { node: 'PAGODA', conquer: 6, id: 'ir37-pink-tessen' },
];
const WIRED = {
  'eclipse-ofuda/attack-strike.webm': 667,
  'eclipse-ofuda/special.webm': 875,
  'ir37-pink-tessen/attack-strike-b.webm': 875,
  'ir37-pink-tessen/special-c.webm': 833,
};

async function clickByText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)]
    .find((e) => (e.textContent || '').toUpperCase().includes(text.toUpperCase())) || null, sel, text);
  const el = h.asElement(); if (!el) throw new Error('no ' + sel + ' :: ' + text); await el.click(); return el;
}

// One sample: every playing clip with its playhead, plus whether an impact element is live.
const sample = (page) => page.evaluate(() => ({
  t: performance.now(),
  spark: !!document.querySelector('.fr-hitspark,.fr-impact-ring,.fr-impact-glow,.fr-clash-spark'),
  vids: [...document.querySelectorAll('video')]
    .filter((v) => !v.paused && !v.ended && v.readyState >= 2)
    .map((v) => ({
      src: ((v.currentSrc || v.src || '').split('/assets/')[1] || ''),
      ct: Math.round(v.currentTime * 1000),
    }))
    .filter((v) => v.src.includes('characters/')),
}));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 860 });
  const results = {};

  for (const T of TARGETS) {
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1100);
    try { await clickByText(page, 'button', 'PRESS TO BEGIN'); } catch (e) {}
    await sleep(900);
    await clickByText(page, 'button', 'CONQUEST'); await sleep(1300);
    for (let i = 0; i < T.conquer; i++) { try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) {} await sleep(450); }
    await sleep(500);
    await clickByText(page, 'button', T.node); await sleep(800);
    await clickByText(page, 'button', 'FIGHT'); await sleep(3600);

    // Per attack clip: the playhead values seen while a spark was live, and the whole seen range.
    const sparkAt = {}; const seenMax = {};
    for (let i = 0; i < 55; i++) {
      if (await page.$('.fr-pickbar')) {
        await page.evaluate(() => {
          const p = [...document.querySelectorAll('.fr-pick:not([disabled])')];
          if (p.length) p[Math.floor(Math.random() * p.length)].click();
        });
        for (let k = 0; k < 46; k++) {           // ~55ms x 46 = 2.5s, dense enough to time a spark
          const s = await sample(page);
          for (const v of s.vids) {
            const key = v.src.replace('characters/', '');
            if (!(key in WIRED)) continue;
            seenMax[key] = Math.max(seenMax[key] ?? 0, v.ct);
            if (s.spark) (sparkAt[key] = sparkAt[key] || []).push(v.ct);
          }
          await sleep(55);
        }
        await sleep(700);
      } else {
        const done = await page.evaluate(() => /VICTORY|DEFEAT/i.test(document.body.textContent));
        if (done) break;
        await sleep(1100);
      }
    }
    results[T.id] = { sparkAt, seenMax };
  }

  console.log('\n=== HITSPARK vs WIRED CONTACT (clip-time ms) ===');
  console.log('clip'.padEnd(42) + 'wired   first-spark   n   playhead range seen');
  for (const id of Object.keys(results)) {
    for (const key of Object.keys(WIRED)) {
      if (!key.startsWith(id + '/')) continue;
      const hits = (results[id].sparkAt[key] || []).sort((a, b) => a - b);
      const first = hits.length ? hits[0] : null;
      console.log(
        key.padEnd(42) +
        String(WIRED[key]).padEnd(8) +
        String(first ?? '-').padEnd(14) +
        String(hits.length).padEnd(4) +
        '0..' + (results[id].seenMax[key] ?? '-'),
      );
    }
  }
  writeFileSync(join(OUT, 'contacts.json'), JSON.stringify(results, null, 1));
  await browser.close();
})();
