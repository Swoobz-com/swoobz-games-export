# SIGNATURE-BEAT PLAN — one distinct effect per character, specials AND normal attacks

Tim's standing rule (2026-07-28/29): *"whenever we generated a attack or special attack we should
also add something more unique for normal attacks"* and *"continue till everyone has something
unique special with effect"*. Global memory: `~/.claude/memory/every-clip-gets-a-signature-beat.md`.

**The point is DIFFERENTIATION, not VFX volume.** Every effect below is derived from that fighter's
OWN declared arsenal (source: `scripts/check-prompt-coherence.mjs`, which reads each prompt file's
`wields:` line) and their own palette. A shared generic flash across the roster defeats the purpose
and is the defect we are fixing.

## The two hard constraints every beat must respect

1. **spanPeak <= ~1.60.** A lunge WIDENS the silhouette, it does not translate it. Anchor bodies run
   ~480px in a 960px frame; at 2.0x they are 966px and physically cannot fit. This killed ir48
   special_1 v5 and v6. Bound the width IN THE PROMPT.
2. **The BOTTOM edge is free.** `check-containment.mjs` treats bottom contact as expected (feet on
   the floor line) and never counts it as a defect. Vertical headroom is only 88px, but a
   ground-level effect costs nothing. **Prefer ground-hugging effects** — dust, scorch, shockwave
   along the floor — over anything that rises or wraps.

## Per character

| boss | arsenal (declared) | SPECIAL signature | NORMAL-ATTACK signature |
|---|---|---|---|
| **satoshi-odachi** | plain steel odachi (greatsword) | **worst in roster** (0.645/20px/0% — static hold + 2-frame blob). Full-body iai draw-cut, deep lunge, blade edge running white-hot, plus a **low dust shockwave racing along the ground** from the plant foot (uses the free bottom edge) | strike: grit/dust scuff kicked off the plant foot; a cold steel glint travelling along the odachi's edge |
| **eclipse-ofuda** | long katana + ofuda paper charms | her charms are the identity: **ofuda peel off the blade and burn tip-to-tsuba**, already proven wording. Fix is COMMITMENT + duty, not a new effect | strike: one loose talisman flutters off the sleeve and burns out; block: paper crumple + spark on contact |
| **hollow-pale** | left arm fused into serrated BONE WING-SCYTHE + clawed right hand | the wing is unique in the roster: **bone-white feather-shed** trailing the scythe arc, pale-gold cinders that die instantly | strike: a few bone flecks shed off the serration; hit: pallid ripple across the wing membrane |
| **ir56-lion-serpent** | heavy cleaver + **serpent tail** | the TAIL is an asset no other boss has and is currently unused — **a low tail-lash sweeping along the ground** (free bottom edge) with green-gold venom sheen | strike: cleaver edge green sheen; block: tail coils and braces |
| **ir37-pink-tessen** | large war-fan (tessen) + short dagger | hot-pink; already the best-scoring specials. Only `special-c` (0.429/56px/15%) needs the commitment pass | strike: pink petal-spray off the fan ribs |
| **sora-yari** | long spear (yari) | **CONTAINMENT WATCH — the yari is long; a level thrust will span the frame.** Angle the thrust DOWNWARD into the ground and put the effect at the impact point: a ground crack + dust ring. Never a level or raised thrust | strike (0.505/38px — flagged): step-through thrust with a shaft-light travelling to the tip |
| **thorn-warden** | thorn club / heavy staff | thorn/bramble motif: **thorns erupt from the ground** along the club's swing path (free bottom edge), then wither | strike: bark chips + a thorn snapping off the club |
| **lady-kurotachi** | black-bladed sword + crimson rings | the **crimson rings** are her unique prop — rings spin out along the blade and contract onto it (attached, not detached) | strike: one ring rings/vibrates on contact |
| **ir48-hex-paper-lord** | crimson hex war-fan + reversed short sword + hat talismans | IN PROGRESS. special_1 hex-charm storm, special_2 talisman brand, special_3 glowing blade | strikes/throws still to do after the specials land |

## Ordering (worst first, by measured body-commitment)

1. satoshi `special` — 0.645 / 20px / 0%
2. eclipse `special-b` — 0.580 / 12px / 28%
3. hollow-pale `special-c` — 0.536 / 18px / 15%
4. ir56 `special` — 0.478 / 18px / 34%
5. eclipse `special-c`, ir37 `special-c`, eclipse `special`, ir56 `special-b`/`special-c`,
   ir37 `special-b`, hollow-pale `special-b`, satoshi `special-c` (duty-only fail)
6. Normal-attack strikes: sora `attack-strike`, sora `attack-strike-b`, satoshi `attack-strike`

`hit` / `block` / `victory` flags are ADVISORY until those states get their own gate profiles — the
CLI currently judges them by an attack's bar and a stagger or a defensive block is legitimately
compact. Do not re-roll those on the current numbers alone.
