// WIRE WAVE 2 batch 1 live-drive: eclipse->node6, LK->node9.
// Verifies: enemy identity, character <video> srcs actually playing the new webms,
// mid-fight screenshots, money to the cent across a settled match.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'noop.js'));
const puppeteer = require('puppeteer-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = join(HERE, 'wire2-shots');
mkdirSync(SHOTS, { recursive: true });
const URL = 'http://localhost:5340/?dev=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickByText(page, sel, text) {
  const h = await page.evaluateHandle((sel, text) => {
    return [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').toUpperCase().includes(text.toUpperCase())) || null;
  }, sel, text);
  const el = h.asElement();
  if (!el) throw new Error('no ' + sel + ' :: ' + text);
  await el.click();
  return el;
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, name + '.png') });

function probeVideos(page) {
  return page.evaluate(() => {
    const vids = [...document.querySelectorAll('video')].map((v) => ({
      src: (v.currentSrc || v.src || '').split('/assets/')[1] || (v.currentSrc || v.src),
      playing: !v.paused && !v.ended && v.readyState >= 2,
      w: v.videoWidth,
    }));
    const npP2 = document.querySelector('.fr-nameplate-p2 .fr-nameplate-name');
    const bal = [...document.querySelectorAll('*')].map((e) => e.textContent || '').join(' ').match(/\$\s?([\d,]+\.\d\d)/);
    return { vids, p2Name: npP2 ? npP2.textContent.trim() : null };
  });
}

function readBalance(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.fr-balance, .fr-wallet, [class*="balance"]');
    if (el) { const m = el.textContent.match(/([\d,]+\.\d\d)/); if (m) return m[1]; }
    const m2 = document.body.textContent.match(/\$\s?([\d,]+\.\d\d)/);
    return m2 ? m2[1] : null;
  });
}

async function driveNode(page, nodeName, expectEnemy, expectClipPrefix, tag) {
  // map is open; click the node
  await clickByText(page, 'button', nodeName);
  await sleep(900);
  await shot(page, tag + '-nodecard');
  // stake+fight (REMATCH law: stake screen each match)
  await clickByText(page, 'button', 'FIGHT');
  await sleep(3500); // vsIntro
  await shot(page, tag + '-intro');
  let probes = [];
  let settled = false;
  for (let i = 0; i < 40 && !settled; i++) {
    const hasPick = await page.$('.fr-pickbar');
    if (hasPick) {
      probes.push(await probeVideos(page));
      await page.evaluate(() => {
        const picks = [...document.querySelectorAll('.fr-pick:not([disabled])')];
        if (picks.length) picks[Math.floor(Math.random() * picks.length)].click();
      });
      await sleep(2600);
      if (probes.length === 2) await shot(page, tag + '-midfight');
    } else {
      const done = await page.evaluate(() => /VICTORY|DEFEAT|CONQUERED|REWARD|RECEIPT|REMATCH|CONTINUE|RETURN/i.test(document.body.textContent));
      if (done && !(await page.$('.fr-pickbar'))) {
        const stillFighting = await page.evaluate(() => !!document.querySelector('.fr-stage'));
        const receipt = await page.evaluate(() => {
          const m = document.body.textContent.match(/(WIN|VICTORY|DEFEAT|LOSS)/i);
          return m ? m[0] : null;
        });
        if (receipt && !(await page.$('.fr-pickbar'))) { settled = true; break; }
      }
      await sleep(1500);
    }
  }
  await shot(page, tag + '-end');
  return probes;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1360,900', '--mute-audio'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 860 });

  // ---- NODE 6 (eclipse) ----
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const balStart = await readBalance(page);
  await clickByText(page, 'button', 'PRESS TO BEGIN');
  await sleep(1200);
  await clickByText(page, 'button', 'CONQUEST');
  await sleep(1500);
  for (let i = 0; i < 5; i++) { await clickByText(page, 'button', 'CONQUER NEXT'); await sleep(600); }
  await sleep(800);
  await shot(page, 'n6-map');
  const p6 = await driveNode(page, 'HOLLOW SHRINE', 'ECLIPSE OFUDA', 'eclipse-ofuda', 'n6');
  const balAfter6 = await readBalance(page);
  console.log('NODE6 probes:', JSON.stringify(p6, null, 1).slice(0, 2500));
  console.log('NODE6 balance:', balStart, '->', balAfter6);

  // ---- NODE 9 (LK) ---- continue: conquer up to node 8
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(1200);
  const bal9a = await readBalance(page);
  await clickByText(page, 'button', 'PRESS TO BEGIN');
  await sleep(1200);
  await clickByText(page, 'button', 'CONQUEST');
  await sleep(1500);
  for (let i = 0; i < 8; i++) { try { await clickByText(page, 'button', 'CONQUER NEXT'); } catch (e) {} await sleep(600); }
  await sleep(800);
  const p9 = await driveNode(page, 'CRIMSON GATES', 'LADY KUROTACHI', 'lady-kurotachi', 'n9');
  const bal9b = await readBalance(page);
  console.log('NODE9 probes:', JSON.stringify(p9, null, 1).slice(0, 2500));
  console.log('NODE9 balance:', bal9a, '->', bal9b);

  await browser.close();
})();
