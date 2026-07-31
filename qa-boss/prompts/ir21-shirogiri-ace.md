# IR-21 SHIROGIRI ACE — XGundam roster. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir21-shirogiri-ace-anchor-green.png`, never the raw
`input/MK FINAL/XGundam not sorted/IR-21 Shirogiri Ace.png`. The raw art measured **L110 / R116 /
HEADROOM 85** — 85px of ceiling and a max span of 1.15x, which is unwritable. Padding at fill 0.68
(no step-down needed; `qa-boss/xg/prep-plates.mjs` reports **chroma-detail CLEAN**, so the green plate
is safe for him) buys **L218 / R218 / HEADROOM 468** and a max span of 1.40x. He is still the
WIDEST-AT-FULL-FILL character in this batch — 1100px of subject in a 1536px frame — so 218px per side
is all there is.

## ★ SHIROGIRI FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1100w x 1044h** (fills 68.0% of frame height), bbox x218..x1317, y468..y1511.
  LEFT **218px** · RIGHT **218px** · HEADROOM **468px** · bottom free (feet on the floor line).
  Max span that still fits = **1.40x** — TIGHTER than the 1.60x roster hard rule, so 1.40x is the cap.

**HE IS DOUBLE-PROP-EXTENDED, AND THAT IS THE WHOLE PROBLEM.** He carries TWO katanas, each roughly
**530px from tsuba to tip**. Probed row by row, the right-hand 218px band of the plate (x1240..x1317)
is occupied by exactly ONE thing: the LEAD katana's tip, a 1872px sliver living in rows y538..y605.
Nothing else of him comes within 100px of the right edge. The off katana's tip sits ~110px further in
at hip height. So the right margin is not "his" margin — it belongs to a blade tip, and it is already
spent. Meanwhile his left side at torso height (rows y568..y718) starts at x368..x429, i.e. **368-429px
of clearance, nearly double the right**; his true left extreme (x218) is only his REAR SANDAL on the
floor line, with the black scabbard tip 21px inside it at hip height. The frame is lopsided, and every
beat in this kit exploits that.

  1. **BOUND THE BLADE TIPS, NOT THE HANDS.** A height or width bound on the body does not bound a
     530px katana — the hands obey and the tip overruns anyway (the phase-58/61 lesson, learned four
     separate times). Both tips are named explicitly in the suffix. Neither blade tip EVER travels
     further screen-RIGHT than the lead blade's tip already sits in the reference.
  2. **ONLY ONE BLADE WORKS AT A TIME.** Two blades is a containment MULTIPLIER: a beat that swings
     both outward at once covers twice the arc of a single-sword fighter inside the same 218px. So the
     second katana is always TUCKED — rolled point-DOWN beside a thigh with its tip just off the floor
     (zero horizontal cost, and the bottom edge is free), laid flat against a forearm, or swept back —
     while the first one works. A and B takes SWAP which blade has which job, which is also what makes
     them genuinely different attacks instead of one cut described twice.
  3. **EVERY CUT TRAVELS DOWN AND INWARD, TOWARD SCREEN-LEFT.** His roomy side is his back side. A cut
     that finishes tucked against his own opposite forearm, rear thigh or far hip is both the correct
     kenjutsu shape AND the only shape the margins allow. Nothing ever reaches out to screen-right.
  4. **NEVER A FULL OVERHEAD RAISE, AND NO WIND-UP THAT LIFTS A TIP.** 468px of ceiling against a 530px
     blade: raised vertical from a head-height grip the tip clears the frame top by ~20px, which is to
     say it does not clear it. The lead tip already sits only 70px below his helmet crest, so **neither
     blade tip is ever raised above the top of his own helmet crest.** That is a bound the model can
     SEE on the character instead of a pixel number it cannot. The coil for a cut lives in his HIPS,
     not in a raised blade.
  5. **HIS DIRECTION IS DOWN, AND HIS STANCE IS ALREADY WIDE.** `check-containment.mjs` treats floor
     contact as expected and never counts it, so a point driven into the floor costs nothing. His
     stance alone already spans 663px at ankle height, so at 1.40x he is touching BOTH edges at once —
     a lunge has nothing to spend. Downward drives, low drags toward his own feet and inward scissors;
     never a lunge.
  6. **EFFECTS ARE SOLID MATERIAL** — sheared steel shavings, curls and flecks struck off the two edges
     as they cross; stone chips and grit off the floor; pale white lacquer flakes off his own plating.
     Never a glow, flare, aura, beam, mist or trail: an emissive effect lights the chroma plate and the
     key keeps it as an olive halo (the session-14 bloom-lit-plate class). **And his one emissive
     feature — the heated amber line tempered along each cutting edge — NEVER flares, brightens or
     trails.** It is exactly the detail the model will want to turn into a light show, so it is locked
     in the suffix.

Shared prefix:
> The EXACT SAME white-and-crimson armoured mech samurai from the reference image (identical glossy
> pearl-white armour panels trimmed in deep crimson red, a white armoured samurai helm with a raised
> crest-fin sweeping up and back off the crown, a deep crimson faceplate mask covering the lower half
> of his face and a narrow angular crimson visor slit for eyes, a layered white gorget at his throat, a
> big multi-banded crimson lamellar shoulder plate over his back shoulder, white upper-arm and forearm
> plates with dark crimson vambrace bands at the wrists, white segmented gauntlet hands, a white chest
> and abdomen shell with a dark crimson chest strap and a crimson waist band, crimson hip and groin
> armour, white thigh plates with crimson wedge trim, dark grey circular knee joints ringed in crimson,
> white greaves and white armoured sandal-boots with crimson soles and a dark toe strap, and a long
> black lacquered scabbard worn on his hip that juts out behind him, and he holds TWO identical katanas,
> one in each gauntlet - black and crimson wrapped hilts, dark round tsuba guards, pale steel blades
> each carrying a narrow heated amber-orange line tempered along its cutting edge as part of the steel
> itself), standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing pink or
> magenta anywhere).

Shared suffix (carries the seven prompt laws — every state inherits these):
> His armour, helm, crest-fin, faceplate, gorget, crimson shoulder plate, scabbard and both katanas stay
> EXACTLY the same the entire clip. He keeps the two katanas in his hands the whole time and never drops
> or swaps them. The heated amber line along each cutting edge stays exactly as it is in the reference
> image and never flares, never brightens, never trails and never throws light onto anything. BOTH BLADE
> TIPS stay FULLY INSIDE the frame at ALL times and NEVER extend past any edge of the frame, and NEITHER
> blade tip EVER travels further toward screen-right than the lead blade's tip does in the reference
> image. NEITHER BLADE TIP IS EVER RAISED ABOVE THE TOP OF HIS OWN HELMET CREST and neither katana is
> ever swung fully vertical or overhead at any moment. HIS FEET NEVER LEAVE THE GROUND AT ANY POINT IN
> THE CLIP and both sandals stay flat while he is standing - he never jumps, never leaps, never hops
> and never lunges out into a wide stance; he keeps his
> stance narrow and never spreads wider than about one and a quarter times his standing stance width. He
> stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera. The camera is
> absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure in frame
> at all times, nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside a blockquote is sent to the model as instructions.
The suffix's weapon-lock and anchor-lock are written as their OWN sentences, each starting after a full
stop, because build-prompt.mjs's KO-SUFFIX RULE strips them by regex for `ko` only — oni-tetsubo.md
welded its identity-lock onto the front of the weapon-lock sentence, so its `ko` build loses the
identity lock as collateral. Splitting them here keeps "his armour stays EXACTLY the same" alive on the
ko. The closing sentence is worded "begins and ends on the EXACT same reference stance" ON PURPOSE:
that is the literal the stripper matches. Law 7 (first==last) is carried per-state instead — every
non-ko action line ends "back into the EXACT same reference stance".

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN SHEARED STEEL SHAVINGS, STONE CHIPS AND KICKED GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his two katanas and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real curls and flakes of bright sheared steel, real chips of stone and clods of broken floor, opaque and lit like metal and rock - never a glow, never a flame, never an aura, never a beam, never a ring of light, never mist or smoke. All of it stays low and close to him, rising no higher than his own waist, crumbling away to nothing in mid-air before any of it reaches the floor, and never coming near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a poised two-sword mech guard, his weight settled between both armoured
sandals, his chest shell rising and falling with a slow machine breath so the banded crimson shoulder
plate lifts and settles band by band, the lead katana held rock-steady at exactly the height and angle
it has in the reference while the lower katana drifts a hand's width and comes back, small weight
shifts from sandal to sandal, and his helmet tipping a few degrees down and back up as he tracks
something ahead of him. Feet planted, coiled, patient. Returns to the exact start pose so it loops
seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (descending kesa cut, lead blade)
STRIKE A (descending kesa cut, lead blade): he begins in the EXACT reference stance in strict side
profile facing screen-right; he sinks his weight back onto his rear sandal and loads his hips WITHOUT
lifting the lead blade out of the angle it holds in the reference, and the lower katana rolls flat and
TUCKED against his opposite forearm; then he drives his whole mass forward onto his front sandal, his
shoulders and hips turning through the cut together, and drops the LEAD katana on a hard diagonal, its
tip sweeping DOWN and INWARD across his own centreline to finish low beside his front knee - and at the
bottom of the cut the descending edge rakes across the spine of the tucked blade and shears off a tight
spray of solid bright steel shavings and flecks that crumbles away to nothing in mid-air before falling
back down. The cut is COMPLETE by the halfway point of the clip; the whole second half is his controlled
settle back up into the EXACT same reference stance. Sharp, weighted, decisive.

## attack_strike_b  (low reverse sweep, off blade)
STRIKE B (low reverse sweep, off blade): he begins in the EXACT reference stance in strict side profile
facing screen-right; he drops into a deep bend on both knees so his hips sink a full head's height, and
as he sinks he snaps the LEAD katana up and ACROSS the front of his own chest into a flat high guard,
its tip pulled IN and held below the top of his own helmet crest; at the same moment the LOWER katana
whips backward at shin height, its edge clipping the ground in front of his front sandal and shearing a
low burst of solid stone chips and grit up off the floor that crumbles away to nothing in mid-air before
falling back down, and the blade runs on until it finishes tucked in flat against his own rear thigh.
The sweep is COMPLETE by the halfway point of the clip; the whole second half is his rise back up into
the EXACT same reference stance. Low, fast, brutal.

## attack_throw A  (scissor trap and wrench-down, solo-safe)
THROW A (scissor trap and wrench-down): he begins in the EXACT reference stance in strict side profile
facing screen-right; he steps his front sandal a SHORT half-pace forward and drives BOTH katanas inward
through EMPTY AIR so the two edges close on each other in one hard scissor at his own chest height, as
if trapping an unseen weapon between them; then he rotates his hips hard, drops his whole weight through
his front leg and WRENCHES the crossed blades down and back toward his own rear hip, driving the trapped
weight into the floor beside his own sandals, and his front sandal skids under him and kicks a burst of
solid grit and floor chips up around his ankles that crumbles away to nothing in mid-air before falling
back down. NO opponent, no second figure, empty air only. The trap and the wrench are COMPLETE by the
halfway point; the whole second half is his settle back into the EXACT same reference stance.

## attack_throw_b  (pauldron barge, solo-safe)
THROW B (pauldron barge): he begins in the EXACT reference stance in strict side profile facing
screen-right; he rolls BOTH katanas point-DOWN so the two blades hang straight down beside his own
thighs with their tips just off the floor and stay there for the whole clip, then he drops the big
banded crimson shoulder plate, coils his back leg and drives a short heavy barge forward from the hips,
his whole torso and both sandals grinding a half-pace forward together WITHOUT spreading his stance, and
grit scuffs up off the floor under both planted sandals and crumbles away to nothing in mid-air. He
barges through empty air only - NO opponent, no second figure. The barge is COMPLETE by the halfway
point; the second half is his settle back into the EXACT same reference stance. Heavy, armoured,
committed.

## attack_block A  (crossed-blade catch into scissor counter)
BLOCK-COUNTER A (crossed-blade catch): he begins in the EXACT reference stance in strict side profile
facing screen-right; he drives BOTH katanas up and inward across the front of his own chest so the two
blades lock into a hard X at chest height with both tips angled DOWNWARD and pulled IN toward his own
body, his rear knee bending and his whole frame sinking backward over that leg as he absorbs the
pressure - and where the two edges grind across each other they shear off a scatter of solid bright
steel shavings that crumbles away to nothing in mid-air. Then he drives back up out of the sink with one
short scissor-counter, snapping the crossed blades apart and DOWN across his own centreline, and flows
in one eased motion back into the EXACT same reference stance. Braced, precise, unmoved.

## attack_block_b  (parry-slip into pommel counter)
BLOCK-COUNTER B (parry-slip): he begins in the EXACT reference stance in strict side profile facing
screen-right; he rolls the LOWER katana flat and sweeps it up across his own chest on a short diagonal
that stops with the tip level with his own rear shoulder, slipping the pressure off behind him, his
shoulders and hips twisting with it and his weight rolling all the way through onto his rear sandal,
while the LEAD katana drops point-DOWN beside his front thigh with its tip just off the floor and stays
there; then he snaps a short armoured gauntlet-pommel strike forward at chest height off the end of the
parry, his hips driving back the other way underneath it, and flows in one eased motion back into the
EXACT same reference stance. Compact, technical, unhurried.

## hit  (armoured stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance in strict side profile facing screen-right; his
helmet and both shoulders snap back and to screen-LEFT, the banded crimson shoulder plate jolting band
by band, his front sandal skids a SHORT half-step back and both knees buckle under the impact, and both
katanas are jarred IN TIGHT against his own body with their tips dropping toward the floor as his arms
are driven back; the impact shears a scatter of pale white lacquer flakes and paint chips off his own
chest plating that crumbles away to nothing in mid-air before falling back down. He catches his balance
over the rear leg, plants both sandals and flows in one eased recovery back into the EXACT same
reference stance. His chest and faceplate lead the recoil; his back is never shown. He is ALONE in an
empty frame - nothing whatsoever enters, crosses or appears in the frame at any time, and there is no
light, no flare and no streak anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance in strict side profile facing screen-right; his
knees fold under him, both katanas slip out of his gauntlets and fall away out of sight beneath his own
body, and he pitches heavily forward and down onto the ground, his armoured shoulder taking the impact,
coming to rest fully prone and motionless with his faceplate turned toward the floor; a scatter of pale
white lacquer flakes shears off his plating as he lands and crumbles away to nothing in mid-air. He is
ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any time. Only
his own body moves. He does NOT get back up.

## victory  (blade planted, slow bow)
VICTORY (planted blade): he begins in the EXACT reference stance in strict side profile facing
screen-right. IN THE FIRST QUARTER OF THE CLIP he turns the LOWER katana point-DOWN and drives its point
into the floor beside his own front sandal, a low burst of solid stone chips and grit jumping up around
it and crumbling away to nothing in mid-air, and he settles his weight down over that planted hilt while
the LEAD katana drops point-DOWN beside his other thigh with its tip just off the floor. FOR THE WHOLE
MIDDLE HALF OF THE CLIP HE HOLDS THAT POSE and only his helmet and chest move - his faceplate lowers
into a slow deliberate bow and comes back level while his chest shell heaves once and the banded crimson
shoulder plate settles band by band; his shoulders, hips and both sandals stay exactly where they are,
he does not step, does not pivot and does not straighten up, and the planted point stays IN THE FLOOR
that entire time. IN THE FINAL QUARTER he draws both katanas back up to the EXACT heights and angles
they hold in the reference image - never higher - and settles into the EXACT same reference stance. Both
blades go DOWN to the floor, never up. Proud, precise, unhurried.

## special_1  (SHIROGIRI CROSS) — the twin-blade scissor, sheared steel
SPECIAL FINISHER (shirogiri cross): he begins in the EXACT reference stance in strict side profile
facing screen-right; he coils his whole body down into a deep braced crouch, his hips sinking a full
head's height while both sandals stay exactly where they are, then he snaps BOTH katanas inward across
his own centreline at once so the two edges shear straight across each other in a single hard scissor at
his own chest height, both tips finishing pulled IN and angled DOWN past his opposite hips - and where
the edges cross, the shear BLASTS a dense spray of solid bright steel shavings, curls and flecks that
stays within one body-width of him and crumbles away to nothing in mid-air before any of it reaches the
floor while he holds the low crouch. The debris is SOLID SHEARED
METAL: opaque, bright, chipped, lit like steel - never a glow, never a flame, never a beam, never a ring
of light. The scissor is COMPLETE by the halfway point of the clip; the whole second half is his slow
controlled rise back into the EXACT same reference stance. Fast, surgical, final.

## special_2  (TWIN FANG DRIVE) — both points driven into the floor, cracked ground
SPECIAL FINISHER (twin fang drive): he begins in the EXACT reference stance in strict side profile
facing screen-right; he brings both hilts in to CHEST height and rolls both katanas point-DOWN so the
two blades hang straight down in front of his own thighs, then he drops his entire mass into a deep
braced crouch and DRIVES both points straight down into the floor between his own sandals with
everything he has, and the floor CRACKS - solid clods of broken floor, stone shards and chips jump up
around the two buried points, rising no higher than his own knee, spreading no wider than one body-width
to either side, and crumbling away to nothing in mid-air before any of it reaches the floor while he
holds the crouch with his whole weight bearing down through both hilts. The debris is SOLID ROCK AND
BROKEN FLOOR: opaque, chunky, sharp-edged, lit like stone - never a glow, never a flame, never a
shockwave of light. The drive is COMPLETE by the halfway point of the clip; the whole second half is his
slow heavy rise, drawing both points back up out of the floor and settling into the EXACT same reference
stance. Heavy, brutal, final.

## special_3  (KIRI-KAESHI) — the rolling one-two, alternating blades
SPECIAL FINISHER (kiri-kaeshi, the rolling one-two): he begins in the EXACT reference stance in strict
side profile facing screen-right. IN THE FIRST THIRD OF THE CLIP he steps his rear sandal through a
SHORT half-pace, drives his hips forward and cuts the LEAD katana down and INWARD across his own
centreline, its tip finishing tucked in against his opposite forearm, and the edge rakes the other
blade's spine on the way in and sheds a tight burst of solid bright steel shavings. IN THE SECOND THIRD
he rolls his hips hard back the other way onto his rear leg and cuts the LOWER katana down and INWARD
along that same line, its tip finishing tucked against his own rear thigh, and a second burst of solid
steel shavings shears off where the two edges cross; both bursts stay within one body-width of him and
crumble away to nothing in mid-air before any of it reaches the floor.
The debris is SOLID SHEARED METAL: opaque, bright, sharp-edged - never a glow, never a flame, never a
trail of light. IN THE FINAL THIRD he draws both blades back out to the EXACT heights and angles they
hold in the reference image and settles into the EXACT same reference stance. The whole sequence is ONE
continuous rolling weight transfer with no pause anywhere in it - his hips, shoulders and both sandals
working through every beat. Relentless, precise, final.
