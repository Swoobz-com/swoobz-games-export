// drive-game.mjs — DRIVE THE REAL GAME headless and screenshot it, optionally after PLAYING until
// a condition is true. The companion to scripts/render-hud-element.mjs: that one renders a static
// element against fight.css, this one exercises the actual running app.
//
// WHY THIS EXISTS. The Chrome extension has been unavailable for entire sessions, and this session
// alone the same throwaway driver was hand-written FOUR times to verify one HUD change. Worse, the
// thing that mattered most about the shield redesign — the SPENT state — could only be seen by
// actually playing until a boss absorbed a hit. "The markup exists" is not the same as "the effect
// happens", and only the second one is evidence.
//
// USAGE
//   node scripts/drive-game.mjs --out shot.png
//   node scripts/drive-game.mjs --out shot.png --node "RED MIST GORGE" --clip 1085,70,340,100
//   node scripts/drive-game.mjs --out spent.png --node "RED MIST GORGE" \
//        --until "document.querySelectorAll('.fr-shieldpip-filled').length < document.querySelectorAll('.fr-shieldpip').length"
//
//   --out <png>      required
//   --port <n>       dev server port (default 5310). Start it yourself; this never spawns one.
//   --node <name>    campaign node to enter, by its on-screen name. Omitted = stop at the map.
//   --no-stake       stop on the NODE CARD / stake screen instead of entering the fight. That screen
//                    carries the defence preview, win chance and payout, so it is where a campaign
//                    or odds change is verified.
//   --until <js>     PLAY (cycling STRIKE/THROW/BLOCK) until this page expression is truthy.
//   --picks <n>      how many picks to try before giving up (default 40).
//   --clip x,y,w,h   crop region in CSS px. Omitted = full viewport.
//   --dpr <n>        deviceScaleFactor (default 2 — you are inspecting ~20px HUD marks).
//   --keep           leave the browser open (debugging).
//
// EXIT CODES — a verification that cannot fail proves nothing.
//   0 = shot taken (and --until was satisfied, if given)
//   1 = --until never became true within --picks  ("inconclusive, NOT a pass")
//   2 = bad arguments, or the dev server is not answering
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const has = (n) => argv.includes('--' + n);

const out = opt('out', null);
if (!out || !/\.png$/i.test(out)) {
  console.error('usage: node scripts/drive-game.mjs --out <shot.png> [--node NAME] [--until JS] [--clip x,y,w,h]');
  process.exit(2);
}
if (!fs.existsSync(CHROME)) { console.error(`ERROR: no Chrome at ${CHROME}. Set CHROME_PATH.`); process.exit(2); }
const port = Number(opt('port', 5310));
const picks = Number(opt('picks', 40));
const dpr = Number(opt('dpr', 2));
if (!Number.isFinite(port) || !Number.isFinite(picks) || picks < 1 || !Number.isFinite(dpr)) {
  console.error('ERROR: --port / --picks / --dpr must be numbers, --picks >= 1'); process.exit(2);
}
const url = `http://localhost:${port}/?dev`;   // ?dev exposes CONQUER ALL / CONQUER NEXT / RESET

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: dpr });

try {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
} catch {
  console.error(`ERROR: nothing answering at ${url}. Start it first:  npx vite --port ${port} --strictPort`);
  await browser.close(); process.exit(2);
}

/** Click the first VISIBLE control whose aria-label or text contains `needle`. */
const click = async (needle, wait = 1400) => {
  const ok = await page.evaluate((n) => {
    const el = [...document.querySelectorAll('button,[role=button],.fr-btn,.fr-map-node')]
      .filter((e) => e.offsetParent !== null)
      .find((e) => ((e.getAttribute('aria-label') || e.textContent || '')).toUpperCase().includes(n.toUpperCase()));
    if (el) { el.click(); return true; }
    return false;
  }, needle);
  await new Promise((r) => setTimeout(r, wait));
  return ok;
};

await new Promise((r) => setTimeout(r, 1200));
await click('PRESS TO BEGIN');
await click('CONQUEST MAP');
await click('CONQUER ALL');          // dev hook: unlock every node so any one is reachable

const nodeName = opt('node', null);
if (nodeName) {
  if (!(await click(nodeName))) {
    console.error(`ERROR: no campaign node matching "${nodeName}" on the map.`);
    await browser.close(); process.exit(2);
  }
  if (!has('no-stake')) await click('STAKE', 3400);   // stake screen -> vs intro -> fight
}
if (has('no-stake') && opt('until', null)) {
  console.error('ERROR: --until needs a fight; it cannot be combined with --no-stake.');
  await browser.close(); process.exit(2);
}

const untilExpr = opt('until', null);
let satisfied = !untilExpr;
if (untilExpr) {
  const test = () => page.evaluate((e) => { try { return !!eval(e); } catch { return false; } }, untilExpr);
  if (await test()) satisfied = true;
  const MOVES = ['STRIKE', 'THROW', 'BLOCK'];
  for (let i = 0; i < picks && !satisfied; i++) {
    await click(MOVES[i % 3], 1500);
    if (await test()) { satisfied = true; console.log(`--until satisfied after ${i + 1} pick(s)`); break; }
    for (const n of ['NEXT ROUND', 'CONTINUE', 'FIGHT ON']) await click(n, 700);
  }
  if (!satisfied) console.error(`--until never became true in ${picks} picks — inconclusive, NOT a pass`);
}

const clip = opt('clip', null);
if (clip) {
  const [x, y, w, h] = clip.split(',').map(Number);
  if ([x, y, w, h].some((v) => !Number.isFinite(v)) || w <= 0 || h <= 0) {
    console.error('ERROR: --clip must be x,y,w,h with w,h > 0'); await browser.close(); process.exit(2);
  }
  await page.screenshot({ path: out, clip: { x, y, width: w, height: h } });
} else {
  await page.screenshot({ path: out });
}
if (!has('keep')) await browser.close();
console.log(`wrote ${out}  (dpr ${dpr}${clip ? `, clip ${clip}` : ''})`);
console.log('VIEW IT — a HUD defect that survives code review is the kind only the eye finds.');
process.exit(satisfied ? 0 : 1);
