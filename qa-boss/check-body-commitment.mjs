// BODY-COMMITMENT GATE — is this clip actually WORTH WATCHING, or is it the anchor pose with an
// overlay painted on it?
//
// ############################################################################################
// # WHY THIS EXISTS. Tim, 2026-07-28, on the finished IR-48 kit: "all specials from final boss #
// # look super super boring." He was right, and NOT ONE existing gate could see it. containment #
// # asks "does anything cross an edge", front-turn asks "does he rotate square to camera",      #
// # extra-objects asks "did something detach". All three are DEFECT detectors: a clip in which  #
// # the fighter does nothing at all passes every one of them PERFECTLY — a still frame is the   #
// # single most containable, most side-profile, most single-blob clip you can generate.         #
// #                                                                                             #
// # So the pipeline had a hole shaped exactly like "boring", and the session-12 prompt process  #
// # walked straight into it: every reject was fixed by DELETING motion ("delete the sweep",     #
// # "delete the vertical raise", "a wrist shake"), because deleting motion always satisfies a   #
// # containment lock. Optimising against defect-only gates converges on the most boring clip    #
// # that passes. This gate closes that hole by making "boring" a MEASURABLE reject reason.      #
// ############################################################################################
//
// THE FOUR SIGNALS, all read off the green-keyed silhouette of the RAW mp4:
//
//   minIoU   lowest IoU(f0, fN), bbox-NORMALISED to 64x64. PURE POSE change — translation and
//            scale are divided out, so this cannot be gamed by drifting across the frame.
//            LOWER = more committed. idle sits at ~0.70; a real throw reaches ~0.11.
//   travel   max |bbox centre-x - f0 centre-x|, in SOURCE px. Real footwork moves the centre.
//   strongPct  % of frames with IoU(f0,fN) < 0.60 — the DUTY CYCLE. This is the signal that
//            catches a clip with one big spike and 78% dead air, which is exactly how ir48
//            special_3 read as boring despite a good peak. A finisher has to SUSTAIN.
//   spanPeak max bbox width / f0 bbox width. A committed strike extends the frame.
//   dropPct  1 - (min bbox height / f0 bbox height). HOW FAR THE BODY SINKS.
//
// *** WHY dropPct EXISTS — minIoU IS STRUCTURALLY BLIND TO A CROUCH. ***
// minIoU bbox-NORMALISES to 64x64 before comparing, which divides out scale — and a crouch's
// entire signal IS the height change. Measured on ir48 special_2: v5 collapses to 57% of standing
// height (42.7% drop, head sinking 352px) and still scored minIoU 0.363, i.e. "barely leaves the
// anchor pose". It plainly does. The boring v1 it replaced drops 1.9%, and idle drops 1.0%.
// I fired a whole re-roll cycle chasing a minIoU number that could not see the thing I had asked
// for. For any sinking / kneeling / ducking action, JUDGE ON dropPct, not minIoU.
//   reference: idle 1.0% · a static "finisher" 1.9% · a real crouch 30-43%.
//
// CRITICAL: travel/spanPeak are measured on a CORE mask that EXCLUDES bright gold/white glow
// pixels, so a big flashy effect CANNOT fake body commitment. That is the whole point — ir48
// special_2 has a large bright flare and a body that moves 12px, which is to say, not at all.
//
// ############################################################################################
// # CALIBRATION STATUS: CALIBRATED ON ONE CHARACTER (ir48-hex-paper-lord, 10 clips, 97 frames  #
// # each). **NOT CALIBRATED TO CONVICT ACROSS THE ROSTER.** This is the same trap that makes    #
// # check-frontturn.mjs flag 77 of 97 shipped clips at its defaults — read its calibration box. #
// # Treat a flag here as "go and LOOK at this clip", never as a defect on its own.              #
// ############################################################################################
//
// The floor is deliberately set from the character's OWN ordinary attacks, not an absolute:
// a SPECIAL that moves less than that character's blocks and throws is failing on its own terms.
// Measured on ir48 (2026-07-28):
//
//   ORDINARY ATTACKS   minIoU 0.114-0.323 | travel  76-174px | strong 46-68%
//   idle               minIoU 0.700       | travel  16px     | strong  0%
//   SPECIAL_1 v4       minIoU 0.475       | travel  68px     | strong 53%   <- fidget: busy but weak
//   SPECIAL_2 v1       minIoU 0.638       | travel  12px     | strong  0%   <- an IDLE with a flare
//   SPECIAL_3 v3       minIoU 0.220       | travel 136px     | strong 19%   <- one spike, 78% dead air
//
// Hence the defaults below: a special must be at least as committed as the character's WEAKEST
// ordinary attack. All three ir48 specials fail, each for its own correct reason.
//
// BLIND SPOTS — this gate measures MOTION, NOT QUALITY:
//   - Wild flailing scores EXCELLENT. A high score is permission to look, not a pass.
//   - It says nothing about whether the effect is good, on-palette, or attached.
//   - `idle` and `ko` are EXEMPT (idle is meant to be near-anchor; ko is off-anchor by spec and
//     its collapse would score as huge commitment for the wrong reason). Both are skipped.
//   - It needs the green plate. Run it on the RAW mp4, before keying.
//
// ############################################################################################
// # ⛔ --kit USED TO JUDGE A FRACTION OF THE KIT AND SAY NOTHING (TOOLCHAIN-AUDIT §4, fixed    #
// # phase 261).                                                                               #
// #                                                                                           #
// # THE DEFECT. `--kit <id>` resolved raws with `f.startsWith(kit)` against qa-boss/raw. A KIT #
// # ID AND A RAW FILENAME PREFIX ARE DIFFERENT NAMESPACES: the kit is `satoshi-odachi`, the    #
// # raws are `satoshi-*`. So `--kit satoshi-odachi` saw 2 of 14 raws, judged 1 of them (the    #
// # other was idle, exempt) and printed `1 judged, 0 flagged` — exit 0, no denominator, no     #
// # warning. Measured undercounts across the roster:                                           #
// #     satoshi-odachi 2/14 · oni-tetsubo 4/8 · thorn-warden 11/18 · ir37-pink-tessen 23/45    #
// #     eclipse-ofuda 41/59 · ir56-lion-serpent 13/14 · lich-scythe 0/9 · gargoyle-spear 0/1   #
// # A ZERO match at least fell through to the usage error and exit 2. A PARTIAL match was      #
// # completely silent, and "0 flagged, exit 0" reads as full coverage.                          #
// #                                                                                           #
// # WHEN IT BITES. Every `--kit` run on any character whose raws predate the long kit id —     #
// # which is most of the roster, because the short prefixes were used first. The fire run-book #
// # uses `--kit` as the per-character sweep, so this is the normal invocation, not a corner.    #
// #                                                                                           #
// # THE RULE, AND WHY THIS ONE. It is NOT invented here: it is copied from the only place in   #
// # the repo that already resolves a character to its raws — fire-queue.mjs:176-178, which     #
// # matches `<kit-id>-` OR the SHORT FORM `<first-segment>-` ("lich-scythe -> lich"). That     #
// # rule reproduces all six audited denominators EXACTLY (14 · 8 · 18 · 45 · 59 · 14), claims  #
// # every one of the 278 raws on disk (verified: 278 claimed, 0 unclaimed, 0 double-claimed),  #
// # and has zero short-form collisions across the 36 non-REROLL kit ids.                        #
// # Inventing a second resolver would have given the two tools silently diverging answers,     #
// # which is the mistake fire-queue's own header warns about for prompt parsing.                #
// #                                                                                           #
// # ⚠ THE SELECTOR ACCEPTS BOTH FORMS — phase 262 fixed a regression in the phase-261 fix.    #
// # The defect being fixed was that a PARTIAL match was SILENT, not that the short form was    #
// # wrong. `--kit satoshi` was the form that actually WORKED (it judged the complete and       #
// # correct 12 of 14); phase 261 made it exit 2 while `--kit satoshi-odachi` produced the      #
// # identical table. Refusing the invocation the run-book types, to protect it from an         #
// # undercount it never had, is a worse tool. So the selector now resolves EITHER form to the  #
// # one kit id, prints WHICH form it matched, and refuses only when the resolution is          #
// # genuinely AMBIGUOUS (a short form shared by 2+ kit ids), EMPTY (0 raws), or UNKNOWN.       #
// #                                                                                           #
// # HOW TO SEE IT. `--kit` always prints `resolved M candidate raw(s)`, splits M into kit-id   #
// # matches vs short-form-only matches, and closes the books at the bottom with `judged N      #
// # of M`. If N is 0 it REFUSES (exit 2): a kit whose whole denominator is exempt or errored   #
// # measured NOTHING, and "0 flagged, exit 0" over it reads as full coverage. That refusal is  #
// # scoped to the --kit path — see the CLI, and the note on why it is not shared.              #
// ############################################################################################
//
// ############################################################################################
// # ⛔ AN UNVALIDATED NUMERIC ARGUMENT SILENTLY DISARMED THE GATE (fixed phase 263).          #
// #                                                                                           #
// # THE DEFECT. The thresholds were read as `th.minIoU = +flag('--min-iou')` with no check at #
// # all, and `th = { ...PROFILES[forced] }` with no check that `forced` names a real profile.  #
// # Every comparison in judge() is `>` or `<`, and EVERY comparison against NaN or undefined   #
// # is false — so a bad argument does not error, it turns the criterion OFF and prints `ok`.   #
// # Measured on `--kit satoshi-odachi`, which flags 4 of 12 at the defaults (exit 1):          #
// #   `--min-iou 0..32 --travel 9o --strong fourty` -> `12 judged, 0 flagged`, EXIT 0          #
// #   `--min-iou 999999 --travel -1 --strong -5`    -> `0 flagged`, EXIT 0  (absurd but VALID) #
// #   `--min-iou --travel 0 --strong 0`             -> `0 flagged`, EXIT 0  (value swallowed   #
// #        the next flag: `+'--travel'` is NaN)                                                #
// #   `--profile speical`  -> `{...undefined}` = `{}`, all three thresholds undefined, every   #
// #        clip printed `ok   [speical]`, `0 flagged`, EXIT 0. ONE TYPO, WHOLE GATE OFF.       #
// # And the mirror shape, silent in the other direction: `--min_iou 0.9` (underscore) or a     #
// # `--min-iou` at the end of argv was DROPPED without a word and the defaults were used, so   #
// # the operator was shown a verdict for thresholds they did not ask for.                      #
// #                                                                                            #
// # THE RULE. Nothing reaches judge() unchecked, and the argv is walked ONCE, up front, before #
// # a single frame is decoded:                                                                 #
// #   · every value-taking flag must HAVE a value (not the end of argv, not the next flag,     #
// #     not empty) and must appear at most ONCE (indexOf silently honoured only the first);    #
// #   · every numeric value must be FINITE and IN RANGE — an IoU outside [0,1] is not an IoU,  #
// #     a travel beyond the 960px source frame is unreachable, a duty cycle outside [0,100] is #
// #     not a percentage;                                                                      #
// #   · --profile must NAME a profile;                                                         #
// #   · an unrecognised token (a mistyped flag, a stray path) is REFUSED, never dropped;       #
// #   · a threshold at the dead end of its own range (--min-iou 1, --travel 0, --strong 0) is  #
// #     legal but is announced as ⚠ NEUTRALISED, and if ALL THREE are neutralised the run is   #
// #     refused: it would measure every frame and be unable to conclude anything.              #
// # All of it exits 2 naming the flag and what it received.                                    #
// #                                                                                            #
// # AND THE VERDICT ITSELF IS GUARDED, not just the argv: judge() runs assertThresholds()      #
// # first and THROWS rather than return "no fails" when a threshold is not a finite number.    #
// # That guard has no argv that can trip it any more, which is exactly why it is EXPORTED —    #
// # it is tripped from a harness (`judge(m, {minIoU: NaN, travel: 90, strong: 40})`), the same #
// # way resolveKitSelector's refusals are. A guard nobody can trip is decoration.               #
// ############################################################################################
//
// ############################################################################################
// # ⛔ AND THE THREE CRITERIA ARE OR-ed, SO EACH RANGE HELD WHILE THE COMBINATION DISARMED    #
// #    THE WHOLE GATE. (phase 264)                                                            #
// #                                                                                            #
// # THE DEFEAT, measured on --kit satoshi-odachi, which flags 4 of 12 at the defaults (exit 1):#
// #   $ check-body-commitment.mjs --kit satoshi-odachi --min-iou 0.99 --travel 0 --strong 0    #
// #     ⚠ NEUTRALISED — --travel 0: travel is never below 0, so TRAVEL can never fire          #
// #     ⚠ NEUTRALISED — --strong 0: strongPct is never below 0, so DUTY can never fire         #
// #     judged 12 of 14 candidate raw(s)  |  0 flagged  |  2 exempt  |  0 errored   <- EXIT 0  #
// # Every value was INSIDE its stated range. The all-three-neutralised refusal did not fire    #
// # because --min-iou 0.99 is below 1 and so was not counted as neutralised — yet no clip in   #
// # the repo measures a minIoU above 0.7004, so POSE could not fire either. THREE legal        #
// # numbers, one silent gate.                                                                  #
// #                                                                                            #
// # TWO CHANGES, and the second is the one that closes the class:                              #
// #  1. THE RANGES ARE NOW MEASURED, not mathematical. Each is the largest/smallest value that #
// #     STILL CONVICTS a real known-bad, measured at full precision:                           #
// #       --min-iou  hi 0.70   satoshi-sp1-iai measures minIoU 0.7003865979 (dropPct 6.5, so   #
// #                            POSE is live): a bar of 0.70 still fires, 0.71 never can.       #
// #       --travel   lo 13     ir48-hex-paper-lord-special-2 measures travel 12px, the lowest  #
// #                            on record: a bar of 13 still fires, 12 fires on nothing.        #
// #       --strong   lo 1      satoshi-sp1-iai and ir48 special-2 both measure 0% duty and a   #
// #                            97-frame clip's quantum is 1/97 = 1.03%, so 1 still fires and 0 #
// #                            fires on nothing.                                               #
// #     `--min-iou 0.99`, `--travel 0` and `--strong 0` are now all refused at parse time.     #
// #  2. THE SUPPRESSION CHECK. A range is a per-flag opinion and this gate's criteria are      #
// #     OR-ed, so no set of per-flag ranges can catch a COMBINATION — the same finding         #
// #     check-frontturn.mjs records for its two OR-ed signals. So every clip is ALSO judged at #
// #     the CALIBRATED PROFILE DEFAULTS, and if the supplied thresholds turned a FLAG into an  #
// #     `ok` the run is refused (exit 2) with no table printed. It needs no judgement about    #
// #     where a threshold stops meaning something: it asks only whether this run HID a clip    #
// #     the defaults would have flagged. --profile is included, because forcing `attack` on a  #
// #     special loosens all three criteria at once.                                            #
// #                                                                                            #
// # ⚠ THE ⚠ NEUTRALISED ANNOUNCEMENT IS GONE, deliberately. It announced --min-iou >= 1,      #
// # --travel <= 0 and --strong <= 0, and all three of those values are now REFUSED by the      #
// # measured ranges above — so the branch could no longer be reached by any command line. A    #
// # guard nobody can trip is decoration, and this file's own resolveKitSelector note says so.  #
// ############################################################################################
//
// USAGE
//   node qa-boss/check-body-commitment.mjs <clip.mp4> [more.mp4 ...] [--profile special|attack]
//                                          [--min-iou 0.32] [--travel 90] [--strong 40]
//   node qa-boss/check-body-commitment.mjs --kit ir48-hex-paper-lord     (whole kit, auto-profile)
//   (--kit takes a KIT ID = the basename of qa-boss/prompts/<id>.md, OR its short raw prefix.
//    `--kit satoshi` and `--kit satoshi-odachi` both resolve to satoshi-odachi's 14 raws.)
//   RANGES (MEASURED, enforced, exit 2):  --min-iou [0..0.70]  --travel [13..960 px]
//                                         --strong [1..100 %]
import { makeArgs } from './lib/argcheck.mjs';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

const SCALE = 240;                 // decode width; source is 960 so results scale by 4
const SRC_W = 960;
const ALPHA_MIN = 24;              // keyed-webm alpha cutoff, matches check-frontturn.mjs
const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
// Bright gold/white glow — excluded from the CORE mask so an effect cannot fake commitment.
const isGlow = (r, g, b) => (r > 200 && g > 170) || (r > 230 && g > 230 && b > 200);

// Profiles. A special is held to the character's ordinary-attack floor; an ordinary attack to a
// looser one. Override any of them on the command line.
const PROFILES = {
  special: { minIoU: 0.32, travel: 90, strong: 40 },
  attack:  { minIoU: 0.45, travel: 60, strong: 30 },
};
const EXEMPT = /(^|[-_])(idle|ko)([-_.]|$)/i;

function bbox(m, w, h) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
function norm(m, w, h, b) {
  const N = 64, out = new Uint8Array(N * N);
  const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = b.x0 + Math.floor((x + 0.5) * bw / N);
    const sy = b.y0 + Math.floor((y + 0.5) * bh / N);
    out[y * N + x] = m[sy * w + sx];
  }
  return out;
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };

export function measure(file) {
  const tmp = path.join(process.env.TEMP || HERE, 'bcg_' + path.basename(file).replace(/\W/g, '_'));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  try {
    // RAW mp4 -> key the green plate. Keyed webm -> use its own alpha, but decode to RGBA PNG
    // (NOT alphaextract) so the glow test still has colour and the CORE mask keeps its meaning.
    // The vp9 decoder flag MUST come before -i or the alpha plane is silently dropped.
    const isWebm = /\.webm$/i.test(file);
    const pre = isWebm ? ['-c:v', 'libvpx-vp9'] : [];
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', file, '-vf', `scale=${SCALE}:-1`,
      '-vsync', '0', path.join(tmp, 'f_%04d.png')], { encoding: 'utf8' });
    if (r.status !== 0) return { error: (r.stderr || 'ffmpeg failed').split('\n')[0] };
    const files = fs.readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
    if (files.length < 2) return { error: `decoded ${files.length} frames` };

    const rows = [];
    for (const fn of files) {
      const p = PNG.sync.read(fs.readFileSync(path.join(tmp, fn)));
      const { width: w, height: h, data } = p;
      const all = new Uint8Array(w * h), core = new Uint8Array(w * h);
      for (let i = 0; i < all.length; i++) {
        const k = i * 4, r0 = data[k], g0 = data[k + 1], b0 = data[k + 2], a0 = data[k + 3];
        if (isWebm ? a0 <= ALPHA_MIN : isGreen(r0, g0, b0)) continue;
        all[i] = 1;
        if (!isGlow(r0, g0, b0)) core[i] = 1;
      }
      const bA = bbox(all, w, h), bC = bbox(core, w, h);
      if (bC.x1 < 0 || bA.x1 < 0) continue;          // fully-empty frame: skip, don't crash
      rows.push({ n: norm(all, w, h, bA), core: bC });
    }
    if (rows.length < 2) return { error: 'no non-empty frames' };

    const f0 = rows[0], S = SRC_W / SCALE;
    const cx0 = (f0.core.x0 + f0.core.x1) / 2;
    const span0 = f0.core.x1 - f0.core.x0 + 1;
    let minIoU = 1, travel = 0, spanPeak = 1, strong = 0, active = 0;
    const h0 = f0.core.y1 - f0.core.y0 + 1; let minH = h0;
    for (const r2 of rows) {
      const v = iou(f0.n, r2.n);
      minIoU = Math.min(minIoU, v);
      if (v < 0.80) active++;
      if (v < 0.60) strong++;
      travel = Math.max(travel, Math.abs((r2.core.x0 + r2.core.x1) / 2 - cx0) * S);
      spanPeak = Math.max(spanPeak, (r2.core.x1 - r2.core.x0 + 1) / span0);
      minH = Math.min(minH, r2.core.y1 - r2.core.y0 + 1);
    }
    return {
      frames: rows.length, minIoU, travel, spanPeak,
      strongPct: 100 * strong / rows.length, activePct: 100 * active / rows.length,
      dropPct: 100 * (1 - minH / h0),
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// GUARD THE VERDICT, NOT THE ARGV. An empty `fails` array is this tool's word for "this clip PASSED
// every criterion". It must never be reachable because a threshold was undefined or NaN: every
// comparison below is `>` or `<`, and both are false against NaN/undefined, so a missing threshold
// does not throw — it silently turns its criterion off and the clip prints `ok`. This throws first.
// EXPORTED so it can be tripped from a harness: the CLI now validates every argument, so there is
// no longer an argv that reaches it, and an untrippable guard is decoration (see resolveKitSelector).
export function assertThresholds(th, ctx = 'threshold set') {
  for (const k of ['minIoU', 'travel', 'strong']) {
    const v = th == null ? undefined : th[k];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError(
        `${ctx}: threshold "${k}" must be a finite number, received ` +
        `${typeof v === 'string' ? JSON.stringify(v) : String(v)} (${v === null ? 'null' : typeof v}). ` +
        'A NaN or undefined threshold makes every comparison against it false, so the clip would be ' +
        'reported "ok" having been tested against nothing.');
    }
  }
  return th;
}

export function judge(m, th) {
  assertThresholds(th, 'judge()');
  const fails = [];
  if (m.minIoU > th.minIoU && m.dropPct < 20) fails.push(`POSE minIoU ${m.minIoU.toFixed(3)} > ${th.minIoU} (barely leaves the anchor pose)`);
  if (m.travel < th.travel) fails.push(`TRAVEL ${m.travel.toFixed(0)}px < ${th.travel}px (no footwork / weight shift)`);
  if (m.strongPct < th.strong) fails.push(`DUTY ${m.strongPct.toFixed(0)}% < ${th.strong}% strong frames (action is a blip, rest is dead air)`);
  return fails;
}

// ---- KIT SELECTOR -> RAWS RESOLUTION (TOOLCHAIN-AUDIT §4) ------------------------------------
const RAW_DIR = path.join(HERE, 'raw');
const KIT_DIR = path.join(HERE, 'prompts');
const USAGE = 'usage: check-body-commitment.mjs <clip.mp4 ...> | --kit <kit-id | short raw prefix>\n' +
  '       kit ids are the basenames of qa-boss/prompts/*.md; "satoshi" and "satoshi-odachi" both work.\n' +
  '       [--profile special|attack] [--min-iou 0..0.70] [--travel 13..960 px] [--strong 1..100 %]\n' +
  '       the ranges are MEASURED (the last value that still convicts a known-bad), not mathematical.\n' +
  '       every flag needs a value, once, in range — a bad threshold is refused, never ignored, and a\n' +
  '       threshold that HIDES a clip the calibrated defaults flag is refused after the scan.';

// THE MATCHING RULE. Copied verbatim in spirit from fire-queue.mjs:176-178 — the ONE existing
// resolver from a character to its raws. Slug OR short form, both anchored with a trailing hyphen
// so `oni-` can never swallow `onryo-katana-*`.
const shortOf = (kitId) => kitId.split('-')[0];
const claims = (fileName, kitId) => fileName.startsWith(`${kitId}-`) || fileName.startsWith(`${shortOf(kitId)}-`);

// The kit-id NAMESPACE is qa-boss/prompts/*.md — the same source fire-queue.mjs derives the roster
// from. Resolving against it is what turns "a kit id and a raw prefix are different namespaces"
// from a silent undercount into a stated, printed mapping.
function kitIds() {
  return fs.readdirSync(KIT_DIR)
    .filter((f) => f.endsWith('.md') && !/-REROLL\.md$/i.test(f))
    .map((f) => f.replace(/\.md$/, ''));
}

// PURE resolver: (selector, kit-id namespace, raw filenames) -> a kit + its raws, or a refusal.
// EXPORTED AND PURE ON PURPOSE. Its refusals depend only on arguments, so each one can be tripped
// from a harness with synthetic ids — the ambiguity and rival branches have no trigger on today's
// 36 kits, and a guard nobody can trip is decoration, not a gate. Both were tripped in phase 262
// with ids=[satoshi-odachi,satoshi-nodachi] sel="satoshi" and ids=[oni,oni-tetsubo] sel="oni".
export function resolveKitSelector(sel, ids, raws, rawDirLabel = 'qa-boss/raw') {
  // STEP 1 — SELECTOR -> KIT ID. Two accepted forms, because two forms are in real use: the kit id
  // (basename of prompts/*.md) and the SHORT RAW PREFIX the raw filenames actually carry.
  let kit = null, howLine = null;
  if (ids.includes(sel)) {
    kit = sel;
  } else {
    const viaShort = ids.filter((k) => shortOf(k) === sel);
    if (viaShort.length === 1) {
      kit = viaShort[0];
      howLine = `  selector "${sel}" is the SHORT RAW PREFIX of kit id "${kit}" — resolved to that kit.`;
    } else if (viaShort.length > 1) {
      // AMBIGUOUS: one short form, several characters. Picking one would judge a fraction; sweeping
      // all would attribute another character's raws to this kit. Both are the audited defect.
      return { ok: false, lines: [
        `ERROR: "${sel}" is AMBIGUOUS — it is the short raw prefix of ${viaShort.length} kit ids: ${viaShort.join(' ')}`,
        '  Resolving it would either judge a fraction of one kit or sweep another character\'s raws',
        '  into this denominator. Pass the full kit id. Nothing was measured.',
      ] };
    } else {
      const near = ids.filter((k) => shortOf(k) === shortOf(sel) || k.startsWith(sel));
      const lines = [
        `ERROR: "${sel}" is neither a kit id nor the short raw prefix of one.`,
        '  Kit ids are the basenames of qa-boss/prompts/*.md. The SHORT form (first hyphen segment)',
        '  is accepted too, because raw filenames use it (kit "satoshi-odachi" -> raws "satoshi-*").',
        '  Nothing was measured.',
      ];
      if (near.length) lines.push(`  Did you mean: ${near.join(' ')}`);
      return { ok: false, lines };
    }
  }
  // STEP 2 — WRONG-ATTRIBUTION GUARD. A short form that also prefixes ANOTHER kit id would sweep
  // that character's raws into this kit's denominator — as silent as the undercount, and worse,
  // because the number looks complete. There are none across the 36 kits today; this refuses if a
  // future kit id introduces one.
  const rivals = ids.filter((k) => k !== kit && claims(`${k}-`, kit));
  if (rivals.length) {
    return { ok: false, lines: [
      `ERROR: the short form "${shortOf(kit)}-" also prefixes another kit id: ${rivals.join(' ')}`,
      '  Resolving by short form would judge another character\'s raws as this kit\'s.',
      '  Pass the raw files explicitly instead. Nothing was measured.',
    ] };
  }
  // STEP 3 — KIT -> RAWS. An EMPTY resolution is the input error: the selector named a real kit and
  // that kit has no raws, so there is no denominator to report at all.
  const all = raws.filter((f) => claims(f, kit)).sort();
  const strict = all.filter((f) => f.startsWith(`${kit}-`)).length;
  if (!all.length) {
    return { ok: false, lines: [
      `ERROR: 0 candidate raws for kit "${kit}" in ${rawDirLabel} (${raws.length} mp4 present).`,
      `  Tried "${kit}-" and the short form "${shortOf(kit)}-". Nothing was measured.`,
    ] };
  }
  const preamble = [`--kit ${sel}: resolved ${all.length} candidate raw(s) from ${rawDirLabel}`];
  if (howLine) preamble.push(howLine);
  preamble.push(`  rule (fire-queue.mjs): "${kit}-" OR short form "${shortOf(kit)}-"  ->  ${strict} kit-id match(es), ${all.length - strict} short-form-only`);
  if (all.length - strict > 0) {
    preamble.push(`  ⚠ ${all.length - strict} of ${all.length} were INVISIBLE to the old kit-id-only prefix match (TOOLCHAIN-AUDIT §4).`);
  }
  return { ok: true, kit, files: all, preamble };
}

// Thin fs wrapper around the pure resolver. Only the two unreadable-directory refusals live here,
// because only they depend on the filesystem.
function resolveKit(sel) {
  let ids;
  try { ids = kitIds(); } catch (e) {
    console.error(`ERROR: cannot read ${KIT_DIR} (${e.code || e.message}) — the selector cannot be resolved,`);
    console.error('  so no denominator would be trustworthy. Refusing rather than measuring a fraction.');
    process.exit(2);
  }
  let raws;
  try { raws = fs.readdirSync(RAW_DIR).filter((f) => /\.mp4$/i.test(f)); } catch (e) {
    console.error(`ERROR: cannot read ${RAW_DIR} (${e.code || e.message}) — nothing was measured.`);
    process.exit(2);
  }
  const r = resolveKitSelector(sel, ids, raws, path.relative(process.cwd(), RAW_DIR).replace(/\\/g, '/'));
  if (!r.ok) { for (const l of r.lines) console.error(l); process.exit(2); }
  return { files: r.files.map((f) => path.join(RAW_DIR, f)), preamble: r.preamble };
}

// ---- ARGUMENT VALIDATION (see the phase-263 and phase-264 boxes) ------------------------------
// EVERY argument goes through qa-boss/lib/argcheck.mjs — the ONE validator, imported and never
// copied. An argument that is accepted and then does nothing is the same defect as a gate that
// measures nothing, because the operator reads the same "ok" either way.
// THE ONE TABLE. Every numeric flag this tool parses is a row here, `key` is the threshold it
// overrides in PROFILES, and lo/hi are INCLUSIVE bounds that are MEASURED — the largest/smallest
// value that still convicts a real known-bad — not the mathematical domain. The domain was the
// mistake: minIoU really is an IoU in [0,1], and `--min-iou 0.99` really did disarm POSE on every
// clip in the repo. Adding a numeric flag anywhere but this table is the defect coming back.
const NUMERIC_FLAGS = {
  '--min-iou': { key: 'minIoU', lo: 0,  hi: 0.70,  unit: '', what: 'an IoU (intersection/union)',
    band: 'minIoU is an IoU, so [0,1] is only the mathematical domain. MEASURED: the highest minIoU on any '
      + 'JUDGED clip is 0.7003865979 (satoshi-sp1-iai — an "iai flash cut" that barely leaves the anchor, '
      + 'dropPct 6.5 so POSE is live). A bar of 0.70 still convicts it; 0.71 can never fire on anything in '
      + 'this repo, and POSE would be off while the table still printed ok.' },
  '--travel':  { key: 'travel', lo: 13, hi: SRC_W, unit: 'px', what: `a distance in ${SRC_W}px source pixels`,
    band: 'TRAVEL fires when a clip moves LESS than the bar, so the disarming direction is DOWN. MEASURED: '
      + 'the least-travelling clip on record is ir48-hex-paper-lord-special-2 at 12px (an idle with a flare). '
      + 'A bar of 13 still convicts it; 12 or below convicts nothing, because travel is never negative.' },
  '--strong':  { key: 'strong', lo: 1,  hi: 100,   unit: '%', what: 'a percentage of frames',
    band: 'DUTY fires when the duty cycle is BELOW the bar, so the disarming direction is DOWN. MEASURED: '
      + 'satoshi-sp1-iai and ir48-special-2 both measure 0% strong frames, and a 97-frame clip cannot '
      + 'measure between 0 and 1/97 = 1.03%. A bar of 1 still convicts them; 0 convicts nothing.' },
};

// ---- CLI ----------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2);
  const A = makeArgs(argv, { tool: 'check-body-commitment', usage: USAGE });
  const kit = A.str('--kit', null, { why: '--kit takes a kit id or its short raw prefix.' });
  // A typo'd profile used to be `{...undefined}` = `{}` — all three thresholds undefined, every
  // comparison false, every clip "ok". oneOf refuses it by name before anything is decoded.
  const forced = A.str('--profile', null, {
    oneOf: Object.keys(PROFILES),
    why: 'PROFILES[<typo>] is undefined, so ALL THREE thresholds would be undefined and every comparison '
      + 'false: every clip prints "ok" having been tested against nothing.',
  });
  // THRESHOLD OVERRIDES — parsed ONCE, up front, before a frame is decoded. They used to be re-read
  // (and re-coerced) inside the per-clip loop, so a bad value cost a full kit decode before lying.
  const OVERRIDES = { minIoU: null, travel: null, strong: null };
  for (const [f, spec] of Object.entries(NUMERIC_FLAGS)) {
    OVERRIDES[spec.key] = A.num(f, null, { min: spec.lo, max: spec.hi, band: spec.band });
  }
  // EVERY positional is a clip. A stray or mistyped path used to be dropped in silence, which is how
  // a smaller denominator got reported as full coverage; a non-clip positional is refused here
  // because "is this a clip?" is a fact about the FILE, not about the shape of the command line.
  const named = A.positionals();
  A.done();
  const notClips = named.filter((a) => !/\.(mp4|webm)$/i.test(a));
  if (notClips.length) {
    console.error(`ERROR: ${notClips.map((a) => JSON.stringify(a)).join(', ')} — neither a flag nor a .mp4/.webm clip.`);
    console.error('  A stray argument used to be dropped in silence, which is how a mistyped path became a');
    console.error('  smaller denominator with no warning. Nothing was measured.');
    console.error(USAGE);
    process.exit(2);
  }

  let files = named;
  let preamble = [], fromKit = false;
  if (kit) {
    // Silently dropping the explicit files in favour of the kit is the same defect class.
    if (files.length) {
      console.error(`ERROR: --kit and ${files.length} explicit clip argument(s) were both given.`);
      console.error('  --kit used to overwrite them silently, so you would have been shown a coverage');
      console.error('  number for a set you did not ask for. Pass one or the other.');
      process.exit(2);
    }
    const r = resolveKit(kit);
    files = r.files;
    preamble = r.preamble;
    fromKit = true;
  }
  if (!files.length) { console.error(USAGE); process.exit(2); }

  // ##########################################################################################
  // # PASS 1 — MEASURE AND JUDGE, PRINTING NOTHING. The rows are built here and printed       #
  // # verbatim below, so the SUPPRESSION CHECK can refuse BEFORE a single "ok" reaches         #
  // # scrollback for a clip a supplied threshold hid. A guard that fires after the verdict is  #
  // # a post-mortem, not a guard — the same restructure check-turn.mjs and check-frontturn.mjs #
  // # already carry (TOOLCHAIN-AUDIT §7). Byte-for-byte the same lines, in the same order.     #
  // ##########################################################################################
  const out = [...preamble];
  out.push('clip                                    frames  minIoU  travel  strong%  spanPk   drop%  verdict');
  out.push('-'.repeat(104));
  let flagged = 0, skipped = 0, errored = 0, judged = 0;
  const suppressed = [];
  // When nothing was overridden the two verdicts are identical by construction, so the suppression
  // check is skipped and a default run does exactly what it always did.
  const usingDefaults = forced === null
    && Object.values(OVERRIDES).every((v) => v === null);
  for (const f of files.sort()) {
    const name = path.basename(f, '.mp4');
    if (EXEMPT.test(name)) { out.push(name.padEnd(40) + '  — EXEMPT (idle/ko are near-anchor or off-anchor by spec)'); skipped++; continue; }
    const m = measure(f);
    if (m.error) { out.push(name.padEnd(40) + '  ERROR ' + m.error); errored++; continue; }
    judged++;
    // `forced` is validated to be a real profile above, so PROFILES[prof] is always a real threshold
    // set — never `{...undefined}` = `{}`, which is how one typo used to disarm every criterion.
    const prof = forced || (/special/i.test(name) ? 'special' : 'attack');
    const th = { ...PROFILES[prof] };
    for (const k of ['minIoU', 'travel', 'strong']) if (OVERRIDES[k] !== null) th[k] = OVERRIDES[k];
    let fails;
    try {
      fails = judge(m, th);           // judge() asserts its thresholds; it throws rather than pass.
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
      console.error(`  ${name} was measured but could not be judged, so no verdict is reported.`);
      process.exit(2);
    }
    // THE SUPPRESSION CHECK, per clip: the SAME measurement judged at the CALIBRATED PROFILE
    // DEFAULTS with the AUTO profile. If the defaults flag it and what was supplied does not, a
    // threshold turned a detection into a pass — whatever combination of flags did it.
    if (!usingDefaults && !fails.length) {
      const autoProf = /special/i.test(name) ? 'special' : 'attack';
      const dflt = judge(m, { ...PROFILES[autoProf] });
      if (dflt.length) suppressed.push({ name, autoProf, dflt });
    }
    if (fails.length) flagged++;
    out.push(
      name.padEnd(40) + String(m.frames).padStart(6) + m.minIoU.toFixed(3).padStart(8) +
      m.travel.toFixed(0).padStart(8) + m.strongPct.toFixed(0).padStart(8) +
      m.spanPeak.toFixed(2).padStart(8) + m.dropPct.toFixed(0).padStart(7) + '  ' + (fails.length ? `FLAG [${prof}]` : `ok   [${prof}]`)
    );
    for (const x of fails) out.push(' '.repeat(42) + '· ' + x);
  }
  out.push('-'.repeat(104));

  // ##########################################################################################
  // # THE SUPPRESSION REFUSAL — the guard that needs no opinion about where a range ends.     #
  // # The three criteria are OR-ed, so no per-flag range can catch a COMBINATION of values     #
  // # that are each individually legal (measured: --min-iou 0.99 --travel 0 --strong 0 turned  #
  // # "4 flagged, exit 1" into "0 flagged, exit 0" with two of the three ANNOUNCED as          #
  // # neutralised and nobody the wiser). This asks the only question that matters: DID THE     #
  // # THRESHOLDS YOU SUPPLIED HIDE A CLIP THE DEFAULTS WOULD HAVE FLAGGED?                     #
  // # It cannot misfire: if the defaults flag nothing there is nothing to suppress, and it is  #
  // # skipped outright when no threshold or profile flag was passed.                           #
  // ##########################################################################################
  if (suppressed.length) {
    console.error(`\n⛔ REFUSING — NO TABLE WAS PRINTED. The thresholds you supplied SUPPRESSED ${suppressed.length} flagged clip(s).`);
    for (const s of suppressed.slice(0, 12)) {
      console.error(`  ${s.name}  at the calibrated [${s.autoProf}] defaults this clip FLAGS:`);
      for (const x of s.dflt) console.error(`      · ${x}`);
    }
    if (suppressed.length > 12) console.error(`  ... and ${suppressed.length - 12} more`);
    const shown = [
      forced !== null ? `--profile ${forced} (the auto profile is per-clip)` : null,
      OVERRIDES.minIoU !== null ? `--min-iou ${OVERRIDES.minIoU} (defaults ${PROFILES.special.minIoU}/${PROFILES.attack.minIoU})` : null,
      OVERRIDES.travel !== null ? `--travel ${OVERRIDES.travel} (defaults ${PROFILES.special.travel}/${PROFILES.attack.travel})` : null,
      OVERRIDES.strong !== null ? `--strong ${OVERRIDES.strong} (defaults ${PROFILES.special.strong}/${PROFILES.attack.strong})` : null,
    ].filter(Boolean);
    console.error(`  You changed: ${shown.join(', ')}`);
    console.error('  These clips were decoded and measured in full; the threshold is the only reason this run');
    console.error('  would have printed "ok" for them. A gate that reports clean because its bar was moved is');
    console.error('  the defect this tool was hardened against. Re-run at the defaults.');
    process.exit(2);
  }
  for (const line of out) console.log(line);

  // THE DENOMINATOR IS ALWAYS PRINTED. This line — not an assertion — is what makes an undercount
  // visible: `judged N of M` next to the resolved M is unreadable as full coverage when N < M.
  // (There is deliberately NO `judged + exempt + errored === files.length` assertion here. The loop
  // above increments exactly one of the three per file and iterates `files` once, so the sum is
  // equal BY CONSTRUCTION — see phase 262. A check that cannot fail is not a safety net, it is a
  // claim of one, which is the exact pattern this audit wave exists to remove.)
  const unit = fromKit ? 'candidate raw(s)' : 'clip(s)';
  console.log(`judged ${judged} of ${files.length} ${unit}  |  ${flagged} flagged  |  ${skipped} exempt (idle/ko)  |  ${errored} errored`);

  // VACUOUS-PASS REFUSAL — SCOPED TO --kit, and this scoping is the whole point (phase 262).
  // On the --kit path the user asked "is this CHARACTER committed?"; answering "0 flagged, exit 0"
  // having measured nothing reads as a whole kit passing. That is an input-level failure: exit 2.
  // On the EXPLICIT-FILE path the user named the clips. `check-body-commitment.mjs <idle>.mp4`
  // judging zero is the CORRECT answer — idle and ko are exempt BY SPEC, so a single exempt clip
  // is a pass, not an input error. Phase 261 put this refusal on the shared path and broke that.
  if (fromKit && !judged) {
    console.error(`ERROR: judged 0 of ${files.length} candidate raw(s) for --kit ${kit} — ${skipped} exempt (idle/ko), ${errored} errored.`);
    console.error('  NOTHING WAS MEASURED, so "0 flagged" would mean nothing. This is not a pass.');
    process.exit(2);
  }
  console.log('A FLAG MEANS GO AND LOOK. This gate measures motion, not quality — flailing scores well.');
  process.exit(flagged || errored ? 1 : 0);
}
