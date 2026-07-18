# FIGHTER ANIMATION CONTRACT — Frozen Requiem

The rule set that makes characters SWAPPABLE: the game speaks a fixed vocabulary of
animation states; every character ships the same states with their OWN acting. The engine
and choreography never know who is fighting — they play states from a manifest.

## 1. The state vocabulary (fixed, engine-derived)

Every exchange resolves to `hit(winner, move)` or `clash`. That gives the choreography
these beats, and therefore every character these states:

| state           | required | what it is (timing envelope, 24fps clips)                              |
| --------------- | -------- | ---------------------------------------------------------------------- |
| `idle`          | YES      | The hub. Seamless loop, starts+ends on THE anchor pose. 5s.            |
| `attack_strike` | YES      | The STRIKE win. Anticipation -> weapon/fist lands (contact ~40%) -> recover to anchor. 4s. |
| `attack_throw`  | YES      | The THROW win. Reach -> grab/slam connects (contact ~45%) -> recover to anchor. 4s. |
| `attack_block`  | YES      | The BLOCK win (block BEATS strike): deflect then counter-punish (contact ~50%) -> recover. 4s. |
| `hit`           | YES      | Getting hit: sharp flinch/stagger back -> recover to anchor. 4s, impact read at ~15%. |
| `ko`            | optional | Falls and stays down (ends held on the ground, NOT at anchor).         |
| `victory`       | optional | Round-win taunt -> recover to anchor.                                  |
| `fx_impact`     | YES      | NOT a body state: the attacker's impact burst, overlaid at the contact point on the DEFENDER whenever their blow lands. See section 7. |

CLASH needs NO clip: both fighters play their attack clip and the choreography freezes
both at contact (hitstop) and bounces them apart.

Hit weight (from Tim's MK1 kick reference, `input/kick fight reference.mp4`): a normal
hit is a HARD stagger (head/torso whip, ground barely held); the ROUND-ENDING hit adds a
launched knockback on top via choreography transform (the clip stays the same `hit` clip
- the launch is the wrapper flying, MK juggle style).

## 2. The anchor-lock law (load-bearing — this is what makes swapping work)

- Each character has ONE anchor pose: the keyed still (`<id>-keyed.png`). Every clip
  except `ko` starts AND ends on that exact pose (generation: seedance with
  `start_image == end_image == image_references == the anchor`).
- Therefore any clip chains into any clip with zero snap, and `idle` is the hub:
  after every beat the character returns to idle, and the idle video is RESTARTED at
  frame 0 (its frame 0 IS the anchor) so the handoff is seamless.
- A clip that drifts off-model, turns the character, or ends off-anchor is REJECTED at
  QA — never "fixed in wiring".

## 3. Per-character acting (the bible rule)

The contract names the state; the CHARACTER decides the acting, derived from their own
design — weapons, body, temperament. Acting is NEVER reused between characters.

- GORVAK (orc, serrated cleaver + parry dagger): attack_strike = heavy one-hand cleaver
  arc; attack_throw = collar grab and downward slam; attack_block = dagger deflect into
  pommel smash; hit = mass staggers, barely gives ground.
- VOLTA (cyber-brawler, powered gauntlets + spark wick): attack_strike = wired straight
  cross with spark trail; attack_throw = clinch and knee; attack_block = forearm servo
  deflect into backfist; hit = whiplash recoil, quick recovery.
- A NEW character = write this table for them first (what do their weapons/body do per
  state?), then generate. If they carry a knife, the knife is IN the acting.

## 4. The manifest (swap = data, not code)

`src/characters/<id>.ts` exports a `FighterDef`; `src/characters/index.ts` is the
registry. The Experience receives two FighterDefs and NEVER hardcodes character assets.

```ts
interface FighterClip {
  url: string;          // /assets/characters/<id>/<state>.webm (VP9 alpha, 24fps)
  cal: ClipCal;         // { h, bottom, left } % placement inside the square fighter box
                        //   — EMITTED BY scripts/key-idle-clips.mjs as JSON, never hand-derived
  contactMs?: number;   // attack clips: when the blow lands, in CLIP time
}
interface FighterDef {
  id: string; name: string;
  still: string;        // anchor pose PNG (the ultimate fallback, always shipped)
  side: 'left' | 'right';  // which slot the character occupies
  faces: 'left' | 'right'; // which way the ART looks — judge the HEAD at full res
  clips: Partial<Record<FighterState, FighterClip>>;
  quotes: string[];     // win-screen lines, in character
  fxImpact?: { url: string; durationMs: number }; // section 7
}
```

THE FACING RULE (Tim, 2026-07-18 — replaces the old "art is never flipped" rule): the
left slot must face right, the right slot must face left. When a character's `faces`
disagrees with its slot, the game renders that fighter AND its HUD portrait mirrored
(scaleX(-1)), classic fighting-game style — VOLTA is the first case (her head looks
right, so the right slot mirrors her). Judge facing by the HEAD at FULL resolution: a
body can stance one way while the head glances the other, and the head is what reads.
Consequence for generation: a mirrored character's directional acting must be prompted
in ART space (screen-left and screen-right swap after the mirror).

- Wiring is EXACT-MATCH with a DEFINED fallback ladder — never a silent no-op:
  missing `attack_*`/`hit` -> the pre-clip CSS choreography (lunge/flinch transforms on
  the still); missing `ko` -> grayscale-fall treatment; missing `idle` -> breathing still.
  So a character is playable the moment it has a keyed still, and gets richer per clip.
- All shipped state videos are PRELOADED (stacked, opacity-toggled, never src-swapped
  mid-fight) — src swaps cause decode-blank flashes.

## 5. Choreography sync (module consts, not per-character)

- `CLIP_RATE = 2.0` — state clips play at 2x (4s clip -> 2s beat, MK weight).
- Attacker's `attack_<move>` starts at reveal; at `contactMs / CLIP_RATE` the
  choreography fires: hitstop freeze (both videos paused 80-120ms; 200-300ms on KO),
  defender's `hit` clip + damage flash + HP drain. Both return to idle after.
- Per-character numbers live ONLY in the manifest (cal, contactMs). Global rhythm lives
  ONLY in module consts. Never mix.

## 6. Production pipeline per new character (mechanical)

1. Keyed still (`scripts/key-fighters.mjs` recipe) -> anchor.
2. Acting table (section 3) -> per-state prompts (style-lock + consistency-lock +
   magenta bg + locked camera + feet planted + starts/ends at reference pose + NEGATIVE).
3. Generate on Seedance 2.0, anchor-locked, 1080p, silent. HUMAN-GATED credits.
4. QA each clip BEFORE keying: on-model, correct facing every frame (art faces its
   slot's direction), no talking, no walking, contact beat readable.
5. `scripts/key-idle-clips.mjs <frames> <out>` -> keyed frames + cal JSON; encode VP9
   alpha WebM, non-black clear plane; matte check over black/white/grey, multi-frame.
6. Fill the manifest (url/cal/contactMs), add to registry. Done — no Experience edits.

## 7. Impact effects (attacker-owned, overlay layer — Tim's effect reference)

Reference: `input/effect.mp4` (MK1 Scorpion fire juggle) — a directional elemental burst
at the exact contact point: appears AT contact, peaks in 2-3 frames, decays in ~10.

- The effect is part of the ATTACKER's identity and lives in THEIR manifest
  (`fx_impact`): GORVAK = ember-and-bone iron burst; VOLTA = crackling voltage burst.
  A new character designs their own (what does THEIR weapon leave in the wound?).
- It is an OVERLAY at the defender's contact point (chest height, offset toward the
  attacker, mirrored to the hit direction), never baked into any body clip. That is
  what keeps it composable: any attacker's burst lands on any defender.
- Body clips are EFFECT-FREE by contract (their NEGATIVE blocks list fire/energy/glow
  additions). One effect on screen per contact; no trails, no emitters - a single
  authored burst clip is the sanctioned Swoobz form (no particle systems).
- Production: emissive-only bursts are generated on PURE BLACK and composited with
  `mix-blend-mode: screen` (no keying, no fringe - additive light). Trim to the burst:
  ~0.7s at 24fps, played once at contact, gone before the hit recovery ends. Dark smoke
  or debris that must occlude the fighter is NOT allowed in v1 (screen blend cannot
  render dark elements; it would need an alpha-keyed variant instead).
- RG-C5: the burst is identical for every hit of that attacker - never bigger for
  match point, streaks, or stake size. KO weight comes from hitstop + launch + zoom
  (already value-independent), not a fatter effect.
