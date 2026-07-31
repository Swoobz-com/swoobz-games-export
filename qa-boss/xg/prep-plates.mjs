// XG PLATE PREP — the pre-kit gate for an XGundam plate, run BEFORE any acting line is written.
//
// Answers three questions per plate, in the order that matters:
//   1. CHROMA-DETAIL SAFETY. Does the CHARACTER itself contain plate-coloured pixels? Pale_Choir's
//      TEETH are rgb(20,189,12) — 25.6% of his mouth keys out as backdrop, so a green plate DELETES
//      his mouth. Detected by flood-filling the plate from the border and then counting green-
//      dominant pixels that the fill could NOT reach: those are green pixels ON the character.
//      Several XGundam characters are lime/acid-themed, so this is a live risk, not a formality.
//   2. FRAME BUDGET, before and after padding (delegated to measure-anchor-budget.mjs).
//   3. PROP-EXTENDED or PROP-TUCKED — the split that decides whether a kit is even writable.
//      Measured as the widest contiguous run of subject rows at body height vs the full bbox.
//
// Usage: node qa-boss/xg/prep-plates.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter';
const require = createRequire(`${ROOT}/package.json`);
const { PNG } = require('pngjs');

const SRC = `${ROOT}/input/MK FINAL/XGundam not sorted`;
const OUT = `${ROOT}/qa-boss/anchors/xg`;
fs.mkdirSync(OUT, { recursive: true });

const PILOT = [
  ['IR-41 Kasa Oni', 'ir41-kasa-oni'],
  ['IR-60 Tiger-Mantis', 'ir60-tiger-mantis'],
  ['IR-52 Umbra Pinions', 'ir52-umbra-pinions'],
  ['IR-05 Fullbarge Titan', 'ir05-fullbarge-titan'],
  ['IR-21 Shirogiri Ace', 'ir21-shirogiri-ace'],
  ['IR-22 Akayari Vanguard', 'ir22-akayari-vanguard'],
];

// Same green predicate as pad-anchor-plate.mjs:51 / measure-anchor-budget.mjs, so the numbers here
// and the numbers those tools print refer to the same pixels.
const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;

function chromaDetailScan(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const { width: w, height: h, data: d } = p;
  const green = new Uint8Array(w * h);
  let greenTotal = 0;
  for (let i = 0; i < w * h; i++) {
    if (isGreen(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])) { green[i] = 1; greenTotal++; }
  }
  // Flood the BACKDROP inward from every border pixel that is green. Anything green left unvisited
  // is enclosed by the subject — i.e. green that belongs to the CHARACTER.
  const seen = new Uint8Array(w * h);
  const st = [];
  for (let x = 0; x < w; x++) { st.push(x, 0); st.push(x, h - 1); }
  for (let y = 0; y < h; y++) { st.push(0, y); st.push(w - 1, y); }
  while (st.length) {
    const y = st.pop(), x = st.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = w * y + x;
    if (seen[i] || !green[i]) continue;
    seen[i] = 1;
    st.push(x + 1, y); st.push(x - 1, y); st.push(x, y + 1); st.push(x, y - 1);
  }
  let reached = 0;
  for (let i = 0; i < w * h; i++) if (seen[i]) reached++;
  const enclosed = greenTotal - reached;

  // ##########################################################################################
  // # THE FALSE-POSITIVE THIS SCAN FELL INTO, AND THE FIX (phase 88).                         #
  // # "Green the border flood cannot reach" is NOT the same as "green on the character".      #
  // # A bat wing with gaps between its fingers, or a spear held away from the body, ENCLOSES  #
  // # a pocket of ordinary BACKDROP inside the silhouette. Measured raw, IR-52 Umbra Pinions  #
  // # scored 34,726px "on the character" (3.33%) and IR-22 Akayari Vanguard 26,583px (3.62%)  #
  // # — and BOTH were pure backdrop pockets, confirmed by painting them red and LOOKING.      #
  // # Acting on that number would have re-plated two clean characters, and for Umbra Pinions  #
  // # the recommended magenta plate would have been actively WRONG: she IS magenta.           #
  // #                                                                                         #
  // # DISCRIMINATOR: split the enclosed green into connected components. A backdrop pocket is #
  // # ONE or a FEW LARGE blobs. Real chroma-coloured character detail (Pale_Choir's TEETH) is #
  // # MANY SMALL blobs sitting inside solid character. So report the component profile and    #
  // # emit a viz — and REFUSE to conclude from the raw pixel count alone.                     #
  // ##########################################################################################
  const encMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (green[i] && !seen[i]) encMask[i] = 1;
  const comp = new Uint8Array(w * h);
  const sizes = [];
  for (let y0 = 0; y0 < h; y0++) for (let x0 = 0; x0 < w; x0++) {
    const id0 = w * y0 + x0;
    if (!encMask[id0] || comp[id0]) continue;
    let n = 0; const s = [x0, y0];
    while (s.length) {
      const yy = s.pop(), xx = s.pop();
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const i2 = w * yy + xx;
      if (comp[i2] || !encMask[i2]) continue;
      comp[i2] = 1; n++;
      s.push(xx + 1, yy); s.push(xx - 1, yy); s.push(xx, yy + 1); s.push(xx, yy - 1);
    }
    sizes.push(n);
  }
  sizes.sort((a, b) => b - a);
  const big = sizes.filter((n) => n >= 500);
  const largestShare = enclosed ? sizes[0] / enclosed : 0;
  // COUNT is the wrong discriminator — a multi-finger wing legitimately makes 5+ large pockets
  // (IR-52 Umbra Pinions: 6 components, all of them thousands of px, all verified backdrop).
  // SIZE is the right one. Chroma-coloured character DETAIL is inherently small: Pale_Choir's teeth
  // are a scatter of few-hundred-px blobs inside solid character. A backdrop pocket is a hole in the
  // silhouette and is large. So ask what fraction of the enclosed green lives in SMALL components.
  const SMALL = 1000;
  const smallPx = sizes.filter((n) => n < SMALL).reduce((a, b) => a + b, 0);
  const smallShare = enclosed ? smallPx / enclosed : 0;
  return {
    w, h,
    greenPct: (100 * greenTotal) / (w * h),
    backdropPct: (100 * reached) / (w * h),
    enclosedGreenPx: enclosed,
    enclosedPctOfSubject: (100 * enclosed) / Math.max(1, w * h - reached),
    components: sizes.length,
    bigComponents: big.length,
    largestShare,
    smallShare,
  };
}

// ADAPTIVE FILL. pad-anchor-plate REFUSES rather than emit a plate whose margins are under
// --min-margin, which is correct — but a WIDE subject (Tiger-Mantis is 1305px at fill 0.68, leaving
// 116px per side) simply cannot have both 0.68 fill and 200px margins. So step the fill DOWN until
// the margin law is satisfiable, and RECORD which fill each character needed: a low fill means the
// character is physically smaller in frame, which costs on-screen detail and is worth knowing before
// anyone judges its clips for softness.
const FILLS = [0.68, 0.62, 0.56, 0.50, 0.45, 0.40, 0.35];
const rows = [];
for (const [name, slug] of PILOT) {
  const src = path.join(SRC, `${name}.png`);
  const padded = path.join(OUT, `${slug}-anchor-green.png`);
  const scan = chromaDetailScan(src);
  let usedFill = null, lastErr = '';
  for (const fill of FILLS) {
    try {
      execFileSync('node', [`${ROOT}/qa-boss/pad-anchor-plate.mjs`, src, padded, '--size', '1536',
        '--fill', String(fill), '--min-margin', '200'], { encoding: 'utf8', stdio: 'pipe' });
      usedFill = fill;
      break;
    } catch (e) { lastErr = (e.stderr || '').trim(); }
  }
  if (usedFill === null) { rows.push({ name, slug, scan, usedFill: null, budget: 'PAD FAILED: ' + lastErr }); continue; }
  const budget = execFileSync('node', [`${ROOT}/qa-boss/measure-anchor-budget.mjs`, padded],
    { encoding: 'utf8' });
  rows.push({ name, slug, scan, usedFill, budget: budget.trim() });
}

for (const r of rows) {
  console.log('#'.repeat(96));
  console.log(`${r.name}   ->   ${r.slug}`);
  console.log(`  raw plate ${r.scan.w}x${r.scan.h} | backdrop ${r.scan.backdropPct.toFixed(1)}% of frame`
    + ` | padded at fill ${r.usedFill ?? 'FAILED'}`
    + (r.usedFill !== null && r.usedFill < 0.68 ? '  <- WIDE SUBJECT, stepped down to hold the 200px margin law' : ''));
  const s = r.scan;
  if (s.enclosedGreenPx === 0) {
    console.log('  chroma-detail: CLEAN — no enclosed green at all, green plate is safe');
  } else if (s.enclosedPctOfSubject < 1) {
    console.log(`  chroma-detail: CLEAN (${s.enclosedGreenPx}px enclosed green, `
      + `${s.enclosedPctOfSubject.toFixed(2)}% of subject) — green plate is safe`);
  } else if (s.smallShare < 0.3) {
    console.log(`  chroma-detail: ${s.enclosedGreenPx}px enclosed green `
      + `(${s.enclosedPctOfSubject.toFixed(2)}% of subject) in only ${s.components} component(s), `
      + `largest = ${(100 * s.largestShare).toFixed(0)}% of it, and only `
      + `${(100 * s.smallShare).toFixed(0)}% of it sits in small (<1000px) blobs.`);
    console.log('    -> READS AS BACKDROP POCKETS (a hole in the silhouette: a wing gap, or the '
      + 'triangle between a held prop and the body), NOT character detail. Green plate is very '
      + 'likely safe — CONFIRM ON THE VIZ before writing the kit.');
  } else {
    console.log(`*** CHROMA-DETAIL RISK: ${s.enclosedGreenPx}px of enclosed green `
      + `(${s.enclosedPctOfSubject.toFixed(2)}% of subject), and ${(100 * s.smallShare).toFixed(0)}% of it `
      + `sits in SMALL (<1000px) blobs across ${s.components} components. MANY SMALL BLOBS is the Pale_Choir signature (his TEETH `
      + `key out as backdrop). A green plate will DELETE them. VERIFY ON THE VIZ, then re-plate with `
      + `replate-chroma.mjs — and pick a chroma the CHARACTER is not (do not send a magenta `
      + `character to a magenta plate). ***`);
  }
  console.log(r.budget.split('\n').map((l) => '  ' + l).join('\n'));
  console.log('');
}
