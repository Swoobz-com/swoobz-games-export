# ONI TETSUBO — MK FINAL playable #1. Full 13-clip kit. Phase 68.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/oni-tetsubo-anchor-green.png`, never the raw
`input/MK FINAL/` art. The raw plate measured L51 / R28 / T71 — tighter than hollow-pale, who owns the
worst anchor break in the roster. The padded plate measures **L234 / R234 / HEADROOM 468**, verified by
`node qa-boss/measure-anchor-budget.mjs`.

## ★ ONI FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1068w x 1044h** (fills 68.0% of frame height), bbox x234..x1301.
  LEFT **234px** · RIGHT **234px** · HEADROOM **468px** · bottom free (feet on the floor line).

**HE IS PROP-EXTENDED — read this before writing any beat.** His BODY MASS is only **401px wide**
(x279..x679). The tetsubo accounts for the rest: it hangs **622px past his body** out to screen-RIGHT,
ending 234px from the frame edge. That is the same shape as satoshi-odachi, whose anchor leaves only
48px and whose finisher consequently measures 0% duty — a static hold, because every wording that
passed containment did so by deleting the motion (`qa-boss/ANCHOR-BUDGETS.md`).

The padding is what makes him workable: 234px of clearance past the club tip instead of 48, and 468px
of ceiling instead of 266. But the rule still binds:

  1. **The club NEVER travels further screen-RIGHT than it does in the reference.** It has 234px and a
     swing arc eats that instantly.
  2. **NEVER a full overhead raise.** The club is ~620px long; swung vertical from a chest-height grip
     it needs more than the 468px of ceiling. Bound the CLUB HEAD, not the hands — a height bound on
     the body does not bound a long prop (the phase-58/61 lesson, learned four times).
  3. **His direction is DOWN.** The bottom edge is free — `check-containment.mjs` treats floor contact
     as expected and never counts it. Every heavy beat is a downward slam into the ground, which also
     shortens the club's rightward reach instead of extending it.
  4. Effects are **SOLID MATERIAL** — kicked grit, stone chips, dust clods, splintered rock. Never a
     glow, flame, aura or mist: an emissive effect lights the chroma plate and the key keeps it as an
     olive halo (the session-14 bloom-lit-plate class).

Shared prefix:
> The EXACT SAME huge red-skinned oni demon brute from the reference image (identical deep blood-red
> muscular skin, two long curved pale-tan horns sweeping back from his forehead, a snarling fanged
> mouth and heavy brow, pointed ears, thick black twisted rope coiled over one shoulder and wrapped
> around his waist, dark iron plate tassets over a ragged olive-brown kilt, dark leather bracers on his
> forearms, black rope wound around his shins over iron shin guards, bare feet, gripping a massive dark
> iron tetsubo war-club studded with pale bone-coloured spikes), standing on a solid saturated GREEN
> chroma screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the seven prompt laws — every state inherits these):
> His skin, horns, rope, iron tassets, kilt, bracers and the iron tetsubo stay EXACTLY the same the
> entire clip, and he keeps the tetsubo in his hands the whole time and never drops or swaps it. The
> tetsubo stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame, and
> it NEVER travels further toward screen-right than it does in the reference image. The CLUB HEAD is
> NEVER raised above his own head and the club is NEVER swung fully vertical or overhead at any moment.
> HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and
> never lunges out into a wide stance; he keeps his stance narrow and never spreads wider than about
> one and a half times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera. The camera is absolutely locked, no zoom, no pan, his full body
> always fully in frame, he is the ONLY figure in frame at all times, nothing else added. He begins and
> ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, and this line is deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates
EVERY `>` line into the fired prompt, so an operator note written inside the blockquote gets sent to the
model as instructions. That is the same defect class as the phase-63 poisoned sections, and I did it to
myself here before catching it on the ko build.
The suffix's closing sentence is worded "begins and ends on the EXACT same reference stance" ON PURPOSE:
build-prompt.mjs's KO-SUFFIX RULE strips the weapon-lock and anchor-lock sentences for `ko`, and it
matches that exact literal. A first draft said "The first frame and the last frame are..." instead,
which the stripper did NOT match — so `ko` was built ordering him to end on the anchor while its acting
line has him collapse prone, the mutually-exclusive pair the rule exists to remove. Law 7 (first==last
as its own sentence) is carried per-state instead: every non-ko action line ends "back into the EXACT
same reference stance".

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT, STONE CHIPS AND DUST the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his iron tetsubo and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips of stone and grit and clods of earth, opaque and lit like rock - never a glow, never a flame, never an aura, never mist or smoke. All of it stays low and close to him, rising no higher than his own waist, crumbling away to nothing in mid-air before any of it reaches the floor, and never coming near the left, right or top edge of the frame.

## idle
IDLE COMBAT-READY LOOP: a heavy grounded brute stance, breathing slow and deep, his shoulders rising
and falling, the tetsubo held steady in his grip exactly as in the reference, the coiled rope and the
ragged kilt swaying faintly with his breath, small weight shifts from foot to foot. Feet planted, heavy
and menacing. Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (downward club slam)
STRIKE (downward slam): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; he coils his weight down onto his back leg, draws the tetsubo back and slightly DOWN, then
drives it in one heavy committed slam DOWNWARD into the ground in front of his own feet, and the impact
kicks up a burst of solid grit and stone chips that leaps up around the club head no higher than his own
knee and crumbles away to nothing before it reaches the floor. The whole slam is COMPLETE by the halfway point of the
clip; the whole second half is his slow heavy settle back up into the EXACT same reference stance. Heavy,
brutal, final.

## attack_strike_b  (low horizontal sweep)
STRIKE (low sweep): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image;
he drops his weight and sweeps the tetsubo LOW across the front of his own body at shin height, keeping
the club head BELOW HIS OWN WAIST for the entire sweep and pulling it IN toward his body rather than out,
and the sweep drags a low wave of grit and dust along the ground at his feet that crumbles away to nothing before it reaches the floor.
The sweep is COMPLETE by the halfway point of the clip; the whole second half is his settle back into the
EXACT same reference stance. Fast for his size, heavy, brutal.

## attack_throw A  (collar seize and slam, solo-safe)
THROW (seize and slam): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; keeping the tetsubo gripped in one hand and held LOW and CLOSE to his body, he reaches
forward with his free hand through EMPTY AIR, clamps as if seizing an unseen foe at chest height, then
wrenches down and back toward his own body, driving the seized weight into the ground at his feet, and a
small burst of grit jumps UP from the floor and crumbles away to nothing in mid-air as it falls. NO
opponent, no second figure, empty air only.
The throw is COMPLETE by the halfway point; the second half is his settle back into the EXACT same
reference stance.

## attack_throw_b  (shoulder barge, solo-safe)
THROW (shoulder barge): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; he drops his shoulder, drives a short heavy barge forward from the hips WITHOUT stepping
his feet apart, the tetsubo tucked DOWN and IN against his own body throughout, and EXACTLY FOUR small
chips of dry grey floor-stone scuff up from under his own planted feet, each chip no bigger than his own
thumb and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke
and never haze - rising no higher than his own ankle, staying inside his own standing footprint and
never past his front foot or his back heel, and every chip crumbling away to nothing in mid-air as it
falls, gone before any piece touches the floor. He barges through empty air only - NO opponent, no second figure. The
barge is COMPLETE by the halfway point; the second half is his settle back into the EXACT same reference
stance.

## attack_block A  (club haft brace)
BLOCK-COUNTER (haft brace into low counter): he begins in the EXACT reference stance in strict side
profile facing screen-right; he brings the tetsubo ACROSS the front of his own body into a hard braced
guard held at CHEST height with the club head angled DOWNWARD, his weight settling onto his back leg as
he absorbs the pressure; then he drives back with one short heavy counter slam DOWNWARD and across, and
flows in one eased motion back into the EXACT same reference stance. Braced, immovable, brutal.

## attack_block_b  (forearm bracer guard into rising elbow)
BLOCK-COUNTER (bracer guard): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; he snaps his free forearm up across his face in a hard leather-bracer guard, the tetsubo
held LOW and CLOSE at his side, his weight settling back as he absorbs the pressure; then he drives a
short elbow strike forward at chest height and flows in one eased motion back into the EXACT same
reference stance. The tetsubo never rises and never swings during this clip. Braced, compact, brutal.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, his body angled toward screen-right exactly as
it is in the reference image; his head and shoulders snap back and to screen-LEFT, his front foot skids
a SHORT half-step back and his knees buckle under the weight, and he pulls the tetsubo IN TIGHT against
his own body; he catches his balance, plants his feet and flows in one eased recovery back into the
EXACT same reference stance. NO blow, no impact, no opponent, no second weapon - nothing ever strikes
him and nothing is ever seen to; the whole stagger is his OWN body recoiling, and his own tetsubo is the
ONLY weapon that exists in the shot. His chest and face lead the recoil; his back is never shown. He is ALONE in an empty
frame - nothing whatsoever enters, crosses or appears in the frame at any time, and there is no light, no
flare and no streak anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; his
legs give way beneath him, the tetsubo drops from his grip to the floor beside him, and he crumples
heavily forward and down onto the ground, coming to rest fully prone and motionless, a small puff of dust
rising from the floor where he lands and drifting away to nothing. He is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time. Only his own body moves. He does NOT get back up.

## victory  (club planted, roar)
VICTORY (planted club): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image. IN THE FIRST QUARTER OF THE CLIP he ROLLS the tetsubo DOWN and
SETS its head heavily on the ground just in front of his own leading foot, the haft raking back and UP
toward screen-LEFT at about forty-five degrees with the butt end level with his own shoulder, never
travelling further toward screen-right than it does in the reference image, and he leans his weight down
onto the haft. The plant knocks UP a low burst of solid grit and stone chips around the club head,
rising no higher than his own ankle and staying inside his own standing footprint, crumbling away to
nothing IN MID-AIR AS IT FALLS so that none of it reaches the floor. FOR THE WHOLE MIDDLE HALF OF THE
CLIP HE HOLDS THAT LEANING POSE and only his head and chest move - his jaw opens wide in a slow roar and
his chin lifts no higher than his own EYE LINE, never past it, while his chest heaves THREE times, his
shoulders rolling once between the second and the third, and the coiled rope over his shoulder and the
ragged kilt swinging heavily and settling; his shoulders, hips and both feet stay exactly where they
are, he does not step, does not pivot and does not straighten up, and the club head stays ON THE GROUND
that entire time.
IN THE FINAL QUARTER he draws the club head back up off the ground to the EXACT height and angle it has in
the reference image - never higher, never vertical - and settles into the EXACT same reference stance. The
club head goes DOWN to the floor, never up. Proud, heavy, brutal.

## ★ WHY VICTORY v1 WAS REJECTED — EMPTY TIME IS AN INVITATION (phase 87, 2026-07-31)
# v1 measured f0 0.995 / fLast 0.995 against the kit anchor — the project's SECOND-BEST anchor-lock —
# with containment CLEAN on every edge and body-commitment "ok" (minIoU 0.217, travel 200, 70% strong).
# THREE GATES GREEN, AND THE CLIP IS UNUSABLE. At f42 he is square to camera with both pectorals
# visible; at f70 he is square to camera AND holding the tetsubo FULLY VERTICAL above his own horns.
# That single frame violates three separate locks that were already in its own prompt: "the CLUB HEAD is
# NEVER raised above his own head", "the club is NEVER swung fully vertical or overhead at any moment",
# and the acting line's own "the club head goes DOWN to the floor, never up".
#
# ROOT CAUSE — A TIME BUDGET, INVERTED. The eclipse attack_strike lesson was that a committed cut RUNS
# OUT of clip. This is the mirror image: v1's three beats (plant / lean+roar / lift back) did not FILL
# four seconds, so the model invented a full theatrical turn to sell the roar to camera and a vertical
# club raise on the word "lifts". Two trigger words did the damage: "throws his head back and roars in
# triumph" invites rotating the body to present the roar to the viewer, and "lifts" is an unbounded UP
# verb. RESTATING THE BANS COULD NOT HAVE HELPED — both bans were already in the suffix, verbatim, and
# were ignored. The fix NARROWS the thing: the roar becomes head-only with the chin bounded by his own
# horns, the return is bounded to the reference image's height rather than by another "never" sentence,
# and — the actual repair — the middle half of the clip is explicitly SPENT on a held pose, so there is
# no empty time left to fill.
#
# THE MEASUREMENT LESSON, AND IT IS THE BIG ONE. `end_image` pins the last frame to the plate. That is
# why fLast is 0.995 here. It means that ON THIS TRANSPORT fLast IS VERY NEARLY FREE AND CARRIES ALMOST
# NO INFORMATION ABOUT THE ACTING — the transport buys the number that the old browser path made the
# prose earn. f0 and fLast together are blind to 95 of 97 frames. NEVER ACCEPT A CLIP ON ANCHOR-LOCK
# PLUS CONTAINMENT AGAIN; the middle of the clip must be LOOKED AT, every time.

## special_1  (EARTHSHAKER) — ground slam shockwave, solid debris
SPECIAL FINISHER (earthshaker): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; he raises the tetsubo only to CHEST height, coils his whole body down into a deep braced
crouch, then drives the club DOWN into the ground in front of his own feet with everything he has, and
the impact BLASTS a ring of solid stone chips, grit and broken earth UPWARD and OUTWARD around his
feet - rising no higher than his own waist, spreading no wider than one body-width to either side, and
crumbling away to nothing in mid-air as it falls, while he holds the low crouch. The debris is SOLID ROCK AND
GRIT: opaque, chipped, lit like stone - never a glow, never a flame, never a shockwave of light. The
whole slam is COMPLETE by the halfway point of the clip; the whole second half is his slow heavy rise
back into the EXACT same reference stance. Heavy, brutal, final.

## special_2  (SPIKE DRIVER) — forward thrust, chips off the club head
SPECIAL FINISHER (spike driver): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image; he draws the tetsubo BACK toward his own body and DOWN, then drives it forward in one
short brutal thrust at CHEST height, keeping the club head CLOSER to his body than it sits in the
reference at every moment of the thrust, and on the drive a tight burst of solid stone chips and grit
shears off the spikes of the club head and falls DOWNWARD to the floor, crumbling away to nothing before it reaches the floor. The chips
are SOLID STONE: opaque, sharp-edged - never a glow, never a flare. They stay within one body-width of
him, never spray outward, and never come near the left, right or top edge of the frame. The thrust is
COMPLETE by the halfway point; the second half is his settle back into the EXACT same reference stance.

## special_3  (OGRE STOMP) — heel stomp, cracked earth
SPECIAL FINISHER (ogre stomp): he begins in the EXACT reference stance, his body angled toward screen-right exactly as it is in the reference image, the tetsubo held LOW and CLOSE at his side throughout; he hauls one knee up only to hip
height and STAMPS his bare heel down into the ground beside his other foot with his full weight, and the
floor CRACKS - solid clods of broken earth and stone shards jump up around his own feet, rising no higher
than his own knee, spreading no wider than one body-width, and crumbling away to nothing before any of it reaches the floor
while he holds the braced landing. The debris is SOLID EARTH AND STONE: opaque, chunky, lit like rock -
never a glow, never a flame, never a ring of light. Both feet are back FLAT on the ground the instant the
stomp lands and stay flat for the rest of the clip. The stomp is COMPLETE by the halfway point; the
second half is his settle back into the EXACT same reference stance. Heavy, brutal, final.
