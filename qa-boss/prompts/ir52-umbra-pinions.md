# IR-52 UMBRA PINIONS — XGundam roster. Full 13-clip kit. Phase 88.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir52-umbra-pinions-anchor-green.png`, never the raw
`input/MK FINAL/XGundam not sorted/IR-52 Umbra Pinions.png`. She is a WIDE subject: the padder had to
step the fill down from 0.68 to **0.50** before the 200px margin law was satisfiable at all, so she sits
physically smaller in frame than the rest of the roster and her clips will read softer at display size.
That step-down bought exactly 200px per side and not one pixel more.

## ★ IR-52 UMBRA PINIONS FRAME BUDGET — measured, applies to EVERY clip of hers

Plate 1536x1536 GREEN. Full subject **1136w x 768h** (fills 50.0% of frame height), bbox x200..x1335.
  LEFT **200px** · RIGHT **200px** · HEADROOM **744px** · bottom free (talons on the floor line).
  Max spanPeak that still fits = **1.35x** — the TIGHTEST budget in this batch.
  chroma-detail: 34,726px of enclosed green measured, VERIFIED BY EYE to be backdrop pockets between
  her wing fingers, NOT green on the character. The green plate is safe. (And a magenta plate would be
  actively wrong for her — see the note under the suffix.)

**SHE IS PROP-EXTENDED ON BOTH SIDES — this is the whole problem, read it before writing any beat.**
Column-mass profile of the padded plate: her BODY MASS is only **480px wide** (x576..x1055, the bands
carrying 20k-38k subject px each). Everything outside that is thin appendage:
  · **WING TIPS own the entire LEFT margin.** The wing fan reaches **376px** past her body out to
    screen-left and terminates at x200 — dead on the edge of the budget, at roughly her own head height.
  · **BLADE TIPS own the entire RIGHT margin.** The twin-crescent head reaches **280px** past her body
    out to screen-right and terminates at x1335 — also dead on the edge, at about hip height.
Her body is 42% of her own bbox width. Both walls are already touched by something thin and pointed.
That is why the rules below are about TIPS, and why every lateral idea is wrong for her:

  1. **Bound the WING TIPS, not the wings.** A bound on her body does not bound a wing any more than a
     height bound on the hands bounds a long blade (the phase-58/61 lesson, learned four times). The
     wings are part of the silhouette and they are the leftmost thing she owns.
  2. **The wings only ever FOLD — down, in, forward, or up-and-in over her back. Never OUT.** If a beat
     touches the wings at all, that beat IS the wings and nothing else moves outward (`special_2` is the
     only clip in the kit that spends itself on them). A wing that closes makes her NARROWER, which is
     the one wing motion the budget can afford, so every wing beat in this kit is a closing beat.
  3. **The blade tips never travel further screen-right than they do in the reference.** Her direction
     is DOWN: the bottom edge is free — `check-containment.mjs` treats floor contact as expected and
     never counts it — and a downward reap also shortens the head's rightward reach instead of extending
     it. Every heavy beat is a reap or a stamp into the ground.
  4. **VERTICAL IS HER FREE AXIS, AND IT IS HOW SHE GETS BODY COMMITMENT.** She has 744px of ceiling and
     is only 768px tall because she is CROUCHED in a deep predatory lunge. She can come to full standing
     height and drop back down with room to spare. So the travel that makes a beat feel committed is
     RISE and DROP, not step and reach. Every clip in this kit moves her whole body up or down.
  5. **Effects are SOLID MATERIAL and they are NEVER her own colour.** Three materials only: shorn black
     metal chips, torn black feather-plates off her own wing edges, and pale slate-grey shards torn up
     out of the ground. Never a glow, flare, aura, mist or beam — an emissive effect lights the chroma
     plate and the key keeps it as an olive halo — and never magenta or pink, which is her body colour.

Shared prefix:
> The EXACT SAME lean black-armoured winged mech-knight from the reference image (identical matte and
> gloss BLACK armour plating over a dark carbon-mesh underlayer, hot-magenta glowing trim lines running
> down her chest, abdomen, hips, thighs, shins and forearms, magenta ring emblems on her shoulder and
> thigh, a sealed black helmet with a hot-magenta visor band and two small backswept horn-fins, a pair of
> huge mechanical bat-style wings mounted on big black pivot discs at her shoulders - the near wing a fan
> of four long tapered black armoured spar-fingers swept BACK behind her toward screen-left with a
> glowing magenta membrane webbed between them, the far wing folded behind it - digitigrade raptor legs
> ending in three-clawed black talons with a rear spur, and gripping a long black scythe-glaive: a
> wrapped black haft with a slim tapered counter-spike at its rear end and, at its forward end, a
> TWIN-CRESCENT head of two huge curved black blades splayed from one black hub, each blade with a
> fiercely glowing hot-magenta inner cutting edge over a dark violet core), standing on a solid saturated
> GREEN chroma screen (bright green #00b140) - the BACKDROP is green and only green, never pink and never
> magenta; the magenta is hers alone and it lives only on her armour, her wings and her blades.

Shared suffix (carries the prompt laws — every state inherits these):
> Her black armour, magenta trim, sealed helmet, wings and the twin-crescent scythe stay EXACTLY the same
> the entire clip. She keeps the twin-crescent scythe in her hands the whole time and never drops or
> swaps it. Her wings and her scythe stay FULLY INSIDE the frame at ALL times and NEVER extend past any
> edge of the frame. The BLADE TIPS never travel further toward screen-right than they do in the
> reference image, and the WING TIPS never travel further toward screen-left and never spread further
> apart than they do in the reference image - her wings may fold DOWN, IN and FORWARD or draw UP AND IN
> over her back, but they never open OUTWARD past the set they have in the reference and never sweep
> further back. HER TALONS STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - she never jumps, never leaps,
> never hops, never takes off and never flies, and her wings never lift her off the ground; she keeps her
> stance low and narrow and never widens it beyond about one and a quarter times the width it has in the
> reference image. Her magenta trim and her magenta blade edges stay exactly as bright and as steady as
> they are in the reference image and NEVER flare, pulse, streak, trail or cast any light onto the green
> backdrop. She stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera.
> The camera is absolutely locked, no zoom, no pan, her full body always fully in frame, she is the ONLY
> figure in frame at all times, nothing else added. She begins and ends on the EXACT same reference
> stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, and these lines are deliberately OUTSIDE the blockquotes: `quoted()` in build-prompt.mjs concatenates
EVERY `>` line into the fired prompt, so an operator note written inside a blockquote is sent to the model
as instructions.
THE MAGENTA DECISION. The house prefix boilerplate ends "nothing pink or magenta anywhere". For HER that
sentence is a lie standing next to her own description — she is black and hot-magenta — and the model
would have to obey one half of the sentence by breaking the other. So the clause is re-scoped to the
BACKDROP only. Same reason her plate is GREEN and must stay green: the pipeline's alternate chroma is
magenta and she would key out to nothing. No magenta plate for this character, ever, and no effect in
her own colour either — the specials paragraph and every acting line name dark/neutral debris on purpose.
THE KO-SUFFIX LITERALS. build-prompt.mjs's KO-SUFFIX RULE strips the weapon-lock and the anchor-lock from
`ko` by matching two exact literals, so the suffix above is worded "keeps the twin-crescent scythe in her
hands the whole time and never drops or swaps it" and "begins and ends on the EXACT same reference
stance" ON PURPOSE. The identity lock is deliberately split into its OWN sentence ahead of the weapon
lock so that `ko` keeps it — the stripper eats the whole sentence it matches, and oni-tetsubo loses its
identity lock on `ko` because the two were welded together. Law 7 (first==last) is carried per-state as
well: every non-ko action line ends "back into the EXACT same reference stance".

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HER OWN SHORN BLACK METAL CHIPS, TORN BLACK FEATHER-PLATES AND PALE SLATE-GREY GROUND SHARDS the green stays completely empty and unbroken; the ONLY things visible are HER OWN body, her twin-crescent scythe and HER OWN debris. Every piece of debris is SOLID MATERIAL - real chips of cut black metal, real torn black plate shorn off her own wing edges, and real broken shards of pale slate-grey ground, opaque and hard-edged and lit like stone and metal - never a glow, never a flame, never an aura, never a beam, never mist or smoke, and never coloured magenta or pink. All of it stays low and close to her, rising no higher than her own waist, crumbling away to nothing in mid-air before any of it reaches the ground, and never coming near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a low coiled predatory hunting crouch, her whole body rocking slowly forward over
her front talon and then back over her rear talon and forward again, her chest plate rising and falling
with a deep slow intake, the scythe haft rocking a few degrees in her leading fist as she breathes, the
wing spars flexing minutely and the magenta membranes rippling like a held breath, her claws opening and
closing their grip on the ground. Her helmet tips very slightly down and forward, hunting. The wings stay
swept back exactly as they are set in the reference image and the blade tips do not travel. Returns to
the exact start pose so it loops seamlessly. Slow, controlled, coiled, subtle motion.

## attack_strike A  (descending twin-crescent reap)
STRIKE A (descending reap): she begins in the EXACT reference stance in strict side profile facing
screen-right; IN THE FIRST QUARTER she drives up out of the low lunge to nearly her full standing height,
hauling the haft BACK and IN across her own chest so the twin-crescent head swings up behind her leading
shoulder and stops level with that shoulder, the blade tips never travelling further screen-right than
they sit in the reference image; then she throws her whole body weight back down in one committed reap,
both crescents biting into the ground just in front of her front talon and tearing a tight burst of solid
pale slate-grey shards and shorn black metal chips up around her talons, no higher than her own knee,
which crumble away to nothing in mid-air. The reap is COMPLETE by the halfway point of the clip; the whole
second half is her slow settle back down into the EXACT same reference stance. Heavy, precise,
executioner-calm.

## attack_strike_b  (counter-spike thrust and talon rake)
STRIKE B (counter-spike thrust): she begins in the EXACT reference stance in strict side profile facing
screen-right; she rolls the long haft through her fist so the slim rear counter-spike comes FORWARD past
her hip while the twin-crescent head swings BACK and DOWN behind her in the same motion, the weapon
pivoting about her grip instead of reaching out; she launches her whole body forward off her rear talon
into a deeper, lower lunge and drives the counter-spike in one short flat thrust straight ahead at her own
chest height. The thrust is COMPLETE one third of the way into the clip. Through the middle third she
hauls her weight back over her rear talon and drags her front talon back through the ground, the three
claws tearing up a low burst of grey grit and shorn black chips that crumbles away to nothing in mid-air.
The final third is her settle back into the EXACT same reference stance. Fast, low, surgical.

## attack_throw A  (talon seize and drive-down, solo-safe)
THROW A (talon seize and drive-down): she begins in the EXACT reference stance in strict side profile
facing screen-right; keeping the scythe clamped LOW and flat along her own flank in her leading fist, she
rises up out of the lunge and snaps her free clawed gauntlet forward through EMPTY AIR, the claws clamping
shut at her own chest height as if hooking an unseen foe; then she hauls that grip DOWN and BACK in toward
her own hip, dropping her entire body weight into a deep crouch, and pins the seized weight into the
ground in front of her front talon with her claws stamping down on top of it, a small burst of pale
slate-grey shards jumping up around her talons no higher than her own knee and crumbling away to nothing
in mid-air. NO opponent, no second figure, empty air only. The drive-down is COMPLETE by the halfway
point; the second half is her rise back into the EXACT same reference stance.

## attack_throw_b  (wing-clamp barge and dump, solo-safe)
THROW B (wing-clamp barge): she begins in the EXACT reference stance in strict side profile facing
screen-right; she folds her near wing FORWARD and DOWN across the front of her own chest into a hard black
shell, and in the first third of the clip drives a short committed barge forward and DOWNWARD off her rear
talon, her whole body sinking lower as it travels no more than a quarter of her own body-width forward,
and plants her front talon hard. At the halfway point she drops her hips and slams the folded wing edge
down and forward through EMPTY AIR at her own hip height as if dumping a seized weight into the ground,
and a scuff of grey grit jumps up from under her talons and crumbles away to nothing in mid-air. She
barges through empty air only - NO opponent, no second figure. The second half is her draw back and settle
into the EXACT same reference stance, both wings easing back to exactly the swept-back set they have in
the reference image.

## attack_block A  (wing mantle guard into crescent counter)
BLOCK-COUNTER A (wing mantle): she begins in the EXACT reference stance in strict side profile facing
screen-right; IN THE FIRST QUARTER she sinks her whole weight back onto her rear talon and sweeps BOTH
wings FORWARD and DOWN, folding them tight across the front of her own body into a single black armoured
shell, the wing tips coming IN toward her own chest so her silhouette pulls in and gets NARROWER. FOR THE
MIDDLE HALF OF THE CLIP SHE HOLDS THAT MANTLED CROUCH and only her shoulders and helmet move as she takes
the pressure and gives ground through her back leg - her talons stay exactly where they are, she does not
step and she does not straighten up. IN THE FINAL QUARTER the wings sweep back to exactly the set they
have in the reference image as she drives one short flat counter-cut with the near crescent blade at her
own hip height, kept LOW and pulled IN toward her body, and she flows in one eased motion back into the
EXACT same reference stance. Braced, patient, lethal.

## attack_block_b  (haft cross-brace into shove)
BLOCK-COUNTER B (haft brace): she begins in the EXACT reference stance in strict side profile facing
screen-right, both wings staying furled and still for the whole clip; in the first third she hauls the
long haft UP across the front of her own body onto a STEEP near-vertical diagonal - the twin-crescent head
planted DOWN on the ground beside her front talon and the rear counter-spike no higher than her own helmet
- and sinks her weight back over her rear talon, her whole body compressing down as she takes the pressure
through both arms. Through the middle third she holds that compressed brace and absorbs, her chest plate
driving back and her helmet dropping in behind the haft. In the final third she stamps her front talon
down, shoves the haft forward a short flat distance at her own chest height, and flows in one eased motion
back into the EXACT same reference stance. Braced, compact, immovable.

## hit  (jarred stagger, quick recover)
HIT (jarred stagger): she begins in the EXACT reference stance in strict side profile facing screen-right;
her helmet and shoulders snap back and to screen-LEFT, her front talon skids a SHORT half-step back across
the ground, her knees buckle deeper into the lunge and her whole body drops, both wings CLAMPING in tight
against her own back as the spars snap shut, and she hauls the scythe IN hard against her own flank as her
arm is jarred; a few shorn black chips shear off her near wing spar and crumble away to nothing in
mid-air. The recoil is spent by the first third of the clip; she catches her balance, plants both talons,
and the rest of the clip is one eased recovery back into the EXACT same reference stance. Her chest plate
and her visor lead the recoil; her back is never shown. She is ALONE in an empty frame - nothing
whatsoever enters, crosses or appears in the frame at any time, and no impact flash, no flare and no
streak of light appears anywhere in the shot. Only her own body moves.

## ko  (cause-free collapse, ends on the ground)
KO (collapse): she begins in the EXACT reference stance in strict side profile facing screen-right; IN THE
FIRST QUARTER her rear leg folds under her and her whole body drops, the scythe tumbles out of her grip
down onto the ground beside her, and her wings collapse and fold down flat over her own back;
she pitches forward and down and comes to rest by the two-thirds point fully prone and motionless on the
ground, her helmet toward screen-right and one folded wing draped across her, and she stays completely
still for the rest of the clip. A small puff of grey grit lifts from the ground where she lands and drifts
away to nothing. She is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the
frame at any time. Only her own body moves. She does NOT get back up.

## victory  (blade planted, wings furled)
VICTORY (mantle furl): she begins in the EXACT reference stance in strict side profile facing
screen-right. IN THE FIRST QUARTER OF THE CLIP she swings the twin-crescent head DOWN and plants it on the
ground beside her own front talon, then pushes her whole body up off the haft, rising out of the low lunge
to her full standing height with her weight settling down over the planted weapon. FOR THE WHOLE MIDDLE
HALF OF THE CLIP SHE HOLDS THAT TALL PLANTED POSE while she sweeps both wings DOWN and IN, folding them
flat and tight against her own back until her silhouette is at its narrowest, and after that only her
chest plate and her helmet move - her helmet tips slowly down toward the planted blades and turns no
further than her own shoulder line, her visor never coming round toward the camera, while her chest heaves
once; her hips, her talons and the planted crescent head stay exactly where they are, she does not step,
does not pivot and does not lift the head off the ground that entire time. IN THE FINAL QUARTER she sinks
back down into the low lunge, draws the crescent head up off the ground to exactly the height and angle it
has in the reference image - never higher - lets both wings ease back open to exactly their reference set,
and settles into the EXACT same reference stance. Cold, still, victorious.

## special_1  (SHEAR REAP) — both crescents bite the ground at once, solid debris
SPECIAL FINISHER (shear reap): she begins in the EXACT reference stance in strict side profile facing
screen-right; IN THE FIRST QUARTER she rises up out of the lunge and hauls the haft BACK and IN across her
own chest, the twin-crescent head swinging up behind her leading shoulder and stopping level with it,
never higher, while she coils her whole body down and back over her rear talon; then she throws every bit
of her weight into one committed downward reap and BOTH crescent blades bite into the ground just in front
of her front talon at the same instant, and the double bite SHEARS a fan of solid pale slate-grey ground
shards and shorn black metal chips up around her talons - rising no higher than her own knee, spreading no
wider than one body-width to either side of her, and crumbling away to nothing in mid-air. The debris is
SOLID MATERIAL: opaque, chipped, hard-edged, lit like broken stone and cut metal - never a glow, never a
flare, never a shockwave of light, and never coloured magenta or pink. The reap is COMPLETE by the halfway
point; she holds the deep finishing crouch until three quarters of the way through the clip; the last
quarter is her slow rise back into the EXACT same reference stance. Heavy, final, executioner-cold.

## special_2  (PINION CRUSH) — the wing beat, and the wings are the entire beat
SPECIAL FINISHER (pinion crush) - THE WINGS ARE THE WHOLE BEAT AND NOTHING ELSE MOVES OUTWARD: she begins
in the EXACT reference stance in strict side profile facing screen-right, the scythe clamped FLAT and
STILL along her own flank for the entire clip so the blade tips never travel at all. IN THE FIRST QUARTER
she rears up out of the low lunge to her full standing height and cocks both wings, the spars drawing UP
and IN toward each other over her own back. AT THE HALFWAY POINT she CLAPS both wings shut forward and
downward across the front of her own body in one enormous hammering mantle-slam, the wing tips driving IN
toward each other and DOWN toward the ground, and she drops her entire body weight down behind the slam
into a deep crouch; the impact tears a burst of torn black feather-plates off her own wing edges and rips
solid pale slate-grey shards up out of the ground around her talons - rising no higher than her own waist,
staying within one body-width of her, and crumbling away to nothing in mid-air. Every piece is SOLID
MATERIAL: opaque, hard-edged, real torn black plate and real broken stone - never a glow, never a flare,
never mist, and never coloured magenta or pink. THE WHOLE SECOND HALF is the wings easing back open to
exactly the swept-back set they have in the reference image while her body rises back into the EXACT same
reference stance. Enormous, crushing, final.

## special_3  (TALON GRAVE) — raptor stamp and rake, solid debris
SPECIAL FINISHER (talon grave): she begins in the EXACT reference stance in strict side profile facing
screen-right, the scythe held LOW and clamped flat along her own flank throughout and both wings staying
furled and still; IN THE FIRST QUARTER she hauls one clawed talon up only to her own hip height while her
whole body coils down and back over her other leg, then STAMPS that talon down into the ground beside her
planted foot with her full weight behind it and immediately RAKES it back through the ground, the three
claws hauling her whole body down and back into a deep low crouch. The stamp and the rake tear up solid
chunky pale slate-grey ground shards and shorn black grit around her feet - rising no higher than her own
knee, spreading no wider than one body-width, and crumbling away to nothing in mid-air. The debris is
SOLID MATERIAL: opaque, chunky, hard-edged, lit like broken stone - never a glow, never a flame, never a
ring of light, and never coloured magenta or pink. Both talons are back flat on the ground the instant the
rake ends, two thirds of the way into the clip; the final third is her settle back into the EXACT same
reference stance. Brutal, low, animal.
