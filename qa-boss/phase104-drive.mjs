// PHASE 104 live-drive: verify the FOUR clips swapped in phase 98 actually render correctly IN THE
// RUNNING GAME. Nothing else covers them — `tsc` and the 157 tests never touch a cal or a contact.
//
// WHAT WAS SWAPPED (phase 98) and what can go wrong:
//   eclipse-ofuda/attack-strike.webm   cal {117.07,-6.1,49.63}  contacts [667]   (was [1875])
//   eclipse-ofuda/special.webm         cal {103.9,-2.93,46.95}  contacts [875]   (was [2667])
//   ir37-pink-tessen/attack-strike-b   cal {115.09,-5.84,48.66} contacts [875]   (was [1417])
//   ir37-pink-tessen/special-c         cal {101.22,-0.49,50.12} contacts [833]   (was [1167])
//   - a wrong `cal` puts the fighter's feet off the arena floor line
//   - a wrong `contacts` fires the hitspark during the walk-back instead of on the hit
// Two of those four contact values are NON-OBVIOUS: the motion-energy argmax was a FALSE PICK (it
// landed on the crouch-drop, i.e. the launch) so the effect-strength peak was wired instead. That
// judgement is exactly what has to be confirmed by WATCHING.
//
// eclipse = campaign node 6, ir37 = node 7. Model: n10-drive.mjs.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = join(HERE, 'phase104-shots'); mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:5340/?dev=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// NODE NAMES ARE NOT THE FIGHTER NAMES. Got this wrong once: "ASHEN TORII" is node 2 (volta), so the
// first run silently fought the wrong character and only the currentSrc probe caught it
// ("OWN clips that actually mounted (0)"). The order is:
//   1 Kurohama=sora  2 Ashen Torii=volta  3 Bamboo Sea=thorn  4 Snowfang=hollow-pale
//   5 Crossing=satoshi  6 Hollow Shrine=ECLIPSE  7 Pagoda=IR37  8 Red Mist=ir56
//   9 Crimson Gates=lady-kurotachi  10 Zero Citadel=ir48
const TARGETS = [
  { node: 'HOLLOW SHRINE', conquer: 5, id: 'eclipse-ofuda', tag: 'ec' },
  { node: 'PAGODA', conquer: 6, id: 'ir37-pink-tessen', tag: 'ir37' },
];

async function clickByText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)]
    .find((e) => (e.textContent || '').toUpperCase().includes(text.toUpperCase())) || null, sel, text);
  const el = h.asElement(); if (!el) throw new Error('no ' + sel + ' :: ' + text); await el.click(); return el;
}
const shot = (page, n) => page.screenshot({ path: join(SHOTS, n + '.png') });

// Probe every character <video>: which file is mounted, is it playing, and WHERE ITS BOX SITS.
// The box geometry is the cal test — bottom edge vs the arena floor line.
function probe(page) {
  return page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].map((v) => {
      const r = v.getBoundingClientRect();
      return {
        src: (v.currentSrc || v.src || '').split('/assets/')[1] || '',
        playing: !v.paused && !v.ended && v.readyState >= 2,
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
      };
    }).filter((v) => v.src);
    // any element the game uses to mark an impact — class-name sniff, best effort
    const sparks = [...document.querySelectorAll('[class*="spark"],[class*="impact"],[class*="hit"]')]
      .map((e) => e.className && e.className.baseVal !== undefined ? e.className.baseVal : String(e.className))
      .filter(Boolean);
    return { vids, sparks, t: Math.round(performance.now()) };
  });
}
const outcome = (page) => page.evaluate(() => {
  const m = document.body.textContent.match(/(VICTORY|DEFEAT)/i); return m ? m[0].toUpperCase() : null;
});

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 860, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('requestfailed', (r) => { if (/\.webm|\.webp|\.mp4/.test(r.url())) errs.push('ASSET FAIL ' + r.url().split('/assets/')[1]); });

  const report = {};
  for (const T of TARGETS) {
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1200);
    try { await clickByText(page, 'button', 'PRESS TO BEGIN'); } catch (e) {}
    await sleep(1000);
    await clickByText(page, 'button', 'CONQUEST'); await sleep(1400);
    for (let i = 0; i < T.conquer; i++) {
      try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) {}
      await sleep(500);
    }
    await sleep(600); await shot(page, T.tag + '-00-map');
    await clickByText(page, 'button', T.node); await sleep(900);
    await shot(page, T.tag + '-01-nodecard');
    await clickByText(page, 'button', 'FIGHT'); await sleep(3800);
    await shot(page, T.tag + '-02-intro');

    const frames = []; const seen = new Set(); let settled = false; let beat = 0;
    for (let i = 0; i < 40 && !settled; i++) {
      if (await page.$('.fr-pickbar')) {
        beat++;
        await page.evaluate(() => {
          const p = [...document.querySelectorAll('.fr-pick:not([disabled])')];
          if (p.length) p[Math.floor(Math.random() * p.length)].click();
        });
        // DENSE capture through the whole resolve — a hitspark is a sub-200ms event and a
        // 1.3s-interval sample cannot resolve whether it lands on the hit or the recovery.
        for (let k = 0; k < 22; k++) {
          const p = await probe(page);
          p.vids.forEach((v) => seen.add(v.src));
          frames.push({ beat, k, ...p });
          if (beat <= 3) await shot(page, `${T.tag}-b${beat}-f${String(k).padStart(2, '0')}`);
          await sleep(120);
        }
        await sleep(900);
      } else {
        const oc = await outcome(page);
        if (oc) { settled = true; break; }
        await sleep(1200);
      }
    }
    await shot(page, T.tag + '-99-end');
    report[T.id] = {
      outcome: await outcome(page),
      srcsSeen: [...seen].sort(),
      ownSrcs: [...seen].filter((s) => s.includes('characters/' + T.id + '/')).sort(),
      frames,
    };
    console.log(`\n=== ${T.id} (node "${T.node}") ===`);
    console.log('outcome:', report[T.id].outcome, '| beats driven:', beat);
    console.log('OWN clips that actually mounted (' + report[T.id].ownSrcs.length + '):');
    report[T.id].ownSrcs.forEach((s) => console.log('   ' + s));
  }

  writeFileSync(join(SHOTS, 'probe.json'), JSON.stringify(report, null, 1));
  console.log('\nconsole errors / asset failures (' + errs.length + '):');
  [...new Set(errs)].slice(0, 15).forEach((e) => console.log('   ' + e));
  await browser.close();
})();
