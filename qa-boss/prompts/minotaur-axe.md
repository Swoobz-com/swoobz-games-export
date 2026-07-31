# MINOTAUR AXE — MK FINAL playable #2. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/minotaur-axe-anchor-green.png`, never the raw
`input/MK FINAL/mythic/Minotaur Axe.png`. The raw plate is 1860x1536 with the subject at 1781x1456 —
L54 / R25 / T39, filling 95% of frame height. That is tighter than hollow-pale, who owns the worst
anchor break in the roster, and it is hostile for a fighter whose weapon is longer than he is wide.
The padded plate measures **L222 / R224 / HEADROOM 620**, verified by
`node qa-boss/measure-anchor-budget.mjs`. Plate uniformity: top green bin 76.3%, two near-identical
tones (216/208) — clean enough, no re-plate needed.

## ★ MINOTAUR FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1090w x 891h** (fills 58.0% of frame height), bbox x222..x1311,
y620..y1510.
  LEFT **222px** · RIGHT **224px** · HEADROOM **620px** · bottom free (hooves on the floor line).

**HE IS DOUBLE-ENDED — read this before writing any beat.** His own body is only ~571px wide
hoof-to-hoof (x302..x873). The axe accounts for essentially the whole 1090px bbox: it spans 1088px of
it, 71% of the plate width, and **BOTH extremes of the subject are prop, not body** — the axe-head tip
at x1311 owns the 224px on the right, the spiked haft-butt at x223 owns the 222px on the left. That is
the oni/satoshi shape doubled: pulling one end in pushes the other end out, so a bound on one tip alone
is not a bound at all.

  1. **ROTATE THE AXE, NEVER SHOVE IT.** Both tips sit at their maximum horizontal reach in the
     reference, so ANY rotation out of that near-horizontal carry pulls BOTH tips inward — a downward
     cleave and a rising cut are each geometrically *safer* than the anchor pose. What kills the budget
     is TRANSLATION: a forward thrust drives the axe head into the 224px, a rearward haul drives the
     butt spike into the 222px, a lunge drives everything. Every beat is an ARC about his own hands.
  2. **NEVER FULLY VERTICAL, NEVER OVERHEAD.** 620px of ceiling sounds generous until you measure the
     prop: the axe head alone is 380x313 with ~700px of haft under it. Swung vertical from a chest-height
     grip the head clears his horns and keeps going. Bound the **AXE HEAD** and the **BUTT SPIKE**, not
     the hands — a height bound on the body has never once bounded a long prop (learned four times).
  3. **HIS DIRECTION IS DOWN.** The bottom edge is free — `check-containment.mjs` treats hoof contact as
     expected and never counts it. A cleave into the floor shrinks his span AND buys the debris beat.
  4. **SPAN CAP 1.41x — TIGHTER THAN THE 1.60 HARD RULE, so 1.41 governs.** 1090 x 1.41 = 1537px = the
     plate width exactly. The cap comes from the prop, not the body; his stance stays narrow, no lunges,
     no spreading.
  5. Effects are **SOLID MATERIAL** — splintered flagstone, sharp stone chips, kicked grit, clods of
     broken floor. Never a glow, flame, aura or mist. And his blade already carries a baked warm amber
     edge-line: it must stay exactly as dim as the reference, because an emissive that blooms lights the
     chroma plate and the key keeps it as an olive halo.

Shared prefix:
> The EXACT SAME huge dark grey minotaur bull-brute from the reference image (identical charcoal-grey
> hide, a heavy bull's head with a broad muzzle, wide flared nostrils, deep-set dark eyes under a heavy
> brow, pointed bovine ears and a snarling mouth showing blunt yellowed teeth, two thick pale bone-tan
> horns curving up and outward from his skull with darker tips, a brown leather harness strapped over
> his shoulders with engraved gold meander plates meeting a heavy brass ring at his chest, a studded
> pale steel gorget plate at the base of his neck, a riveted steel pauldron on his near shoulder,
> banded brown leather bracers on both forearms, a wide dark leather belt with a round gold medallion
> buckle, dark leather hip tassets, a ragged tan cloth kilt with an embossed scrollwork panel and a
> torn frayed hem, massive muscled legs ending in split cloven hooves, and brass-trimmed steel
> hoof-guards over both lower legs; he grips in BOTH hands a huge double-bladed battle-axe on a long
> dark iron haft - twin crescent steel blades with bronze runic panels and a warm amber heat-line along
> their outer edges, a short steel spike above the head, a leather-wrapped grip, and a bronze-collared
> four-sided spike on the butt of the haft), standing on a solid saturated GREEN chroma screen (bright
> green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His charcoal hide, pale horns, gold-trimmed harness and belt, leather bracers, hip tassets, ragged
> cloth kilt, steel hoof-guards and the double-bladed axe stay EXACTLY the same the entire clip. He
> keeps the axe in his hands the whole time and never drops or swaps it. The amber heat-line on the
> blade edges stays exactly as dim as in the reference image and never brightens, flares, trails or
> throws light onto anything. The axe stays FULLY INSIDE the frame at ALL times and NEVER extends past
> any edge of the frame: the AXE HEAD never travels further toward screen-right
> than it does in the reference image, and the SPIKED BUTT of the haft never travels further toward
> screen-left than it does in the reference image. The AXE HEAD is NEVER raised above his own horns and
> the axe is NEVER swung fully vertical or overhead at any moment. HIS FEET STAY FLAT ON THE GROUND FOR
> THE ENTIRE CLIP - he never jumps, never leaps, never hops and never lunges out into a wide stance; he
> keeps his stance narrow and never spreads wider than about one and a quarter times his standing
> width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera,
> and his body holds the SAME angle to camera it has in the reference image - it never opens further
> toward the viewer and never turns away. His mouth stays as it is in the reference image - he never
> talks and his jaw never chatters. The camera is absolutely locked, no zoom,
> no pan, his full body always fully in frame, he is the ONLY figure in frame at all times,
> nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. Three literals above are load-bearing for `ko` and must not be re-worded. The KO-SUFFIX
RULE strips (a) the weapon-lock sentence, which it matches on `keeps the ... in his hands ... never
drops or swaps`, so "in BOTH hands" would NOT have matched and the ko would have been ordered to hold
an axe it drops; (b) the anchor lock, matched on `begins and ends on the EXACT same reference stance`;
and it REWORDS (c) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` — spelled "HOOVES" that
rewrite silently misses and a prone collapse ships with its feet locked flat. The identity lock is
written as its OWN sentence so the strip cannot take it as collateral, and law 7 (first==last as its own
sentence) is carried per-state instead: every non-ko action line ends "back into the EXACT same
reference stance".
FACING, judgement call: his plate is not a razor-thin profile — his hips and chest sit open to camera by
roughly a third of a turn, with head, axe and intent committed to screen-right. So no line orders "strict
side profile", which would make the model re-pose him toward pure profile mid-clip; every line says
"angled to camera exactly as in the reference image and facing screen-right", and the suffix bans the
turn in both directions.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT, STONE CHIPS AND SPLINTERED FLOOR-STONE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his double-bladed axe and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, shards and clods of broken stone and grit, opaque, sharp-edged and lit like rock - never a glow, never a flame, never an aura, never mist or smoke. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own chest and spreading no wider than one body-width to either side, and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a heavy grounded bull-brute stance, his weight low and even over both cloven
hooves, the axe held steady in both hands exactly as in the reference. ONE full slow breath fills the
first half of the clip and a second fills the second half: on each one his ribs and shoulders swell and
sink, his nostrils flare and he blows out, his ears twitch back and then forward, his head settles a
fraction lower on his thick neck the way a bull sizes up the ground in front of it and rises again, and
his weight rolls slowly from his rear hoof onto his front hoof and back. The ragged cloth of his kilt
and the loose straps of his harness sway faintly with him and the brass ring at his chest swings a
little. Hooves planted, heavy and menacing. Returns to the exact start pose so it loops seamlessly.
Slow, controlled, subtle motion.

## attack_strike A  (downward floor cleave)
STRIKE A (floor cleave): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he coils his weight down onto
his rear leg and rolls the axe head back and DOWN, then he drives it in one heavy committed arc DOWNWARD
into the stone floor just in front of his leading hoof - the whole haft turning about his own hands, so
the axe head travels down and IN toward his own body while the spiked butt swings up behind him and
stops at his own shoulder, never higher. The blade bites the floor and knocks a burst of solid
splintered flagstone and grit UPWARD around the blade, rising no higher than his own knee and staying
within one body-width of him, every piece crumbling away to nothing in mid-air as it falls. THE CLEAVE
HAS LANDED BY THE HALFWAY POINT OF THE CLIP; the whole second half is his slow heavy haul of the blade
back up to the EXACT height and angle it has in the reference image and his settle back into the EXACT
same reference stance. Heavy, brutal, final.

## attack_strike_b  (rising gore-line cut)
STRIKE B (rising gore-line cut): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he hunches his skull down between his
shoulders and sinks the axe head DOWN and IN beside his own leading knee, loading his hips; then he
drives up out of his legs and rips the blade UP the front of his own body in one short savage cut that
follows the exact line his own horns sweep, his head and shoulders snapping up with it - and the AXE
HEAD STOPS AT HIS OWN SHOULDER, never higher, staying closer to his body for the whole cut than it sits
in the reference. His rear hoof grinds on the stone as he drives and scuffs a little grit UP off the
floor, no higher than his own ankle, crumbling away to nothing in mid-air as it falls; nothing else
sheds and nothing breaks - this is a clean edge. THE CUT IS COMPLETE BY THE HALFWAY POINT; the whole
second half is his controlled settle back down into the EXACT same reference stance, the blade riding
back down to the height it has in the reference image. Fast for his size, savage, compact.

## attack_throw A  (horn hook and drive-down, solo-safe)
THROW A (horn hook and drive-down): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; keeping BOTH hands on the axe and hauling it DOWN and IN
across his own thighs so the head sits closer to his body than in the reference, he dips his skull and
hooks his near horn under an unseen weight at his own chest height in EMPTY AIR - there is NO opponent
and no second figure, nothing else in the frame at any time. THE HOOK IS SET BY THE END OF THE FIRST
THIRD; then he wrenches his neck, shoulders and hips DOWN in one brutal committed drive and slams that
weight into the floor beside his leading hoof, his knees folding deep and his whole mass going down with
it, so THE DRIVE HAS LANDED BY THE HALFWAY POINT. A scatter of solid grit and stone chips is knocked
UPWARD off the floor where it lands, rising no higher than his own knee, every piece crumbling away to
nothing in mid-air as it falls. The whole second half is his slow rise back up into the EXACT same
reference stance.

## attack_throw_b  (shoulder barge, solo-safe)
THROW B (shoulder barge): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; he drops his near shoulder, levels his horns and drives one
short heavy barge forward out of his hips WITHOUT stepping his hooves apart and without leaving the spot
he stands on, hauling the axe DOWN and IN across his own thighs as he goes so the axe head finishes the
barge nearer his body than it sits in the reference. His hooves grind and skid a little on the stone and
scuff grit UP off the floor, no higher than his own ankle, crumbling away to nothing in mid-air as it
falls. He barges through EMPTY AIR only - NO opponent, no second figure, nothing else in frame. THE
BARGE HAS LANDED BY THE HALFWAY POINT; the whole second half is his weight rocking back over his rear
hoof and his settle back into the EXACT same reference stance. Heavy, blunt, brutal.

## attack_block A  (haft brace)
BLOCK-COUNTER A (haft brace): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he brings the long haft ACROSS the front of
his own body with both hands into a hard braced guard at chest height, the axe head angled DOWNWARD and
pulled IN so it sits closer to his body than in the reference, his skull tucked down between his
shoulders and his weight settling back onto his rear leg. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE
HALF OF THE CLIP as he absorbs the pressure - his hooves grind a fraction backwards on the stone, his
forearms shake under the load and his shoulders roll and reset, but the guard itself does not move and
nothing else in his body travels. IN THE FINAL QUARTER he drives the braced haft one short heavy shove
forward out of his chest - short enough that the axe head is still nearer his body at the end of it than
it is in the reference - and flows in one eased motion back into the EXACT same reference stance.
Braced, immovable, brutal.

## attack_block_b  (skull guard)
BLOCK-COUNTER B (skull guard): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the axe DOWN and IN to his own
side in both hands, drops his skull and rolls both shoulders forward so the heavy bone plate between his
horns is what meets the pressure, chin tucked hard to his chest, back curved, weight settling onto his
rear leg. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - his hooves grind a
fraction backwards, his neck and shoulders shudder under the load, his ears flatten back, and the axe
stays low and still at his side and never rises and never swings for one frame of it. IN THE FINAL
QUARTER he drives up out of his knees and shrugs one short heavy shoulder-and-horn shove forward, his
muzzle rising no higher than his own horns, then flows in one eased motion back into the EXACT same
reference stance. Braced, compact, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his head and shoulders snap back and to screen-LEFT, his horns swinging
wide with the recoil, his leading hoof skidding a SHORT half-step backwards across the stone and his
knees buckling under his own weight, and he hauls the axe IN TIGHT across his own body with both hands
as his arms are jarred. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance
through the middle of the clip - ears flat back, the ragged cloth of his kilt whipping, his weight
rolling back over his rear hoof, his shoulders juddering. IN THE LAST THIRD he catches his balance,
plants both hooves and flows in one eased recovery back into the EXACT same reference stance. His chest
and face lead the recoil; his back is never shown. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time, and there is no light, no flare and no streak
anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his legs give way beneath him, his head
drops, his grip opens and the axe falls out of his hands to the floor beside him. BY THE HALFWAY POINT
he has crumpled heavily forward and down onto the ground and come to rest fully prone and motionless,
and a scatter of solid grit is knocked UPWARD off the floor where he lands, rising no higher than his own
fallen shoulder, every piece crumbling away to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF
OF THE CLIP HE LIES COMPLETELY STILL, face down and heavy - he does not stir, does not lift his head, does
not push up on an arm and he does NOT get back up. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time. Only his own body moves.

## victory  (axe planted, bull's blow)
VICTORY (planted axe): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he rolls the axe head DOWN in
one heavy arc and plants it on the floor beside his leading hoof, the haft leaning back up across his
body with the spiked butt behind him no higher than his own shoulder, and he leans his weight down onto
the haft with both hands; a scatter of grit is knocked UP where the blade sets down, no higher than his
own knee, crumbling away to nothing in mid-air as it falls. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE
HOLDS THAT LEANING POSE and only his head, neck and chest move - his chest heaves with slow deep breaths,
his nostrils flare and he blows out hard twice like a bull cooling off, his ears flick flat back and then
forward, and his muzzle rises no higher than his own horns. His shoulders, hips and both hooves stay
exactly where they are, he does not step, does not pivot and does not straighten up, and the axe head
stays ON THE FLOOR that entire time. IN THE FINAL QUARTER he draws the blade back up off the floor to the
EXACT height and angle it has in the reference image - never higher, never vertical - and settles into
the EXACT same reference stance. The axe head goes DOWN to the floor, never up. Proud, heavy, spent.

## special_1  (LABYRINTH BREAKER) — full-force cleave, the floor splits
SPECIAL FINISHER (labyrinth breaker): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the axe head back and
DOWN and coils his whole body into a deep braced crouch over both hooves, skull dropping between his
shoulders, then he drives the blade DOWN into the stone floor in front of his own hooves with everything
he has, the haft turning about his hands so the head goes down and IN while the spiked butt rises behind
him no higher than his own shoulder. AT THE HALFWAY POINT the floor SPLITS - solid slabs of broken
flagstone, sharp stone chips and grit are BLASTED UPWARD around the buried blade, rising no higher than
his own knee, spreading no wider than one body-width to either side of him, every piece crumbling away to
nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged, lit like
stone - never a glow, never a flame, never a ring of light. HE HOLDS THE DEEP CROUCH THROUGH THE WHOLE
THIRD QUARTER, shoulders heaving, the blade sunk in the split stone. IN THE FINAL QUARTER he hauls it up
out of the floor to the EXACT height and angle it has in the reference image and rises slowly back into
the EXACT same reference stance. Heavy, brutal, final.

## special_2  (PILLAR DRIVER) — the butt spike punched into the floor
SPECIAL FINISHER (pillar driver): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he rolls the whole axe over in his
hands THE OTHER WAY - the axe head tipping back and up toward his own leading shoulder, never above his
own horns, while the spiked butt of the haft drops down toward the floor behind his rear hoof - and he
sinks his hips into a deep braced crouch under it. Then he drives that spike DOWN into the stone with
both hands and his whole weight behind it, and AT THE HALFWAY POINT it punches into the floor: a tight
cone of solid stone shards and grit is knocked UPWARD around the spike, rising no higher than his own
knee, spreading no wider than one body-width, every piece crumbling away to nothing in mid-air as it
falls. The debris is SOLID BROKEN STONE: opaque, chunky, sharp-edged, lit like rock - never a glow,
never a flame, never a shockwave of light. HE HOLDS THE BRACED CROUCH OVER THE BURIED SPIKE THROUGH THE
WHOLE THIRD QUARTER, leaning his weight down on the haft. IN THE FINAL QUARTER he hauls the spike back
up out of the floor and rolls the axe down to the EXACT height and angle it has in the reference image,
settling into the EXACT same reference stance. Heavy, jarring, final.

## special_3  (STONE GORE) — horns hooked into the floor and ripped up
SPECIAL FINISHER (stone gore): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right, the axe hauled LOW and CLOSE in both hands across his own
thighs for the entire clip, the head nearer his body than it sits in the reference and never rising.
THROUGH THE FIRST HALF OF THE CLIP he drops his skull, levels his horns and RAKES his leading cloven
hoof backwards across the stone twice the way a bull paws before it charges - the hoof never leaving the
floor - each rake knocking a little grit UP off the stone, no higher than his own ankle, every piece
crumbling away to nothing in mid-air as it falls, his weight rocking back over his rear leg and his
shoulders bunching. Then he folds his whole body DOWN over his own leading hoof, without travelling
forward off the spot he stands on, and HOOKS BOTH HORNS INTO THE STONE FLOOR in front of that hoof;
AT THE SIXTY PERCENT MARK he rips his head, neck and shoulders UP out of it with everything
he has, tearing loose a burst of solid torn flagstone and stone shards that is thrown UPWARD off the
floor with his horns, rising no higher than his own chest, spreading no wider than one body-width, every
piece crumbling away to nothing in mid-air as it falls. His horn tips rise no higher than they sit in the
reference image and his hooves stay planted the whole time. The debris is SOLID BROKEN STONE: opaque,
jagged, lit like rock - never a glow, never a flame, never a ring of light. THE FINAL QUARTER is his
heavy settle back down into the EXACT same reference stance. Savage, animal, final.
