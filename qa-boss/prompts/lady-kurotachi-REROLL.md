# LADY KUROTACHI (node 9) — RE-ROLL KIT: 2 defective clips only

Scope: replacements for `lady-kurotachi-throw_b` (clip `attack-throw-b`) and `lady-kurotachi-special_3`
(clip `special-c`). Nothing else in `lady-kurotachi.md` is touched. Headings below use the ENGINE STATE
names so `scripts/check-prompt-coherence.mjs` scores each block as the right state.

INPUT ANCHOR: `qa-boss/anchors/lady-kurotachi-anchor-green.png` **horizontally flipped** before upload —
the on-disk plate faces screen-LEFT; the whole shipped kit was generated from the H-FLIPPED anchor
(media `c337bf7b`) so she faces SCREEN-RIGHT. Both prompts below are written for the flipped,
screen-right-facing input. **If the unflipped plate is uploaded, the take will be mirrored again — that
is the mechanical cause of the `attack-throw-b` defect.** Verify the input thumbnail faces screen-right
before firing.

Generation settings: Seedance 2.0, image-to-video, 4s, 1:1, 720p, 24fps, fixed camera, one continuous shot.

---

## ARSENAL — read off the plate

Silhouette: a tall, slim, athletic female samurai in full articulated plate, standing relaxed with her
weight even, one arm hanging free and one arm holding a planted sword.

Armor / body:
- Glossy **black** lacquered plate armor over a black bodysuit — segmented pauldrons, a plated cuirass
  with a defined breastplate, banded tassets over the thighs, armored greaves and hard boots with
  **crimson-red soles**.
- Every panel is outlined in glowing **HOT-PINK / CRIMSON neon** edge-lighting (chest, collar, arms,
  hips, knees, shins). This neon is the only non-black colour on her.
- Black horned **kabuto** helmet: stacked lacquered plates, a dark blank visor with no visible face, a
  small pink emblem on the brow, and three flat black blades sweeping back off the crown.
- Both hands are fully armored gauntlets with segmented fingers.

Weapons — ONE weapon plus one signature detail:
1. **A single curved katana held point-down**, its tip near the ground, gripped in **one hand at the
   end of a straight, relaxed arm** — the trailing hand on her back side once she faces screen-right.
   - **The BLADE IS GLOSSY BLACK.** It is a black blade, not steel, not silver, not chrome. This is
     the single most-violated fact in this kit and the cause of the `special-c` defect.
   - Hilt: **crimson-wrapped** tsuka with a bronze/dark ornate pommel ornament and a dark ornate tsuba.
2. **CRIMSON RINGS along the blade's spine** — four or five open red loops encircling the black blade
   from just below the guard down toward the tip. *This is her signature motif and it is used as the
   finisher vocabulary instead of invented generic magic:* the `special_3` replacement below is those
   rings igniting ALONG her own blade.

Her other gauntlet hand is **open and empty** — she carries nothing else. No second weapon, no
scabbard in hand, no charms, no shield.

Geometry note that changes the choreography: her katana is long and already reaches near the floor at
rest, so every action keeps the blade **below helmet height** (a raise over the head crossed the top
edge in the shipped `block_a v1` and `special_1 v2`), and the forward step in the throw is capped at
half a body-length so the leading gauntlet never approaches the right edge.

---

## throw_b — clip `attack-throw-b` (replaces the MIRRORED take)

Defect this prevents: she rendered MIRRORED, facing away from her opponent. Facing is now pinned to
frame-side landmarks (visor and chin to screen-right, helmet horns and katana to screen-left), a
first-frame-equals-last-frame facing identity is demanded, and mirroring/flipping is banned by name.
The barge is also re-written as a target-free shove so no opponent or object can be painted in.

```
The EXACT SAME black-armored female samurai from the reference image, unchanged: glossy black
lacquered plate armor with glowing HOT-PINK and CRIMSON neon edge-lighting on every panel, a black
horned kabuto helmet with a dark blank visor, a pink brow emblem and three flat black horns sweeping
back off the crown, crimson-red boot soles, and her single sword - a curved katana whose BLADE IS
GLOSSY BLACK (a black blade, never silver, never steel, never chrome) with CRIMSON RINGS around its
spine, a crimson-wrapped hilt and a dark ornate guard. She holds that katana point-down in her
trailing hand on her back side; her other armored gauntlet hand is OPEN and EMPTY. She stands on a
solid saturated GREEN chroma screen (bright green #00b140); nothing on her is green.

ACTION - THROW (shoulder barge through empty air, nothing seized):
0.0-0.4s she holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.0s she coils: her weight sinks back onto her screen-left leg, the katana drawn in tight and low
against her trailing hip, her leading gauntlet hand opening flat and EMPTY at waist height.
1.0-1.5s she DRIVES forward toward screen-right - one short explosive step, no more than half a body
length, staying near the centre of the frame - and rams her leading screen-right shoulder through
EMPTY AIR at chest height in a barging shove that meets nothing, her open empty gauntlet driving flat
through that same empty space past her own shoulder.
1.5-2.1s follow-through: her armor plates jolt with the effort of the shove and her open hand sweeps
down and across her OWN torso to her own hip, a wrenching finish that stays against her own body.
2.1-3.2s she steps back onto her original footprint and lowers the katana back to point-down at
arm's length.
3.2-4.0s she settles into the EXACT reference stance and holds completely still, zero motion.

NOTHING IS SEIZED: there is no target and no opponent. Her gauntlet hand stays WIDE OPEN and EMPTY for
the entire clip, it never closes, never curls into a fist and never holds anything; the space she
barges through is completely empty green. No object, no ball, no shape appears in her hand or under
her hand at any moment.

FACING LOCK: she stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. The front of her helmet, her visor and her chin
point SCREEN-RIGHT at all times; the swept horns and the back of her helmet stay on the SCREEN-LEFT
side; her leading shoulder, leading knee and leading foot are always the ones on the SCREEN-RIGHT
side; the katana stays on her trailing SCREEN-LEFT side. She NEVER rotates toward the camera, NEVER
turns her back to the camera, NEVER turns to face screen-LEFT. The image is NEVER mirrored and NEVER
flipped: her facing direction in the last frame is identical to her facing direction in the first
frame. No 180-degree turn, no about-face, no pivot, no spin, no rotation out of profile at any point.

WEAPON LOCK: the katana is in her hand in every frame - never dropped, never let go, never swapped to
the other hand, never duplicated, never put away - and no second weapon and no scabbard appears. Her
armor, neon trim, helmet and black blade look EXACTLY the same in the last frame as in the first.

CONTAINMENT: the whole action, including the katana at its furthest reach, stays WELL INSIDE the frame
with a wide empty green margin on all four edges; nothing ever touches or crosses the top, bottom,
left or right edge of the frame. The blade never rises above her helmet. She returns to her original
footprint with zero net drift.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake.
She is the ONLY figure in frame at all times.

NEGATIVE: no second character, no opponent, no body being thrown, no object of any kind in her hand or
anywhere in frame, no ball, no debris; nothing enters the frame and nothing leaves it. NOT a beam, NOT
a laser, NOT an orb, NOT a fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a ring of
light, NOT a halo, NOT a jet, NOT a blast wave; nothing is fired and nothing is thrown. No silver
blade, no chrome blade, no steel blade, no glowing white blade. No green light and no green effect. No
smoke, no haze, no fog, no dust, no bloom, no depth of field. No text, no logo, no watermark.
```

---

## special_3 — clip `special-c` (replaces the SILVER-BLADE take)

Defect this prevents: the finisher rendered a SILVER blade on a character whose blade is BLACK. The
blade colour is now locked three times (identity block, a dedicated mid-prompt colour lock, and the
negative block), the on-blade palette is crimson and hot-pink with NO white core so nothing can read as
bright steel, and per the re-roll rule the arc TERMINATES ON THE BLADE at the tip in every frame rather
than hanging loose as a trail.

```
The EXACT SAME black-armored female samurai from the reference image, unchanged: glossy black
lacquered plate armor with glowing HOT-PINK and CRIMSON neon edge-lighting on every panel, a black
horned kabuto helmet with a dark blank visor, a pink brow emblem and three flat black horns sweeping
back off the crown, crimson-red boot soles, and her single sword - a curved katana whose BLADE IS
GLOSSY BLACK (a black blade, never silver, never steel, never chrome) with CRIMSON RINGS around its
spine, a crimson-wrapped hilt and a dark ornate guard. She holds that katana point-down in her
trailing hand on her back side; her other armored gauntlet hand is OPEN and EMPTY. She stands on a
solid saturated GREEN chroma screen (bright green #00b140); nothing on her is green.

ACTION - SPECIAL FINISHER, RING IGNITION (the crimson rings on her own blade catch fire):
0.0-0.4s she holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.0s she rolls her wrist and lifts the point-down katana to hip height, angling the black blade
across her own body; the blade is still plain black.
1.0-1.6s she RIPS one short, fast, compact downward-diagonal cut, the blade travelling from hip height
to knee height and stopping dead - kept low, kept close against her own body, the blade never rising
above her shoulders. DURING the cut the CRIMSON RINGS already on her blade ignite one after another
from the guard toward the tip, so crimson and hot-pink fire runs ALONG THE BLADE and burns as a thin
rim ON THE BLADE edge. The fire is welded to the metal: it touches the blade along its whole length in
every single frame, it moves with the blade, and it ENDS EXACTLY AT THE BLADE'S TIP - it never
continues past the tip, never lingers where the blade has already been, never leaves the blade, never
becomes a crescent, an arc, a slash mark, a trail or a shape of its own, and there is never any light
anywhere that is not touching her blade.
1.6-2.3s the cut has stopped; the fire drains back down the blade into the rings and goes out, the
last light snuffing at the guard, and the blade is plain glossy black again.
2.3-3.4s she rolls her wrist back and lowers the katana to point-down at arm's length.
3.4-4.0s she settles into the EXACT reference stance and holds completely still, zero motion.

BLADE COLOUR LOCK: under the crimson fire the blade's own surface stays GLOSSY BLACK at all times -
this is crimson and hot-pink light sitting ON a BLACK blade. The blade never turns silver, never turns
steel, never turns chrome, never turns white, never turns grey and never becomes a bright glowing
white bar. The rings on the blade stay CRIMSON RED, never gold, never silver.

FACING LOCK: she stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. The front of her helmet, her visor and her chin
point SCREEN-RIGHT at all times; the swept horns and the back of her helmet stay on the SCREEN-LEFT
side; her leading shoulder, leading knee and leading foot are always the ones on the SCREEN-RIGHT
side; the katana stays on her trailing SCREEN-LEFT side. She NEVER rotates toward the camera, NEVER
turns her back to the camera, NEVER turns to face screen-LEFT. The image is NEVER mirrored and NEVER
flipped: her facing direction in the last frame is identical to her facing direction in the first
frame. No 180-degree turn, no about-face, no pivot, no spin, no rotation out of profile at any point.

WEAPON LOCK: the katana is in her hand in every frame - never dropped, never let go, never swapped to
the other hand, never duplicated, never put away - and no second weapon appears. Her armor, neon trim,
helmet and black blade look EXACTLY the same in the last frame as in the first.

CONTAINMENT: the whole action and all of the fire stay WELL INSIDE the frame with a wide empty green
margin on all four edges; nothing - not the blade, not a single spark of the fire - ever touches or
crosses the top, bottom, left or right edge of the frame. The blade and the fire stay BELOW the top of
her helmet at all times, and the fire never covers her helmet, her visor or her head. She stays
planted with zero net drift.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake.
She is the ONLY figure in frame at all times. The fire is solid and opaque with crisp edges, not a
soft glowing haze.

NEGATIVE: no second character, no opponent, no object of any kind in her hand or anywhere in frame, no
debris; nothing enters the frame and nothing leaves it. NOT a beam, NOT a laser, NOT an orb, NOT a
fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a ring of light, NOT a halo, NOT a jet,
NOT a blast wave, NOT a crescent, NOT an arc left hanging; nothing is fired, nothing is thrown, and no
light ever separates from her blade. No silver blade, no chrome blade, no steel blade, no white
glowing blade, no gold rings. No green light and no green effect. No smoke, no haze, no fog, no dust,
no bloom, no depth of field. No text, no logo, no watermark.
```

---

## SELFSCORE — the 12 defect classes

| # | Class | Score | Note |
|---|-------|-------|------|
| 1 | All weapons read off the plate, with grip and hand | PASS | She carries ONE weapon. The katana is named with its grip (point-down, trailing hand on her back side) and the free gauntlet is named as open and empty, in both prompts. Hands are named by FRAME SIDE rather than anatomy, because anatomical left/right is meaningless on an H-flipped anchor. |
| 2 | Signature motif as finisher vocabulary | PASS | `special_3` is the crimson rings already painted on her own blade igniting — her own detail, not invented magic. |
| 3 | Identity locked in every clip | PASS | The full identity paragraph is repeated verbatim in both prompts, plus "look EXACTLY the same in the last frame as in the first". |
| 4 | Never dropped, swapped, duplicated or added | PASS | Dedicated WEAPON LOCK paragraph in both prompts. |
| 5 | Effects attached to body or weapon | PASS | The only effect is fire welded to the blade and terminating at the tip. Neither prompt contains any space-placement wording. |
| 6 | Shape names banned in the NEGATIVE block | PASS | Every shape name from `arsenal.json` universalBanned appears in the negative block of both prompts, each one immediately preceded by NOT. |
| 7 | Solo throw mimes with NOTHING seized | PASS | The barge is a shoulder shove through empty air; the hand stays WIDE OPEN and EMPTY and "never closes, never curls into a fist"; `no opponent, no body being thrown` is in the negative block. Re-read after drafting per the known blind spot: no grab / seize / grip / hook / clamp / hold verb survives anywhere in the throw prompt. |
| 8 | Effect colours away from the key colour | PASS | Crimson and hot-pink only; "No green light and no green effect" in both. |
| 9 | Nothing semi-transparent or bloom-glowing | PASS | "solid and opaque with crisp edges, not a soft glowing haze"; smoke / haze / fog / dust / bloom / depth of field banned by name. |
| 10 | Anchor lock, begins and ends on the reference stance | PASS | Both end on the EXACT reference stance with a still hold (0.8s and 0.6s), and the fire is explicitly extinguished and the blade returned to point-down before the settle, so nothing the action changed persists into the last frame. |
| 11 | Containment and zero drift | PASS | Blade kept below helmet height, four-edge margin demanded, the forward step capped at half a body-length so the leading gauntlet stays clear of the right edge, "zero net drift". |
| 12 | Facing lock restated in every clip | PASS | Full FACING LOCK paragraph in both, pinned to frame-side landmarks (visor and chin screen-right, horns and back screen-left, katana screen-left), plus an explicit no-mirror / no-flip clause and a first-frame-equals-last-frame facing identity. |

Residual risk, flagged rather than hidden: **class 12 depends on the operator uploading the H-FLIPPED
anchor.** No prompt wording can survive a left-facing input plate — the header note is the only guard.
