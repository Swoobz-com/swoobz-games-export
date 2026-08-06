import type { FighterDef } from './types';

// LICH SCYTHE — MK-FINAL character. Skeletal undead spellcaster: a spiked iron crown burning with
// purple-and-green soulfire, a tattered violet mage-robe over exposed ribs and bone, and a long
// two-handed bone scythe with a bone-chain-and-claw pendant on the haft butt.
//
// FREE-ROSTER PLAYABLE, NO CAMPAIGN NODE (Tim's ruling). rosterGating.ts:18-22 returns null from
// bossNodeId for a fighter no node names, so isFighterSelectable (:28-32) returns true the moment
// the orchestrator adds the import + FIGHTERS entry to src/characters/index.ts. This file does NOT
// register itself.
//
// ── WHERE THE 13 CLIPS CAME FROM (two keying passes, reconciled) ─────────────────────────────────
// The kit is the UNION of two staging passes with ZERO overlap — nothing was replaced:
//   phase 182 (qa-boss/key-parked-accepted.mjs)  -> idle, attack-strike, attack-strike-b
//   session 30 (qa-boss/key-s30-harvest.mjs)     -> the other 10
// The three phase-182 clips were ALREADY in public/assets/characters/lich-scythe/ and are kept
// byte-for-byte (md5 idle f4b1c234506619286832461ca49dbc91, attack-strike 74afaf7f99b0cec9a1208
// a772e0fd6cf, attack-strike-b 1ec0434e26c4bb059c96107b02547090 — identical to their sources in
// qa-boss/staged/lich-scythe/webm/). qa-boss/staged-s30/lich-scythe/webm/ ships NO idle and NO
// attack_strike, so there was never a newer-vs-older contest to judge; the sets are disjoint and
// each shipped file is the only candidate for its state.
// The 10 new clips were copied BYTE-IDENTICAL from qa-boss/staged-s30/lich-scythe/webm/ with the
// state->filename rename of qa-boss/fire-queue.mjs:45-59 (underscores -> hyphens, special_1/2/3 ->
// special/-b/-c). md5 verified per pair, all 10 IDENTICAL. Nothing was re-keyed, re-encoded or
// re-timed. Both passes used the SAME --still (qa-boss/anchors/mk/lich-scythe-anchor-green.png,
// key-parked-accepted.mjs:46 and key-s30-harvest.mjs:56), which is why one cal convention covers
// all 13 clips — see `cal` below.
// Every shipped webm decodes with REAL alpha under `-c:v libvpx-vp9 -i` (checked on f0/f48/f96 of
// all 13: alpha==0 63.0-85.4% of pixels, minAlpha 0, maxAlpha 255, 7k-20k partial-alpha pixels per
// frame). All 13 are 97 frames at 24fps.
//
// ── faces:'right' — MEASURED TWICE, THEN CONFIRMED BY EYE ────────────────────────────────────────
// `node scripts/check-facing.mjs lich-scythe --still` (anchor = the keyed cutout below):
//   13/13 clips as-is, votes AAAAA on every clip, as-is 0.9046-0.9594 vs mirrored 0.0717-0.0805,
//   ratio 0.079-0.087, exit 0. Lowest as-is is attack-strike-b (0.9046), highest attack-block
//   (0.9594).
// Cross-checked against the SECOND independent reference, the green generation plate
// (`node scripts/check-facing.mjs lich-scythe`, anchor qa-boss/anchors/mk/lich-scythe-anchor-green
// .png): again 13/13 as-is, as-is 0.9001-0.9432 vs mirrored 0.0678-0.0769. Two unrelated anchors
// agreeing closes the "relative gate anchored on an outlier" trap.
// ABSOLUTE direction fixed by MY OWN EYES, not inferred: the keyed cutout and a mid-frame contact
// sheet of all 13 clips both show the skull in 3/4 profile toward screen-RIGHT (cranium left, nasal
// cavity and jaw right) with the scythe blade on the RIGHT in every clip.
// `node qa-boss/check-turn.mjs public/assets/characters/lich-scythe --anchor .../idle.webm` adds
// the full-timeline half: 0/97 turned frames on all 13 clips, worst mirror gain 0.000, exit 0 — no
// mid-clip rotation. (It ABSTAINED on some frames — 72 of 97 on attack-block-b, 47 on special-c,
// 30 on attack-strike — so those frames are unjudged, not judged clean.)
// NO hflip was applied anywhere in this kit. The game mirrors per THE FACING RULE
// (FightExperience.tsx:919) for whichever slot the fighter lands in.
//
// ── `cal`: every value below is the KEYER-EMITTED value, NOT re-derived ──────────────────────────
// qa-boss/rederive-cal.mjs REFUSES on this batch's own still: the padded MK plate is alpha-255
// everywhere (measured 1536x1536, pxBelowA128 = 0, minAlpha 255) and the tool exits 2 on that, its
// unkeyed-input guard at rederive-cal.mjs:129-140. Run verbatim and quoted:
//   ⛔ REFUSING — the still has NO pixel below alpha 128: qa-boss/anchors/mk/lich-scythe-anchor-
//   green.png                                                                          EXIT=2
// Substituting the keyed cutout as `still` DOES run, but it answers a different question and its
// "DRIFTED" verdict is a CONVENTION change, not staleness — PROVEN by a control. Re-derived against
// the cutout, all 10 new clips report drift 4.51-5.93 with a near-CONSTANT signature (h -4.51..-5.93,
// bottom +1.37..+1.44, left -0.81..+0.28); the THREE ALREADY-SHIPPED, ALREADY-ACCEPTED clips show
// the SAME signature on the same run (idle h-2.69/bottom+0.75, attack-strike h-3.36/bottom+1.11,
// attack-strike-b h-5.63/bottom+1.12). Accepted clips cannot be "drifted", so the offset belongs to
// the still, not to the clips: the keyer's full-bleed opaque plate gives onH 1.0000 / onBG 0.0000 /
// onCX 0.5000, the 804x900 keyed cutout gives onH 0.9567 / onBG 0.0133 / onCX 0.4972, and the ratio
// reproduces the deltas exactly (attack_throw: 103.36 x 0.9567 = 98.88 vs measured 98.77; predicted
// bottom 1.333 - 98.77x0.02071 = -0.712 vs measured -0.71).
// AND THE STALENESS QUESTION IS ANSWERED DIRECTLY, by measurement rather than by re-derivation: the
// only thing that can stale an emitted cal is a post-pass that DELETES pixels and moves the alpha
// bbox. This batch's post-pass is green-despill, which deletes ZERO. Verified on all 10 rows of
// qa-boss/staged-s30/lich-scythe.summary.json: opaqueBefore === opaqueAfter on every row (e.g.
// attack_throw 12,670,888 = 12,670,888; special_3 15,570,643 = 15,570,643) and escalated === false
// on every row, with plate retention 5.46-16.79% BEFORE -> 0.00% after and olive 0.01-0.02%. Zero
// pixels deleted ⇒ the anchor-frame bbox cannot have moved ⇒ the emitted cal is provably not stale.
// (key-s30-harvest.mjs:162-170 does invoke rederive-cal, but gates on `o.rederived`, a key the tool
// never emits — it emits `cal`. Consequence, visible in the summary: calDrift null and cal byte-equal
// to emittedCal on all 10 rows. So the pipeline's own re-derive was a NO-OP; the manual run above is
// the real one.)
// THE h OUTLIERS ARE NOT DEFECTS — verified by arithmetic instead of by eye on stage. With a
// full-bleed still, h ~= 100 x cropHeight / anchor-pose content height, so a tall crop MUST give a
// large h. Dividing back out, all 13 clips imply the SAME standing height: 650.0-654.0px (spread
// 4.0px = 0.6%). attack-strike-b h 146.01 on a 952px crop -> 652.0; attack-block 133.44 on 870 ->
// 652.0; special 132.82 on 866 -> 652.0; special-b 129.14 on 842 -> 652.0; idle 101.23 on 660 ->
// 652.0. Every clip therefore scales to one on-screen fighter height. This is NOT the on-stage
// floor-line check the spec asked for — see UNVERIFIED at the bottom of this file.
//
// ── `contacts`: MEASURED, then frame-inspected; 3 of 8 argmaxes were REJECTED ────────────────────
// scripts/measure-contacts.mjs (motion-energy argmax, 24fps) on each take's keyed frame dir, then
// cross-read against qa-boss/trace-reach.mjs (per-frame reach maxX / centroid cy / opaque px) AND a
// frame strip viewed at 240-380px per cell. The argmax was rejected wherever it landed on a body
// drop or a parry settle rather than the impact plane; every deviation is noted on the take.
// ⚠ A TRAP THIS KIT SETS FOR THE REACH TRACE: maxX is CONTAMINATED BY SHED DEBRIS on the throws and
// specials. attack_throw_b's "peak reach" maxX 959 @f43 (+196px past the anchor's 763) is NOT a
// second thrust — viewed at 380px it is rock chunks drifting off to the right while the body holds a
// crouch. Do not read a maxX surge on those clips as an extension without looking.
//
// ── ⛔ TWO SHIPPED CLIPS CARRY A REAL, UNPRECEDENTED END-POSE DEFECT ─────────────────────────────
// attack-throw.webm and special.webm do NOT return to the anchor: their ground debris PERSISTS to
// the last frame. Three independent gates converge on exactly those two and on no others —
//   1. check-anchor-lock's `all` column (the column gate-control says to read for lich):
//      attack-throw fLASTall 0.274, special fLASTall 0.512 / fLASTbody 0.549, against a shipped
//      population median of 0.926 and a min of 0.916 elsewhere.
//   2. Direct pixel count at f96 vs f0: attack-throw +16,041px (+14.4%), special +25,317px
//      (+22.6%); every other clip is +10 to +344px (0.0-0.3%).
//   3. qa-boss/check-floor-growth.mjs on the raws: attack_throw floor band 15.42% -> 21.24%
//      (+5.81pp) "WATCH"; special_1 15.46% -> 24.91% (+9.45pp) "FLOOR GREW IN — LOOK". All seven
//      other raws are -0.06pp to -0.01pp, "clean".
// Component-level at f96: attack-throw carries FIVE detached rubble blobs >=400px (7,991 / 3,913 /
// 2,036 / 917 / 827px) all at y560-675 on the floor line, where f0 has exactly ONE component >=400px
// and no rubble. special's stone-slab furrow is fused to the body mask (one 136,638px component at
// f96 vs ~111,321px at f0).
// THE ON-SCREEN CONSEQUENCE IS A HARD POP, NOT A DISSOLVE: .fr-state-video (fight.css:133-140)
// transitions `filter` only — opacity is switched instantly at FightExperience.tsx:1119 — so the
// debris vanishes in a single frame at the hand-off back to idle.
// NOT PRECEDENTED: the accepted control population (thorn-warden, 11 shipped clips) sits at
// fLAST 0.929-0.956 on every clip except ko, which is exempt by spec.
// Both are shipped ANYWAY, with the defect recorded on the take, because that is the orchestrator's
// ship/re-roll call and not this file's. The recommended fix is a RE-ROLL of both raws with the
// debris settling out of frame (or clearing) before the last frame — not a re-key: the rubble is
// baked into the generated video.
export const LICH_SCYTHE: FighterDef = {
  id: 'lich-scythe',
  name: 'LICH SCYTHE',
  // The phase-20 keyed enemy cutout, produced for this kit by the recipe of record
  // (scripts/key-enemies.mjs key(): corner-median bg sample -> border flood @ BG_TOLERANCE 60 ->
  // enclosed-pocket cut @ POCKET_TOLERANCE 45 -> largest connected component -> inward-only feather
  // r=2 -> green despill on a 4px edge ring @ DESPILL_MARGIN 8 -> the bgLikeKept<=150 self-check),
  // driven over input/MK FINAL/mythic/Lich Scythe.png (1372x1536, backdrop sampled rgb(0,217,6)) and
  // encoded with key-enemies.mjs:390 verbatim (scale=-1:900 lanczos, libwebp q:v 90, cl 6).
  // Measured result: 804x900, subject bbox 749x861 at margins L25 R30 T27 B12, filling 95.7% of the
  // height — key in place, no crop, source aspect preserved, matching the roster framing.
  // ALPHA IS REAL, NOT AN OPAQUE RECTANGLE: alpha==0 on 72.51% of pixels (524,672), alpha==255 on
  // 24.78% (179,321), 19,607 partial-alpha pixels, minAlpha 0 / maxAlpha 255. Keyer self-check
  // bgLikeKept = 0px (limit 150); pocket cut removed 3,261px, despill touched 33,194px.
  // interiorGreen was NOT enabled (it is hollow-pale-only, key-enemies.mjs:50-63).
  still: 'assets/enemies/lich-scythe.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile, measured on the 804x900 cutout ABOVE (not on a
  // clip crop) by per-row opaque scan: the crown's soulfire tops out at y27, the crown metal and hood
  // span x271..370 through y60..y150, the glowing eye socket centres near (336,131), the teeth row is
  // y160 and the jaw ends ~y168; below y158 the shoulder pauldron (x207 at y160) and the scythe haft
  // (x670 at y170) merge in, so the isolated head+crown box is x258..370 / y27..158.
  // headX 0.401 = px 322.4 (between the head+crown box centre x314 and the skull centre x~340);
  // headY 0.129 = px 103.7 (the crown-circlet base, the crown/face junction — thorn-warden.ts:41-44
  // uses the same convention). BOTH are fractions of the still's WIDTH, which is what the medallion
  // transform consumes for both axes (FightExperience.tsx:947-952 over a square .fr-portrait).
  // zoom 4.4 (vs the 4.6 house value) was chosen by rendering that exact CSS transform offline and
  // LOOKING at it: the visible window is 804/zoom px square, so 4.4 gives 182.7px centred on
  // (322.4, 103.7) = source x231.0..413.8 / y12.4..195.1, which holds the full flaming crown AND the
  // jaw inside the disc with ~15px of air top and bottom. At 4.6 (174.8px) the crown spikes crowd the
  // disc edge; at 4.2 (191.4px) the head reads small. The simulator was validated first against
  // thorn-warden's shipped 0.509/0.2/4.1, which reproduced his documented antler-crown framing.
  // The 3:4 select tile reuses these same numbers against a taller container, so the head sits
  // higher/larger there — pre-existing behaviour (CharacterTile:1272-1275 vs .fr-select-tile
  // aspect-ratio 3/4), deliberately NOT compensated, because doing so would break the medallion.
  portrait: { headX: 0.401, headY: 0.129, zoom: 4.4 },
  clips: {
    idle: {
      // Phase-182 clip, unchanged. Standing guard, scythe held two-handed forward-right with the
      // blade raised; the robe and the bone chain breathe. No step, no turn. It IS the kit anchor —
      // every other clip is scored for anchor-lock against this frame 0 (check-anchor-lock reports
      // "anchor = idle.webm f0"), and its own f0 1.000 is true by construction.
      url: 'assets/characters/lich-scythe/idle.webm',
      cal: { h: 101.23, bottom: -0.61, left: 49.39 },
    },
    // Contract §10: two interchangeable takes per non-idle state, each with its own cal + contacts.
    attack_strike: [
      {
        // Take A (phase 182): a flat scythe sweep — the blade rotates from raised to horizontal and
        // is driven through the strike plane, then the body drops into a low follow-through.
        // Contact = f14 (583ms). CORRECTED FROM THE ARGMAX. measure-contacts picks f16 (energy
        // 78.86, top12 f16>f17>f14>f15>f60), but at f16 the blade has ALREADY left the plane and the
        // BODY is dropping: reach maxX collapses 671->643 and the alpha centroid jumps cy 367.4 ->
        // 388.1 between f15 and f16, the largest single-frame descent of the clip. That is the crouch
        // drop, the same false pick eclipse-ofuda.ts:216-220 records. f14 is inside the 3-frame
        // extension window (maxX 675 @f13, 673 @f14, 671 @f15, against an anchor reach of 665) with
        // the blade horizontal at torso height, and the blade's specular ("hot") count peaks over
        // f14-f15 at 10-17px. The wind-up is f11-f13 and the return to the anchor is f52-f68;
        // neither was wired.
        url: 'assets/characters/lich-scythe/attack-strike.webm',
        cal: { h: 103.38, bottom: -2.46, left: 43.77 },
        contacts: [583],
      },
      {
        // Take B (phase 182): a two-handed overhead slam — the scythe is raised fully over the head
        // (which is why this crop is 742x952, the tallest in the kit) and driven straight down.
        // Contact = f28 (1167ms), the RAW ARGMAX, and it needed no correction: energy peaks at 54.85
        // exactly where the slam bottoms out, with maxX 701 (+54 past the 647 anchor reach) and still
        // rising out of the descent. The later "peak reach" maxX 731 @f44-46 is the HELD low
        // extension after the slam, not the impact, and its energy is 2.6-3.5 (i.e. nearly static).
        url: 'assets/characters/lich-scythe/attack-strike-b.webm',
        cal: { h: 146.01, bottom: -2.15, left: 51.23 },
        contacts: [1167],
      },
    ],
    attack_throw: [
      {
        // Take A, "THROW A (dead-weight drive)". Solo-safe (no phantom opponent): he crouches and
        // drives the scythe into the ground, which erupts a dust cloud and stone rubble.
        // Contact = f24 (1000ms), the RAW ARGMAX, confirmed as the impact ignition: the blade reaches
        // ground level at f22 (crop top=168) and the opaque pixel count steps 106,323 -> 116,028
        // between f23 and f24 as the burst spawns. The wind-up is f8-f21 (a monotone crouch, cy
        // 346->441) and the recovery is f52-f96; neither was wired.
        // ⛔ DEFECT SHIPPED KNOWINGLY — RUBBLE PERSISTS TO THE LAST FRAME. See the block at the top
        // of this file: fLASTall 0.274 (population 0.916-0.957), +16,041px at f96 (+14.4%) in FIVE
        // detached blobs >=400px on the floor line (7,991/3,913/2,036/917/827px), floor band +5.81pp
        // ("WATCH"). f0 has one component >=400px and no rubble. Because the state's opacity switch
        // is instantaneous, those five blobs POP out of existence at the hand-off back to idle.
        // This take is the best available, NOT a passing take. Take B below is clean and the variant
        // law treats a one-element list identically, so dropping this take is a one-line change if
        // the orchestrator prefers that to the pop.
        // Also measured: LEFT-edge contact 59px @f49 (the dust cloud sliced flat by the frame border).
        url: 'assets/characters/lich-scythe/attack-throw.webm',
        cal: { h: 103.36, bottom: -2.14, left: 38.53 },
        contacts: [1000],
      },
      {
        // Take B, "THROW B (bone-hand seize)". Solo-safe: the free bone hand reaches out, closes, and
        // the whole body drives down, slamming the (unseen) victim into the ground.
        // Contact = f18 (750ms), the RAW ARGMAX (energy 55.81), confirmed as the drive-down slam by
        // the centroid: cy 378.2 @f16 -> 429.1 @f18 -> 470.0 @f20, the steepest descent in the clip.
        // The reach-out (f0-f12, maxX 763->797) is the wind-up and was not wired. A SECOND contact
        // was CONSIDERED AND REJECTED: maxX surges to 959 @f43 (+196px), which looks like a follow-up
        // thrust in the trace but is rock debris drifting off to the right when viewed at 380px, with
        // the body holding its crouch and energy only ~40 against 55.81.
        // Anchor-clean at both ends: f96 opaque px 111,176 vs f0 111,166 (+10px, 0.0%).
        // Measured edge contact: LEFT 112px @f34, RIGHT 10px @f43 — the debris field, and the largest
        // in this kit. It is well inside the ACCEPTED range: the shipped thorn-warden kit measures up
        // to RIGHT 317px and has 7 of 11 clips over the same 1px threshold.
        url: 'assets/characters/lich-scythe/attack-throw-b.webm',
        cal: { h: 103.69, bottom: -2.46, left: 50.08 },
        contacts: [750],
      },
    ],
    attack_block: [
      {
        // Take A, "BLOCK-COUNTER A (haft brace)". The scythe haft is braced overhead against the
        // incoming blow (peak brace f14: maxX 725 = +86 past the 639 anchor reach, crop top=30, i.e.
        // the scythe nearly touches the top of frame), the guard is HELD f28-f76 at maxX 575-605,
        // then he counters f78-f88.
        // Contact = f84 (3500ms). CORRECTED FROM THE ARGMAX. measure-contacts picks f19 (59.66), but
        // by f19 the brace has already collapsed (maxX back to ~660, cy 492 @f14 -> 536.7 @f20) — it
        // is the parry settling into the guard crouch, and a parry is not a blow landing on the
        // opponent (types.ts:39-45: `contacts` are the blow-landing times). f84 is the counter at its
        // furthest forward reach, maxX 679 (+40), the local energy cluster being f82/f85/f89 =
        // 36.96/39.74/37.29.
        // NOTE A DOCTRINE DISAGREEMENT, not softened: thorn-warden.ts:105 fires its take B "on the
        // catch, not the apex". This take fires on the COUNTER instead, deliberately, because the
        // engine plays the DEFENDER's hit clip and shows damage at each contact.
        url: 'assets/characters/lich-scythe/attack-block.webm',
        cal: { h: 133.44, bottom: -2.45, left: 51.53 },
        contacts: [3500],
      },
      {
        // Take B, "BLOCK-COUNTER B (crown guard)". The scythe is pulled across the body into a high
        // guard (f10-f16, maxX 704 -> 564), HELD f18-f78 at maxX ~552, then swept back out as a
        // counter f82-f88.
        // Contact = f88 (3667ms). CORRECTED FROM THE ARGMAX f85 (energy 69.99, the kit's second
        // highest) by 3 frames: f85 is mid-sweep with maxX ~693 and still climbing, while the blade
        // reaches its impact plane at f88, maxX 724 (+20 past the 704 anchor reach), with the blade's
        // specular count peaking 19px @f86. The f9-f13 energy cluster (61.17/60.01/58.72) is the
        // guard being raised — a parry, not wired, same reasoning as take A.
        url: 'assets/characters/lich-scythe/attack-block-b.webm',
        cal: { h: 101.85, bottom: -0.92, left: 41.38 },
        contacts: [3667],
      },
    ],
    hit: {
      // "HIT (stagger)". Cause-free, no opponent: the head snaps down, he staggers back off the
      // impact and recovers to the anchor by f96. REQUIRED, not optional — FightExperience.tsx:1778
      // gates the whole clip beat on `defenderHasHit`, so without this the fighter would never
      // trigger clip choreography as a defender against ANY opponent.
      // No contacts (a defender state; only the attacker's states carry contacts).
      // Measured: containment CLEAN on all edges; f96 within +281px of f0. qa-boss/check-extra-
      // objects.mjs reports "2 blobs @f8 sizes=[25530,481] EXTRA OBJECT PRESENT" on the RAW plate —
      // examined, and it is NOT the oni-hit defect class (an invented second attacker). In the
      // SHIPPED keyed clip the largest detached component at f8 is 375px, a 70x7px pale motion streak
      // at x506-575 / y140-146 above and behind the head, i.e. below the gate's own 400px floor.
      url: 'assets/characters/lich-scythe/hit.webm',
      cal: { h: 106.15, bottom: -1.08, left: 52.46 },
    },
    // ko is the ONE off-anchor clip by contract: he collapses and HOLDS the ground pose to f96 rather
    // than returning to the anchor. check-anchor-lock scores f0all 0.927 (fine) and fLAST 0.504body /
    // 0.517all — the low END value is CORRECT and explicitly exempt ("ko ends down by spec"), and it
    // is excluded from the fLAST population by gate-control for that reason. check-extra-objects
    // reports CLEAN (1 blob, 26,141px) and containment is clean on all edges.
    ko: {
      url: 'assets/characters/lich-scythe/ko.webm',
      cal: { h: 103.07, bottom: -2.45, left: 61.96 },
    },
    victory: {
      // "VICTORY (reaper's stillness)". He straightens, draws the scythe slowly across the body and
      // holds the reaper's pose, then settles back toward the anchor (f96 within +244px of f0).
      // Containment clean; floor growth -0.01pp. check-extra-objects reports "2 blobs @f84
      // sizes=[26018,460]" on the RAW plate, but the SHIPPED keyed frame f84 has exactly ONE
      // component >=400px (112,272px) and nothing else above 2px — the raw's second blob does not
      // survive into the asset.
      url: 'assets/characters/lich-scythe/victory.webm',
      cal: { h: 101.38, bottom: -0.77, left: 44.49 },
    },
    // §11 signature FINISHER, three takes. This is the ONE state whose clips may carry the
    // character's elemental trail BAKED INTO the body (types.ts:9-15), which is what the green
    // necromantic ground effects below are. POSITIONAL filenames per qa-boss/fire-queue.mjs:45-59:
    // special_1 -> special.webm, special_2 -> special-b.webm, special_3 -> special-c.webm.
    special: [
      {
        // Take 1, "SPECIAL FINISHER (grave furrow)": the scythe is raised fully overhead, driven into
        // the ground, and a furrow of broken paving slabs tears open in green soulfire.
        // Contact = f23 (958ms), the RAW ARGMAX (63.48), confirmed as the ground slam: the overhead
        // charge peaks at f18 (crop top=4, the scythe at the top of frame) and the furrow erupts on
        // f24-f30 as the opaque count steps 108,663 -> 133,120 -> 177,930.
        // ⛔ DEFECT SHIPPED KNOWINGLY — THE STONE FURROW PERSISTS TO THE LAST FRAME, the same class as
        // attack_throw take A: fLASTall 0.512 / fLASTbody 0.549, +25,317px at f96 (+22.6%, fused into
        // one 136,638px component), floor band 15.46% -> 24.91% (+9.45pp, "FLOOR GREW IN — LOOK").
        // Because special hands off to `victory`, whose f0 has no furrow, the slab field pops out in
        // one frame. Also measured: RIGHT-edge contact 75px @f37.
        // Its pre-post-pass plate retention was 10.81% (the second highest in the kit) and 0.00%
        // after, with 0 pixels deleted.
        url: 'assets/characters/lich-scythe/special.webm',
        cal: { h: 132.82, bottom: -2.45, left: 56.6 },
        contacts: [958],
      },
      {
        // Take 2, "SPECIAL FINISHER (the tithe)": arms spread wide in a summoning beat (f21), then
        // the scythe is driven down and stone erupts to the right.
        // Contact = f26 (1083ms), the RAW ARGMAX (54.72), confirmed as the slam by the centroid
        // descent cy 502.6 @f21 -> 552.3 @f24 -> 661.1 @f27, steepest across f24-f27.
        // Anchor-clean at both ends (f96 within +244px of f0, fLASTall 0.916) and floor growth
        // -0.06pp. Measured: RIGHT-edge contact 110px @f47 (stone chunks leaving frame).
        // ⚠ qa-boss/check-feet-planted.mjs rates this one "WATCH", the only clip in the kit that is
        // not "planted": worst lift 24px @f18, and the bottom then runs 16px BELOW the f0 floor line
        // across f42-f60 (the deep crouch plus the ground effect). Every other take measures a 0-2px
        // worst lift. Not judged a defect here — but it is the one clip whose feet leave the floor
        // line, and it is the reason the on-stage floor check in UNVERIFIED below matters most here.
        url: 'assets/characters/lich-scythe/special-b.webm',
        cal: { h: 129.14, bottom: -2.45, left: 52.45 },
        contacts: [1083],
      },
      {
        // Take 3, "SPECIAL FINISHER (the hollow crown)": a fast low scythe drive that floods the
        // ground with a wide green necromantic mist, which then thins as he rises.
        // Contact = f14 (583ms), the RAW ARGMAX and the highest energy in the entire kit (86.74),
        // confirmed as the ground strike: the opaque count steps 118,431 @f12 -> 144,023 @f15 as the
        // burst spawns, and the mist keeps growing to 199,456 @f42.
        // Anchor-clean at both ends: f96 within +339px of f0 (fLASTall 0.922), floor growth -0.02pp.
        // Measured: LEFT-edge contact 28px @f29.
        // This take carried the kit's HIGHEST pre-post-pass plate retention, 16.79% (all others
        // 5.46-10.81%), which is why §9.5 of the build spec flagged it. VIEWED over BLACK AND WHITE
        // at f16/f24/f30/f45: 0.00% after despill is real. The ground cloud is a translucent
        // olive-grey-green haze, NOT plate green and NOT a halo; the body and scythe edges are clean
        // on both backgrounds. The residual is the character's own effect. olive 0.01%.
        url: 'assets/characters/lich-scythe/special-c.webm',
        cal: { h: 103.37, bottom: -2.45, left: 37.42 },
        contacts: [583],
      },
    ],
  },
  quotes: [
    'Everything you own is a loan. I have come to collect.',
    'I wore a crown once. Now the crown wears me.',
    'Do not run. The harvest is patient, and so is the field.',
    'Bone keeps better than flesh. You will understand shortly.',
  ],
};

// ── UNVERIFIED / UNMEASURED, stated rather than implied ─────────────────────────────────────────
//  1. NO RUNTIME FACING PROOF EXISTS FOR A NODELESS FIGHTER. qa-boss/phase28-drive.mjs is this
//     repo's only runtime facing assertion and it reaches a character ONLY through CONQUEST -> a
//     node button by name -> FIGHT (driveNode, :67-117), so it has no path to a free-roster fighter
//     and cannot be pointed at this one. It also asserts the p2 polarity (wantMirrored = faces ===
//     'right'), which INVERTS for a p1 pick: with faces:'right', isMirrored(def,'p1') is false, so
//     this fighter must render UNMIRRORED (matrix a > 0) in the player slot. No driver in
//     qa-boss/*.mjs or scripts/*.mjs clicks a select tile or asserts p1 facing. The facing evidence
//     above is therefore STATIC (two anchors x 13 clips, plus a 97-frame turn scan, plus my eyes) —
//     not a live render.
//  2. THE ON-STAGE FLOOR LINE WAS NOT VIEWED. The cal.h arithmetic above proves all 13 clips imply
//     one standing height to within 4px, but nothing here proves the feet land on the arena floor
//     line in the running game — that needs the fighter registered in src/characters/index.ts, which
//     this file must not do. Check special-b first (see its "WATCH" note).
//  3. NOT MEASURED AT ALL, so read no verdict into their absence: per-clip anchor-lock beyond
//     check-anchor-lock (qa-boss/check-anchor-pair.mjs, measure-vs-anchor.mjs), per-edge containment
//     profiling (qa-boss/profile-containment.mjs), qa-boss/check-frontturn.mjs, qa-boss/check-body-
//     commitment.mjs, qa-boss/check-inset-ring.mjs, and whether any clip wants scripts/edge-feather
//     .mjs (none was applied). The batch's own disclaimer stands: qa-boss/SESSION30-HARVEST-
//     MANIFEST.tsv says "None was per-frame QA'd."
//  4. THE STAGED SUMMARY FOR THIS CHARACTER IS A BARE 10-ELEMENT ARRAY, not the {ok, failed} object
//     key-s30-harvest.mjs:188 writes, so it carries NO `failed` record and its silence proves
//     nothing about refusals. Cross-checked instead against the two independent sources: qa-boss/
//     SESSION30-HARVEST-MANIFEST.tsv lists exactly 10 lich-scythe rows for session 30 and
//     qa-boss/staged-s30/lich-scythe/webm/ holds exactly 10 webms, so all 10 attempted states are
//     accounted for and none was silently dropped.
//  5. check-anchor-lock IS MISCALIBRATED FOR THIS CHARACTER — read the `all` column, never `body`.
//     Confirmed with `node qa-boss/gate-control.mjs --char lich-scythe`: 11 of 12 SHIPPED (= already
//     accepted) clips fail its own f0body >= 0.90 band (min 0.800, median 0.833) while 0 of 12 fail
//     f0all (min 0.916, median 0.928); the body-vs-all gap runs a median 0.103 and a max 0.119 on
//     special-c. The pre-existing evidence holds too: the phase-182 attack-strike.webm scores f0body
//     0.851 against f0all 0.954, a 0.103 gap, and has been shipped and accepted since phase 182.
//     The largest-connected-component "body" split mis-splits on a character whose scythe spans the
//     frame. gate-control's own verdict line: "READ COLUMN: `all`".
