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
      // Take A STAYS PULLED after its v2 re-roll (phase 26, orchestrator-verified on the frames).
      // The re-roll DID fix the arsenal break — the bone-scythe is a full forward blade in all 97
      // frames instead of shrinking to rib-stubs — and its containment is clean (0px top/left/right,
      // cal { h: 100.08, bottom: 0, left: 46.93 }, contact f44/1833ms). But it reproduces the OTHER
      // half of the v1 defect: at f43-f62 (~0.8s) the torso rotates past profile into a 3/4 BACK view,
      // both scapulae and the spine groove to camera, skull twisted round. That is the systemic
      // "rotation out of profile through the back" class the animation sweep flagged across ~10 clips.
      // Session-6 doctrine 6 is binding — never ship a known-defective take while waiting on a render;
      // pulling is cheap and reversible, and clipVariants treats the remaining 1-element array like a
      // bare clip. The keyed webm is kept at public/assets/characters/hollow-pale/attack-throw.webm so
      // a future re-roll (or Tim overriding this call) is a pure manifest swap, no re-key.
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
      {
        // Take B (v2 RE-ROLL, phase 26): the blade is snatched IN across the chest to absorb while
        // the free claw comes up as a high guard, a long braced hold, then a straight counter thrust.
        // Contact = the guard-CATCH (f12, blocks fire on the catch, not the counter), verified by the
        // reach trace: the scythe tip retracts 909 -> 531px between f8 and f16 and the argmax sits
        // mid-pull; the later energy peaks are the counter (f44) and the return to anchor (f76/f80).
        // The re-roll FIXED the vanish: the bone-scythe is a fully rendered blade in all 97 frames,
        // never a plain fleshy arm.
        // FLAG: the counter overshoots the frame - the blade tip is cut flat by the RIGHT edge,
        // 16px contiguous, sustained f46-f62 (~0.7s). NOT feathered: this is the scythe, not smoke,
        // and feathering a weapon edge is not allowed here. Accepted as far less bad than the v1
        // arsenal break; a shorter-counter re-roll is a pure swap.
        url: 'assets/characters/hollow-pale/attack-block-b.webm',
        cal: { h: 100.75, bottom: 0, left: 42.65 },
        contacts: [500],
      },
    ],
    hit: {
      // Head and torso whip back, smoke scatters off the waist, hard stagger, clean recover to the
      // anchor. Cause-free: empty air throughout, no phantom, nothing enters the frame.
      url: 'assets/characters/hollow-pale/hit.webm',
      cal: { h: 102.11, bottom: -0.68, left: 47.71 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win; one take is
    // chosen uniform-random per finish. Three takes: A PALE HARVEST (v2), B INK BLOOM, C EMBER RIBS (v2).
    special: [
      {
        // Take A - PALE HARVEST (v2 RE-ROLL, phase 26): pale-gold fire ignites ALONG the bone-scythe
        // during a back-swing wind-up, then he sweeps it forward and the flame drags a wide reaping
        // fan that stays welded to the blade. Contact = the sweep peak (f46), verified as the action
        // beat two ways: the alpha-pixel count spikes 137k (rest) -> 218k at f46 as the fan opens,
        // and the warm-effect pixel count also argmaxes at f46; the tail f80-f90 is the return to
        // anchor with zero effect pixels.
        // The re-roll FIXED the rocket class: in every frame the arc TERMINATES ON THE BLADE - there
        // is no detached crescent hanging in open air and nothing extends past the blade tip as a
        // separate object. Crimson/pale-gold trim survives the pink-safe key (0 green-dominant px).
        // FLAG: during the wind-up the blade tip is swung back over the shoulder and is cut flat by
        // the LEFT edge, 18px contiguous, f34-f40 (~0.25s). NOT feathered (scythe, not smoke).
        url: 'assets/characters/hollow-pale/special.webm',
        cal: { h: 100.08, bottom: 0, left: 40.4 },
        contacts: [1917],
      },
      {
        // Take B — INK BLOOM: a tight crimson-and-white bloom with black ink wisps bursts from the
        // ribcage as he arches, pulsing once (f43-f52) and fading. Centered, contained, no edge
        // crossing; crimson survives the pink-safe key (0.0000% green). Contact = the bloom peak (f47).
        url: 'assets/characters/hollow-pale/special-b.webm',
        cal: { h: 99.84, bottom: 0.01, left: 49.41 },
        contacts: [1958],
      },
      {
        // Take C - EMBER RIBS (v2 RE-ROLL, phase 26): smoke gathers up his back, he hunches and
        // arches, and the ribcage lights from WITHIN - the rib bars glow amber-white through the
        // ink-stained chest - then it dims and he settles back to the anchor. Contact = the arch
        // (f44), verified as the action beat by the centroid trace: the subject top drops 6 -> 42px
        // and cy rises 434 -> 447 between f42 and f44 as he hunches into the ignition; the glow is
        // held f46-58 and f60-64 is the rise back to the anchor.
        // The re-roll FIXED all three v1 defects: the head is never swallowed (skull and antlers
        // clear in every frame), the top edge is clean (containment 0px on top/left/right), and
        // there is no shed floating blob.
        // KNOWN WEAKNESS (shipped deliberately): it is by far the WEAKEST of the three finishers.
        // Measured on the keyed frames as bright-pixel share of the subject above its own resting
        // baseline: take C peaks at +1.8pp and stays above +1pp for only 0.46s, versus take A at
        // +16.2pp / 1.71s and take B (ink bloom) at +8.9pp / 0.25s. It reads as an internal ember
        // rather than a finisher flourish. Defect-free beats absent, and a presence re-roll later
        // is a pure drop-in swap (same file name, same slot).
        url: 'assets/characters/hollow-pale/special-c.webm',
        cal: { h: 100.08, bottom: 0, left: 48.16 },
        contacts: [1833],
      },
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
