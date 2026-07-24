// GREEN-NEUTRALIZE second pass (ported from the eclipse QA agent, 2026-07-24) - sibling of
// magenta-neutralize.mjs for GREEN-chroma kits. CRITICAL LESSON: neutralize green on ALL pixels
// INCLUDING alpha=0 ones - VP9 4:2:0 chroma subsampling bleeds invisible-pixel green into
// visible edges after encode. Calibrated to 0.000% visible green on eclipse vs satoshi baseline.
// Scratch GREEN neutralizer/de-bloom for keyed frame dirs (green sibling of magenta-neutralize.mjs).
// key-idle-clips.mjs is magenta-tuned, so on GREEN chroma it leaves (a) green fringe on silver hair,
// (b) green BLOOM around bright special effects, and (c) — critically for VP9 yuva420p — green chroma
// on ALPHA=0 pixels that 4:2:0 subsampling bleeds into adjacent visible edge pixels.
// So we neutralize green chroma on EVERY pixel regardless of alpha (excess = G - max(R,B) > 0 -> G:=max),
// and additionally REMOVE (alpha 0 + neutral grey RGB) any visible pixel whose green bloom is strong.
// Character is safe: dark-olive undershirt G~=R (excess~0), armor black/gold, hair/skin neutral; white/gold
// effect cores are neutral (excess~0). Only true green screen/bloom/fringe is touched.
// Usage: node greenclean.mjs <keyedDir> [HARD=32]
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');
const [dir, hardS] = process.argv.slice(2);
const HARD = Number(hardS ?? 32);
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
let removed=0, neutralized=0, framesTouched=0;
for (const f of files){
  const p = path.join(dir,f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { data:d } = png; let changed=false;
  for (let i=0;i<d.length;i+=4){
    const r=d[i], g=d[i+1], b=d[i+2], a=d[i+3];
    const mx = Math.max(r,b);
    const excess = g - mx;
    if (excess <= 0) continue;               // no green chroma -> leave alone (incl neutral clear plane)
    if (a > 0 && excess > HARD){              // strong green bloom on a VISIBLE pixel -> drop to neutral clear
      d[i]=88; d[i+1]=88; d[i+2]=96; d[i+3]=0; removed++; changed=true;
    } else {                                  // any residual green (any alpha, incl 0) -> zero the green chroma
      d[i+1]=mx; neutralized++; changed=true;
    }
  }
  if (changed){ fs.writeFileSync(p, PNG.sync.write(png)); framesTouched++; }
}
console.log(`greenclean ${dir.replace(/.*keyed./,'')}: frames=${framesTouched}/${files.length} removedPx=${removed} neutralizedPx=${neutralized} (HARD=${HARD})`);
