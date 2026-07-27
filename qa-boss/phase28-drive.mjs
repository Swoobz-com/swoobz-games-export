// PHASE 26-28 live-drive: prove the four touched bosses still mount + PLAY their own clips in the
// real game, and that the facing fix reads correctly on the stage.
//   n4 SNOWFANG PASS  hollow-pale      (phase 26: block Take B + special Takes A/C restored)
//   n6 HOLLOW SHRINE  eclipse-ofuda    (phase 28: 4 clips hflipped, faces:'left')
//   n7 BURNED PAGODA  ir37-pink-tessen (phase 28: hit + victory hflipped, faces:'right')
//   n9 CRIMSON GATES  lady-kurotachi   (phase 27: 11 clips hflipped, faces:'right')
// Model: qa-boss/wire3-drive.mjs (its conquer/pick/probe pattern is the proven one).
//
// The extra assertion over wire3: for every character <video> that actually plays, read the COMPUTED
// transform of the wrapper the FACING RULE writes (FightExperience.tsx:1087). The enemy sits in the p2
// slot, which must face LEFT; so a def with faces:'right' MUST come out scaleX(-1) and a def with
// faces:'left' MUST come out unmirrored. That is the runtime half of what check-facing.mjs proves on
// the pixels — the gate says the art faces the way the manifest claims, this says the manifest claim
// produces the right on-screen direction.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = join(HERE, 'phase28-shots');
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

function probe(page) {
  return page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].map((v) => {
      // Walk up for the nearest ancestor carrying an explicit scaleX — that is the FACING RULE wrapper.
      let mirrored = null;
      for (let n = v.parentElement; n && n !== document.body; n = n.parentElement) {
        const t = getComputedStyle(n).transform;
        if (t && t !== 'none') {
          const m = t.match(/^matrix\(([-\d.]+)/);
          if (m) { mirrored = Number(m[1]) < 0; break; }
        }
      }
      return {
        src: (v.currentSrc || v.src || '').split('/assets/')[1] || '',
        playing: !v.paused && !v.ended && v.readyState >= 2,
        w: v.videoWidth, mirrored,
      };
    });
    const np = document.querySelector('.fr-nameplate-p2 .fr-nameplate-name');
    return { vids, p2Name: np ? np.textContent.trim() : null };
  });
}
const bal = (page) => page.evaluate(() => {
  const m = document.body.textContent.match(/\$\s?([\d,]+\.\d\d)/); return m ? m[1] : null;
});
const outcome = (page) => page.evaluate(() => {
  const m = document.body.textContent.match(/(VICTORY|DEFEAT|WIN|LOSS|CONQUERED)/i); return m ? m[0].toUpperCase() : null;
});

async function driveNode(page, conquers, nodeName, clipPrefix, faces, tag) {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const bStart = await bal(page);
  await clickByText(page, 'button', 'PRESS TO BEGIN');
  await sleep(1200);
  await clickByText(page, 'button', 'CONQUEST');
  await sleep(1500);
  for (let i = 0; i < conquers; i++) { try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) {} await sleep(700); }
  await sleep(700);
  await clickByText(page, 'button', nodeName);
  await sleep(900);
  await clickByText(page, 'button', 'FIGHT');
  await sleep(3500);
  await shot(page, tag + '-intro');

  const probes = []; let settled = false;
  for (let i = 0; i < 48 && !settled; i++) {
    if (await page.$('.fr-pickbar')) {
      probes.push(await probe(page));
      await page.evaluate(() => {
        const p = [...document.querySelectorAll('.fr-pick:not([disabled])')];
        if (p.length) p[Math.floor(Math.random() * p.length)].click();
      });
      await sleep(2600);
      if (probes.length === 2) await shot(page, tag + '-midfight');
    } else {
      const oc = await outcome(page);
      if (oc && !(await page.$('.fr-pickbar'))) { settled = true; break; }
      await sleep(1500);
    }
  }
  await shot(page, tag + '-end');

  const own = probes.flatMap((p) => p.vids).filter((v) => v.src.includes('characters/' + clipPrefix + '/'));
  const srcs = [...new Set(own.map((v) => v.src))];
  const played = [...new Set(own.filter((v) => v.playing).map((v) => v.src))];
  // p2 slot must face LEFT, so faces:'right' art must be mirrored and faces:'left' art must not.
  const wantMirrored = faces === 'right';
  const seen = [...new Set(own.map((v) => v.mirrored))].filter((x) => x !== null);
  const facingOk = seen.length > 0 && seen.every((m) => m === wantMirrored);
  console.log('=== ' + tag + '  ' + nodeName + '  (' + clipPrefix + ", faces:'" + faces + "') ===");
  console.log('  p2 name        :', JSON.stringify([...new Set(probes.map((p) => p.p2Name).filter(Boolean))]));
  console.log('  own clips seen :', srcs.length, JSON.stringify(srcs));
  console.log('  actually PLAYED:', played.length, JSON.stringify(played));
  console.log('  wrapper scaleX<0:', JSON.stringify(seen), '| expected', wantMirrored, '->', facingOk ? 'FACING OK' : 'FACING MISMATCH');
  console.log('  balance        :', bStart, '->', await bal(page), '| outcome:', await outcome(page));
  return facingOk && played.length > 0;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 860 });
  const r = [];
  r.push(await driveNode(page, 3, 'SNOWFANG PASS', 'hollow-pale', 'right', 'n4'));
  // eclipse was normalised from faces:'left' to 'right' in phase 29 (Tim's one-convention ruling),
  // so the expectation here flips too: the p2 slot must face LEFT, so her 'right' art is now MIRRORED.
  r.push(await driveNode(page, 5, 'HOLLOW SHRINE', 'eclipse-ofuda', 'right', 'n6'));
  r.push(await driveNode(page, 6, 'BURNED PAGODA', 'ir37-pink-tessen', 'right', 'n7'));
  r.push(await driveNode(page, 8, 'CRIMSON GATES', 'lady-kurotachi', 'right', 'n9'));
  console.log('\nALL NODES PASS:', r.every(Boolean));
  await browser.close();
})();
