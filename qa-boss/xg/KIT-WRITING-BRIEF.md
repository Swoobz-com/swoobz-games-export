# XG KIT-WRITING BRIEF — the shared law for writing an XGundam character's 13-clip kit

You are writing ONE character's clip-kit prompt file. Everything here is a hard constraint learned
from a shipped defect. Read `qa-boss/prompts/oni-tetsubo.md` first — it is the MODEL to copy in
structure, tone and level of specificity.

## 0. THE TWO RULES TIM GAVE FOR THIS BATCH — these override any instinct

**A. "Review their picture so samurais don't shoot bullets."** Every single beat must be derived
from what THIS character visibly carries and IS in its own plate. **Open the plate image and read
it.** Inventory the actual arsenal — blade, polearm, claws, fan, mace, shield, thrusters, wings —
and write only actions that arsenal can perform. A melee samurai never fires a projectile. A mech
that has no visible gun never shoots. If the art shows thrusters, it may boost; if it does not, it
may not. **Never assign an action the picture does not support**, and never reach for a generic
mecha idea (beam spam, missile pods, energy blasts) because the character "looks like a gundam".

**B. "Never let their body be static."** Every clip needs real, committed BODY DISPLACEMENT — the
whole body moves, not just an arm. This is a measured gate (`qa-boss/check-body-commitment.mjs`)
and it exists because Tim looked at a finished kit and said the specials "look super super boring".
Understand why that keeps happening: **every defect gate rewards a still frame.** A motionless clip
is the most containable, most side-profile, most single-blob clip you can generate, so it passes
containment, front-turn and extra-objects perfectly. The pipeline therefore has a hole shaped
exactly like "boring", and the historic failure mode is fixing a reject by DELETING motion until
the beat measures 0% duty. Write weight, travel and a real change of stance into every line.

## 1. THE FILE SHAPE (copy oni-tetsubo.md exactly)

```
# <NAME> — XGundam roster. Full 13-clip kit. Phase 88.
<a short paragraph: which plate, why it is padded, what the raw plate measured>

## ★ <NAME> FRAME BUDGET — measured, applies to EVERY clip
<paste the measured budget you are given, then 3-5 numbered rules DERIVED from it for this body>

Shared prefix:
<ONE long paragraph naming every visual identity detail — armour colours, trim, helmet shape,
 markings, weapon, and the plate: "standing on a solid saturated GREEN chroma screen (bright green
 #00b140, nothing pink or magenta anywhere)". This is prepended to all 13 prompts.>

## idle
## attack_strike A
## attack_strike_b
## attack_throw A
## attack_throw_b
## attack_block A
## attack_block_b
## hit
## ko
## victory
## special_1  (NAME) — <one-line concept>
## special_2  (NAME) — <one-line concept>
## special_3  (NAME) — <one-line concept>
```

The `Shared prefix:` line is REQUIRED — without it the file is treated as a fragment and every
state silently fails to build.

**HEADING LAW.** A live section's heading must NOT contain any of
`RESULT / REJECTED / SUPERSEDED / QUEUED / LESSON / CONDITIONAL / FAILED`, and must carry no QA
numbers. `build-prompt.mjs` treats such a heading as history and REFUSES to build the state. (This
is not hypothetical — it fired on a live heading this session and blocked the build.)

## 2. WHAT EVERY ACTING LINE MUST CONTAIN

Start every one with the state in caps and a parenthetical, then the anchor:
`STRIKE A (rising helm-split): he begins in the EXACT reference stance in strict side profile facing screen-right; ...`

- **Facing:** always **screen-right**, never rotating to camera. But **"strict side profile" is a
  per-plate JUDGEMENT, not a default — do not write it unless the plate really is one.** Ordering
  strict profile on a plate that is actually three-quarter open makes every line fight the anchor:
  it cost nine states on oni-tetsubo, all fixed by replacing `"in strict side profile facing
  screen-right"` with `"his body angled toward screen-right exactly as it is in the reference
  image"`. Read the plate at FULL SIZE and call it. The decisive test is the FEET: if both feet show
  their tops or insteps, it is not a profile. State your verdict in an operator note with evidence.
- **The suffix enforces facing, but the ACTING must not ask for anything that needs a turn — and
  this is stronger than it sounds. See §2b.**

### 2b. ROTATIONAL LICENCE — the beat grants what the bound forbids

**Gated:** `check-prompt-sections.mjs` now reports `ROTATIONAL-LICENCE` on `idle`,
`attack_strike` and `attack_strike_b`.

lich `idle` v1 stated the facing lock TWICE and was ignored — `check-frontturn` sym 0.075 → 0.239,
an 11-frame run where the torso AND the skull opened to camera. The bound was not missing. The BEAT
granted the rotation:

> his shoulders **ROLL** up under the pauldron … his weight **ROLLS** slowly from his rear foot onto
> his leading foot and back

A foot-to-foot weight transfer squares the hips in a three-quarter stance, and a shoulder *roll* is
a rotation by definition. v2 added **no new facing sentence**; it removed both licences and bound
the OBJECT instead. Result: **0/97 frames**, peak sym 0.105.

Write settling and wind-ups as PURELY VERTICAL:

> his shoulders **lift STRAIGHT up** … with neither one coming forward and neither one going back
> his whole weight **sinks a fraction STRAIGHT DOWN through BOTH of his planted feet at once** and
> rises again, and it NEVER transfers from one to the other

and bind the object, phrased so the beat still fits — a falling reap must FOLD, so permit folding
and forbid only turning:

> THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE
> IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME — his near shoulder never comes forward, his far
> shoulder never swings round, and his chest never squares up toward the camera; he may FOLD and
> SINK, but he never TURNS.

This phrase class was templated through **41 sites across 12 kits** before it was caught. It took
three cleanup passes, because these files HARD-WRAP and a phrase grep cannot see across a line
break — the same reason the §5 debris contradiction survived a targeted search five times. **Read
your finished line for MEANING; when you must search, search whitespace-tolerantly.**

### 2c. DE-ROTATING IS NOT DE-RAISING — and never name a start height above the reference

lich `attack_strike` v1 was fired AFTER the §2b sweep, with its shoulder roll already replaced by
`"shoulders LIFTING STRAIGHT up"`. It failed harder than the idle ever did: **sym 0.436, aspect
1.40, 69/97 frames**, and frame f020 shows the scythe **fully overhead**, the body **square to
camera**, and a **heel off the ground** — five bounds broken at once, on a character whose ceiling
is bounded four separate ways in his own suffix.

Two things caused it, and both are general:

1. **Straightening a wind-up is not removing it.** `"shoulders lifting STRAIGHT up"` still grants an
   upward move. For a DOWNWARD beat, the wind-up must be **removed**, not tidied. Say so explicitly
   and in the positive-free form: *"THERE IS NO WIND-UP OF ANY KIND: he does NOT raise it, does NOT
   draw it back, does NOT lift it even slightly, and NO PART of the weapon travels UPWARD at ANY
   moment in the clip."*
2. **Never name a START HEIGHT above where the prop already sits.** The line said the edge *"shears
   down from his own SHOULDER HEIGHT"*, but the reference holds the scythe on a low diagonal — so
   reaching shoulder height REQUIRES a raise, and the model built an overhead one to get there. For
   a downward beat the only safe start is **"from the height it ALREADY HAS"**. A height you name is
   a height the model will travel to, whether or not you meant it as a starting point.

Compare his `idle`, which passed: it has no wind-up at all and every motion is a sink.
- **Anchor return:** every clip except `ko` begins AND ends on the exact reference stance.
- **`ko` is the exception:** it ends PRONE on the ground and does not return. Its acting line must
  not promise to keep hold of the weapon or to end on the anchor.
- **Signature beat:** Tim's standing rule — every clip gets one. A plain effect-free swing is not
  acceptable output. Give each state something only THIS character would do.
- **Distinctness:** A and B takes must be genuinely different attacks (different line of attack,
  different height, different weapon role), not the same swing described twice.

## 3. THE CONTAINMENT LAW — this is where kits die

You are given a measured `LEFT / RIGHT / HEADROOM` budget in pixels. Obey it in the ACTION.

- **Bound the PROP TIP, not the hands.** A height bound on the body does not bound a long weapon:
  the hands obey and the blade tip overruns anyway. This lesson was learned four separate times.
- **A prop lifted overhead needs its own LENGTH in headroom.** If the weapon is long and headroom is
  short, it may never go fully vertical or overhead. Say so as a property of the beat.
- **Prefer DOWNWARD and INWARD motion.** The bottom edge is free — `check-containment.mjs` treats
  feet-on-floor as expected and never counts it. Downward slams are always safer than raises.
- **NARROW THE THING, DO NOT RESTATE THE BOUND.** If a beat is too big, make the ACTION smaller —
  shorter sweep, fewer objects, closer to the body. Do NOT add another "it stays inside the frame"
  sentence. Repeating a bound has never once worked; the model ignores the third restatement exactly
  as it ignored the first. Never state the same bound more than twice in one prompt.

## 4. EFFECTS ARE SOLID MATERIAL — never energy

Effects must be **solid, opaque, individual objects with visible edges**, in the character's own
palette: stone chips, bone shards, torn paper, petals, splintered metal, kicked grit, sparks struck
off steel. **NEVER** a glow, flare, aura, mist, beam, trail, ring of light, or "energy" of any kind.
Two reasons: a glow blooms onto the chroma plate and keys out as an olive halo, and Tim rejects it
on sight. If the character's art has emissive trim, that trim may stay lit — but the EFFECT it
throws is still solid material.

### 4b. A POSITIVE NOUN IN THE BEAT DEFEATS A NEGATIVE IN THE SUFFIX

lich's suffix bans `mist, smoke, haze` by name. His `attack_strike` v1 still rendered a translucent
**dust cloud** — because the acting line called its own debris *"three grains of hard grey
**GRAVE-DUST** grit"*. The beat named DUST, so dust is what it got; the suffix's ban never had a
chance, because the beat is the thing being performed and the suffix is only the thing being
obeyed.

**So the ban list is not protection. Audit your own NOUNS.** Never name the banned class even as a
modifier — not "dust", "smoke", "ash-cloud", "spray", "mist", "vapour", "steam", "sparks", "glow",
"flash". Name the solid object instead and assert its solidity inline:

> break EXACTLY THREE small chips of hard grey floor-**STONE** up off the flagstones … each one
> SOLID, OPAQUE and sharp-edged — never a puff, never a cloud, never dust, never smoke, never haze

This is the same shape as §5: a contradiction between the beat and a global rule always resolves in
the BEAT's favour. Fix the beat.

**AND THE STRONGER FORM, proven by a controlled pair (phase 149).** It is not enough to avoid the
banned noun — you must **positively assert solidity INLINE, at the point of use**. Two lich clips,
same character, same plate, same session, same suffix (which bans mist, smoke and haze by name),
differing in exactly one thing:

| clip | inline solidity clause | result |
|---|---|---|
| `attack_strike` v3 | `each one SOLID, OPAQUE and sharp-edged — never a puff, never a cloud, never dust, never smoke and never haze` | solid chips, background **perfectly clean** |
| `attack_strike_b` | *absent* (count/size/span bounds only) | same solid chips **plus a milky pale haze** across the feet |

Neither line used a banned noun. The suffix ban was identical in both and **did not prevent the
haze**. So the suffix is not protection — it is background the model treats as satisfiable, while
the acting line is the thing being performed. Every debris beat needs its own inline solidity
assertion, next to the count and the size bound:

> knock EXACTLY THREE chips of split grey floor-stone UPWARD beside that foot, each chip no bigger
> than one of his own foot-talons **and each one SOLID, OPAQUE and sharp-edged — never a puff,
> never a cloud, never dust, never smoke and never haze** — rising no higher than his own knee …

The haze also matters beyond taste: a translucent pale cloud over the chroma plate keys badly and
leaves an olive fringe, which is the session-14 bloom-lit-plate defect arriving by another route.

## 5. THE DEBRIS-VANISH LAW — the contradiction that has recurred five times

A global suffix is appended to every prompt ending: *"Anything that sheds, tears loose, breaks off
or is kicked up during the clip has COMPLETELY VANISHED before the final frame ... NONE of it is
left lying on the ground or visible anywhere in the frame at the end."*

So **no acting line may say debris settles, lands, comes to rest, litters, scatters across the
floor, drifts down onto the ground, or is left behind.** Write it as crumbling, burning away, or
falling out of sight instead. This contradiction has been introduced and fixed FIVE times, once
wrapped across a line break so a targeted search missed it. **Read your own finished line for
MEANING, not for a phrase list.**

Equally: do not write an effect that both "runs along the ground" and "vanishes before reaching the
floor" — that is the same contradiction inside one sentence.

### 5b. THE ASSEMBLED `ko` IS REWRITTEN BY THE TOOL — never copy its wording back into the kit

`build-prompt.mjs` does not emit your Shared suffix verbatim for `ko`. It runs `koSuffix()`, which
**silently rewrites it in FOUR places** — the weapon-lock clause is deleted, `FEET STAY FLAT ON THE
GROUND` becomes `FEET NEVER LEAVE THE GROUND`, the `begins and ends on the EXACT same reference
stance` sentence is stripped, and the debris tail

> ; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

is replaced by

> ; at the end there is no shed, torn, broken or kicked-up material anywhere in the shot.

All four rewrites are CORRECT for a ko and WRONG for every other state — a collapsed fighter holds
nothing and does not return to the anchor.

**So: read the assembled `ko` to check it, never to source text from.** If you copy the rewritten
tail back into `Shared suffix`, every standing state silently loses `exactly as the first frame
does` — the anchor re-assertion — and no gate sees it, because the prompt still builds clean and
the clause count is still 1.

This is not hypothetical: it landed in **five kits at once** (lich-scythe, hydra-flail,
ir12-rose-lance, raiju-naginata, pale-choir) and was caught only by a pre-fire read.

**Check per kit, not per repo:** build BOTH `idle` and `ko` and confirm they differ at the tail —
`idle` must end `...exactly as the first frame does.` and `ko` must end `...anywhere in the shot.`
If both end the same way, the suffix is contaminated.

## 6. THE TIME BUDGET — a 4-second clip, and BOTH ways to get it wrong

Clips are 4s / 97 frames at 24fps. Budget the beat explicitly in the prose.

- **Too big** and the action runs out of clip and never returns to the anchor.
- **Too small and the model INVENTS.** oni `victory` v1 asked for three modest beats, did not fill
  four seconds, and the model filled the gap with a full theatrical turn to camera and a vertical
  overhead club raise — breaking three locks that were already in its own prompt verbatim.

The fix for both is the same: **say where the time goes.** e.g. *"the strike lands by the halfway
point; the whole second half is his recovery back into the exact reference stance"*, or for a beat
with a hold, *"first quarter ... he HOLDS that pose for the middle half ... final quarter returns"*.

## 7. VERIFICATION — you are not done until these pass

```
node qa-boss/build-prompt.mjs qa-boss/prompts/<slug>.md <state>     # for ALL 13 states
node qa-boss/check-prompt-sections.mjs                              # must print problems=0
```

Then **read at least three assembled prompts end to end** (one attack, one special, the ko) and
check them against §2-§6 yourself. Four of five recent generation failures were prompt-ASSEMBLY
defects that NO GATE SHOWS — they were caught only by a human reading the assembled output. Your
own file is not exempt from that.

Report: the slug, the 13 build results, the gate line, the character's actual arsenal as you read it
off the plate, and any judgement call you made that the next person should know about.
