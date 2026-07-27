# SESSION 7 FINDINGS (2026-07-27, Opus 5 orchestrator)

Generation-only session, ZERO credits (browser Higgsfield Unlimited). Nothing wired into the game.
Everything below was MEASURED, not eyeballed — see "the eyeball lesson" at the bottom.

---

## 1. TOOLING — two gate bugs fixed, one new gate built

**`scripts/check-prompt-coherence.mjs` — two real bugs, both silently corrupting the pre-fire check:**
- A `<id>-REROLL.md` kit did not resolve to its base character, so it gated with **no arsenal** and
  printed a **false PASS** (`wields: (arsenal not declared)`). Fixed: strip the `-REROLL` suffix when
  looking up `arsenal.json`. Eclipse's first "PASS" was meaningless until this landed.
- The scanner read the kits' own **self-score tables** and convicted them for documenting that they
  had banned projectile words ("named shapes banned in the NEGATIVE block: beam / laser / orb / ...").
  That produced 8 phantom BLOCKs on LK. Fixed: skip markdown table rows (a prompt never contains one).
- Regression-checked: every pre-existing BLOCK is still BLOCK, every PASS still PASS.

**`scripts/check-containment.mjs` — NEW.** The coherence gate reads PROMPTS; this reads PIXELS. Per
frame it takes the longest CONTIGUOUS run of subject pixels on each border (contiguity separates a
real slice from keying crumbs). Bottom edge never counts — feet are on the floor line. Handles keyed
`.webm` (alpha plane) and raw `.mp4` (chroma plate). Exits non-zero so it can gate a ship step.
**`-c:v libvpx-vp9` MUST precede `-i`** or ffmpeg silently drops alpha and every clip measures clean.

### Containment sweep of all 104 shipped clips — 48 have TOP/LEFT/RIGHT edge contact
Worst offenders (source px):

| clip | contact |
|---|---|
| satoshi-odachi special_3_rising_crescent | **LEFT 504px** |
| ir56-lion-serpent special_3_cleaver_flash | **RIGHT 437px**, LEFT 76px |
| lady-kurotachi throw_b | **LEFT 422px** |
| ir56-lion-serpent special_2_tail_strike | RIGHT 363px |
| satoshi-odachi special_2_quake | TOP 348px, RIGHT 317px |
| thorn-warden block-a | RIGHT 317px, TOP 78px |

CAVEAT: the shipped webms are cropped, so a small contact may be crop rather than generation. The
large ones (300px+) are real. Calibrate like the coherence gate — **flag for review, do not convict**;
a 14px graze is noise, a 400px run is half the frame.

---

## 2. FACING — the trap that nearly shipped, and how to settle it

**Eclipse's three re-roll prompts commanded `FACING SCREEN-RIGHT` on a plate that faces screen-LEFT.**
Her own clipdata already documents this exact trap — *"anchor 5972e73a faces screen-LEFT (the -r label
lie confirmed)"* — after `victory` and `idle` failed with 180-turns TWICE. The registry is
ground-truth: `src/characters/eclipse-ofuda.ts` → `faces: 'left'`. Corrected all three to SCREEN-LEFT
before firing; re-gated PASS. **A prompt that commands the opposite facing to its own anchor reliably
produces the 180-turn.**

**The decisive test (use this, not your eyes):** bbox-normalise the anchor silhouette and the clip
frame to 64x64 binary masks, then compare `IoU(anchor, clip)` vs `IoU(anchor, mirror(clip))`.

### LK's kit is internally inconsistent — OPEN ISSUE, needs Tim's ruling
| clip | IoU as-is | mirrored | verdict |
|---|---|---|---|
| idle | **0.546** | 0.150 | SAME orientation as anchor |
| strike_a | 0.083 | **0.255** | mirrored vs anchor |
| throw_b | 0.085 | **0.246** | mirrored vs anchor |
| victory | 0.203 | **0.745** | mirrored vs anchor |

`idle` matches her anchor AND her registry (`faces:'right'`). **The other 12 clips are mirrored
against both.** Either those 12 need re-rolling or the registry needs flipping — a call about the
shipped kit, not something to fix mid-queue.
**Consequence for the re-rolls:** generated from her plate they come out right-facing (matching idle
and the anchor) and therefore MISMATCH the 12. They must be **hflipped at keying** to sit with the
kit — hflip-at-keying is an established step (eclipse clipdata: *"HFLIP the 5 kept v1 clips at keying"*).

### LK `throw_b` is NOT "a mirrored take" — re-diagnosed
Measured across the timeline: correct at f0–f32, **rotates out of profile f40–f56 (~1s), returns by
f64**. That is the systemic rotation defect, not a plate error. The agent's mid-clip facing lock is
the right fix; the sweep's "mirrored" label was misleading.

---

## 3. CLIPS GENERATED (hollow-pale, from his green plate, prompts as authored)

| clip | verdict | evidence |
|---|---|---|
| `block-b-v2` | **PASS** | scythe whole in every frame (target defect FIXED); anchor IoU 0.991; containment 14px right graze on 3/97 frames; facing locked |
| `special-3-v2` | **PASS w/ caveat** | head never swallowed + top-edge slab GONE (both target defects fixed); containment 0px; anchor IoU 0.9895. CAVEAT: brief asked for a smoke shroud; Seedance rendered an internal ribcage glow — 0.67s (f47–f62), peak 3.06% of subject px. Defect-free but modest for a finisher; candidate for a presence re-roll later. |

Raws at `qa-boss/raw/hollow-pale-{block-b,special-3}-v2.mp4`. Not keyed, not wired.

---

## 4. OPERATIONAL

- **Browser Unlimited is ONE-AT-A-TIME.** Four back-to-back fires registered as one; clips 2–4 were
  silent no-ops. Generation must be serial: fire → wait → verify → fire next. (~15–25 min per clip.)
- **Clipboard paste works on the Lexical prompt field**: click → `ctrl+a` → `Delete` → `ctrl+v`.
  Landed 4,826 chars exactly, no double-insert. Far faster than `computer type` for 5k-char prompts.
  Still verify `el.textContent.length` before firing.
- **MCP `show_generations` is DAYS stale** — it returned July 22 arena backgrounds while a July 27 job
  was processing. It cannot verify a fire. The tab is the only source of truth.
- **The button reads `Generate2418` (credits) pre-hydration and `GenerateUnlimited` once loaded** —
  check AFTER the page settles, and confirm the `Unlimited mode` toggle is on, before every fire.
- **IR-48 has 0 clips on disk** but finished renders exist in the cloud history from July 26 — possibly
  free finished work. The History pane appears scoped to the loaded reference, so they surface when his
  anchor is loaded. Worth harvesting before re-firing his kit.

---

## 5. THE EYEBALL LESSON

In this session, reading frames by eye was **wrong 2 of 2 times** and measurement was **right 4 of 4**:
- Called a left-edge crossing on `block_b` that measured **0px** on the left.
- Called `throw_b` wholly mirrored; it is correct at f0 and rotates mid-clip.
- A "which way do the helmet horns sweep" heuristic looked convincing and **disagreed with the
  anchor-IoU test**.

Contact sheets are for understanding WHAT happened. Verdicts come from numbers.
