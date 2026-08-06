// ANCHOR-PAIR GATE — does the clip END where it BEGAN?
//
// WHY THIS EXISTS (session 31). gargoyle-spear `attack_throw_b` v3 fixed its 82px leap and came back
// with its FIRST FRAME off-anchor: f0 bbox y[210..902] h=693 against a last frame of y[312..943] h=632
// — 102px higher at the top, 61px taller. Every other gate passed it: containment CLEAR,
// extra-objects CLEAN (1 blob), feet-planted "planted", chroma held. A clip whose f0 does not match
// its own settle JUMPS the moment it starts playing, which is the whole defect anchor-locking exists
// to prevent.
//
// It is NOT covered by check-anchor-lock for every character: `gate-control.mjs` reports
// gargoyle-spear as UNUSABLE there (only idle.webm is shipped, so its f0 population is empty and
// idle's own 1.000 is a tautology). This gate needs no anchor file and no shipped population — it
// compares the clip against ITSELF, so it works on a character with zero wired clips.
//
// SIGNAL: IoU of the non-plate bounding box at frame 0 vs the last frame. Measured band on the four
// clips accepted this session: 1.000 / 0.999 / 0.999 / 0.994. The rejected clip: 0.791.
// Default fail bar 0.95 sits in that empty gap; --min overrides it.
//
// ⚠ SCOPE. This is a WITHIN-clip test (does it return?), NOT a cross-clip test (do all clips share one
// framing?). Accepted clips legitimately differ from EACH OTHER — strike_b sits at y[68..877] while hit
// sits at y[312..943] — because the model reframes per state and the keyer's `cal` (h/bottom/left)
// normalises that downstream. Do not read a low cross-clip agreement off this tool.
// ⚠ `ko` is EXEMPT: it ends down by spec, so its bbox is SUPPOSED to differ from f0.
import { spawnSync } from 'node:child_process';
const argv = process.argv.slice(2);
const files = argv.filter((a) => !a.startsWith('--'));
const MIN = Number((argv.find((a) => a.startsWith('--min=')) || '--min=0.95').split('=')[1]);
const LAST = (argv.find((a) => a.startsWith('--last=')) || '--last=4.0').split('=')[1];
if (!files.length) { console.error('usage: node qa-boss/check-anchor-pair.mjs <clip.mp4> [more...] [--min=0.95] [--last=4.0]'); process.exit(2); }
const W = 960, H = 960;
function bbox(file, t) {
  const r = spawnSync('ffmpeg', ['-v','error','-i',file,'-ss',String(t),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < W*H*3) return null;
  const b = r.stdout;
  const P = (i) => { const g = b[i+1]; return g > 110 && b[i] < 0.55*g && b[i+2] < 0.55*g; };
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!P((y*W+x)*3)) { if (x<x0)x0=x; if (x>x1)x1=x; if (y<y0)y0=y; if (y>y1)y1=y; }
  if (x1 < 0) return null;
  return { x0, x1, y0, y1, w: x1-x0+1, h: y1-y0+1 };
}
console.log('=== ANCHOR-PAIR GATE ===  IoU(bbox f0, bbox fLAST). a clip must END where it BEGAN.');
console.log(`    fail below ${MIN}. session-31 accepted band 0.994-1.000; the rejected clip scored 0.791.\n`);
let bad = 0, errored = 0;
for (const f of files) {
  const name = f.replace(/.*[\/]/, '');
  if (/(?:^|[-_])ko(?:$|[-_.])/i.test(name)) { console.log(`  [EXEMPT] ${name.padEnd(46)} ko ends down by spec`); continue; }
  const a = bbox(f, 0), z = bbox(f, LAST);
  if (!a || !z) { console.log(`  [ERROR ] ${name.padEnd(46)} could not decode f0 or fLAST — NOT measured`); errored++; continue; }
  const ix = Math.max(0, Math.min(a.x1,z.x1) - Math.max(a.x0,z.x0) + 1);
  const iy = Math.max(0, Math.min(a.y1,z.y1) - Math.max(a.y0,z.y0) + 1);
  const iou = (ix*iy) / (a.w*a.h + z.w*z.h - ix*iy);
  const ok = iou >= MIN;
  if (!ok) bad++;
  console.log(`  ${ok ? '[ ok  ]' : '[DRIFT]'} ${name.padEnd(46)} IoU ${iou.toFixed(3)}  f0 y[${a.y0}..${a.y1}] ${a.h}x${a.w}  fLAST y[${z.y0}..${z.y1}] ${z.h}x${z.w}  dTop ${z.y0-a.y0} dBot ${z.y1-a.y1} dH ${z.h-a.h}`);
}
console.log(`\nscanned ${files.length}  |  drifted ${bad}${errored ? `  |  errored (NOT measured) ${errored}` : ''}`);
process.exit(bad > 0 || errored > 0 ? 1 : 0);
