# IR-41 KASA ONI — XGundam roster. Full 13-clip kit. Phase 88.

BLOCKED: the plate is FRONT-FACING, so every acting line here is unfireable as written. Re-plate to a side/three-quarter pose, or re-pose the character, then delete this line.

> The block was already documented in prose further down this file (§ "This plate is not — IR-41
> stands square to camera..."), and it changed nothing: all 13 states still demanded "side profile
> facing screen-right", the shared suffix still added "NEVER rotates or turns to face the camera",
> and the kit ASSEMBLED CLEANLY at LEN=3990 while `check-prompt-sections.mjs` counted it among the
> clean. Firing it forces the model to break either the anchor lock (`start_image` pins the frontal
> plate at f0) or the facing lock — there is no third option.
> Verified phase 108 by rendering the alpha (`node qa-boss/check-plate-key.mjs
> qa-boss/anchors/xg/ir41-kasa-oni-anchor-green.png`): legs planted wide and symmetric, both feet
> splayed outward, shoulders and hips square, one arm raised overhead and the other extended open.
> Unmistakably frontal. The `BLOCKED:` line above is machine-read by `build-prompt.mjs`, which now
> REFUSES with exit 3 — a warning a tool cannot read is a warning that gets fired anyway.
> The acting lines are KEPT, not deleted: they are good work and become usable the moment the plate
> does. **They just must not be fireable against this plate.**

Written against the PADDED plate `qa-boss/anchors/xg/ir41-kasa-oni-anchor-green.png`, never the raw
`input/MK FINAL/XGundam not sorted/IR-41 Kasa Oni.png`. The raw art measures **L186 / R436 / HEADROOM
58** — his already-raised katana runs to within 58px of the top of its own frame, the tightest ceiling
on any plate in this batch. Padding at fill 0.68 buys **L350 / R348 / HEADROOM 468**, verified by
`node qa-boss/measure-anchor-budget.mjs`. Chroma-detail scan: CLEAN — no plate-coloured pixels on the
character, so the green plate is safe for him.

## ★ HIS ARSENAL — inventoried off the plate, and it is the whole list

ONE long katana with a tan cord-wrapped handle and a molten-orange heated blade, held in his sword
hand. ONE open, splayed, fully articulated steel guard hand, empty. TWO curved dark-steel oni horns
mounted on the crown of his straw kasa. The wide rigid woven brim of that kasa itself. Heavy armoured
sabaton boots and a mech frame with real mass. A thick braided straw rope over his shoulders that lags
and snaps with every weight change.

**He has NO gun, NO thrusters, NO wings, NO shield, NO missile pods and NO scabbard** — there is no
saya anywhere on his hips, so there is no draw and no iai in this kit either. He never fires anything,
never boosts, never flies and never throws his sword or his hat. Every beat below is a blade, a fist,
a horn, a brim or a boot.

## ★ IR-41 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **838w x 1044h** (fills 68.0% of frame height), bbox x350..x1187,
y468..y1511.
  LEFT **350px** · RIGHT **348px** · HEADROOM **468px** · bottom free (feet on the floor line).
  Max spanPeak that still fits = 1.83x, but the HARD RULE caps it at **1.60x** — use 1.60x.

**WHICH PART OF HIM OWNS EACH EDGE — measured row by row, and it is not what you would guess.**

  · TOP (y468) is the **KATANA BLADE**, not his hat. The crown of the kasa and the horn tips sit at
    y~540, i.e. ~70px BELOW the blade.
    All 468px of ceiling is already spent by a sword that is *already raised*.
  · LEFT (x350) is the **butt of the sword handle**, at head height (rows 560-578).
  · RIGHT (x1187) is his **open guard hand**, at chest height (rows 754-787).
  · The widest single row is only ~718px — the two arms at chest height. The 838px bbox is two
    different limbs, at two different heights, on two opposite sides. No single row is 838 wide.

Read in the strict screen-right side profile every clip is shot in, that is one coherent guard: the
katana cocked HIGH and BACK over his sword shoulder with the tip up and the handle butt trailing
toward screen-left, the free hand open and forward at chest height toward screen-right. So:

  1. **THE BLADE TIP NEVER RISES ABOVE THE HEIGHT IT HAS IN THE REFERENCE.** He starts at the ceiling.
     Bound the BLADE TIP, not the hands — a height bound on the body does not bound a ~470px blade
     (the phase-58/61 lesson, learned four times). No full vertical raise, no overhead, ever.
  2. **HIS ANCHOR IS ALREADY THE TOP OF A DOWNSTROKE — that is his structural gift.** He is the one
     fighter who begins cocked and loaded, so every attack RELEASES downward and the return to the
     anchor IS the re-cock. Nothing in this kit ever needs to travel up to be violent.
  3. **NEVER A FULL HORIZONTAL EXTENSION, EITHER SIDE.** The blade alone is about as long as either
     margin. A katana swung out to arm-plus-blade reach leaves the frame instantly. Every cut finishes
     DOWN and IN, inside his own shoulder line, with the blade ending below his own waist.
  4. **HIS DIRECTION IS DOWN.** The bottom edge is free — `check-containment.mjs` treats floor contact
     as expected and never counts it. Slams, buries, crouches and grinding boots are all free.
  5. **HE IS ALREADY BRACED WIDE** (640px across the boots). 1.60x leaves him roughly a quarter of his
     own width of growth per side, so commitment has to come from SINKING and from the downstroke, not
     from travelling. No lunges, no wide steps. **And no foot ever leaves the floor in this kit** —
     every low beat is written as a boot that GRINDS or SCRAPES, so the feet lock in the suffix never
     contradicts an acting line the way an ordinary sweep or stomp would.
  6. Effects are **SOLID MATERIAL** — kicked grit, splintered stone chips, and the hard black flakes of
     forge-scale that shear off his own hot edge. Never a glow, flare, aura, beam, ring or mist.
  7. **HIS BLADE IS EMISSIVE AND IT ALREADY BLOOMS ONTO THE PLATE.** The molten-orange edge throws a
     visible warm halo onto the green in the anchor image itself. It is part of his art and stays lit,
     but the suffix pins it to exactly the reference brightness and forbids any flare, pulse or trail.
     An unbounded glowing sword on a chroma plate keys out as an olive halo (the session-14 class), and
     this is the only character in the batch that carries that risk in his own reference.

Shared prefix:
> The EXACT SAME armoured samurai war-machine from the reference image (identical weathered
> gunmetal-grey steel mech body with rust-copper brown accent plates across his chest, his segmented
> belly, his laced hanging hip skirts, his knees and his boot caps, a snarling deep-red lacquered oni
> demon face-mask with bared pale teeth and one burning orange eye set into a dark steel skull-helm and
> a ringed steel neck, a wide conical woven straw kasa hat with a dark steel cap along its crown and
> two curved dark-steel oni horns sweeping up and back from it, a thick braided tan straw rope draped
> over both shoulders and knotted across his chest with the ends hanging, layered segmented pauldrons
> laced with tan cord, jointed steel arms, one open splayed mechanical guard hand, heavy armoured
> sabaton boots, and gripping a single long katana with a tan cord-wrapped handle, a dark round guard
> and a blade that glows molten orange along its whole length with a pale hot edge), standing on a
> solid saturated GREEN chroma screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the identity, weapon, blade-glow, containment, stance, facing and anchor locks
— every state inherits these):
> His steel armour, copper plates, red oni mask, straw kasa hat, its two horns, his shoulder rope and
> his katana stay EXACTLY the same the entire clip. He keeps the katana in his hands the whole time and
> never drops or swaps it. The heat-glow along the blade is part of the sword itself and stays EXACTLY
> as bright and EXACTLY the same colour as it is in the reference image at every moment - it never
> flares, never brightens, never pulses, never leaves a trail or a streak behind the blade, and never
> throws light onto his armour, onto his hat or onto the background. The katana stays FULLY INSIDE the
> frame at ALL times and NEVER extends past any edge of the frame, and THE BLADE TIP NEVER RISES ABOVE
> THE HEIGHT IT HAS IN THE REFERENCE IMAGE - the sword is NEVER raised into a fully vertical or
> overhead position at any moment, and it is never swung out to full arm's-length reach to either side.
> HIS FEET STAY DOWN ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and
> never lunges out into a wide stance, and he never spreads his feet wider than about one and a quarter
> times the width they already have in the reference image. He stays FACING SCREEN-RIGHT the entire
> clip and NEVER rotates or turns to face the camera. The camera is absolutely locked, no zoom, no pan,
> his full body always fully in frame, he is the ONLY figure in frame at all times, nothing else added.
> He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquotes: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside a blockquote is sent to the model as an
instruction. The suffix's closing sentence is worded "begins and ends on the EXACT same reference
stance" ON PURPOSE — build-prompt.mjs's KO-SUFFIX RULE strips the weapon-lock and the anchor-lock for
`ko` by matching that exact literal, and the weapon lock is written as its OWN sentence ("He keeps the
katana in his hands...") so the ko strip removes only that sentence and leaves the identity lock and
the blade-glow lock standing. Law 7 (first==last) is carried per-state instead: every non-ko action
line ends "back into the EXACT same reference stance".

THE ONE THING THE NEXT PERSON MUST CHECK BEFORE FIRING. Every shipped kit on this roster was written
off a plate that is ALREADY a strict screen-right side profile (oni-tetsubo, ir48, ir56, ir22 all
are). **This plate is not — IR-41 stands square to camera in a broad front-facing fighting stance.**
The kit is written to the batch law (strict side profile facing screen-right) because the engine
requires it: FightExperience.tsx applies ONE mirror to the whole fighter stack, and per the front-turn
gate a frontal stance "has no side, so it cannot be mirrored into agreement with the rest of the kit —
it is wrong in BOTH slots". So the PLATE is the thing that is out of spec, not the law. Re-pose or
re-render this anchor into a screen-right side profile before firing, or frame 0 will be square to
camera and every clip will start by turning. The identity paragraph above is pose-free on purpose, so
it survives a re-posed plate unchanged; the frame budget survives too, because the same three features
own the same three edges in profile (blade up, handle butt trailing left, guard hand forward right).

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT, SPLINTERED STONE CHIPS AND THE HARD BLACK FLAKES OF FORGE-SCALE SHEARED OFF HIS OWN BLADE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his katana and HIS OWN debris. Every piece of that debris is SOLID MATERIAL - real opaque chips of stone, real grit, real hard flakes of burnt-black iron with sharp visible edges, lit like rock and metal - never a glow, never a flame, never an aura, never a beam, never a ring of light, never mist or smoke. All of it is thrown UP and stays low and close to him, rising no higher than his own waist and spreading no wider than one body-width to either side, and every piece crumbles away to nothing in mid-air. Nothing ever comes near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: he holds the exact reference guard in strict side profile facing screen-right -
the katana cocked high and back over his sword shoulder, his free hand open and forward at chest
height, both armoured sabatons braced wide - and the whole machine idles under load. His chest plates
rise and settle with a slow deep servo breath and his shoulders lift and drop with it, the braided
straw rope across his chest swings a beat behind him, the wide woven brim of his kasa rocks a hair with
every breath, and his weight rolls slowly from one boot to the other. The blade stays dead steady at
exactly the height and angle it has in the reference. Planted, heavy, patient. Returns to the exact
start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (kesa downstroke — the loaded blade released)
STRIKE A (kesa downstroke): he begins in the EXACT reference stance in strict side profile facing
screen-right; he coils his weight back onto his rear leg and drops the wide brim of his kasa forward so
the woven edge cuts across his red mask, then RELEASES the loaded blade in one heavy committed diagonal
cut, driving it down and across the front of his own body from his sword shoulder to his opposite hip.
His whole frame sinks behind the cut until both knees are deeply bent and his head is a clear head's
height lower than it starts, and the braided rope snaps forward across his chest plate with the weight.
The cut finishes with the blade held LOW and CLOSE across the front of his hips, well below his own
waist and inside his own shoulder line, and the edge shears off a tight spray of hard black forge-scale
flakes that crumble away to nothing in mid-air within a hand's reach of the blade. The cut is COMPLETE
by the halfway point of the clip; the whole second half is his slow heavy rise and re-cock back into the
EXACT same reference stance. Heavy, committed, final.

## attack_strike B  (dropping point-thrust into the floor)
STRIKE B (dropping point-thrust): he begins in the EXACT reference stance in strict side profile facing
screen-right; his open guard hand swings IN and clamps onto the butt of the handle so both hands are on
the grip, he rolls the blade over until the point aims straight DOWN, and he drops his whole body with
it, driving the point into the ground just in front of his own lead boot with the full weight of the
machine behind it. His hips sink almost to his own knee height and his shoulders and mask come down
with them into a deep braced crouch. The bite punches a tight burst of grit and splintered stone chips
UP around the point, no higher than his own knee, every piece crumbling away to nothing in mid-air.
Then he wrenches the blade back out of the floor, his free hand releasing the grip, and rises into the
EXACT same reference stance. The point lands by the halfway point of the clip; the whole second half is
the pull-free and the rise. Low, fast, brutal.

## attack_throw A  (collar seize and hip wrench, solo-safe)
THROW A (seize and wrench): he begins in the EXACT reference stance in strict side profile facing
screen-right, the katana staying cocked in its guard the whole time; he drives his weight forward off
his rear leg and his free hand snaps SHUT on EMPTY AIR barely a forearm's length in front of his own
chest plate, as if seizing an unseen foe by the collar. Then he hauls that seized weight down and past
his own hip with his whole back and both knees folding behind the pull, his shoulders rolling over and
his head dropping until the brim of his kasa is level with his own fist, ending in a deep low brace
with the fist down at knee height and the rope swung hard across his chest. A small burst of grit jumps
UP off the floor under the pull and crumbles away to nothing in mid-air. He throws through EMPTY AIR
only - there is NO opponent and no second figure anywhere in the frame at any time. The wrench is
COMPLETE by the halfway point; the second half is his rise back into the EXACT same reference stance.

## attack_throw B  (boot-drag trip and downward dump, solo-safe)
THROW B (trip and dump): he begins in the EXACT reference stance in strict side profile facing
screen-right, the katana staying cocked in its guard the whole time; he loads his weight hard onto his
rear leg, then DRAGS his lead sabaton forward and around through a short low scrape, its sole grinding
along the floor and never once leaving it, throwing a spray of grit off the ground that crumbles away
to nothing in mid-air. His hips and shoulders turn over the planted rear leg with the drag and his free
hand drives DOWN and across in front of his own chest as if dumping an unseen body off the trip, and he
settles into a low braced finish with his weight sunk over both boots and his free hand at hip height.
He trips through EMPTY AIR only - there is NO opponent and no second figure anywhere in the frame at
any time. The drag and the dump are COMPLETE by the halfway point; the second half is his settle back
into the EXACT same reference stance.

## attack_block A  (flat blade brace into a chopping counter)
BLOCK-COUNTER A (flat blade brace): he begins in the EXACT reference stance in strict side profile
facing screen-right; he brings the katana DOWN out of its high guard and across the front of his own
body into a hard flat brace held at chest height, his free hand clamping onto the butt of the handle to
hold it there, and his whole weight settles back and DOWN onto his rear leg as he absorbs the pressure,
both knees bending deep and his shoulders driving in behind the brace. HE HOLDS THAT BRACE THROUGH THE
MIDDLE OF THE CLIP, the blade shuddering under the load and the rope swinging in against his chest
plate while his boots stay exactly where they are. Then, at about three quarters, he snaps the blade
off the brace in one short chopping counter driven DOWNWARD and inward across his own hips, and flows
in one eased motion back into the EXACT same reference stance. Braced, immovable, brutal.

## attack_block B  (kasa brim guard into a palm-heel counter)
BLOCK-COUNTER B (brim guard): he begins in the EXACT reference stance in strict side profile facing
screen-right, the katana dropping straight DOWN out of its guard to hang low and close along his own
leg and staying down there for the whole clip; he drops his head hard and turns the wide woven brim of
his kasa edge-on into the incoming line so the straw brim takes the blow, his free forearm snapping up
underneath it as a second hard steel guard, and his whole body sinking back and down over his rear leg
under the pressure with the rope swinging in against his chest plate. HE HOLDS THAT HUNCHED BRIM-GUARD
THROUGH THE MIDDLE OF THE CLIP, the brim shuddering and his shoulders working against the load. Then,
at about three quarters, he drives one short palm-heel counter forward from the hip at chest height and
flows in one eased motion back into the EXACT same reference stance, bringing the blade back up to
exactly the height and angle it has in the reference image. Compact, hunched, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance in strict side profile facing screen-right; his
head and shoulders snap back and to screen-LEFT, the wide brim of his kasa slamming up out of line so
the red oni mask and its burning eye are fully exposed, his lead sabaton skidding a SHORT half-step
back across the floor and both knees buckling under the weight, the braided rope whipping loose off his
chest plate, and the katana jarred DOWN out of its high guard as his sword arm is knocked through. He
catches his balance, plants his weight, brings the blade back up to exactly the height and angle it has
in the reference image and flows in one eased recovery back into the EXACT same reference stance. His
chest and his mask lead the recoil; his back is never shown. He is ALONE in an empty frame - nothing
whatsoever enters, crosses or appears in the frame at any time, and there is no light, no flare and no
streak anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on the ground)
KO (collapse): he begins in the EXACT reference stance in strict side profile facing screen-right; his
knees fold under him, the katana slips out of his grip and falls away beneath him out of sight, and he
pitches heavily forward and down onto the floor, coming down on top of the fallen sword so it is hidden
completely under his own body. The wide brim of his kasa strikes the ground first and tips down over
his red mask as he comes to rest fully prone and motionless, and a low puff of dust lifts from the
floor where he lands and drifts away to nothing. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time, and there is no light, no flare and no streak
anywhere in the shot. Only his own body moves. He does NOT get back up.

## victory  (chiburi — the blade snapped clean, the mask revealed)
VICTORY (chiburi): he begins in the EXACT reference stance in strict side profile facing screen-right.
IN THE FIRST QUARTER OF THE CLIP he brings the katana DOWN out of its high guard in one short hard arc
and snaps it to a dead stop held flat and low at his own hip, his weight dropping onto his lead leg
behind the snap, and the flick shears a fine spray of hard black forge-scale flakes off the edge that
crumble away to nothing in mid-air. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW POSE and
only his head and his hat move - the wide woven brim tips slowly up until his red oni mask clears it
completely and the burning orange eye looks down the length of his own blade, while the braided rope
swings to a stop against his chest plate. His shoulders, his hips and both sabatons stay exactly where
they are that entire time, he does not step, does not pivot, does not straighten up and does not turn
toward the camera, and the blade stays low at his hip. IN THE FINAL QUARTER he draws the blade back up
to the EXACT height and angle it has in the reference image - never higher - and settles into the EXACT
same reference stance. Proud, cold, patient.

## special_1  (TSUCHI-GIRI) — one enormous downstroke buried in the floor, then held
SPECIAL FINISHER (earth cut): he begins in the EXACT reference stance in strict side profile facing
screen-right; his open guard hand swings IN and clamps onto the butt of the handle so both hands drive
the sword, and he coils his whole body down and back over his rear leg. Then, with everything the
machine has, he drives the blade in one enormous committed downstroke straight into the ground in front
of his own lead boot, burying the edge in the floor and folding into a deep braced crouch behind it,
his hips sinking to near his own knee height and his mask dropping down behind the brim of the kasa.
The bite BLASTS a burst of splintered stone chips and grit UP around the buried blade, no higher than
his own knee and no wider than one body-width, every piece crumbling away to nothing in mid-air. The
downstroke lands by the first third of the clip. HE THEN HOLDS THAT DEEP CROUCH WITH THE BLADE IN THE
FLOOR THROUGH THE MIDDLE OF THE CLIP, only his shoulders heaving and the braided rope swinging dead
against his chest plate. IN THE LAST QUARTER he hauls the blade back out of the ground, his free hand
letting go of the grip, and rises into the EXACT same reference stance. The chips are SOLID STONE:
opaque, sharp-edged, lit like rock - never a glow, never a flame, never a ring of light. Heavy,
committed, final.

## special_2  (HAGANE ARASHI) — three descending cuts, the weight dropping a notch on each
SPECIAL FINISHER (steel squall): he begins in the EXACT reference stance in strict side profile facing
screen-right; he drives the katana through THREE successive downward cuts across the front of his own
body, each one shorter and lower than the one before, and his weight drops a full notch on every cut so
that by the third he is folded into a deep braced crouch with his hips near his own knee height and his
head a clear head's height lower than it starts. The first cut fires in the opening quarter, the second
just before the halfway point, the third at two thirds; the blade never leaves the volume between his
own chest and the floor and never travels outside his own shoulder line, and each cut shears a tight
spray of hard black forge-scale flakes off the edge that crumble away to nothing in mid-air within a
hand's reach of the blade. THE WHOLE FINAL THIRD OF THE CLIP is his heavy rise up out of the crouch and
his re-cock back into the EXACT same reference stance. The flakes are SOLID BURNT IRON: opaque, hard,
sharp-edged - never a glow, never a shower of sparks, never a trail of light. Fast, relentless, brutal.

## special_3  (ONI-ZUKI) — the horn ram, sword parked, boots grinding
SPECIAL FINISHER (horn ram): he begins in the EXACT reference stance in strict side profile facing
screen-right, the katana staying cocked in its guard and never swinging at any point in the clip. IN
THE FIRST QUARTER he coils his whole body back and DOWN over his rear leg and drops his head until the
wide brim of the kasa hides his mask completely and the two dark-steel horns come level and point
forward, and he holds that coiled crouch. Then he drives the entire machine forward and down from the
hips, ramming both horns through EMPTY AIR at chest height with his free hand punching down alongside
them, both sabatons grinding a short hard scrape across the floor and never once leaving it, and the
drive tears a burst of grit and broken stone UP around his boots, no higher than his own knee and no
wider than one body-width, every piece crumbling away to nothing in mid-air. THE RAM LANDS AT THE
HALFWAY POINT AND HE HOLDS THE LOW RAMMED FINISH TO THREE QUARTERS, his shoulders heaving and the rope
still swinging against his chest plate. He rams through EMPTY AIR only - there is NO opponent and no
second figure anywhere in the frame at any time. THE LAST QUARTER is his haul back upright into the
EXACT same reference stance. The grit is SOLID STONE AND EARTH: opaque, chunky, lit like rock - never a
glow, never a flame, never a shockwave of light. Savage, low, final.
