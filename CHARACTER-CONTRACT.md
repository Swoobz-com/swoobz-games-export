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
  faces: 'left' | 'right'; // which way the ART looks — judge the HEAD at full res
  portrait: { headX: number; headY: number; zoom: number }; // per-char head-crop for HUD
                        //   medallions + select tiles (fraction of the PNG + enlarge factor)
  clips: Partial<Record<FighterState, FighterClip>>;
  quotes: string[];     // win-screen lines, in character
  fxImpact?: { url: string; durationMs: number }; // section 7
}
```

NOTE — side/slot is RUNTIME, not a character property. The player's pick is always the LEFT
slot; the opponent is always the RIGHT slot; every fighter mirrors per THE FACING RULE for
whichever slot it lands in. So `FighterDef` carries NO `side`. The Experience computes
`isMirrored(def, slot)` = `def.faces !== (slot === 'p1' ? 'right' : 'left')`. Per-slot stage
geometry (fighter/ring positions) lives in the Experience CAL; per-character head crop travels
in `portrait`, so a medallion frames the same head in either slot.

THE FACING RULE (Tim, 2026-07-18 — replaces the old "art is never flipped" rule): the
left slot must face right, the right slot must face left. Slot is a RUNTIME assignment (the
player's pick is always the left slot, the opponent the right), so this must hold for EVERY
character in EITHER slot, forever. When a character's `faces` disagrees with the slot it landed
in, the game renders that fighter AND its HUD portrait mirrored (scaleX(-1)), classic
fighting-game style — e.g. VOLTA's head looks right, so she mirrors in the RIGHT slot (opponent
of GORVAK) and does NOT mirror in the LEFT slot (when the player picks her). Judge facing by the
HEAD at FULL resolution: a body can stance one way while the head glances the other, and the
head is what reads. Consequence for generation: a mirrored character's directional acting must
be prompted in ART space (screen-left and screen-right swap after the mirror).

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

> DEPRECATED for NEW characters (after Tim's fire rejection): the generated emissive burst
> (`fx_impact`) is no longer commissioned per character — contact fx are now CSS-authored (the
> frost ring + echo + glow + "-1", §9). This §7 machinery stays LEGAL and wired but OPT-IN: a
> character that ships an `fx_impact` still gets its burst; leaving it out is the new default.

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

## 8. Character select (registry-driven, zero UI cost per character)

The `charSelect` phase sits between mode select and stake. The player picks their fighter; that
pick becomes the LEFT slot and the opponent (for now the first OTHER registry entry) the RIGHT
slot — so THE FACING RULE (§4) resolves the mirroring for both, for any combination, forever.

- The tile grid is built straight from the `FIGHTERS` registry in registry order, so a new
  manifest file appears as a new tile with ZERO Experience edits. Alongside the real tiles are
  exactly 4 locked "?" mystery tiles (dark plate, big glyph, quiet SOON label, no interaction).
- Each tile is a bust crop of the character's `still` using its `portrait` params (the SAME
  head-crop math as the HUD medallion, framed ~3:4). The selected tile lights with a gold accent
  frame + a "P1" chip; the picked fighter's NAME shows in large type under the grid.
- Interactions: click a tile or arrow-left/right to select (fires the existing UI tick from
  `fightAudio` — no new audio), CONFIRM (gold CTA, same family as the stake commit) advances to
  stake. BACK from charSelect returns to mode select; BACK from stake returns to charSelect.
- The provider stays IDENTITY-AGNOSTIC: it owns only the `charSelect` phase + `confirmFighter()`
  transition and never knows which character is chosen. The Experience owns `playerId` state
  (defaults to the previously picked fighter within the session).

## 9. The combo-string law (attack clips are contact STRINGS)

An `attack_*` clip is a 1-3 contact STRING: one clip, one to three blows landing inside it. This
is PRESENTATION only — the engine stays byte-frozen, damage is exactly 1 per exchange. The string
makes a win READ as a flurry without touching the math.

- **Contacts live in the manifest, measured from the QA sheet — never guessed.** `FighterClip.contacts`
  is the blow-landing times in CLIP time ms (pre-`CLIP_RATE`), ASCENDING, each read off the sheet
  EXACTLY like `contactMs`. `contacts` SUPERSEDES `contactMs` when present; `contactMs` stays as the
  single-contact form, so every existing manifest is unchanged (a clip with only `contactMs`, or
  neither, is a one-contact string — byte-identical to the pre-combo beat).
- **The defender plays ONE universal hit clip, re-triggered per contact.** There is no per-blow
  reaction clip: the single `hit` clip is the reaction, restarted from frame 0 at every contact. So
  the `hit` clip MUST read when restarted mid-flow — a whole-body react that resolves QUICKLY back
  toward guard (not a slow one-way topple), or the re-trigger looks like a stutter. Round-ending
  strings resolve the defender to `ko` at the first contact (as the single beat did); `ko` holds and
  is NOT re-triggered.
- **The "-1" shows ONCE, at the final contact.** The frost ring + echo + glow fire at EVERY contact
  (the flurry reads), but the damage floater renders only on the last blow — three "-1"s would lie
  about HP (damage is 1). RG-C5 honesty.
- **The hits counter derives from the contact COUNT only.** On a 2+ contact string a "N HITS" tally
  pops near the stage centre-top from the 2nd contact on, in the frost/steel palette (never gold),
  and fades after the last blow. Its text is the choreography contact index, NEVER a stake / win /
  streak value (RG-C5). Single-contact strings show no counter.
- **Contact fx are CSS-authored (see §7).** The generated `fx_impact` burst is deprecated for new
  characters; the ring/echo/glow/floater/counter above are the sanctioned contact presentation. The
  §7 burst machinery stays legal but opt-in.

## 10. The variant law (every non-idle state ships >= 2 interchangeable takes)

A repeated win must never look pixel-identical. So every state EXCEPT `idle` ships AT LEAST TWO
interchangeable TAKES; one is chosen uniform-random per exchange. `idle` is exempt — it is THE
anchor hub, the one loop every state returns to, so it is never varied (a single take, forever).

- **Same acting family, distinct actions.** All takes of a state are the SAME state — a strike take
  is still a strike (contract §3 acting) — but they are DIFFERENT actions (e.g. GORVAK's cleaver: an
  overhead chop take AND a horizontal sweep take), so back-to-back wins read fresh, not looped.
- **Each take carries its OWN measured cal + contacts.** A variant is NOT a re-timing of another
  clip: every take is its own generated clip with its own geometry (`cal`) and its own beat times
  (`contacts`/`contactMs`), each measured off its own QA sheet EXACTLY like a single clip (§9), never
  copied from a sibling and never guessed.
- **The manifest holds a clip OR a list.** `clips[state]` is either one `FighterClip` (one take) or a
  `FighterClip[]` (a list of takes). `clipVariants(def, state)` normalises both to a flat list ([],
  [one], or the array) — it is the ONE reader every render + timing path routes through. A single
  clip and a one-element list mean the SAME thing, so single-clip manifests stay byte-identical.
- **Chosen per EXCHANGE, never per contact.** The choreography picks the take at resolve start (from
  `Math.random` only — RG-C5: never from stake, streak, or outcome value) and dispatches the index so
  the render layer AND all contact/clash timing read the SAME take. Every contact of a combo STRING
  (§9) belongs to that one chosen take; a re-pick (e.g. a StrictMode re-run) re-picks render + timing
  together and cannot desync them.
- **File naming.** Take A keeps the existing single-clip name `<id>-<state>.webm` (so shipped files
  are unchanged); later takes are `<id>-<state>-b.webm`, `<id>-<state>-c.webm`, and so on. Idle stays
  the single `<id>-idle.webm`.
- **Fallback ladder unchanged.** A state with ZERO takes ([]) still falls back exactly as §4: missing
  `attack_*`/`hit` -> the pre-clip CSS choreography; missing `idle` -> the breathing still.

## 11. The special law (optional signature finisher)

A character MAY ship a `special` state: a signature FINISHER clip. It is the ONE deliberate exception
to the effect-free-body rule (§7): the character's elemental trail is BAKED INTO the special clip's
body (GORVAK = a flaming cleaver circle; VOLTA = a lightning spin), held to the Scorpion-quality bar —
added after Tim approved fire at that quality. Every other state stays effect-free.

- **Plays on round-ending wins ONLY, never selectable, never value-dependent.** When an exchange's win
  TAKES the round (the choreography's `roundEnding` flag) and the WINNER ships a `special`, the winner
  plays `special` in place of its normal `attack_<move>` clip. The trigger is ROUND STATE only — never
  the stake, the streak, or any money value (RG-C5 clean, like every other beat). A player never picks
  it; it is not a move (it is NOT in `ATTACK_STATE`).
- **Measured and timed EXACTLY like an attack clip.** `special` carries its own `cal` and 2-3 `contacts`
  (§9), each read off its QA sheet, never guessed. The round-ending choreography (multi-contact string,
  KO hitstop on the final contact, KO zoom, loser launch) reads the special clip's contacts identically
  to an attack clip's — the ONLY thing that changes is WHICH clip the winner plays.
- **Anchor-locked, effect fully dissipated by the final frame.** Like every non-`ko` clip (§2) it starts
  and ends on THE anchor pose, and it is a ONE-SHOT: it returns to idle on its own end (never loops). The
  baked elemental trail must be fully gone by the last frame so the return-to-idle handoff is seamless.
- **`special` may be varied like any non-idle state (§10)** — a clip OR a list of takes, read through
  `clipVariants`. It is preloaded per-take alongside every other state.
- **Falls back to the normal attack clip when absent.** A character with no `special` plays its normal
  `attack_<move>` finisher on a round-ending win, exactly as before. The swap is invisible until a
  manifest ships a `special` take.
