# HOLLOW PALE (node 4) — RE-ROLL KIT: 4 defective clips only

Scope: replacements for `hollow-pale-attack-block-b` (`block_b`), `hollow-pale-attack-throw`
(`throw_a`), `hollow-pale-special` (`special_1`) and `hollow-pale-special-c` (`special_3`). Nothing
else in `hollow-pale.md` is touched. Headings below use the ENGINE STATE names so
`scripts/check-prompt-coherence.mjs` scores each block as the right state.

INPUT ANCHOR: `qa-boss/anchors/hollow-pale-anchor-green.png`, used UNFLIPPED — the plate already faces
screen-RIGHT.

Generation settings: Seedance 2.0, image-to-video, 4s, 1:1, 720p, 24fps, fixed camera, one continuous shot.

PRECEDENT THIS KIT OBEYS: his shipped `special_3 v1` ("smoke spikes just in front of him") rendered as a
detached flaming object — Tim's "one shoots a rocket" — and was PULLED. The pattern that worked is the
SMOKE SHROUD: the effect wraps HIM. Every effect below wraps him or is welded to his own bone.

---

## ARSENAL — read off the plate

Silhouette: a tall, gaunt, floating yokai — narrow chalk-white torso, a long horizontal bone blade
reaching out toward screen-right at chest height, and a wide black smoke column instead of legs. The
silhouette is a T of white bone crossed over a black plume.

Body:
- Emaciated **chalk-white** skin, every rib and vertebra showing, sunken shoulders and a long thin neck.
- A **skull-like head** with hollow eye pits and a wide, permanently bared **fanged grin**, crowned by
  **six tall pale antler horns** sweeping up and back. The antler tips sit close to the TOP EDGE of the
  frame — this is the tightest margin on the whole plate.
- **Black ink-rot stains** across the sternum, the ribs and the hip — his signature marking. *These
  stains are the finisher vocabulary: the `special_1` light seeps out of his own bone and the
  `special_3` shroud kindles where it touches the ink-rot, rather than inventing generic magic.*
- From the waist down he has **no legs**: his lower body is a wide column of **dense opaque black
  smoke**, with two clawed **talon feet** showing beneath it. The smoke is baked into the anchor and is
  part of his body, not an effect.

Weapons — his own two arms, nothing carried:
1. **LEFT ARM = a BONE WING-SCYTHE.** The arm itself is a row of pale vertebra-like spines that ends in
   one long, curved, **serrated bone blade**. It is FUSED to his shoulder. **It IS his arm — there is
   no hand on it, it cannot be dropped, put away, sheathed, swapped or let go, because there is nothing
   to let go of.** It is the near arm, extended toward screen-right; its tip already sits close to the
   RIGHT EDGE in the reference pose.
2. **RIGHT ARM = a normal gaunt white arm ending in long curved claws**, hanging down on the
   screen-LEFT side.

He carries no object at all — no staff, no charm, no scabbard, nothing in the claw.

Geometry notes that change the choreography (acted on, not just noted):
- **Top edge is tight** (antler tips near the frame top). Nothing rises. Every windup is INWARD and
  DOWNWARD; the `special_3` shroud is capped at his collarbone.
- **Right edge is tight** (scythe tip near the frame right). Every windup pulls the scythe IN across
  his own chest toward screen-left; the scythe never extends further right than in the reference pose.
- His smoke is soft-edged and will fight the key — so it is specified as DENSE and OPAQUE everywhere,
  and it is never allowed to thin into haze.

---

## block_b — clip `attack-block-b` (replaces the VANISHING-SCYTHE take)

Defect this prevents: his bone-scythe — which IS his arm — VANISHED mid-clip. The old prompt gave the
scythe nothing to do during the parry beat, so the model quietly deleted it. Now the scythe is given a
visible job in EVERY beat, its per-frame persistence is demanded explicitly, and "it is his arm, it
cannot vanish" is stated inside the identity lock.

```
The EXACT SAME gaunt chalk-white yokai demon from the reference image, unchanged: an emaciated
bone-thin white body with every rib showing, a skull-like head with hollow eye pits, a wide bared
fanged grin and a crown of six tall pale antler horns, black ink-rot stains across his sternum, ribs
and hip. HIS LEFT ARM IS A BONE SCYTHE: the arm itself is a row of pale vertebra-like spines ending in
one long curved serrated bone blade, permanently FUSED to his left shoulder. That scythe IS his arm -
it is present, whole and full size in EVERY SINGLE FRAME of the clip; it can never be put away, never
be sheathed, never be let go, never shrink, never thin, never fade, never turn into a normal hand or a
stump, never come away from his shoulder and never leave the frame, because it is not a held weapon,
it is his own arm. His right arm is a normal gaunt white arm ending in long curved claws. From the
waist down he has no legs: his lower body is a wide column of dense opaque BLACK SMOKE with two clawed
talon feet showing beneath it. He stands on a solid saturated GREEN chroma screen (bright green
#00b140); nothing on him is green.

ACTION - BLOCK AND COUNTER (arms only, torso locked):
0.0-0.4s he holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.0s he draws the bone-scythe arm IN toward screen-left and cocks it low across his own chest, the
whole serrated blade sweeping inward so its full length stays clearly visible against his white ribs;
at the same time his clawed right arm swings up in front of his own collarbone into a hard brace.
1.0-1.5s IMPACT: an unseen blow lands on the raised clawed forearm. The forearm jolts hard, his
shoulders and neck absorb the shock, the black smoke around his waist compresses and boils. The
bone-scythe stays cocked, whole and fully visible across his chest through the entire impact.
1.5-2.2s COUNTER: he RIPS the bone-scythe back out low - one short savage horizontal counter cut kept
BELOW his own shoulder and close to his body, the blade stopping dead well short of the right side of
the frame.
2.2-3.4s the scythe arm eases back to its exact reference position and the clawed arm drops back down
on the screen-left side.
3.4-4.0s he holds the EXACT reference stance, completely still, zero motion.

SCYTHE PERSISTENCE, absolute: the bone scythe is visible, whole, serrated and the same size in every
frame of the clip from the first to the last. It is never hidden behind his body, never cropped by an
edge, never obscured by smoke, never faded out, never replaced by a hand, and it never simply stops
being there. If a moment of the action would hide it, the action moves instead - the scythe stays in
view.

TORSO LOCK: only his arms move. His chest, hips and shoulders stay square in side profile and do not
twist, rotate or open toward the camera at any point.

FACING LOCK: he stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. His fanged muzzle and jaw point SCREEN-RIGHT at
all times; his antler crown sweeps back over the SCREEN-LEFT side; his clawed arm stays on the
SCREEN-LEFT side. He NEVER rotates toward the camera, NEVER turns his back to the camera, NEVER turns
to face screen-LEFT. The image is NEVER mirrored and NEVER flipped: his facing direction in the last
frame is identical to his facing direction in the first frame. No 180-degree turn, no about-face, no
pivot, no spin, no rotation out of profile at any point.

CONTAINMENT: the anchor already places his antler tips close to the TOP edge and his scythe blade
close to the RIGHT edge, so every movement is pulled INWARD and DOWNWARD. Nothing - no horn, no bone,
no claw, no smoke - ever touches, overlaps or crosses the top, bottom, left or right edge of the
frame; there is clear empty green above his antler tips in every frame. He never rises and never grows
taller, and the scythe never reaches further toward the right side of the frame than it does in the
reference image. He stays planted with zero net drift.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake. He
is the ONLY figure in frame at all times. His black smoke stays dense and opaque, never thin, never
wispy, never a transparent haze.

NEGATIVE: no second character, no opponent, no body being thrown, no object of any kind in his claw or
anywhere in frame, no ball, no debris; nothing enters the frame and nothing leaves it. NOT a beam, NOT
a laser, NOT an orb, NOT a fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a halo, NOT a
jet, NOT a blast wave; nothing is fired and nothing is thrown. No missing arm, no severed arm, no
stump. No green light and no green effect. No fog, no dust, no bloom, no depth of field. No text, no
logo, no watermark.
```

---

## throw_a — clip `attack-throw` (replaces the defective A take)

Defect this prevents: the solo-throw trap. The old take framed the claw as closing on an unseen foe,
and the model PAINTED the foe as a visible object in his fist. The gesture is now fully target-free:
the claw stays SPREAD WIDE OPEN and EMPTY for the whole sweep, the follow-through lands against his own
body, and both the no-object and no-opponent guards are in the negative block.

```
The EXACT SAME gaunt chalk-white yokai demon from the reference image, unchanged: an emaciated
bone-thin white body with every rib showing, a skull-like head with hollow eye pits, a wide bared
fanged grin and a crown of six tall pale antler horns, black ink-rot stains across his sternum, ribs
and hip. HIS LEFT ARM IS A BONE SCYTHE: the arm itself is a row of pale vertebra-like spines ending in
one long curved serrated bone blade, permanently FUSED to his left shoulder. That scythe IS his arm -
it is present, whole and full size in EVERY SINGLE FRAME of the clip; it can never be put away, never
be sheathed, never be let go, never shrink, never thin, never fade, never turn into a normal hand or a
stump, never come away from his shoulder and never leave the frame, because it is not a held weapon,
it is his own arm. His right arm is a normal gaunt white arm ending in long curved claws. From the
waist down he has no legs: his lower body is a wide column of dense opaque BLACK SMOKE with two clawed
talon feet showing beneath it. He stands on a solid saturated GREEN chroma screen (bright green
#00b140); nothing on him is green.

ACTION - THROW (a claw rake through empty air, nothing seized):
0.0-0.4s he holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.0s he coils: the dense black smoke around his waist compresses as he sinks, his clawed right
hand drawing back beside his own ribs with the fingers SPREAD WIDE OPEN, and the bone-scythe arm cocks
IN and low across his chest, staying fully visible.
1.0-1.5s he RAKES the open claw forward and downward through EMPTY AIR at chest height - one violent
tearing sweep that touches nothing and closes on nothing. His fingers stay SPREAD WIDE OPEN and EMPTY
for the whole sweep: they never close, never curl into a fist, never hook, and never hold anything.
1.5-2.2s follow-through: the rake finishes down against his OWN smoke-wrapped waist, his ribs flexing
with the effort and the dense black smoke whipping around his own body with the force.
2.2-3.4s he rises back out of the coil and the clawed arm and the scythe arm ease back to their exact
reference positions.
3.4-4.0s he holds the EXACT reference stance, completely still, zero motion.

NOTHING IS SEIZED: there is no target and no opponent anywhere in this clip. Nothing is grabbed,
gripped, hooked, clamped, caught or held at any moment. The space his claw rakes through is completely
empty green: no object, no ball, no lump, no shape ever appears in his claw, between his fingers or
under his hand.

SCYTHE PERSISTENCE, absolute: the bone scythe is visible, whole, serrated and the same size in every
frame of the clip from the first to the last. It is never hidden behind his body, never cropped by an
edge, never faded out, never replaced by a hand, and it never simply stops being there.

FACING LOCK: he stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. His fanged muzzle and jaw point SCREEN-RIGHT at
all times; his antler crown sweeps back over the SCREEN-LEFT side; his clawed arm stays on the
SCREEN-LEFT side. He NEVER rotates toward the camera, NEVER turns his back to the camera, NEVER turns
to face screen-LEFT. The image is NEVER mirrored and NEVER flipped: his facing direction in the last
frame is identical to his facing direction in the first frame. No 180-degree turn, no about-face, no
pivot, no spin, no rotation out of profile at any point.

CONTAINMENT: the anchor already places his antler tips close to the TOP edge and his scythe blade
close to the RIGHT edge, so every movement is pulled INWARD and DOWNWARD. Nothing - no horn, no bone,
no claw, no smoke - ever touches, overlaps or crosses the top, bottom, left or right edge of the
frame; there is clear empty green above his antler tips in every frame. He never rises and never grows
taller, the rake stays near the centre of the frame, and the scythe never reaches further toward the
right side of the frame than it does in the reference image. He stays planted with zero net drift.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake. He
is the ONLY figure in frame at all times. His black smoke stays dense and opaque, never thin, never
wispy, never a transparent haze.

NEGATIVE: no second character, no opponent, no body being thrown, no object of any kind in his claw or
anywhere in frame, no ball, no lump, no debris; nothing enters the frame and nothing leaves it. NOT a
beam, NOT a laser, NOT an orb, NOT a fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a
halo, NOT a jet, NOT a blast wave; nothing is fired and nothing is thrown. No green light and no green
effect. No fog, no dust, no bloom, no depth of field. No text, no logo, no watermark.
```

---

## special_1 — clip `special` (replaces the DETACHED-CRESCENT take)

Defect this prevents: a crescent floated FREE of him. Per the re-roll rule the fix is not less effect —
the light is now WELDED to the serrated bone edge, touching the blade along its whole length in every
frame, ending exactly at the tip, with an explicit ban on it lingering where the blade has already
been. The light also seeps out of his own bone rather than appearing anywhere off his bone.

```
The EXACT SAME gaunt chalk-white yokai demon from the reference image, unchanged: an emaciated
bone-thin white body with every rib showing, a skull-like head with hollow eye pits, a wide bared
fanged grin and a crown of six tall pale antler horns, black ink-rot stains across his sternum, ribs
and hip. HIS LEFT ARM IS A BONE SCYTHE: the arm itself is a row of pale vertebra-like spines ending in
one long curved serrated bone blade, permanently FUSED to his left shoulder. That scythe IS his arm -
it is present, whole and full size in EVERY SINGLE FRAME of the clip; it can never be put away, never
be sheathed, never be let go, never shrink, never thin, never fade, never turn into a normal hand or a
stump, never come away from his shoulder and never leave the frame, because it is not a held weapon,
it is his own arm. His right arm is a normal gaunt white arm ending in long curved claws. From the
waist down he has no legs: his lower body is a wide column of dense opaque BLACK SMOKE with two clawed
talon feet showing beneath it. He stands on a solid saturated GREEN chroma screen (bright green
#00b140); nothing on him is green.

ACTION - SPECIAL FINISHER, PALE HARVEST (his own bone catches light):
0.0-0.4s he holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.1s he draws the bone-scythe arm IN across his own chest and lifts it only to his own shoulder
height, never higher than his shoulder; PALE-GOLD light seeps out of the serrated bone itself, glowing
from inside the blade like bone heated from within, brightest along the serrated edge.
1.1-1.7s he RIPS the scythe down in one short, fast vertical guillotine cut kept close against his own
body, travelling from his shoulder height down to his hip height and stopping dead. Through the whole
cut the pale-gold and white light stays WELDED ALONG THE BLADE: it is a thin bright rim burning ON THE
BLADE, on the serrated bone edge, touching the blade along its entire length in every single frame, it
moves with the blade, and it ENDS EXACTLY AT THE BLADE'S TIP. It never continues past the tip, never
lingers where the blade has already been, never comes away from the bone, never becomes a crescent, an
arc, a slash mark, a hanging trail or a shape of its own, and there is never any light anywhere that
is not touching his bone.
1.7-2.4s the cut has stopped; the light drains back inside the bone and goes out, and the blade is
plain pale bone again, the same bone as in the first frame.
2.4-3.4s the scythe arm eases back to its exact reference position.
3.4-4.0s he holds the EXACT reference stance, completely still, zero motion.

FACING LOCK: he stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. His fanged muzzle and jaw point SCREEN-RIGHT at
all times; his antler crown sweeps back over the SCREEN-LEFT side; his clawed arm stays on the
SCREEN-LEFT side. He NEVER rotates toward the camera, NEVER turns his back to the camera, NEVER turns
to face screen-LEFT. The image is NEVER mirrored and NEVER flipped: his facing direction in the last
frame is identical to his facing direction in the first frame. No 180-degree turn, no about-face, no
pivot, no spin, no rotation out of profile at any point.

CONTAINMENT: the anchor already places his antler tips close to the TOP edge and his scythe blade
close to the RIGHT edge, so the whole cut is pulled INWARD and DOWNWARD. Nothing - no horn, no bone, no
claw, no smoke and not a single spark of the light - ever touches, overlaps or crosses the top,
bottom, left or right edge of the frame; there is clear empty green above his antler tips in every
frame. The blade and the light never rise above his own shoulder, never cover his skull face and never
cover his antler crown. He stays planted with zero net drift.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake. He
is the ONLY figure in frame at all times. The light is solid and opaque with a crisp edge, not a soft
glowing haze. His black smoke stays dense and opaque.

NEGATIVE: no second character, no opponent, no object of any kind in his claw or anywhere in frame, no
debris; nothing enters the frame and nothing leaves it. NOT a beam, NOT a laser, NOT an orb, NOT a
fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a halo, NOT a jet, NOT a blast wave, NOT
a crescent, NOT an arc left hanging, NOT a slash mark left behind; nothing is fired, nothing is
thrown, and no light ever separates from his bone. No green light and no green effect. No fog, no
dust, no bloom, no depth of field. No text, no logo, no watermark.
```

---

## special_3 — clip `special-c` (replaces the HEAD-SWALLOWING / TOP-EDGE-SLAB take)

Defect this prevents: the smoke shroud SWALLOWED HIS HEAD and an opaque slab hit the top frame edge.
The shroud is now hard-capped at his collarbone with his skull, grin and antler crown declared visible
in every frame, and it is specified as a tight sheath on his own body — never a wall, slab, column or
curtain, and never anywhere near an edge. This keeps the SHROUD pattern that replaced the pulled
finisher (see the precedent note at the top of this file), and only removes its two failure modes.

```
The EXACT SAME gaunt chalk-white yokai demon from the reference image, unchanged: an emaciated
bone-thin white body with every rib showing, a skull-like head with hollow eye pits, a wide bared
fanged grin and a crown of six tall pale antler horns, black ink-rot stains across his sternum, ribs
and hip. HIS LEFT ARM IS A BONE SCYTHE: the arm itself is a row of pale vertebra-like spines ending in
one long curved serrated bone blade, permanently FUSED to his left shoulder. That scythe IS his arm -
it is present, whole and full size in EVERY SINGLE FRAME of the clip; it can never be put away, never
be sheathed, never be let go, never shrink, never thin, never fade, never turn into a normal hand or a
stump, never come away from his shoulder and never leave the frame, because it is not a held weapon,
it is his own arm. His right arm is a normal gaunt white arm ending in long curved claws. From the
waist down he has no legs: his lower body is a wide column of dense opaque BLACK SMOKE with two clawed
talon feet showing beneath it. He stands on a solid saturated GREEN chroma screen (bright green
#00b140); nothing on him is green.

ACTION - SPECIAL FINISHER, SMOKE SHROUD (his own smoke climbs his own body):
0.0-0.4s he holds the EXACT reference stance, facing screen-right, completely still.
0.4-1.2s the dense black smoke already wrapped around his waist SURGES UPWARD OVER HIS OWN BODY,
climbing his torso as a tight second skin that clings to his hips, his ribs and his shoulders and
follows his exact outline - and it STOPS at his collarbone. Pale-gold light kindles inside the smoke
exactly where it covers the black ink-rot stains on his sternum and ribs.
1.2-2.1s the shroud CLENCHES tight around his own body, once, hard, and he arches and shudders with
it, his ribs and the whole bone-scythe still reading clearly through the outline; the pale-gold light
pulses once inside the smoke against his own chest and holds a beat.
2.1-3.2s the shroud sinks back down his own body to his waist, exactly where it was in the first
frame, and the pale-gold light goes out.
3.2-4.0s he holds the EXACT reference stance, completely still, zero motion.

HEAD CLEARANCE, absolute: the smoke NEVER rises above his collarbone. His neck, his skull face, his
hollow eye pits, his bared fanged grin and his entire antler crown stay completely visible, sharp and
unobscured in EVERY frame - nothing covers his head, nothing crosses his face, nothing wraps his neck
and nothing touches his horns. The upper third of the frame stays empty green with a clear margin
above his antler tips.

SHROUD SHAPE LOCK: the shroud is a TIGHT SHEATH on his own body, no wider than his own shoulders,
touching his body at every point along its whole height in every frame. It is not a wall, not a slab,
not a curtain, not a pillar, not a column standing apart from him; it does not spread sideways, does
not rise past him, does not stand anywhere he is not, and it never reaches any edge of the frame. No
smoke and no light ever exists in this clip that is not physically touching his own body.

FACING LOCK: he stays in strict SIDE PROFILE FACING SCREEN-RIGHT for the entire clip, in every single
frame including the first frame and the final frame. His fanged muzzle and jaw point SCREEN-RIGHT at
all times; his antler crown sweeps back over the SCREEN-LEFT side; his clawed arm stays on the
SCREEN-LEFT side. He NEVER rotates toward the camera, NEVER turns his back to the camera, NEVER turns
to face screen-LEFT. The image is NEVER mirrored and NEVER flipped: his facing direction in the last
frame is identical to his facing direction in the first frame. No 180-degree turn, no about-face, no
pivot, no spin, no rotation out of profile at any point.

CONTAINMENT: the anchor already places his antler tips close to the TOP edge and his scythe blade
close to the RIGHT edge, so the whole finisher is pulled INWARD and DOWNWARD. Nothing - no horn, no
bone, no claw, no smoke and not a single spark of the light - ever touches, overlaps or crosses the
top, bottom, left or right edge of the frame. He never rises, never grows taller and never floats
upward. He stays planted with zero net drift, and he ends at exactly the height he started.

TECHNICAL: one continuous shot, absolutely locked camera, no zoom, no pan, no cut, no camera shake. He
is the ONLY figure in frame at all times. The smoke is DENSE and OPAQUE with a defined silhouette
edge, never thin, never wispy, never a transparent haze; the pale-gold light is solid and opaque, not
a soft glow.

NEGATIVE: no second character, no opponent, no object of any kind in his claw or anywhere in frame, no
debris; nothing enters the frame and nothing leaves it. NOT a beam, NOT a laser, NOT an orb, NOT a
fireball, NOT a projectile, NOT a missile, NOT a rocket, NOT a halo, NOT a jet, NOT a blast wave, NOT
a spike, NOT a spear of smoke, NOT a cloud standing apart from him; nothing is fired, nothing is
thrown, and no smoke, light or shape ever separates from his body. His head is never covered. No green
light and no green effect. No fog, no dust, no bloom, no depth of field. No text, no logo, no
watermark.
```

---

## SELFSCORE — the 12 defect classes

| # | Class | Score | Note |
|---|-------|-------|------|
| 1 | All weapons read off the plate, with grip and hand | PASS | Both arms named in every prompt: LEFT arm = the fused bone wing-scythe (near arm, extended toward screen-right), RIGHT arm = the clawed hand on the screen-left side. Grip is stated as fusion, not a hold, because there is no hand on that arm. |
| 2 | Signature motif as finisher vocabulary | PASS | Both finishers are built from his own plate details — the pale-gold light seeps out of his own serrated bone, and the shroud kindles exactly where it covers the black ink-rot stains. |
| 3 | Identity locked in every clip | PASS | The full identity paragraph, including the scythe-is-his-arm clause, is repeated verbatim in all four prompts. |
| 4 | Never dropped, swapped, duplicated or added | PASS | Stated as an identity fact ("it is not a held weapon, it is his own arm") plus a dedicated SCYTHE PERSISTENCE paragraph in the two clips where it went missing. |
| 5 | Effects attached to body or weapon | PASS | `special_1` is welded to the bone edge and terminates at the tip; `special_3` is a sheath on his own body touching him at every point. No prompt contains any space-placement wording. |
| 6 | Shape names banned in the NEGATIVE block | PASS | Every shape name from `arsenal.json` universalBanned appears in the negative block of all four prompts, each one immediately preceded by NOT, plus the smoke-specific spike / spear / standing-cloud bans that match his pulled finisher. |
| 7 | Solo throw mimes with NOTHING seized | PASS | The rake is target-free; fingers stay SPREAD WIDE OPEN and EMPTY and "never close, never curl into a fist, never hook"; the follow-through lands on his own waist; `no opponent, no body being thrown` and `no object, no ball, no lump` are both in the negative block. Re-read after drafting per the known blind spot: no grab / seize / grip / hook / clamp / hold verb survives anywhere in the throw prompt. |
| 8 | Effect colours away from the key colour | PASS | Pale-gold, white and his own black smoke only; "No green light and no green effect" in all four. |
| 9 | Nothing semi-transparent or bloom-glowing | PARTIAL — flagged | His lower body IS black smoke, baked into the anchor; it cannot be removed. Mitigated everywhere by specifying it as DENSE and OPAQUE with a defined silhouette edge and banning thin / wispy / transparent haze, and by banning fog, dust, bloom and depth of field. The light is specified solid and opaque. The keyer should still be checked on `special_3` first — this is the one clip in the set with a real matte risk. |
| 10 | Anchor lock, begins and ends on the reference stance | PASS | All four begin and end on the EXACT reference stance with a 0.6-0.8s dead-still tail, and everything the action changed is explicitly undone first: the light drains back into the bone, the shroud sinks back to exactly its first-frame position, both arms return to their reference positions. |
| 11 | Containment and zero drift | PASS | The tight top edge and tight right edge are read off the plate and acted on — all windups go INWARD and DOWNWARD, the scythe is forbidden to reach further right than the reference pose, the shroud is capped at the collarbone, and clear empty green above the antler tips is demanded in every frame. |
| 12 | Facing lock restated in every clip | PASS | Full FACING LOCK paragraph in all four, pinned to frame-side landmarks (muzzle and jaw screen-right, antler crown and clawed arm screen-left), plus an explicit no-mirror / no-flip clause and a first-frame-equals-last-frame facing identity. |
