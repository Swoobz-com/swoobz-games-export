# MK FINAL — 6 PLAYABLE characters: selection, and the PADDING pre-step that must come first

Tim, 2026-07-30: *"pick 6 fitting characters out of the mk final map and generate the clips"* +
*"those will be playable characters"*. This closes the `input/MK FINAL/` scope question that had been
open in the handoff since session 13.

## What MK FINAL actually is
`input/MK FINAL/` holds ~153 characters sorted into rarity tiers (common 53 · rare 38 · Epic 28 ·
legendary 13 · mythic 21), each as three files: `Name.png` (full-body plate), `Name PFP.png`,
`Name TCG.png` — the same convention as the phase-20 `npc boss/` art.

**It is the SOURCE ART FOR THE EXISTING ROSTER.** `Hollow_Pale` and `Onryo Katana` are in legendary;
`Eclipse Ofuda`, `Kitsune Tanto` and `Thorn_Warden` are in mythic. So the picks below deliberately
exclude anything already wired, and anything that would read as a duplicate of a wired character.

## ★★★ THE BLOCKER TO FIX BEFORE GENERATING ANYTHING: these plates are CROPPED TIGHT
Measured on the raw plates (subject bbox vs frame, same method as the per-character FRAME BUDGETS):

| character | plate | subject | L | R | T | fills |
|---|---|---|---|---|---|---|
| Oni Tetsubo | 1536x1536 | 1457x1425 | 51 | 28 | 71 | 93% |
| Raiju Naginata | 1544x1536 | 1454x1340 | 42 | 48 | 128 | 87% |
| Minotaur Axe | 1860x1536 | 1781x1456 | 54 | 25 | 39 | 95% |
| Skullrend Orcus | 1520x1536 | 1447x1466 | 18 | 55 | 56 | 95% |
| Pale_Choir | 856x1536 | 761x1313 | 32 | 63 | 144 | 85% |
| Jin_Goldenhand | 1064x1536 | 953x1324 | 48 | 63 | 144 | 86% |

For scale: ir37 has **206/208/88** and still could not extend her fan; hollow-pale at **131/29/37** is
the tightest currently-wired character and his `special-b` is the worst anchor break in the roster.
**Every one of these plates is tighter than ir37 and comparable to or tighter than hollow-pale.**

Generating straight off these plates would fail containment on essentially every action, and would
repeat the whole ir37 oscillation (v2..v6) six times over. So:

**BUILD A PADDED ANCHOR PLATE FIRST.** Re-composite each keyed character onto a larger pure-green
1536x1536 canvas, scaled so the subject fills ~65-70% of frame height and sits centred with the feet
on the floor line. Target budget: **>=200px each side and >=200px headroom**, with the bottom edge on
the floor (free — `check-containment.mjs` never counts bottom contact). This is the same move as the
phase-9 gorvak CLEAN PLATE rebuild (composite the keyed still onto a fresh plate) and it is what makes
the frame budget usable instead of hostile. Verify the padded plate with the same bbox measurement
before firing a single clip.

## The 6 picks (viewed at size AND measured — never chosen from filenames)
All mythic, all natively side-profile facing SCREEN-RIGHT (roster convention, so no hflip), all on a
green plate, all with a clear arsenal for a signature beat, and all six read as distinct archetypes
from each other and from the crimson/pink existing roster.

1. **Oni Tetsubo** — red oni, spiked iron club. Theme-perfect for STANDOFF, compact silhouette, and
   the CLEANEST plate of the set (0 near-white px, so no baked-glow risk).
   Signature beat: club slam into the ground -> kicked grit and stone chips (solid material, and it
   exploits the free bottom edge).
2. **Raiju Naginata** — blue-and-white tiger-beast with a naginata. The only cool-palette fighter in
   the roster, which is a real contrast against all the crimson.
   Signature beat: shed fur tufts / frost shards (solid). NOT a lightning glow — that is unkeyable.
3. **Minotaur Axe** — dark minotaur, gold double-headed axe. Heavy-bruiser archetype nobody fills.
   Signature beat: struck stone chips off the axe head (solid).
4. **Skullrend Orcus** — orange-skinned brute, black jagged blade, skull pauldron.
   Signature beat: shed bone shards (solid).
5. **Pale_Choir** — gaunt white clawed humanoid, **UNARMED**. Valuable because every wired fighter
   holds a weapon; an empty-handed clawed acting family is genuinely new and sidesteps the prop-reach
   problem that cost ir37 and eclipse most of their rolls.
   Signature beat: shed pale ash flakes (solid).
6. **Jin_Goldenhand** — martial artist with oversized golden gauntlets on chains.
   Signature beat: chain-link flick + gold flake (solid).

## Rejected, with the reason (so nobody re-litigates these)
- **Emberpaw Kage**, **Stormlord_Rex** — baked FLAME / LIGHTNING on the weapon. That is the
  kitsune-tanto blocker class (a baked glow that cannot be keyed or art-directed) and it has already
  cost this project a whole blocked node. Do not start here.
- **Sol Ofuda** — conical hat + ofuda + katana reads as a duplicate of the wired Eclipse Ofuda.
- **Azure_Ling** — would be the THIRD fan-wielder after ir37 and IR-48.
- **Nurikabe Shield**, **Golem Mace**, **Gargoyle Spear**, **Jorogumo Kusarigama**,
  **Lilith_Palehorn** — huge shield / huge mace / spread wings / spider legs / flowing ribbons. All
  add width to an already-hostile budget; see the three-axis rule below.
- **Horned Ruin Vex**, **Antler_Mire** — good art, held as ALTERNATES. Vex overlaps Skullrend's
  orange-brute slot; Antler_Mire's plate carries 6088 near-white px worth checking for glow first.

## Carry ALL of these forward from the ir37 + eclipse re-rolls (they cost ~15 rolls to learn)
1. **Bound HEIGHT, REACH and SPAN independently**, and bound the **PROP TIP**, not the hands — a long
   prop clears the ceiling even with the hands at chest height. Constraining one axis silently pushes
   the motion into another.
2. **PLANTED clause** on every clip: *feet stay flat on the ground, never jumps/leaps/hops/lifts both
   feet*. Without it "drives forward off that leg" is read as a JUMP.
3. **CAUSE-FREE** wording for any reaction (`hit`, `ko`): never mention the blow, not even to negate
   it. A NEGATIVE block does NOT work — naming the blow summons the thing that delivers it. And a
   baked impact flash violates contract §7 anyway, because the engine draws its own contact FX.
4. **Every signature-beat effect needs its OWN containment clause.** The inherited suffix bounds only
   the NAMED props, so a newly-added effect is uncovered and will drift out of frame.
5. **TIME BUDGET** for any big motion: state that the action is complete by the halfway point and the
   second half is the settle. Three separate "return to the anchor" sentences did not achieve it on
   eclipse `attack_strike`; the clip simply ran out of time.
6. Effects must be a **SOLID MATERIAL** doing something, never flame/glow/mist/aura.
7. `first frame == last frame == the anchor`, as its own sentence.

## Scope, stated plainly
6 characters x 13 clips = **78 clips minimum**. The free Unlimited path runs **ONE generation at a
time** (see `~/.claude/memory/unlimited-is-serialized.md`) at ~20-30 min each, so 78 clean-first-try
clips is already ~30-40 hours of wall-clock. At the observed 2-4 rolls per clip it is realistically
150-250 renders. **This spans many sessions.** Work ONE CHARACTER AT A TIME through the full kit so
each finished fighter is shippable, rather than leaving six half-built. Order: padded anchor -> idle
(the anchor hub) -> hit/ko/victory -> strikes/throws/blocks -> specials.
