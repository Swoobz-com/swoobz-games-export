# IR-60 TIGER-MANTIS — XGundam roster. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir60-tiger-mantis-anchor-green.png`, never the raw
`input/MK FINAL/XGundam not sorted/IR-60 Tiger-Mantis.png`. The raw art is 2304x1536 and the subject
fills 95.2% of it: L245 / R231 / **HEADROOM 41px**, spanCap 1.26x. 41px of ceiling is not a budget, it
is a wall — every raised beat overruns on frame one. `qa-boss/xg/prep-plates.mjs` therefore re-plated
him square at 1536x1536, and because he is the WIDEST subject in the pilot the fill had to be stepped
DOWN from 0.68 to **0.56** before the 200px margin law was satisfiable (at 0.68 he measures 1305px
wide and leaves 116px per side). That trade buys 652px of ceiling for 12% of his on-screen size: he is
physically SMALLER in frame than the rest of the pilot, so judge his clips for softness with that known.

## ★ IR-60 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536 GREEN. Full subject **1076w x 860h** (fills 56.0% of frame height), bbox x230..x1305,
y652..y1511.
  LEFT **230px** · RIGHT **230px** · HEADROOM **652px** · bottom free (feet on the floor line).
  max spanPeak that still fits = **1.43x** — TIGHTER than the 1.60x hard rule, so 1.43x is the number.
  chroma-detail **CLEAN** — no enclosed green anywhere on him; the green plate is safe for this
  character (he is amber/black, nothing on him is near the key colour).

**BOTH MARGINS ARE BLADE TIPS — read this before writing any beat.** His torso column is a small
fraction of that 1076px bbox. The rest is two scythe blades held wide in an OPEN SCISSOR guard: the
near blade's point IS the left edge at x230, and the far blade's point IS the right edge at x1305.
Nothing is in reserve. He is the same shape as satoshi-odachi and oni-tetsubo — prop-extended — except
he is prop-extended in BOTH directions at once, which is worse.

  1. **NEITHER blade travels further outward than it does in the reference.** Not the near one to
     screen-left, not the far one to screen-right. Both points are already sitting on their margin.
  2. **1.43x is the exact width at which he touches BOTH edges simultaneously**, so treat any widening
     at all as an overrun, not as headroom to spend. A lunge widens both ways and eats 230px on each
     side in one frame: no lunges, no wide stances, no stepping out, no boosting forward.
  3. **His commitment currency is DROP, not travel.** The bottom edge is free — `check-containment.mjs`
     treats feet-on-floor as expected and never counts it — and a sinking body costs ZERO margin on
     either side while `check-body-commitment.mjs` measures it directly as dropPct. Every heavy beat
     sinks the hips.
  4. **652px of ceiling sounds generous and is not.** Each blade is roughly 430px of curve and the twin
     swept-back crest horns already sit near the top of the bbox. Bound the BLADE TIP, never the elbow
     — a height bound on the arm does not bound a 430px blade, which is the lesson this project has
     now learned four separate times (phase 58/61).
  5. Effects are **SOLID MATERIAL** — curled bright metal shavings sheared off the edges, splintered
     plating flakes, chipped floor grit and stone. Never a glow, beam, aura, trail or ring of light: an
     emissive effect lights the chroma plate and the key keeps it as an olive halo. His blade edges are
     drawn hot in the plate and stay lit exactly as they are, but they THROW no light.

**THE MANTIS FOLD IS THE ANSWER TO ALL OF THE ABOVE.** His anchor is an OPEN scissor; every attack
CLOSES it. Folding both blades in toward his own centre-line NARROWS the silhouette at the exact moment
the action peaks — the only body language this budget can afford, and the one this body was built for.

Shared prefix:
> The EXACT SAME orange-and-black tiger-striped beast mech from the reference image (identical warm
> amber-orange armour plating with hard black tiger stripes brushed across his chest, shoulders, thighs
> and shins over a matte black inner frame, a beast-mech helmet with one narrow glowing amber eye slit,
> a slatted vent grille over the muzzle, a dark visor band across the brow and a round dark sensor pod
> at the temple, TWO long slim swept-back crest horns rising from the crown, layered stacked amber
> shoulder slats striped in black, dark vent louvres on the chest plate, amber hip tassets, pointed
> amber knee spurs, short stubby dark vent cylinders on the back of each calf, heavy dark boots with
> split amber claw toe caps, and a LONG CURVED MANTIS SCYTHE BLADE BOLTED ONTO EACH FOREARM at a dark
> gunmetal pivot housing - each blade amber-orange with hard black tiger stripes on its flat and a hot
> glowing amber cutting edge along its inner curve, with a short amber counter-hook on the back of each
> housing and a compact dark claw-hand tucked beneath it), standing on a solid saturated GREEN chroma
> screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His amber-orange plating, the black tiger stripes, the swept-back twin crest horns, the layered
> shoulder slats and both curved scythe blades stay EXACTLY the same the entire clip. The two curved
> scythe blades are BOLTED ONTO HIS FOREARMS at their dark pivot housings - they are PART OF HIS ARMS,
> never gripped in a fist, never dropped, never thrown and never swapped. Both blades stay FULLY INSIDE
> the frame at ALL times and NEVER extend past any edge of the frame, and NEITHER blade ever travels
> further out toward screen-left or screen-right than it does in the reference image. The BLADE TIPS
> are NEVER raised above the top of his own swept-back crest horns and neither blade is EVER swung
> fully vertical or overhead at any moment. HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he
> never jumps, never leaps, never hops, never flies, never hovers, never boosts and never lunges out
> into a wide stance; he keeps his stance narrow and never spreads wider than it is in the reference
> image. He has NO gun, NO cannon and NO launcher of any kind anywhere on his body, and he NEVER fires,
> shoots or launches a projectile, a beam or a missile at any moment - he is a pure melee machine and
> the only weapons in this clip are the two blades on his arms. He stays FACING SCREEN-RIGHT the entire
> clip and NEVER rotates or turns to face the camera. The camera is absolutely locked, no zoom, no pan,
> his full body always fully in frame, he is the ONLY figure in frame at all times, nothing else added.
> He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and his own two arm-blades, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside a blockquote is sent to the model as instructions.
The suffix's closing sentence is worded "begins and ends on the EXACT same reference stance" ON PURPOSE:
build-prompt.mjs's KO-SUFFIX RULE matches that exact literal and strips it for `ko`. The weapon-lock
sentence is deliberately worded WITHOUT "in his hands", so the stripper does NOT remove it on `ko` —
that is correct for this body, because his blades are bolted to his forearms and cannot be dropped even
when he is prone. `ko` therefore has no weapon contradiction to strip, only the anchor one.

THE ANCHOR STANCE, for whoever reads this next: strict side profile facing screen-RIGHT, a low
forward-leaning predatory crouch — rear leg extended back to screen-left with the foot flat, front leg
planted and bent, hips low. His NEAR arm is held low and forward with its blade sweeping UP and BACK to
screen-left, tip at about head height (that tip is the left frame margin). His FAR arm is raised with
the elbow up beside his head and its blade sweeping OUT to screen-right and curving DOWN, tip low-right
(that tip is the right frame margin). The silhouette is a wide open scissor.

ARSENAL, read off the plate: two forearm-mounted curved mantis scythe blades on dark pivot housings; a
short amber counter-hook on the back of each housing; a straight matte-dark spine rail along the top of
each forearm; a compact dark claw-hand tucked under each housing; twin swept-back crest horns; pointed
amber knee spurs; heavy clawed feet. NO firearm of any kind — no barrel, no muzzle, no hatch, no pod
anywhere on the torso, shoulders or back. He is melee-only and nothing in this kit may fire.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN SHEARED METAL SHAVINGS, PLATING SPLINTERS AND CHIPPED FLOOR GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his two arm-blades and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real curled shavings of bright metal, hard splinters of broken plating and chips of floor stone, opaque and lit like metal - never a glow, never a flame, never an aura, never mist or smoke, never a beam or a ring of light. All of it stays low and close to him, rising no higher than his own waist, crumbling away to nothing in mid-air before any of it reaches the floor, and never coming near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a low coiled predatory beast-mech stance, his weight rocking slowly forward and
back between his two planted feet, his chest plate and its dark vent louvres flexing with slow deep
intakes, the layered shoulder slats lifting and re-seating a fraction with each breath, both forearm
blades held steady in the open scissor guard exactly as in the reference and drifting only very
slightly with his breathing, his head making tiny predator micro-adjustments while his visor stays
pointed screen-right. Feet planted, low, patient, dangerous. Returns to the exact start pose so it
loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (cross-fold chop)
STRIKE (cross-fold chop): he begins in the EXACT reference stance in strict side profile facing
screen-right; he coils his weight down onto his back leg, rolls the near blade's pivot housing over so
that blade drops FORWARD out of its raised guard - it never swings back behind him first, it falls
straight into the line of the chop - then drives it in one heavy committed diagonal chop DOWN and
ACROSS his own body, finishing with the blade tip driven into the floor INSIDE the line of his own
front foot and his hips sunk into a deep crouch, and the bite kicks up a tight burst of chipped floor
grit and stone splinters around the tip that leaps no higher than his own knee and crumbles away to
nothing in mid-air. The chop is COMPLETE by the halfway point of the clip; the whole second half is his
slow controlled rise, drawing that blade back up into the open guard and settling back into the EXACT
same reference stance. Heavy, precise, predatory.

## attack_strike_b  (hook rake across the chest)
STRIKE (hook rake): he begins in the EXACT reference stance in strict side profile facing screen-right;
he drops his hips hard and turns his shoulders down into the movement, and the RAISED far blade sweeps
IN toward his own chest in one fast tight arc at chest height, its hot inner curve raking across the
dark spine rail of the near forearm as the two pass and shearing off a short comb of curled bright
metal shavings that crumble away to nothing in mid-air, and it finishes folded flat across his own
chest with his weight low over his front leg. This is a PULLING hook, not a chop - the blade travels
inward toward his centre-line the whole way. The rake is COMPLETE by the halfway point of the clip; the
whole second half is his unfold back out into the EXACT same reference stance. Fast, tight, vicious.

## attack_throw A  (claw seize and drive down, solo-safe)
THROW (claw seize and drive down): he begins in the EXACT reference stance in strict side profile
facing screen-right; keeping both blades angled DOWN and CLOSE against his flanks, he reaches forward
with the compact dark claw-hand tucked under his near blade housing through EMPTY AIR, clamps as if
seizing an unseen foe at chest height, then wrenches down and back toward his own rear hip, his whole
body sinking over his back leg as he drives the seized weight into the floor beside his own foot, and a
low burst of chipped floor grit jumps up around that impact and crumbles away to nothing in mid-air. NO
opponent, no second figure, empty air only. The throw is COMPLETE by the halfway point; the second half
is his rise and settle back into the EXACT same reference stance.

## attack_throw_b  (low counter-hook takedown, solo-safe)
THROW (low counter-hook takedown): he begins in the EXACT reference stance in strict side profile
facing screen-right; he drops into a deep low crouch, drives the short amber counter-hook on his near
blade housing forward through EMPTY AIR at shin height, catches, and wrenches it IN and UP toward his
own hip as if sweeping an unseen foe's legs out from under them, his shoulder driving forward and DOWN
over his front knee as he does it and the long blade above that housing staying angled DOWN and CLOSE
against his own flank for the whole hook, and scuffed floor grit tears up under his planted feet and crumbles
away to nothing in mid-air. He hooks through empty air only - NO opponent, no second figure. The
takedown is COMPLETE by the halfway point; the second half is his rise back into the EXACT same
reference stance. Low, fast, brutal.

## attack_block A  (crossed-blade guard into low chop)
BLOCK-COUNTER (crossed-blade guard): he begins in the EXACT reference stance in strict side profile
facing screen-right; he snaps both forearms IN and crosses the two blades flat in front of his own
chest into a hard braced X, his weight settling back and DOWN onto his rear leg as he absorbs the
pressure and the layered shoulder slats compress under it; then he breaks the cross and drives one
short heavy counter chop DOWNWARD and inward with the near blade at hip height. The cross goes up in
the first quarter and the counter chop lands by the halfway point of the clip; the whole second half is
his slow eased settle back into the EXACT same reference stance. Braced, compact, immovable.

## attack_block_b  (shoulder-slat roll into hook drive)
BLOCK-COUNTER (shoulder-slat roll): he begins in the EXACT reference stance in strict side profile
facing screen-right; he rolls the layered slat pauldron of his leading shoulder forward into the
pressure and drops his hips hard, both blades tucked DOWN and IN tight against his own flanks and the
slats compressing one over the other as they take the hit; then he drives the amber counter-hook of his
far blade housing forward and up in one short jolt at gut height. The shoulder roll and the hip drop
fill the first quarter, the hook jolt lands by the halfway point of the clip, and the whole second half
is his slow eased settle back into the EXACT same reference stance. Neither blade edge swings at any
point in this clip - this is armour and hook only. Armoured, low, brutal.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance in strict side profile facing screen-right; his
head and shoulders snap back and to screen-LEFT, his swept-back crest horns whipping with the recoil,
his front foot skids a SHORT half-step back and his knee joints buckle under the impact, and both
blades are jarred DOWN as he clamps them in tight against his own flanks; he catches his balance and
re-plants his feet. The recoil and the skid are COMPLETE by the halfway point of the clip; the whole
second half is his slow eased recovery back into the EXACT same reference stance. His chest
and visor lead the recoil; his back is never shown. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time, and there is no light, no flare and no streak
anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance in strict side profile facing screen-right; his
knee joints give way beneath him, both blade housings go slack so the blades swing down and fold in
flat against his own body, and he pitches heavily forward and down onto the floor, coming to rest fully
prone and motionless with both arm-blades folded flat along the ground beside him, a small puff of
floor dust rising where he lands and drifting away to nothing. He is fully down and completely still by
two thirds of the way through the clip and simply lies there, unmoving, for the whole rest of it. He is
ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any time. Only
his own body moves. He does NOT get back up.

## victory  (blade planted, guard folded)
VICTORY (planted blade, folded guard): he begins in the EXACT reference stance in strict side profile
facing screen-right. IN THE FIRST QUARTER OF THE CLIP he swings the near blade FORWARD and DOWN in one
short arc and sets its tip into the floor beside his own front foot, folds the far blade IN flat
across his own chest, and sinks
his weight low over both planted feet, a low puff of floor dust kicking up and drifting away to
nothing. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW FOLDED POSE and only his head, chest
and shoulder slats move - his chest plate heaves with deep slow intakes, the vent louvres across it
flex open and shut, the layered shoulder slats ripple and re-seat one plate at a time, and his chin
drops a fraction and lifts no higher than his own visor; his hips, both feet and both blades stay
exactly where they are, he does not step, does not pivot and does not straighten up, and the planted
blade tip stays ON THE FLOOR that entire time. IN THE FINAL QUARTER he draws that tip back up off the
floor and unfolds the far blade back out to the EXACT height and angle they have in the reference image
- never higher, never vertical - and settles into the EXACT same reference stance. Both blades go DOWN
and IN, never up. Proud, low, predatory.

## special_1  (TIGER SCISSOR) — both blades scissor shut across the centre-line, body sinking
SPECIAL FINISHER (tiger scissor): he begins in the EXACT reference stance in strict side profile facing
screen-right; he coils his whole body down into a deep braced crouch, then SNAPS both forearms in at
once so the two scythe blades sweep IN from the open guard and scissor shut across his own centre-line
at chest height, the two hot inner edges shearing hard past one another at the crossing, and that shear
BLASTS a tight burst of curled bright metal shavings and splintered plating flakes out of the crossing
point - rising no higher than his own waist, spreading no wider than one body-width to either side, and
crumbling away to nothing in mid-air while he holds the low crouch. The debris is SOLID METAL: opaque,
curled, sharp-edged and lit like steel - never a glow, never a beam, never a shockwave of light. The
scissor is COMPLETE by the halfway point of the clip; the whole second half is his slow controlled
rise, unfolding both blades back out into the EXACT same reference stance. Fast, brutal, final.

## special_2  (MANTIS PIN) — both tips driven into the floor, held, wrenched out
SPECIAL FINISHER (mantis pin): he begins in the EXACT reference stance in strict side profile facing
screen-right; in the first quarter he rears his shoulders back a fraction and then collapses his whole
body straight DOWN into the lowest crouch of his kit, driving BOTH blade tips into the floor in front
of his own feet at once and pinning them there with his full weight through both forearms, and the
floor SHATTERS around the two tips - solid chipped stone, broken plating splinters and grit jumping up
around them, rising no higher than his own knee, spreading no wider than one body-width to either side,
and crumbling away to nothing in mid-air. The debris is SOLID STONE AND METAL: opaque, chunky,
sharp-edged - never a glow, never a flame, never a ring of light. HE HOLDS THAT PINNED CROUCH FOR THE
WHOLE MIDDLE HALF OF THE CLIP with his weight bearing down through both blades and only his chest and
shoulder slats moving; IN THE FINAL QUARTER he wrenches both tips back up out of the floor and rises
into the EXACT same reference stance. Heavy, low, final.

## special_3  (PREY-FOLD) — the clamp closes and STAYS closed while the whole body wrenches down
SPECIAL FINISHER (prey-fold): he begins in the EXACT reference stance in strict side profile facing
screen-right. IN THE FIRST QUARTER OF THE CLIP he clamps both blades shut around EMPTY AIR at gut
height, the two hot inner edges closing onto one another and STAYING closed - nothing caught between
them but air, NO opponent and no second figure. FOR THE WHOLE MIDDLE HALF he WRENCHES that locked clamp
down and back over his rear leg in one long sustained twist, his shoulders rolling down, his hips
sinking through the movement until he is folded into a deep low crouch, and the two edges grinding hard
against each other the whole way so a steady comb of curled bright metal shavings shears off the
crossing and crumbles away to nothing in mid-air, staying close in against his own body and rising no
higher than his own waist. The shavings are SOLID METAL: opaque, curled, sharp-edged - never a glow,
never an aura, never a trail of light. IN THE FINAL QUARTER he releases the clamp, unfolds both blades
and rises back into the EXACT same reference stance. Slow, crushing, final.
