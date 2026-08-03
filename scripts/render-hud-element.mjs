// render-hud-element.mjs — SEE a HUD element without the browser extension.
//
// WHY THIS EXISTS. The Chrome extension has been unavailable for whole sessions, and a HUD change
// cannot be judged from CSS source: the shield pips shipped a "crack" that was authored as a 135deg
// gradient on an element carrying rotate(45deg), so on screen it came out a horizontal red MINUS
// SIGN. Nobody could see that by reading it. puppeteer-core + the real fight.css closes the gap.
//
// THE TWO THINGS THAT MAKE IT HONEST, both learned by getting them wrong first:
//   1. --sw / --sh ARE THE WHOLE PROBLEM. They are stage/100, so at a 1920x1071.6 campaign stage
//      they are 19.2px / 10.716px and a `calc(var(--sh) * 1.55)` mark is SIXTEEN PIXELS. Render at
//      any other scale and you are judging a different object.
//   2. RENDER AT REAL STAGE PROPORTIONS, never a short mock strip. HUD elements are positioned in
//      PERCENT of the stage (CAL.hpP2 = { x0 57.4, y0 9.4 }). A 74px-tall mock stage puts 9.4% at
//      7px, which clipped the element and looked exactly like a design defect. A `position: static`
//      override to work around that then re-parented an absolutely-positioned ::before onto the
//      stage and painted a full-width black band — a second phantom defect. Both were the harness.
//
// USAGE
//   node scripts/render-hud-element.mjs <out.png> [--w 1920] [--h 1071.6] [--crop x,y,w,h]
//     [--html <fragment file>]   markup to drop inside .fr-stage (default: the shield strip + a
//                                stand-in enemy HP bar at the real CAL.hpP2 rect)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')), '..');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const out = argv.find((a) => !a.startsWith('--') && /\.png$/i.test(a));
if (!out) { console.error('usage: node scripts/render-hud-element.mjs <out.png> [--w N] [--h N] [--crop x,y,w,h] [--html file]'); process.exit(2); }
if (!fs.existsSync(CHROME)) { console.error(`ERROR: no Chrome at ${CHROME}. Set CHROME_PATH.`); process.exit(2); }

const W = Number(opt('w', 1920));
const H = Number(opt('h', 1071.6));           // a CAMPAIGN stage: 2752/1536 -> 1920/1.791667
// FAIL LOUD ON A NONSENSE STAGE. Caught on this tool's own first run: `--w 0` rendered a zero-width
// stage, wrote a PNG and exited 0 — the vacuous-pass class (a mis-invocation becoming a green light)
// that qa-boss/TOOLCHAIN-AUDIT.md catalogues across nine other tools here. A HUD render is only
// meaningful at a real stage size, because --sw/--sh ARE the stage.
if (!Number.isFinite(W) || !Number.isFinite(H) || W < 320 || H < 240) {
  console.error(`ERROR: nonsense stage ${W}x${H}. --sw/--sh derive from it, so a bad stage renders a `
    + 'meaningless image. Want >=320x240; the real campaign stage is 1920x1071.6.');
  process.exit(2);
}
const htmlFile = opt('html', null);
const DEFAULT_FRAGMENT = `
  <div class="hp"><i></i><i></i><i></i></div>
  <div class="fr-shieldpips">
    <span class="fr-shieldpip fr-shieldpip-filled"></span>
    <span class="fr-shieldpip fr-shieldpip-filled"></span>
    <span class="fr-shieldpip"></span>
  </div>`;
const fragment = htmlFile ? fs.readFileSync(htmlFile, 'utf8') : DEFAULT_FRAGMENT;
const cssUrl = 'file:///' + path.join(ROOT, 'src/ui/fight.css').replace(/\\/g, '/');

const html = `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${cssUrl}">
<style>
  :root { --sw: ${W / 100}px; --sh: ${H / 100}px; }
  body { margin:0; background:#0b0d11; }
  .stage { position:relative; width:${W}px; height:${H}px;
           background:linear-gradient(100deg,#3a2f2a,#221a17 45%,#2e2622); }
  /* stand-in enemy HP bar at the REAL CAL.hpP2 rect, so % positioning lands where it does in game */
  .hp { position:absolute; left:57.4%; top:9.4%; width:29%; height:4.2%; display:flex; gap:.35%; }
  .hp i { flex:1; background:linear-gradient(180deg,#6ee7ff,#2aa7c9); border-radius:2px; }
</style>
<div class="stage">${fragment}</div>`;

const tmp = out.replace(/\.png$/i, '.harness.html');
fs.writeFileSync(tmp, html);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: W, height: Math.round(H), deviceScaleFactor: 2 });
await page.goto('file:///' + path.resolve(tmp).replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));  // let any one-shot refill animation finish
const crop = opt('crop', null);
if (crop) {
  const [x, y, w, h] = crop.split(',').map(Number);
  await page.screenshot({ path: out, clip: { x, y, width: w, height: h } });
} else {
  await page.screenshot({ path: out });
}
await browser.close();
console.log(`wrote ${out}  (stage ${W}x${H}, --sw ${W / 100}px --sh ${(H / 100).toFixed(3)}px)`);
console.log('VIEW IT. A HUD defect that survives code review is exactly the kind only the eye finds.');
