import type { FighterDef } from './types';

// HOLLOW PALE — node 4 boss (SNOWFANG PASS). Pale antlered yokai: bone-white skull grin, ink-stained
// ribs, an antler crown, a serrated bone wing-scythe for a right arm, and no legs — the lower body is
// black smoke it floats on. Replaces the superseded ONRYO KATANA as node 4's identity (phase 24f);
// the sanitized redesign is the take that cleared upload moderation where onryo hard-blocked.
//
// The 11-clip kit was generated on GREEN (browser Higgsfield Unlimited), QA-passed per contract §6,
// keyed with the PINK-SAFE green keyer (scripts/key-clips-green-pinksafe.mjs — the stock magenta
// suppress would crush the crimson/pale-gold finisher trim) + green-despill + green-neutralize(32),
// then encoded VP9 alpha. Every `cal` here is the value EMITTED by the keyer
// (qa-boss/webm/hollow-pale-<state>.cal.json — never hand-derived); every `contacts` array is
// MEASURED motion-energy argmax over the keyed frames at 24fps (scripts/measure-contacts.mjs), each
// one verified to be the action beat and not the return-to-anchor recovery.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/hollow-pale.webp, h900). It is the
// ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle clip
// overlays it once loaded. faces:'right' (head + body face screen-right at full res); the game
// mirrors per THE FACING RULE for whichever slot he lands in.
export const HOLLOW_PALE: FighterDef = {
  id: 'hollow-pale',
  name: 'HOLLOW PALE',
  still: 'assets/enemies/hollow-pale.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. Measured off the cutout: the antler crown +
  // skull mass spans y41..y205 of the 912x900 still with its x centre at ~333px, so the head centre
  // is ~x0.368 / y0.148 in still-WIDTH units (which is what the medallion transform consumes).
  portrait: { headX: 0.368, headY: 0.148, zoom: 4.6 },
  clips: {
    idle: {
      // Planted right-facing float: the bone-scythe arm rises and settles with predatory patience,
      // the smoke curls and breathes, the claw flexes. No turn, no step.
      url: 'assets/characters/hollow-pale/idle.webm',
      cal: { h: 100.08, bottom: 0, left: 48.73 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: blade drawn back LOW at the hip, then one violent guillotine cut through the
        // front with a smoke whip. Contact = the cut at full extension.
        url: 'assets/characters/hollow-pale/attack-strike.webm',
        cal: { h: 99.85, bottom: 0, left: 45.8 },
        contacts: [2333],
      },
      {
        // Take B: gut-hook — sink into the smoke, explosive rising rip, settle. Contact = the rip.
        // Top + right edges feathered 48px over f29-f50 where the hook peak crosses frame.
        url: 'assets/characters/hollow-pale/attack-strike-b.webm',
        cal: { h: 105.02, bottom: 0, left: 42.43 },
        contacts: [1167],
      },
    ],
    attack_throw: [
      // Take A (attack-throw.webm) PULLED 2026-07-26 (animation<->character sweep, orchestrator-
      // verified): he turns his BACK to camera at f46-50 (side-profile lock broken) AND the
      // bone-scythe shrinks to a few rib-stubs at his hip while turned. Re-roll queued.
      {
        // Take B: the smoke surges as he lunges antlers-first like a charging stag. Contact = the
        // deepest committed lunge. (This take also fixed the phantom brown ball: hand open + empty.)
        url: 'assets/characters/hollow-pale/attack-throw-b.webm',
        cal: { h: 99.85, bottom: 0, left: 51.42 },
        contacts: [1000],
      },
    ],
    attack_block: [
      {
        // Take A: the wing-blade WRAPS over his shoulders into a defensive huddle, braces, then a
        // counter snap. Contact = the guard-catch beat (blocks fire on the catch, not the counter).
        url: 'assets/characters/hollow-pale/attack-block.webm',
        cal: { h: 100.08, bottom: 0, left: 42.09 },
        contacts: [333],
      },
      // Take B (attack-block-b.webm) PULLED 2026-07-26: THE BONE-SCYTHE VANISHES. At f64-f78 his
      // left arm renders as a plain fleshy arm with an ordinary clawed hand - his signature weapon
      // (which IS his arm) disappears for ~0.8s, then returns. Orchestrator-verified on the frames.
      // Worst possible arsenal break; re-roll queued.
    ],
    hit: {
      // Head and torso whip back, smoke scatters off the waist, hard stagger, clean recover to the
      // anchor. Cause-free: empty air throughout, no phantom, nothing enters the frame.
      url: 'assets/characters/hollow-pale/hit.webm',
      cal: { h: 102.11, bottom: -0.68, left: 47.71 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win; one take is
    // chosen uniform-random per finish. Two takes so far (special_3 SMOKE SPIKE appends later, no re-wire).
    special: [
      // Take A (PALE HARVEST, special.webm) PULLED 2026-07-26: at f32 the white crescent arc hangs in
      // OPEN AIR up-right of the blade with a visible GAP to it, and at f38-f44 it still extends far
      // past the blade tip as a separate arc = the detached-projectile ("rocket") class. The fix on
      // re-roll is not "less effect" but "the arc must TERMINATE ON THE BLADE in every frame".
      {
        // Take B — INK BLOOM: a tight crimson-and-white bloom with black ink wisps bursts from the
        // ribcage as he arches, pulsing once (f43-f52) and fading. Centered, contained, no edge
        // crossing; crimson survives the pink-safe key (0.0000% green). Contact = the bloom peak (f47).
        url: 'assets/characters/hollow-pale/special-b.webm',
        cal: { h: 99.84, bottom: 0.01, left: 49.41 },
        contacts: [1958],
      },
      // Take C (SMOKE SHROUD, special-c.webm) PULLED 2026-07-26. It DID fix the rocket (the smoke
      // wraps him instead of flying off) but the sweep found three new defects the orchestrator
      // then verified on the frames: the shroud SWALLOWS HIS HEAD at peak (only antler tips show,
      // f44-64); it HARD-CUTS against the top frame edge for 8 frames (f40-47 carry ~100-130 fully
      // OPAQUE alpha-255 pixels in the top row = a black slab, not billowing smoke - an earlier
      // orchestrator check used too low an alpha threshold and wrongly accepted this); and at f58 it
      // sheds a separate black blob floating clear of the mass. Re-roll: keep the shroud LOW (waist
      // to chest, never over the head) and well inside the top edge.
    ],
    // ko is the ONE off-anchor clip: the smoke thins and sinks, he crumples straight DOWN and lies
    // low with the smoke settling over him like a shroud, then HOLDS (does NOT return to the
    // anchor). Cause-free, no weapon-drop, no opponent. This is the COMPACT-collapse re-roll (v2):
    // the first take sprawled the head/scythe past the right edge on the held pose (212px slice);
    // this one holds a 56px right margin (measured f64/80/95) with only soft smoke at the left edge.
    ko: {
      url: 'assets/characters/hollow-pale/ko.webm',
      cal: { h: 102.1, bottom: -2.02, left: 39.84 },
    },
    // Round-win taunt: the smoke swells, he rises taller and spreads the wing-scythe arm and clawed
    // hand wide in a skeletal display, antlered head tipped back, then sinks back to the anchor.
    victory: {
      url: 'assets/characters/hollow-pale/victory.webm',
      cal: { h: 105.25, bottom: -0.23, left: 41.64 },
    },
  },
  quotes: [
    'The pass keeps its dead standing. I am only the first.',
    'You brought breath to a place that has no use for it.',
    'Nothing of me is warm. Nothing of you will stay so.',
    'Walk on. The snow will finish what the blade began.',
  ],
};
