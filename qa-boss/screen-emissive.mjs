// EMISSIVE PRE-SCREEN for raw MK FINAL plates — screen #1 of the three in MK-FINAL-WAVE2-SCREEN.md.
//
// Uses the HUE-AGNOSTIC test that replaced the original warm-only one in phase 109: a pixel counts
// as emissive if it is BRIGHT (max channel >= 215) AND SATURATED (max-min >= 70). Ordinary lit
// material DESATURATES as it brightens; a flame does not. The old warm-only test scored
// drake-glaive 0.49% "clean" when it is actually >5% and had to be REJECTED.
//
// Subject = non-background. These raw plates are not chroma — background is detected from the
// four corners and matched with tolerance, so this works on white, black or transparent alike.
//
// usage: node qa-boss/screen-emissive.mjs <dir> [maxFiles]
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url); const { PNG } = require('pngjs');

// ############################################################################################
// # KNOWN LIMITATION, MEASURED phase 186: THIS SCREEN UNDER-DETECTS THIN EMISSIVE FEATURES.    #
// # emis% is a PERCENTAGE OF SUBJECT AREA, so a defect made of thin filaments scores low even  #
// # when it is visually dominant and functionally disqualifying:                               #
// #     Zephiron       1.11%  -> filed as "has a lit feature, pin it"  ... BOTH staves are      #
// #                              wrapped in brilliant baked LIGHTNING. A hard reject, missed.   #
// #     Godflame_Liu  14.09%  -> a head that is simply on fire. Large area, easy catch.         #
// # Same defect class, an order of magnitude apart in the statistic, purely from stroke width.  #
// #                                                                                            #
// # I TRIED TO FIX IT AND THE FIX DOES NOT WORK — recorded so it is not naively re-attempted.   #
// # Candidate: a HOT-CORE count (near-clipped AND strongly saturated: max>=248, max-min>=90),   #
// # reported per 100k subject px. It separates the obvious cases but NOT the one that matters:  #
// #     Stormlord_Rex (lightning)  984      Wight Spear (frost rime)   1                        #
// #     Zephiron      (lightning)   52      Hector        (clean)      0                        #
// #     oni-tetsubo   (SHIPPED)     48      Jorogumo (cyan web)        3                        #
// # Zephiron 52 vs oni-tetsubo 48. Any threshold that catches the lightning FALSE-ALARMS ON A   #
// # SHIPPED CHARACTER, and a screen that cries wolf on the roster is a screen people stop       #
// # reading. So no threshold was added.                                                        #
// #                                                                                            #
// # THE OPERATIONAL CONSEQUENCE: for THIN bright features — lightning, filaments, edge arcs —   #
// # THE VIEW IS THE ONLY RELIABLE DETECTOR. That is not a gap to be patched later; it is the    #
// # reason screens 1-3 are a CHEAP FILTER AND NOT A SHORTLIST, and why ~50% of numerically-     #
// # clean plates still die on sight. Never promote a plate on emis% alone.                      #
// ############################################################################################
const dir = process.argv[2];
if (!dir) { console.error('ERROR: no directory given — nothing was measured.'); process.exit(2); }
let entries; try { entries = fs.readdirSync(dir); }
catch (e) { console.error(`ERROR: cannot read directory ${JSON.stringify(dir)} (${e.code || e.message}) — nothing was measured.`); process.exit(2); }
const files = entries
  .filter((f) => /\.png$/i.test(f) && !/ (PFP|TCG)\.png$/i.test(f))   // base plate only
  .sort();
if (!files.length) { console.error(`ERROR: no base plates in ${JSON.stringify(dir)} (${entries.length} entries, all filtered out) — nothing was measured.`); process.exit(2); }

const rows = [], failed = [];
for (const f of files) {
  // Never skip silently — an unreadable plate must not be indistinguishable from a clean one.
  let p; try { p = PNG.sync.read(fs.readFileSync(path.join(dir, f))); } catch (e) { failed.push([f, e.code || e.message]); continue; }
  const { width: W, height: H, data: d } = p;
  const at = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i+1], d[i+2], d[i+3]]; };
  const corners = [at(0,0), at(W-1,0), at(0,H-1), at(W-1,H-1)];
  const bg = corners[0];
  const isBg = (r,g,b,a) => a < 24 || (Math.abs(r-bg[0])<26 && Math.abs(g-bg[1])<26 && Math.abs(b-bg[2])<26);
  let sub = 0, emis = 0, white = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
    if (isBg(r,g,b,a)) continue;
    sub++;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b);
    if (mx >= 215 && (mx - mn) >= 70) emis++;
    if (r >= 250 && g >= 250 && b >= 250) white++;
  }
  if (!sub) { failed.push([f, 'no subject pixels — plate is entirely background?']); continue; }
  rows.push({ f, sub, e: (emis/sub)*100, w: (white/sub)*100, fill: sub/(W*H)*100 });
}
rows.sort((a,b) => a.e - b.e);
console.log(`${rows.length} of ${files.length} base plates measured in ${dir}\n`);
console.log('  emis%   white%  subj%   plate');
console.log('  ' + '-'.repeat(74));
for (const r of rows) {
  // This screen cannot tell BAKED RIM LIGHT from a live flame — both are bright+saturated. It used to
  // say "reject" outright, which over-claimed: drake-glaive trips the top band on baked orange rim
  // light, and rim light SHIPS by pinning it inline (raiju, lich). The reject stays a human call.
  const flag = r.e >= 1.5 ? '  <- STRONG emissive, LOOK: rim light → pin it inline; live flame → reject'
             : (r.e >= 0.8 ? '  <- has a lit feature, pin it' : '');
  console.log(`  ${r.e.toFixed(2).padStart(5)}   ${r.w.toFixed(2).padStart(5)}  ${r.fill.toFixed(1).padStart(5)}   ${r.f.replace(/\.png$/,'')}${flag}`);
}
// Say plainly what was NOT measured — silence is indistinguishable from a clean result.
if (failed.length) {
  console.error(`\nERROR: ${failed.length} of ${files.length} plate(s) could NOT be measured:`);
  for (const [f, why] of failed) console.error(`  ${f}  (${why})`);
  console.error('The table above is INCOMPLETE. Do not read it as a verdict on the missing plates.');
  process.exit(2);
}
