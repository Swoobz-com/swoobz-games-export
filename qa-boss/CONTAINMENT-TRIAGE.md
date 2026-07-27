# CONTAINMENT GATE — CALIBRATION & TRIAGE

Read-only analysis pass. Scope: `public/assets/characters/**/*.webm` (the SHIPPED boss clips).
No script, manifest or asset was modified. Nothing was staged or committed.

Every claim below is tagged **[M]** measured, **[V]** viewed (I looked at the pixels),
**[D]** derived from code/geometry, or **[I]** inferred.

---

## ⚠ REGENERATED AT HEAD `d9d3c62` (session 11, 2026-07-27)

**The per-clip border NUMBERS below are superseded. The VIEWED analysis (§4 boundary calls, every
`[V]` note) is not, and is why this file is kept rather than replaced.**

Fresh measurement lives in **`qa-boss/containment-sweep.md`** (+ `.json`), produced by the rebuilt
profiler `qa-boss/profile-containment.mjs`. Read the sweep for any border value; read this file for
what the pixels LOOK like.

**Why the old numbers are stale:** they were measured before the 17 phase-27/28 clips were
horizontally flipped, so those clips report **LEFT/RIGHT swapped**. The flip preserved magnitude and
changed side — exactly as Tim's ordering rule predicted.

**Toolchain validated against a control before any of this was believed** (session-10 lesson 1):
`satoshi-odachi/special-c` LEFT reproduced **504 / 498 / 486** at alpha 40/128/200 — to the pixel,
matching this file's §6. Cross-checked further: of the 32 rows in §6, **30 reproduce exactly**. The
2 that moved are not disagreements, they are fixes landed since:

| clip | §6 A200 | now | fixed by |
|---|---|---|---|
| `lady-kurotachi/attack-throw-b` | 420 | **0** | `95ed978` phase 30 (throw_b v3 harvest) |
| `hollow-pale/special-c` | 65 | **0** | `07bcbfe` phase 26 (drop-ins) |

No clip *gained* a contact. Both decode 97 frames with a live alpha plane, so they are true zeros,
not the dropped-alpha false-clean trap.

**Result: BLOCK 18 → 16.** The delta is exactly those two re-rolls; the calibration and the ranking
are unchanged and are CONFIRMED at HEAD. The handoff's priority claim reproduces exactly:
thorn-warden (n3) **7 of 10 flagged, 3 BLOCK**, earliest defective node; satoshi (n5) and ir56 (n8)
**5 BLOCK each**.

**Current bands (97 shipped clips): BLOCK 16 · REVIEW 14 · CLEAR 67.** `hollow-pale` is the only
fully clean kit (13/13 CLEAR).

**One calibration note.** `dwell` is defined at line 193 as frames with an `A200` run **≥ 24 px**.
The handoff's calibration line quotes `dwell >= 3` without stating that floor; a sweep run at a
90 px floor produces systematically lower dwell and silently drops BLOCK clips (it yields 14, not
16). If you re-run the profiler, pass `--dwell-min 24`.

---

## 0. HEADLINE

1. **[M] The handoff's denominator is wrong.** It reports "48 of 104". The shipped character set is
   **97 clips**, of which **49** flag on `TOP/LEFT/RIGHT` at the gate's default `--min 6`.
   104 is the file count of **`qa-boss/webm/`** — the *staging* directory, not what ships.
   The handoff swept staging and reported it as the shipped sweep.
2. **[D] Nothing is masked in game.** The premise "some border contact is expected and invisible"
   is **false for TOP/LEFT/RIGHT**. Derived from the render geometry (§2): every clip edge lands
   well inside the visible stage. A border contact is a hard cut in open arena space.
3. **[M] My own first hypothesis was wrong and I am reporting it.** I expected the long runs to be
   soft smoke/motion-blur that the gate's low `ALPHA_MIN = 40` was over-counting. Measured across
   all 97 clips at alpha 40 / 128 / 200, the three numbers are **near-identical** (satoshi
   `special_3`: 504 / 498 / 486). The contacts are **solid matter**, not haze. Alpha thresholding is
   *not* the discriminator. Run length is.
4. **[V] Contact is nonetheless not automatically a defect.** 16 of the 49 are invisible weapon-tips
   exiting a frame edge. The boundary is real and I located it (§4).
5. **[M] `onryo-katana` is dead but not inert** — it is absent from `arsenal.json`, and it is
   currently emitting **1 of the coherence gate's 14 BLOCK findings** (§7).

Proposed bands: **BLOCK 18 · REVIEW 14 · COSMETIC 16 · CLEAR 1** (of the 49 flagged).

---

## 1. REPRODUCED SWEEP

Command (per character dir; the script is non-recursive):

```
node scripts/check-containment.mjs public/assets/characters/<char>/ --min 1
```

`-c:v libvpx-vp9` is already correctly placed before `-i` inside the script (line 81/85), so the
alpha plane survives. I verified this independently: my own decode in `profile.mjs` uses the same
flag order and returns matching numbers; dropping the flag returns all-zero contacts.

**[M] Per-character totals**

| character | node | clips | flagged (min 6) |
|---|---|---|---|
| sora-yari | 1 | 10 | 9 |
| thorn-warden | 3 | 10 | 7 |
| hollow-pale | 4 | 13 | 1 |
| satoshi-odachi | 5 | 13 | 10 |
| eclipse-ofuda | 6 | 13 | 6 |
| ir37-pink-tessen | 7 | 13 | 3 |
| ir56-lion-serpent | 8 | 12 | 9 |
| lady-kurotachi | 9 | 13 | 4 |
| **total** | | **97** | **49** |

(`satoshi-odachi/old/` contains superseded takes; it is a subdirectory, not shipped, and is excluded.
A naive `find -name '*.webm'` returns 98 because it descends into it.)

**[M] The three worst named in the handoff reproduce, within rounding:**

| clip | handoff | mine |
|---|---|---|
| satoshi `special_3` LEFT | 504px | **504px** @f52 |
| ir56 `special_3` RIGHT | 437px | **438px** @f59 |
| LK `throw_b` LEFT | 422px | **422px** @f45 |

The full 49-row table with the added measurements is §6.

---

## 2. [D] GEOMETRY — WHY NO CONTACT IS HIDDEN

From `src/ui/FightExperience.tsx` + `src/ui/fight.css`:

- `.fr-stage` — `aspect-ratio: 1.8333`, `overflow: hidden`.
- `.fr-fighter` — `left: cx%`, `top: feetY%`, `height: h%`, `aspect-ratio: 1/1`,
  `transform: translate(-50%, -100%) …` (`transformFor`, line 714–716).
- Fight config (line 153–154): `fighterP1 { cx: 24, feetY: 96, h: 58 }`, `fighterP2 { cx: 76, … }`.
- `.fr-state-video` — `height: cal.h%`, `width: auto`, `left: cal.left%`, `translateX(-50%)`.

Working it through: the fighter box is `58%` of stage height and square, so it is
`58 / 183.33 = 31.6%` of stage **width**. At `cal.h ≈ 100` and a typical clip aspect ≈ `960/916`,
the video is ≈ `33%` of stage width, centred on the box. P1 therefore spans roughly **x 7%…41%**
of the stage; P2 **x 59%…93%**. Vertically the video top sits at ≈ `y 38%` (and at the largest
shipped `cal.h` of 144.58, still ≈ `y 12%`).

**All four clip edges are interior to the visible stage.** `overflow: hidden` on `.fr-stage` never
touches them. There is no crop that rescues a TOP/LEFT/RIGHT contact.

Two aggravating factors, also [D]:
- `.fr-stage.fr-ko-zoom-active { transform: scale(1.15) }` — the stage pushes in 15% on KO,
  magnifying any cut in the `ko` / `special` / `victory` clips at exactly that moment.
- Per `FightExperience.tsx:1789`, **`special` is not rare**: it swaps in for the normal attack clip
  on *every round-ending win* by a fighter that ships one, take picked uniformly from three.
  The brief's assumption that `special` fires rarely does not hold — see §5.

---

## 3. [M] THE MEASUREMENT I ADDED: OPACITY + DWELL

The shipped gate reports one number: longest contiguous run at `alpha > 40`. I re-scanned all 97
clips recording three run lengths per edge (`alpha > 40 / 128 / 200`) plus a **dwell** count —
how many frames of the clip carry a `alpha>200` run of ≥24 source px on any of TOP/LEFT/RIGHT.

**Result — the opacity axis is dead.** Across all 49 flagged clips, `A40` and `A200` differ by
under 5%. Representative:

| clip | A40 | A128 | A200 |
|---|---|---|---|
| satoshi/special-c | 504 | 498 | 486 |
| ir56/special-c | 438 | 436 | 434 |
| LK/attack-throw-b | 422 | 421 | 420 |
| thorn/attack-block | 317 | 315 | 315 |
| hollow-pale/special-c | 68 | 68 | 65 |
| eclipse/attack-block | 12 | 10 | 10 |

So "soft smoke grazing the edge" is essentially not a category in this asset set — even the swing
trails (satoshi's white arcs) are near-opaque. I use **A200** below purely because it is the
conservative reading of the same quantity.

**The dwell axis is alive and useful.** It ranges 0/97 to 58/97 and separates a single-frame blip
(eclipse `throw_b`, 1 frame = 42ms) from a sustained cut (ir56 `attack-block-b`, 58/97 frames ≈ 60%
of the clip). Dwell enters the BLOCK rule.

**[V] What actually distinguishes visible from invisible** — from the frames in §4: it is whether
the cut produces a **flat face broadside to the form**. A thin blade crossing an edge diagonally
yields a *short* run and no flat face; a club head, a war fan, a tail loop or a swing trail meeting
the edge broadside yields a *long* run and a flat face. Run length is a good proxy precisely
because it measures the width of the flat face.

---

## 4. CALIBRATION — THE FRAMES I VIEWED

19 frames extracted with a purpose-built viewer (VP9-alpha decode, composited **over black on the
left and over white on the right**, with a red rule painted just inside each border where alpha is
low so contact is unambiguous). Frame index = the argmax frame the gate itself reports.

Reproduce any of these with:
`ffmpeg -c:v libvpx-vp9 -i <clip> -vf "select=eq(n\,<idx>)" -frames:v 1 -pix_fmt rgba out.png`

### Clearly FINE (viewed)

| clip | f | A40 / A200 | what I saw |
|---|---|---|---|
| ir56/attack-block | 47 | 6 / 0 | R. Nothing perceptible. Tail tip approaches the edge and stops. |
| eclipse/attack-block | 66 | 12 / 10 | R. The thin katana runs off the right edge. No flat face — reads as "the blade continues out of frame". |
| LK/attack-block | 82 | 20 / 16 | L. Blade tip clipped. Visible only on a deliberate still hunt; the blade is thin and diagonal. |
| **satoshi/attack-block** | **14** | **32 / 28** | **T. The odachi exits the top edge. Thin, diagonal, no flat face. Clearly fine — this is my just-below anchor for the 32 boundary.** |

### The boundary zone (viewed) — genuinely ambiguous, which is *why* it is a REVIEW band

| clip | f | A40 / A200 | what I saw |
|---|---|---|---|
| **satoshi/hit** | **25** | **44 / 40** | **L. A second, phantom odachi blade at upper-left is sliced by the edge — a small but real flat cut. Just-above anchor for 32.** |
| sora-yari/attack-block | 14 | 49 / 47 | T. Spear shaft + motion-echo exits the top. Reads acceptably as "spear goes off-frame". |
| eclipse/attack-throw-b | 18 | 54 / 50 | R. Her white ponytail is chopped square by the right edge. Reads *wrong* — a blunt end where a taper belongs. Very visible over black. But dwell is 1/97 (42ms). |
| ir56/attack-strike-b | 59 | 54 / 50 | L. A flat spot bitten out of the tail loop's leftmost curve. Mild. |
| thorn/attack-strike | 65 | 61 / 59 | T. The thorn club raised overhead has its head cut flat off. Visible. |
| **hollow-pale/special-c** | **43** | **68 / 65** | **T. The antler crown is flat-topped by the edge — the spikes are truncated. Noticeable on inspection, not screaming. Just-below anchor for 90.** |
| thorn/attack-block-b | 60 | 72 / 68 | T. Vertical club truncated at the top. Moderate — partly reads as "continues out of frame". |

Note the honest result: `sora/attack-block` (47) reads fine and `eclipse/attack-throw-b` (50) reads
wrong. At ~50px the number alone cannot decide. That is exactly the argument for a review band
rather than a second conviction threshold.

### Clearly NOT fine (viewed)

| clip | f | A40 / A200 | what I saw |
|---|---|---|---|
| **thorn/attack-strike-b** | **67** | **102 / 98** | **R. The entire business end of the thorn club is sliced off flat by the right edge; the weapon just stops at a wall. dwell 44/97 — on screen nearly half the clip. Just-above anchor for 90.** |
| ir56/attack-block-b | 41 | 110 / 106 | L. The serpent tail loop chopped flat. dwell 58/97 — the single longest-dwelling defect in the set. |
| ir37/attack-throw-b | 44 | 158 / 157 | R. The pink war fan — her signature weapon, high contrast — sliced vertically. Obvious. |
| satoshi/attack-strike | 25 | 263 / 259 | T. A broad opaque white swing trail cut dead flat along the top for 263px. Glaring over black and over arena art. |
| thorn/attack-block | 48 | 317 / 315 | R. Club head *and* a bright pale-green glow burst chopped by the right edge. |
| satoshi/special-b | 54 | 348 / 340 | T. Odachi blade + a large solid-white trail truncated flat at the top. dwell 41/97. |
| LK/attack-throw-b | 45 | 422 / 420 | L. Her katana runs the full left side and is cut. **Nearly invisible over black — obvious over white.** The arena is not black; this ships as a visible cut. |
| ir56/special-c | 59 | 438 / 434 | R. Sword blade *and* a bright cyan/white starburst sliced clean by the right edge. |
| satoshi/special-c | 52 | 504 / 486 | L. A large grey swing arc cut at the left; the arms/head also reach the top edge. The least offensive of the >400 group because the arc is low-contrast grey — but still a hard cut. |

The `LK/attack-throw-b` case is the methodological lesson: over black it looks clean, over white it
is unmistakable. Any future eyeball pass must composite over both.

---

## 5. PROPOSED THRESHOLDS

Metric: **`A200`** = longest contiguous run of `alpha > 200` on TOP, LEFT or RIGHT, in source px,
max over the clip. **`dwell`** = frames carrying an `A200` run ≥ 24px. Bottom edge never counts.

```
CLEAR     A200  <  32
REVIEW    32 <= A200 < 90
BLOCK     A200 >= 200
       OR (A200 >= 90 AND dwell >= 3)
```

### Boundary 1 — CLEAR | REVIEW at **A200 = 32**

- **Just below — clearly fine:** `satoshi-odachi/attack-block` f14, A200 **28**. Viewed: the odachi
  exits the top edge diagonally. No flat face, nothing reads as cut.
- **Just above — not fine:** `satoshi-odachi/hit` f25, A200 **40**. Viewed: the phantom blade is
  sliced at the left with a visible flat end. Small, but it is a cut — and `hit` fires constantly.

I did **not** put this boundary lower. Everything I viewed at A200 ≤ 28 (6, 10, 16, 28) was a thin
blade or tail tip exiting a frame edge and was invisible. Setting it at 6 (today's `--min`) is what
makes the gate unusable.

### Boundary 2 — REVIEW | BLOCK at **A200 = 90** (with dwell ≥ 3)

- **Just below — real but not ship-blocking:** `hollow-pale/special-c` f43, A200 **65**, dwell 8.
  Viewed: antler crown flat-topped. You see it if you look for it. Also
  `thorn-warden/attack-block-b` f60, A200 **68**, dwell 19 — vertical club truncated, moderate.
- **Just above — ship-blocking:** `thorn-warden/attack-strike-b` f67, A200 **98**, dwell 44.
  Viewed: the whole club head is gone behind a flat vertical wall, for ~45% of the clip's frames.

The `dwell >= 3` conjunct exists because a 1–2 frame contact is ≤83ms and does not register at
review speed (`eclipse/attack-throw-b`, A200 50, dwell 1 — viewed, wrong-looking, but a blink).

### The magnitude override at **A200 = 200**

Added *after* viewing, because the dwell conjunct produced one wrong answer:
`satoshi-odachi/attack-strike` is A200 **259** but dwell only **2**, so the dwell rule demoted it to
REVIEW. Viewed (f25): a 263px opaque white bar cut flat across the top of a state that fires every
exchange. A cut that wide is a hard cut however brief. `A200 >= 200` therefore blocks regardless of
dwell. It is the only clip the override moves.

### Band populations under this proposal (of the 49 flagged)

| band | count | share |
|---|---|---|
| BLOCK | **18** | 37% |
| REVIEW | **14** | 29% |
| COSMETIC (`6 ≤ A200 < 32`) | **16** | 33% |
| CLEAR (`A200 < 6`) | **1** | 2% |

The single CLEAR is `ir56/attack-block`: A40 6 but A200 **0** — pure feather, no solid matter at
the edge at all. It is a false positive of the shipped gate's alpha-40 threshold.

**Suggested gate wiring** (not implemented — operator's call): keep `A200 >= 32` as the print
threshold, exit 1 only on the BLOCK predicate. That turns 49 undifferentiated flags into 18
convictions and 14 review items.

---

## 6. RANKED TRIAGE

Impact score = `A200^0.6 × fire-rate × (1 + earliness/12) × (0.6 + dwell/frames)`, ranked within
band. Fire-rate weights [I, grounded in [D] from `FightExperience.tsx:1775-1800`]:
`strike/block/throw/hit` = 5 (RPS moves + the loser's reaction, several per round);
`special`/`victory` = 2 (one per *round-ending win* — **not** rare, see §2);
`ko` = 1 (once per fight). Earliness: node 1 weighs most, node 9 least.

### SHIP-BLOCKING — 18

| # | node | clip | A40 | A200 | T/L/R (A200) | dwell |
|---|---|---|---|---|---|---|
| 1 | 9 | lady-kurotachi/attack-throw-b | 422 | 420 | 0/420/0 | 23/97 |
| 2 | 3 | thorn-warden/attack-block | 317 | 315 | 76/0/315 | 4/97 |
| 3 | 5 | satoshi-odachi/attack-strike-b | 280 | 276 | 276/34/0 | 10/97 |
| 4 | 3 | thorn-warden/attack-strike-b | 102 | 98 | 56/94/98 | 44/97 |
| 5 | 5 | satoshi-odachi/attack-strike | 263 | 259 | 259/24/0 | 2/97 |
| 6 | 8 | ir56-lion-serpent/attack-block-b | 110 | 106 | 0/106/0 | 58/97 |
| 7 | 9 | lady-kurotachi/attack-strike | 255 | 251 | 251/17/0 | 8/97 |
| 8 | 6 | eclipse-ofuda/attack-strike | 201 | 197 | 176/197/0 | 4/97 |
| 9 | 3 | thorn-warden/attack-throw | 150 | 142 | 58/142/46 | 6/97 |
| 10 | 5 | satoshi-odachi/special-b | 348 | 340 | 340/22/314 | 41/97 |
| 11 | 7 | ir37-pink-tessen/attack-strike | 120 | 116 | 0/6/116 | 26/97 |
| 12 | 7 | ir37-pink-tessen/attack-throw-b | 158 | 157 | 0/0/157 | 12/97 |
| 13 | 8 | ir56-lion-serpent/attack-throw | 142 | 138 | 0/0/138 | 22/97 |
| 14 | 5 | satoshi-odachi/special-c | 504 | 486 | 0/486/0 | 10/97 |
| 15 | 8 | ir56-lion-serpent/special-c | 438 | 434 | 0/72/434 | 12/97 |
| 16 | 8 | ir56-lion-serpent/special-b | 364 | 362 | 0/16/362 | 10/97 |
| 17 | 5 | satoshi-odachi/victory | 198 | 192 | 192/0/188 | 13/97 |
| 18 | 8 | ir56-lion-serpent/ko | 199 | 197 | 0/197/0 | 38/97 |

Items 14–18 carry the extra `fr-ko-zoom` 1.15× magnification [D] — they play on the KO beat when
the camera pushes in.

### REVIEW — 14 (a human decides; the number cannot)

| # | node | clip | A40 | A200 | T/L/R | dwell |
|---|---|---|---|---|---|---|
| 19 | 3 | thorn-warden/attack-block-b | 72 | 68 | 68/62/42 | 19/97 |
| 20 | 3 | thorn-warden/attack-strike | 61 | 59 | 59/0/0 | 5/97 |
| 21 | 1 | sora-yari/attack-block | 49 | 47 | 47/20/0 | 6/97 |
| 22 | 3 | thorn-warden/attack-throw-b | 50 | 48 | 0/0/48 | 2/97 |
| 23 | 5 | satoshi-odachi/hit | 44 | 40 | 0/40/34 | 16/97 |
| 24 | 1 | sora-yari/hit | 42 | 38 | 0/38/22 | 4/97 |
| 25 | 1 | sora-yari/attack-throw-b | 42 | 38 | 0/12/38 | 1/97 |
| 26 | 1 | sora-yari/attack-throw | 40 | 36 | 0/36/20 | 4/97 |
| 27 | 7 | ir37-pink-tessen/attack-block | 62 | 59 | 59/0/0 | 2/97 |
| 28 | 3 | thorn-warden/hit | 44 | 42 | 10/42/0 | 1/97 |
| 29 | 6 | eclipse-ofuda/attack-throw-b | 54 | 50 | 0/6/50 | 1/97 |
| 30 | 8 | ir56-lion-serpent/attack-strike-b | 54 | 50 | 0/50/0 | 7/97 |
| 31 | 5 | satoshi-odachi/attack-throw | 38 | 34 | 0/16/34 | 1/97 |
| 32 | 4 | hollow-pale/special-c | 68 | 65 | 65/0/0 | 8/97 |

Of these, **#23 `satoshi/hit` (dwell 16/97)** and **#19 `thorn/attack-block-b` (dwell 19/97)** are
the two I would look at first — both sustained, both on constantly-firing states.

### COSMETIC / EXPECTED-AND-CLEAR — 16 COSMETIC + 1 CLEAR

`satoshi/attack-throw-b` (30) · `satoshi/attack-block` (28) · `satoshi/attack-block-b` (28) ·
`sora-yari/attack-strike` (21) · `ir56/hit` (30) · `sora-yari/attack-strike-b` (14) ·
`sora-yari/attack-block-b` (12) · `eclipse/attack-strike-b` (15) · `eclipse/attack-throw` (16) ·
`lady-kurotachi/attack-block` (16) · `eclipse/attack-block` (10) · `sora-yari/victory` (25) ·
`ir56/victory` (31) · `lady-kurotachi/special-b` (13) · `sora-yari/ko` (21) · `eclipse/ko` (19) ·
`ir56/attack-block` (0 — pure feather, gate false positive).

*(A200 in parentheses.)* Four of these were viewed directly (6, 10, 16, 28) and all four were
invisible. I did not view the other thirteen; they are classified by measurement alone, which for
this band I consider adequate — no clip in the set with A200 < 32 showed a flat face when viewed.

### Per-boss rollup

| node | boss | BLOCK | REVIEW | COSMETIC |
|---|---|---|---|---|
| 1 | sora-yari | 0 | 4 | 5 |
| 3 | thorn-warden | 3 | 4 | 0 |
| 4 | hollow-pale | 0 | 1 | 0 |
| 5 | satoshi-odachi | 5 | 2 | 3 |
| 6 | eclipse-ofuda | 1 | 1 | 4 |
| 7 | ir37-pink-tessen | 2 | 1 | 0 |
| 8 | ir56-lion-serpent | 5 | 1 | 3 |
| 9 | lady-kurotachi | 2 | 0 | 2 |

**satoshi-odachi (node 5) and ir56-lion-serpent (node 8) are the two characters needing a kit-level
re-roll** — 5 BLOCK clips each, 10 of 25 shipped clips between them. **thorn-warden (node 3)** is
the highest *priority* despite fewer blocks: 7 of its 10 clips are flagged, 3 block, and it is the
earliest node with defects, so it is the first thing a new player meets.
**hollow-pale (node 4)** is the cleanest kit in the roster — 1 of 13 flagged, and that one is
REVIEW-band. The phase-25 re-roll work held up.

---

## 7. `onryo-katana` — FINDING

**[M] Confirmed: `onryo-katana` has NO entry in `qa-boss/arsenal.json`.**
`Object.keys(arsenal.characters)` returns exactly ten ids:
`sora-yari, kitsune-tanto, thorn-warden, hollow-pale, satoshi-odachi, eclipse-ofuda,
ir37-pink-tessen, ir56-lion-serpent, lady-kurotachi, ir48-hex-paper-lord`.
`hollow-pale` is present; `onryo-katana` is not.

**[M] It is the dead, superseded node-4 identity.** Evidence:

- `src/engine/fightCampaign.ts:94` — node 4 SNOWFANG PASS is
  `fighterId: 'hollow-pale', enemy: { id: 'hollow-pale', name: 'HOLLOW PALE' }`.
  No campaign node references `onryo-katana`.
- `src/characters/` contains no `onryo-katana.ts`. `src/characters/hollow-pale.ts:5-6` states it
  outright: *"Replaces the superseded ONRYO KATANA as node 4's identity (phase 24f)."*
- `public/assets/characters/onryo-katana/` does not exist — there is no clip kit.
- Grep over `src/**` for `onryo` returns **only** the two comment lines in `hollow-pale.ts`.
  Zero live code references.

**[M] One live reference survives outside `src/`:**

- `scripts/prep-boss-anchors.mjs:39` — `{ dir: 'map 4', base: 'Onryo Katana.png', id: 'onryo-katana' }`
  still sits in the `BOSSES` array. Running that script regenerates the dead anchor. Harmless
  (it only writes to `qa-boss/anchors/`), but it is a stale row and node 4's real character
  (`hollow-pale`) is **not** in that array at all — so the anchor-prep script is out of sync with
  the shipped roster in both directions.

**[M] Residual assets** (none referenced by `src/`):
`public/assets/enemies/onryo-katana.webp`, `…-pfp.webp` and their `dist/` copies;
`qa-boss/anchors/onryo-katana-anchor{,-green}.png`; `qa-boss/prompts/onryo-katana.md`;
`pack-machine/assets/roster/onryo-katana.webp`; `qa-phase20/` QA stills;
`input/MK FINAL/legendary/Onryo Katana*.png`.

### [M] Correction to the handoff: it does not gate "unchecked"

The handoff says the missing arsenal entry means it "gates UNCHECKED". Measured by running the gate:

```
[BLOCK] onryo-katana  (10 states)  wields: (arsenal not declared)
    BLOCK  idle  projectile-wording: "hovering"
           ...along the katana, only very subtle weight shifts. Feet hovering just above the ground...
```

`check-prompt-coherence.mjs:129-131` enumerates **every `.md` in `qa-boss/prompts/`**, not the
roster. So `onryo-katana.md` *is* scanned. What the missing arsenal entry degrades is only the
per-character layer (`def.wields` and `def.banned` are empty); the `universalBanned` rules still
apply and still fire. Net effect: the dead identity **contributes 1 of the gate's 14 BLOCK
findings** and keeps `check-prompt-coherence.mjs` at exit code 1 for a character that cannot ship.

**Recommendation (operator's call — I deleted nothing):** removing or `.md.disabled`-renaming
`qa-boss/prompts/onryo-katana.md` drops the gate to 13 BLOCK findings, all against live characters.
Adding an arsenal entry instead would be worse — it would legitimise a dead id. The stale
`scripts/prep-boss-anchors.mjs:39` row and the missing `hollow-pale` row there are a separate,
independent inconsistency worth fixing in the same pass.

---

## 8. LIMITS OF THIS PASS

- I viewed **19** of the 49 flagged clips at their argmax frame — a sample chosen to span the range
  and to bracket both proposed boundaries, not an exhaustive review. 13 COSMETIC-band clips were
  classified on measurement alone.
- I judged each contact from a **single still** (the gate's argmax frame) composited over black and
  white. I did **not** watch the clips play, and I did **not** render them over the real arena art
  in the running build. "Visible at review speed" is therefore partly [I]; `dwell` is my
  measured proxy for it.
- The impact ranking's fire-rate weights are [I]. The claim that `special` fires on every
  round-ending win is [D] from `FightExperience.tsx:1789`; the numeric weight of 2 is a judgement.
- I did not sweep the player fighters (`public/assets/fighter-{1,2}-*.webm`, 24 clips) or the
  staging dir `qa-boss/webm/` (104 clips). The staging sweep is what the handoff's numbers describe.
