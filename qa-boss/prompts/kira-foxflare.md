# KIRA FOXFLARE — MK FINAL playable. Full 13-clip kit. Written 2026-08-01 against KIT-WRITING-BRIEF (§2b/§2c/§4b/§4c/§5b applied).
#
# FIRST-CLIP WATCHES (author's):
#   · FOXFIRE INVENTION — her name and her species BEG the model for glowing blue-green fox flames.
#     "foxfire", "flame" and "ember" are banned BY NAME in the suffix and the SPECIAL add-on; if any
#     glow appears the clip is dead on keying AND on Tim's no-energy law — reroll, do not key it.
#   · TAIL-COUNT DRIFT — she has EXACTLY THREE tails with white tips. Watch clip 1 for two, four,
#     or one merged fur mass; the count is locked in the suffix because it is a countable identity
#     feature exactly like hector's insignia.
#   · THE TAILS OWN THE LEFT EDGE (x394). hit and ko recoil toward screen-left, INTO the tails'
#     territory — both beats therefore BUNCH the tails down against her legs instead of swinging
#     them, and bound the recoil above her own rear heel. If containment LEFT flags, shrink the
#     trunk pitch, not the bound.
#   · THE WIDE STRAW HAT — a brim that wide makes any head whip read huge, and a lifted hat is an
#     orphaned object the next clip won't have. The hat is pinned seated in the suffix; every head
#     beat in this kit is a small vertical dip. Both her hands are full of daggers, so NO beat ever
#     touches the hat.
#   · SPECIAL_3'S TIP-DOWN TURN — the one licensed blade re-orientation in the kit. Watch the
#     leading fist: if the fingers open or the hand re-seats on the hilt, that is the grip law
#     broken, not a style choice.
#
Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/kira-foxflare-anchor-green.png`, pre-screened
before this kit was written: opaque 12.06%, emissive 0.04% (nothing baked-lit on her anywhere),
transl 3.13, green-dominance 4.6% — CLEAN ON EVERY AXIS, keys with margin, no special keying
language needed beyond the standard. Padded at the FULL 0.68 standard fill. She faces SCREEN-RIGHT
natively; no hflip anywhere in this kit. Nothing on her is green — amber fur, black-and-red cloth,
straw and steel all sit far from the key. The two facts that shape every line below: her THREE FOX
TAILS own the LEFT edge and are the widest deformable mass on the plate, and the only high prop
point is the RAISED dagger's tip at her own chin — everything else she carries lives at or below
her belt.

## ★ KIRA FOXFLARE FRAME BUDGET — measured, applies to EVERY clip of hers

Plate 1536x1536. Full subject **~746w x ~1044h** (fills 68% of frame height — that is a RESOLUTION
budget: the engine upscales, so no beat may shrink her, move her off her spot or carry her away from
the camera).
  LEFT **394px** · RIGHT **396px** · HEADROOM **468px** · bottom free (geta soles on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **2.06x**, hard ceiling 1.60x — nothing in this kit approaches
  either; the widest beat (special_1's low scissor spread) stays inside her own reference envelope,
  ~1.1x.

WHO OWNS EACH EDGE:
  · **LEFT x394** — the WHITE TIPS of her three fox tails (the furthest screen-left points of the
    whole subject). The rope tassels hang inside them.
  · **RIGHT x1140** — the forward TIP of the LOW dagger at her belt height, with the knuckles of
    her raised leading fist and the toe of her leading geta just inside it.
  · **TOP y468** — the tips of her two fox EARS above the hat crown. Nothing she carries goes
    anywhere near it.
  · **BOTTOM** — her geta soles on the floor line.

  1. **A ROOMY PLATE, AND THE FREEDOM IS SPENT ON DEPTH, NOT REACH.** Every attacking beat travels
     DOWN and IN, because the anchor return — not the frame edge — is what fails a clip. Nothing in
     this kit steps, lunges, reaches out or swings wide; the body commitment is full-mass sinks,
     deep folds, one bounded trunk-drive and sustained loaded holds.
  2. **BLADE CEILING: THE HAT BRIM.** The raised dagger's tip already sits at her own chin in
     reference — that is the highest any part of either dagger ever gets to be. NO PART of either
     dagger ever rises above the height of her own hat's brim, neither blade is ever raised
     overhead or swung up past her own head, and no wind-up ever lifts a blade before a cut — every
     cut starts from the height the blade ALREADY HAS in the reference image.
  3. **THE TAIL BOUND.** The three tails own the LEFT edge: their white tips never travel further
     toward screen-left than they sit in the reference image, and never rise above the height of
     her own shoulders. Every tail beat moves INWARD (around her own planted legs) or straight
     up-and-down in place; recoils COMPRESS the tails against her body rather than swinging them.
  4. **THE FORWARD BOUND.** The LOW dagger's tip is the forward-most point of the subject: neither
     blade's tip ever travels further toward screen-right than the LOW dagger's tip sits in the
     reference image. Floor bites land AT or INSIDE the toe of her own leading geta.
  5. **THE GRIP LAW.** Both fists stay closed on their hilts in every frame of all 13 states —
     nothing is ever released, exchanged, sheathed or slid along. Both hands are permanently full,
     so no state can grab, carry, or touch the hat; solo throws are body-checks and tail-work by
     construction. The ONE licensed blade re-orientation in the kit is special_3's tip-down turn
     about its own closed fist, stated in that beat and reversed in its recovery.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME fox-spirit swordswoman from the reference image (a lithe young kitsune ronin woman
> with fair skin, a calm stern face and a small red mark on her cheek under her eye; long copper-red
> hair falling from under her hat past her shoulders; a wide conical woven STRAW HAT sitting level
> on her head, with two upright orange FOX EARS, cream-furred inside, standing through the crown of
> the hat; THREE large bushy FOX TAILS of amber-orange fur with WHITE tips sweeping back and down
> behind her toward screen-LEFT, the highest rising from her lower back and the lowest hanging near
> her calves; a black kimono jacket with a layered RED collar over a pale under-layer at her chest,
> fine red wave patterns embroidered across the sleeves and trousers, a thick red ROPE COIL looped
> over her rear shoulder, a thick red rope OBI knotted around her waist with tasselled ends hanging
> at her rear hip, dark forearm bracers tied with thin red cords at the wrists, a rectangular
> armoured APRON PLATE of dark lacquered steel laced with rows of small red squares hanging from her
> belt over her front hips, baggy black hakama trousers gathered below the knee, dark shin guards
> bound with red cords at knee and ankle, and wooden GETA sandals with red thong straps on her bare
> feet; and gripped one in EACH hand a matched pair of curved steel DAGGERS with dark swept recurved
> blades and red-corded hilts - her LEADING arm reaching toward screen-RIGHT at her own lower-chest
> height, that closed fist holding the RAISED dagger with its blade pointing UP, its curved tip
> level with her own chin; her REAR hand held in low at her own front waist just ahead of the apron
> plate, that closed fist holding the LOW dagger with its blade pointing forward toward
> screen-RIGHT, riding level at her own belt height), standing on a solid saturated GREEN chroma
> screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> Her fair-skinned face with its small red cheek mark, her long copper-red hair, the straw hat and
> the two orange fox ears through its crown, her three amber fox tails with their white tips, the
> black kimono jacket with its red collar and red wave embroidery, the red rope coil on her rear
> shoulder, the red rope obi and its tassels, the dark armoured apron plate at her hips, her
> bracers, her shin guards, her wooden geta and BOTH curved steel daggers all stay EXACTLY the same
> the entire clip - nothing is ever added, lost, re-coloured or re-shaped, she has EXACTLY THREE fox
> tails in every single frame - never fewer and never more, and they never merge into one mass - NO
> mask, cloak, banner, lantern or extra weapon ever appears, and the straw hat stays seated level on
> her head in every single frame - it never lifts, never tips back, never slips and never comes off
> - her two fox ears may make small flicks but never fold away and never vanish. Her hair, the rope
> tassels and the fur of her three tails may sway softly with her motion but never billow and never
> flare wide; the three tails stay attached at her lower back, and their white tips NEVER travel
> further toward screen-LEFT than they sit in the reference image and NEVER rise above the height of
> her own shoulders. Both daggers stay gripped in her own closed fists the entire clip - they are
> never released, never let go, never exchanged between hands, never sheathed and never replaced by
> anything else, BOTH of her fists stay closed on their hilts in every single frame, NEITHER hand
> ever slides along its hilt or changes where it holds it, and no second pair of daggers and no
> other weapon or new object ever appears anywhere in the shot. Every surface of her stays EXACTLY
> as bright as it is in the reference image - her steel blades and the apron plate never shine
> brighter, never flare and never bloom, nothing on her ever glows or lights up, and no glow, aura,
> beam, halo, ring of light, orb, fireball, foxfire, flame, ember, projectile, wisp, mist, smoke,
> fog or energy of any kind ever appears anywhere in the shot. While they are in her grip the
> daggers only ever move with her own two arms in tight lines close to her own body - NO PART of
> either dagger ever rises above the height of her own hat's brim, neither dagger is ever raised
> overhead, never swung up past her own head and never thrown, and neither blade's tip ever travels
> further toward screen-RIGHT than the LOW dagger's tip sits in the reference image or further
> toward screen-LEFT than her own rear heel. HER FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP -
> she never jumps, never leaps, never hops, never steps and never lunges out into a wide stance; she
> keeps her stance narrow and never spreads wider than about one and a quarter times her standing
> width. She stays planted on the same spot at the same distance from the camera the whole clip,
> with zero net drift in any direction. She stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and her body holds the SAME angle to camera it has in the
> reference image - it never opens further toward the viewer and never turns away, and her back is
> never shown. Her face keeps the same calm stern expression it has in the reference image - it
> never changes - and she never talks, never shouts and never cries out. The camera is absolutely
> locked, no zoom, no pan, her full body always fully in frame, she is the ONLY figure in frame at
> all times, nothing else added. She begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The literals below are load-bearing and must not be re-worded.

(a) THE GRIP LOCK IS WRITTEN TO **SURVIVE** THE ko, following hector/gargoyle/lich. The KO-SUFFIX
rule strips any sentence matching `keeps the ... never drops or swaps`; this character never lets
go of either dagger in any state (her fists never open), so the lock is phrased "stay gripped in
her own closed fists ... never released, never let go, never exchanged", which does not match the
strip, stays TRUE through a prone collapse, and sits in its own sentence so no strip takes the
identity lock with it. Verify on the built `ko` that both the identity sentence and the grip
sentence survive.

(b) `HER FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not GETA — the ko
rewrite matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any other way and the
rewrite silently misses. Consequence honoured kit-wide: NO standing state kneels, stamps or lifts a
geta — every impact is delivered flat-footed through sinks, folds, grinds and the blades. The only
knees-to-ground in the kit is the ko collapse, which the rewritten ko suffix governs.

(c) THE STANCE CLAUSE USES THE CANONICAL `she keeps her stance narrow and never spreads wider
than`, so the ko rewrite rescopes it to while-standing — koSuffix() CAPTURES the pronouns (phase
103), so the she/her forms survive the rewrite correctly. Do not re-word it. The ratio stays at one
and a quarter despite the ~395px margins — nothing in this kit needs more.

(d) THE WEAPON-MOTION SENTENCE IS SCOPED `While they are in her grip` and the ceiling is HER OWN
HAT'S BRIM kit-wide — the raised blade's tip rides AT its reference chin height, just below that
cap, in every standing state; do not tighten the cap later without reading every state. The tail
cap is HER OWN SHOULDERS and `victory` deliberately rides AT it (the tail fan rises exactly to
shoulder height); do not tighten that either without reading victory.

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko`
is rewritten by koSuffix() to end `...anywhere in the shot.`; build BOTH `idle` and `ko` and
confirm they DIFFER at the tail. Never copy the ko tail back into this file.

(f) BOTH HANDS ARE FULL IN EVERY FRAME OF ALL 13 STATES: no beat ever opens a fist, touches the
hat, or mimes a grab — a two-dagger character CANNOT seize anything, so both throws are a
body-check and a tail-sweep through empty air, with the emptiness asserted inline. The ONLY
licensed blade re-orientation is special_3's tip-down turn about its own closed fist, stated in
that beat and reversed in its recovery; no other state re-orients a blade.

(g) THE THREE TAILS ARE A COUNTABLE IDENTITY FEATURE, exactly like hector's insignia: EXACTLY
three, white-tipped, attached at her lower back. They are never a debris source (fur breaks no
stone — every debris beat sources from her geta or a blade tip against the floor), never multiply,
and never merge. They own the LEFT edge, so every tail beat in the kit moves inward or vertical,
and hit/ko compress them instead of swinging them.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist" and no foot-to-foot
weight transfer anywhere in this file — not only in the gated states. Settles are written
straight-down through BOTH feet at once; the one blade re-orientation is written as a TURN of the
OBJECT about a closed fist, never as a body rotation.

FACING, judgement call: **NEAR-PROFILE THREE-QUARTER toward screen-right — close to strict profile,
but NOT one**, so no line in this file orders "strict side profile". The evidence, read at full
size:
  · HEAD — the most profile-true part of her: nose, lips and chin silhouette cleanly against the
    green with a single visible eye; the hat brim reads as a clean side-on ellipse.
  · TORSO — the tell that breaks strict profile: the pale V of her chest under-layer and the FRONT
    of the laced apron plate both read clearly, which an edge-on torso would hide.
  · FEET — the decisive test: both feet show their tops and toes; the rear foot is turned a few
    degrees out toward the viewer. One clear instep is enough to fail strict profile.
So every acting line says "her body angled to camera exactly as it is in the reference image and
facing screen-right", and the suffix bans the turn in BOTH directions. Her face, chest V, both
dagger tips and her leading geta all commit toward screen-right, and every line of attack in the
kit goes that way or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HER OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things visible are HER OWN body, her two daggers and HER OWN debris. Every piece of debris is SOLID MATERIAL - real chips and shards of broken grey flagstone, opaque, sharp-edged, matte and lit like stone - never a glow, never a flame, never foxfire, never an ember, never a wisp, never an aura, never mist, never smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is knocked UPWARD and stays low and close to her, rising no higher than her own waist and spreading no wider than HER OWN STANDING FOOTPRINT - never past the toe of her leading geta toward screen-right, never past her rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a fox-spirit duellist's patient two-knife guard, her weight sunk and even
over both planted geta, the RAISED dagger held blade-up at her own lower-chest height and the LOW
dagger level at her own belt, exactly as in the reference image. ONE slow full SETTLING of her
whole body fills the first half of the clip and a second fills the second half, and EVERY PART of
that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each settling her whole weight
sinks a fraction STRAIGHT DOWN through BOTH of her planted feet at once and rises again - it NEVER
transfers from one foot to the other and neither foot ever carries more of it than the other - her
shoulders sink a fraction STRAIGHT DOWN and lift again with neither one coming forward and neither
one going back, and both daggers ride DOWN with her a finger's width and back up, each holding its
exact reference angle, neither tip ever swinging toward either side edge. The prop beat inside each
settling: the fingers of her REAR fist flex and re-close on the LOW dagger's corded hilt one
knuckle at a time WITHOUT the hand ever leaving or sliding on the hilt, then the fingers of her
LEADING fist do the same on the RAISED dagger's hilt - neither hilt ever leaves either closed palm.
The fox beats: ONCE in each half, both fox ears give one small quick flick and stand tall again,
and her three tails rise a breath's height and settle again, straight up and down, their white tips
never travelling toward any edge. She breathes slow and even, the rise of her chest barely lifting
the red collar. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO
CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her near shoulder never comes
forward, her far shoulder never swings round, and her chest never squares up toward the camera; she
may SINK, but she never TURNS. Her gaze stays fixed toward screen-right under the still, level
brim. Feet planted, silent, patient as a hunting fox. Returns to the exact start pose so it loops
seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (falling fang down the line of her own body)
STRIKE A (falling fang): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right, the RAISED dagger already up at
her own lower-chest height with its tip at her own chin. THERE IS NO WIND-UP OF ANY KIND: she does
NOT raise the blade higher, does NOT draw it back, does NOT lift it even slightly, her shoulders do
NOT rise, and NO PART of either dagger travels UPWARD at any moment before the cut - the cut starts
from the height the raised blade ALREADY HAS in the reference image and only ever travels DOWN and
IN. IN THE FIRST QUARTER her knees fold and she DROPS her whole weight straight DOWN over both
planted feet in one committed sink, hips folding deep and chest coming down - and through that same
sink her LEADING fist RIPS the raised blade DOWN in ONE single tight arc close along the front of
her own body, the curved tip tracing from her own chin height down past her own belt to her own
knee height, at every moment NEARER her own body than the LOW dagger's tip sits in the reference
image and never travelling further toward screen-right; the LOW dagger stays parked level at her
waist and rides down with her, its tip never travelling further toward screen-right than it sits in
the reference image. THE CUT HAS LANDED BY THE HALFWAY POINT and the blade never touches the ground
- one clean cut through empty air, stopped dead at her own knee height by her own control. As her
weight lands, the wooden sole of her leading geta grinds hard DOWN into the stone and breaks
EXACTLY THREE small chips of hard grey flagstone up off the floor beside that geta, each chip no
bigger than one of her own knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff,
never a cloud, never dust, never smoke and never haze - rising no higher than her own ankle and
spreading no wider than her own standing footprint - never past the toe of her leading geta toward
screen-right, never past her rear heel toward screen-left - every chip crumbling away to nothing in
mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. Her
three tails snap a fraction upward with the cut and settle again, their white tips never travelling
further toward screen-left than they sit in the reference image. BOTH OF HER FEET STAY FLAT ON THE
STONE THROUGHOUT - neither heel ever lifts. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO
HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her
near shoulder never comes forward, her far shoulder never swings round, and her chest never squares
up toward the camera; she may FOLD and SINK, but she never TURNS. She HOLDS the sunk finish with
the blade low through the third quarter while the last chips crumble away, and only in the final
quarter does she rise slowly, the raised blade drawing back UP close along the front of her own
body to the EXACT height and angle it has in the reference image, and settle into the EXACT same
reference stance, so that she is already standing completely still in the reference pose well
before the clip ends. Quick, clean, vulpine.

## attack_strike_b  (low fang beside the leading shin)
STRIKE B (low fang): she begins in the EXACT reference stance, her body angled to camera exactly as
it is in the reference image and facing screen-right, the LOW dagger already level at her own belt
height with its blade toward screen-right. THERE IS NO WIND-UP OF ANY KIND: she does NOT lift the
low blade first, does NOT pull it back toward her hip, does NOT cock the wrist upward, and NO PART
of either dagger travels UPWARD at any moment before the cut - the cut starts from the height the
low blade ALREADY HAS in the reference image and only ever travels DOWN and IN. IN THE FIRST
QUARTER she folds into a deep crouch, her whole weight sinking STRAIGHT DOWN over both flat geta,
and through that sink her REAR fist drives the LOW blade DOWN and IN past her own leading shin in
ONE single short stab, until its tip STRIKES the flagstone tight beside the toe of her own leading
geta - travelling only down and inward, never further toward screen-right than that toe. THE BITE
HAS LANDED BY THE HALFWAY POINT: the tip cracks the floor where it strikes and EXACTLY THREE chips
of hard grey flagstone burst UPWARD around the buried tip, each chip no bigger than one of her own
knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than her own knee, staying within one hand's-breadth
of the bite - never past the toe of her leading geta toward screen-right, never past her rear heel
toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER
MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. Through the whole clip the RAISED dagger
holds its exact reference station, riding down with her body, its tip never rising above her own
chin and never travelling further toward screen-right than it sits in the reference image. Her
three tails bunch low with the crouch, their white tips never travelling further toward screen-left
than they sit in the reference image. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS
HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her near
shoulder never comes forward, her far shoulder never swings round, and her chest never squares up
toward the camera; she may FOLD and SINK, but she never TURNS. She HOLDS the low finish with the
tip in the stone through the third quarter while the last chips crumble away, and only in the final
quarter does she draw the tip free, the low blade returning UP to its EXACT belt-height reference
station as she rises into the EXACT same reference stance, so that she is already standing
completely still in the reference pose well before the clip ends. Short, low, surgical.

## attack_throw A  (crossed-fang body check through empty air, solo-safe)
THROW A (crossed-fang check): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in this clip - nothing is ever caught, hooked, carried, dragged or
thrown, both of her fists stay closed on her own two dagger hilts in every single frame and close
on NOTHING else, and there is no object of any kind anywhere in the frame except her own two
daggers; the ONLY thing anything of hers touches is the bare flagstone floor. IN THE FIRST THIRD
she coils STRAIGHT DOWN into a deep crouch over both planted feet, knees folding, chin tucking a
fraction under the level brim - and she draws BOTH daggers IN until they cross in a tight X against
her own chest, every part of both daggers NEARER her own body than it sits in the reference image,
and they stay crossed there for the whole middle of the clip. THEN she DRIVES her whole trunk a
short way toward screen-right in one hard hip-and-shoulder check through the empty air on her
screen-right side, BOTH feet staying flat and planted exactly where they stand - the drive travels
through her hips and trunk alone, a short way only, her leading shoulder never travelling further
toward screen-right than the toe of her own leading geta below it - and her three tails snap taut
behind her with the drive, a tightening and not a reach, their white tips never travelling further
toward screen-left than they sit in the reference image. BOTH shoulders travel together the same
distance, so THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO
CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her chest never squares up toward
the camera; she may LEAN and SINK, but she never TURNS. THE CHECK PEAKS BY THE HALFWAY POINT. On
the drive the wooden soles of her geta grind hard into the stone and EXACTLY FOUR chips of hard
grey flagstone burst UPWARD from under her own geta, each chip no bigger than one of her own
knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than her own knee and spreading no wider than her own
standing footprint - never past the toe of her leading geta toward screen-right, never past her
rear heel toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE
ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. THROUGH THE THIRD QUARTER she draws
her trunk back upright over her planted hips while the last chips crumble away, and in the final
quarter both daggers ease back OUT from her chest to their EXACT reference stations - the raised
blade back up at her own chin height, the low blade back level at her own belt - and she settles
into the EXACT same reference stance, so that she is already standing completely still in the
reference pose well before the clip ends. Coiled, driving, foxlike.

## attack_throw_b  (three-tail sweep through empty air, solo-safe)
THROW B (three-tail sweep): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in the frame at any time - her tails strike NOTHING, nothing is ever
caught, lifted, swept off its feet or thrown, both of her fists stay closed on her own two dagger
hilts in every single frame and close on NOTHING else, and the sweep passes through empty air only.
IN THE FIRST THIRD she coils STRAIGHT DOWN into a deep low crouch over both planted feet, haunches
sinking, both daggers drawing IN and crossing low in front of her own belt - every part of both
daggers NEARER her own body than it sits in the reference image, where they stay for the whole
middle of the clip. THEN her THREE TAILS lash together in ONE single low sweep - the lash lives
entirely in the tails while her hips, trunk and both flat geta stay locked on their spot: the three
tails whip low around her own planted legs toward screen-right and back again, staying BELOW her
own waist the whole way, their white tips sweeping never further toward screen-right than the toe
of her own leading geta and never further toward screen-left than they sit in the reference image
on the backswing, and as the lash lands her whole weight drops a further fraction STRAIGHT DOWN
through both grinding geta. THE LASH PEAKS BY THE HALFWAY POINT. Under her grinding geta EXACTLY
THREE chips of hard grey flagstone break UPWARD from under the wooden soles, each chip no bigger
than one of her own knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a
cloud, never dust, never smoke and never haze - rising no higher than her own knee and spreading no
wider than her own standing footprint - never past the toe of her leading geta toward screen-right,
never past her rear heel toward screen-left - every chip crumbling away to nothing in mid-air as it
falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. THE LINE OF HER TWO
SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - her chest never squares up toward the camera; she may FOLD and SINK,
but she never TURNS. THROUGH THE THIRD QUARTER the three tails sweep back and settle into their
exact reference drape while the last chips crumble away, and in the final quarter both daggers ease
back OUT to their EXACT reference stations and she rises into the EXACT same reference stance, so
that she is already standing completely still in the reference pose well before the clip ends.
Low, sweeping, vulpine.

## attack_block A  (the crossed-fang guard)
BLOCK-COUNTER A (crossed-fang guard): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER she
SINKS her whole weight straight DOWN into a braced crouch over both planted feet while BOTH daggers
draw IN toward her - the RAISED blade dipping in and down, the LOW blade drawing in and up - until
the two dark blades cross in a tight X just in front of her own collarbones, neither tip rising
above the height of her own chin, every part of both daggers NEARER her own body than it sits in
the reference image, elbows pulled in tight against her own ribs, chin tucked a fraction under the
level brim, knees taking the load. The crossed X is a solid two-blade wall between her and the
pressure; it does not travel sideways and it drops with her body and nothing else. SHE HOLDS THAT
BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as she absorbs the pressure - the wooden soles of
both geta grind a fraction on the stone without either one leaving the spot it stands on, her
forearms shudder under the load, her shoulders judder and settle straight up and down, her three
tails bunch low and tight behind her with their white tips never travelling further toward
screen-left than they sit in the reference image - but the crossed blades themselves do not move
and nothing else in her body travels. IN THE FINAL QUARTER she drives one short hard shove straight
UP out of her knees behind the crossed X, rising only back to her own standing height and no
further, and then both daggers ease back OUT to their EXACT reference stations - the raised blade
back up at her own chin height, the low blade back level at her own belt - as she flows in one
eased motion back into the EXACT same reference stance, so that she is already standing completely
still in the reference pose well before the clip ends. Nothing sheds and nothing breaks. Braced,
tight, immovable.

## attack_block_b  (the brim guard, blades low)
BLOCK-COUNTER B (brim guard): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER she bows her
head a SMALL way so the wide straw brim shades her eyes - the hat staying seated level on her head,
never lifting and never slipping - hunches her shoulders straight DOWN, and sinks her whole weight
STRAIGHT DOWN through both flat geta while BOTH daggers sweep DOWN into a low double bar: the
raised blade comes down close along the front of her own body until both daggers lie level in front
of her own thighs with their tips toward screen-right, neither tip higher than her own belt and
neither tip further toward screen-right than the LOW dagger's tip sits in the reference image. SHE
HOLDS THAT HUNCHED LOW GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - the wooden soles of both
geta grind a fraction on the stone without leaving the spots they stand on, her neck, back and
shoulders shudder under the load straight up and down, the two level blades stay dead-still and
never rise and never swing for one frame of it, and her three tails hang low and close, their white
tips never travelling further toward screen-left than they sit in the reference image. IN THE FINAL
QUARTER she drives straight up out of her knees with one short heavy shrug of her whole back - the
crown of her hat rising no higher than it sits in the reference image - her head lifting back
level, and both daggers ride back UP to their EXACT reference stations - the raised blade back up
at her own chin height, the low blade back level at her own belt - as she flows in one eased motion
back into the EXACT same reference stance, so that she is already standing completely still in the
reference pose well before the clip ends. Nothing sheds and nothing breaks. Compact, shaded,
immovable.

## hit  (snap recoil, tails bunch)
HIT (snap recoil): she begins in the EXACT reference stance, her body angled to camera exactly as
it is in the reference image and facing screen-right; her head and both shoulders snap back and to
screen-LEFT, her spine folding and her knees buckling under the blow's weight - but BOTH FEET STAY
EXACTLY WHERE THEY STAND, she does not step back and she does not skid, every bit of the recoil is
absorbed in her knees, hips and trunk, and her shoulders travel back no further than above her own
rear heel. The straw hat stays seated square and level on her bowed head - it never lifts, never
tips back and never comes off. Both fists clamp harder on their hilts and both daggers are jolted
straight DOWN with her body a short way, each holding its exact reference angle - they never swing,
never rise and never cross. Her three tails jolt once and BUNCH DOWN close against her own legs
rather than swinging back, their white tips never travelling further toward screen-left than they
sit in the reference image. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and she rides it off
balance through the middle of the clip - her trunk pitched a short way back over her rear leg with
both feet still planted, her shoulders juddering, the blades trembling in her locked fists. IN THE
LAST THIRD she catches her balance, straightens up out of her knees and flows in one eased recovery
back into the EXACT same reference stance, so that she is already standing completely still in the
reference pose well before the clip ends. Her face leads the recoil, jaw set; her back is never
shown and her chest never squares up toward the camera. Nothing sheds and nothing breaks. She is
ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any time,
and there is no light, no flare, no wisp and no streak anywhere in the shot. Only her own body and
her own weapons move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): she begins in the EXACT reference stance, her body angled to camera exactly as it is
in the reference image and facing screen-right; IN THE FIRST THIRD OF THE CLIP her knees give way
beneath her, her head drops and her shoulders slump, and she goes STRAIGHT DOWN onto both knees on
the spot she stands on without travelling forward, her legs folding beneath her. Then she pitches
forward and down over her own thighs and FOLDS, her arms folding down beneath her with both fists
still closed on their hilts, and BY THE HALFWAY POINT she has come to rest fully collapsed and
motionless, folded heavily down over her own knees with her hatted head lying low toward
screen-right and her face still pointed that way - the straw hat staying seated on her bowed head
all the way down and lying with her. Her fists never open: both daggers come down WITH her and come
to rest tucked close against her own fallen body, each blade finishing NEARER her own body than it
sits in the reference image, and neither tip anywhere near an edge of the frame. Her three tails
settle down over her own folded legs toward screen-left and lie still, their white tips never
travelling further toward screen-left than they sit in the reference image. EXACTLY THREE small
chips of hard grey flagstone are knocked UPWARD where her knees strike, each chip no bigger than
one of her own knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud,
never dust, never smoke and never haze - rising no higher than her own fallen shoulder and staying
within one body-width of where she lands, every chip crumbling away to nothing in mid-air as it
falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. FOR THE WHOLE SECOND
HALF OF THE CLIP SHE LIES COMPLETELY STILL - she does not stir, does not lift her head, does not
push up on an arm and she does NOT get back up - and the fallen daggers, the hat and the three
tails lie exactly where they came to rest and do not move again. She is ALONE in an empty frame -
nothing whatsoever enters, crosses or appears in the frame at any time. Only her own body and her
own weapons move.

## victory  (the three-tail fan and crossed-fang salute)
VICTORY (three-tail fan): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. IN THE FIRST QUARTER she bends
both knees in one slow dignified sink straight DOWN while she draws both daggers slowly IN until
the two dark blades cross in a tight X just in front of her own collarbones, neither tip rising
above the height of her own chin - and as the blades cross, her THREE TAILS rise slowly and FAN
OPEN behind her, spreading apart from one another like a hand of feathers, the fan opening by
RISING in place: the highest white tip rises exactly to the height of her own shoulders and no
higher, and none of the three tips ever travels further toward screen-left than the tails sit in
the reference image. FOR THE WHOLE MIDDLE HALF OF THE CLIP SHE HOLDS THAT SALUTE - the crossed
blades dead-still at her collarbones, the fanned tails swaying a breath's height straight up and
down - and only three small motions live inside it: two slow settlings of her whole weight STRAIGHT
DOWN through both planted feet and back up, never transferring from one foot to the other; the
fingers of each fist re-closing one knuckle at a time on its own hilt without either hand leaving
its station; and ONE slow shallow bow of her head straight down and back up, the wide brim dipping
only a finger's width, the hat staying seated and level, her face staying pointed toward
screen-right throughout - she never turns her head or her body toward the camera at any point, and
her chest never squares up toward the viewer. Her expression stays calm and stern and she makes no
sound. IN THE FINAL QUARTER the three tails sink back down into their EXACT reference drape, both
daggers ease back OUT to their EXACT reference stations - the raised blade back up at her own chin
height, the low blade back level at her own belt - and she rises out of the knee-bend into the
EXACT same reference stance, so that she is already standing completely still in the reference pose
well before the clip ends. Nothing sheds and nothing breaks. Composed, ceremonial, vulpine.

## special_1  (THE SCISSORED EARTH) — twin bites either side of her own stance
SPECIAL FINISHER (the scissored earth): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF
ANY KIND: she does NOT raise either blade, does NOT draw either back, and NO PART of either dagger
travels UPWARD at any moment before the cut - both cuts start from the heights the blades ALREADY
HAVE in the reference image and only ever travel DOWN and IN. IN THE FIRST QUARTER she sinks
straight DOWN over both flat geta while both blades sweep IN and cross low in front of her own
belt, every part of both daggers NEARER her own body than it sits in the reference image. FROM THE
QUARTER MARK she rips the X apart in ONE single committed scissor as her crouch bottoms out: the
RAISED-hand blade cuts DOWN and forward until its tip STRIKES the flagstone tight beside the toe of
her own leading geta - never further toward screen-right than that toe - while the LOW-hand blade
cuts DOWN and back until its tip STRIKES the flagstone just ahead of her own rear geta - never
further toward screen-left than her own rear heel - BOTH tips biting the stone at the SAME instant,
and THE DOUBLE BITE HAS LANDED BY THE HALFWAY POINT. At the two bites EXACTLY FOUR chips of hard
grey flagstone burst UPWARD, two at each bite, each chip no bigger than one of her own knuckles and
each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and
never haze - rising no higher than her own knee, each pair staying within one hand's-breadth of its
own bite - never past the toe of her leading geta toward screen-right, never past her rear heel
toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER
MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. Her three tails snap taut and low with the
scissor, their white tips never travelling further toward screen-left than they sit in the
reference image. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO
CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her chest never squares up toward
the camera; she may FOLD and SINK, but she never TURNS. SHE HOLDS the wide low finish with both
tips in the stone through the third quarter, shoulders juddering straight up and down under the
load, while the last chips crumble away, and IN THE FINAL QUARTER she draws both tips free and both
blades return to their EXACT reference stations - the raised blade back up at her own chin height,
the low blade back level at her own belt - as she rises into the EXACT same reference stance, so
that she is already standing completely still in the reference pose well before the clip ends. Two
fangs, one floor, silent.

## special_2  (THE THREE-TAIL LASH) — three staged tail-lashes around her own planted legs
SPECIAL FINISHER (the three-tail lash): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right. IN THE FIRST QUARTER she
coils STRAIGHT DOWN into a deep loaded crouch over both planted feet while both daggers draw IN and
cross close in front of her own chest, every part of both daggers NEARER her own body than it sits
in the reference image, where they stay crossed and take no other part until the recovery. FROM THE
QUARTER MARK TO THE SEVENTY PERCENT MARK her three tails LASH one after another - first the
highest, then the middle, then the lowest - each lash whipping low around her own planted legs
toward screen-right and back again, the lash living entirely in the tails while her hips and both
flat geta stay locked on their spot: every lash stays BELOW her own waist, the white tips sweep
never further toward screen-right than the toe of her own leading geta and never further toward
screen-left than they sit in the reference image on the backswing, and with each lash her whole
weight drops a further fraction STRAIGHT DOWN through both grinding geta - three small sinks, one
per lash. Under the grinding wooden soles the floor gives way IN STAGES across the three lashes:
EXACTLY SIX chips of hard grey flagstone break loose in ones and twos spread across the length of
the clip, never in one burst, each chip no bigger than one of her own knuckles and each one SOLID,
OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze -
knocked UPWARD no higher than her own knee and spreading no wider than her own standing footprint -
never past the toe of her leading geta toward screen-right, never past her rear heel toward
screen-left - every chip crumbling away to nothing in mid-air as it falls, each stage's chips gone
before the next lash lands. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE.
THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE
IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her chest never squares up toward the camera; she
may FOLD and SINK, but she never TURNS. AFTER THE THIRD LASH the tails sweep back and settle into
their EXACT reference drape while the last chips crumble away, and IN THE FINAL QUARTER both
daggers ease back OUT to their EXACT reference stations - the raised blade back up at her own chin
height, the low blade back level at her own belt - and she rises into the EXACT same reference
stance, so that she is already standing completely still in the reference pose well before the clip
ends. Low, lashing, vulpine.

## special_3  (THE EARTH FANG) — her whole weight poured down one short blade
SPECIAL FINISHER (the earth fang): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY
KIND: she does NOT raise either blade, does NOT draw either back, and NO PART of either dagger
travels UPWARD at any moment before the press - the press starts from the heights the blades
ALREADY HAVE in the reference image and only ever goes DOWN. IN THE FIRST QUARTER she TURNS the
raised dagger tip-DOWN a short way about its own hilt inside her closed leading fist - her fingers
never opening, her hand never leaving or sliding on the hilt - while she folds STRAIGHT DOWN into
the deepest crouch of the kit, haunches sinking low over both flat geta, knees never touching the
ground, and SETS the down-turned tip onto the flagstone tight against the toe of her own leading
geta - the tip never further toward screen-right than that toe; the LOW dagger draws IN against her
own waist and takes no part. FROM THE QUARTER MARK TO THE SEVENTY PERCENT MARK she POURS her whole
weight down the short blade: her chest folds down over her leading knee, her leading arm
straightens as she bears down, her shoulders judder straight up and down under the load, both geta
stay flat and planted, and under the grinding point the stone gives way IN STAGES: EXACTLY SIX
chips of hard grey flagstone break loose in ones and twos spread across the length of the press,
never in one burst, each chip no bigger than one of her own knuckles and each one SOLID, OPAQUE and
sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - knocked UPWARD
no higher than her own knee, staying within one hand's-breadth of the buried tip - never past the
toe of her leading geta toward screen-right - every chip cracking apart and crumbling away to
nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT
ONCE. Through the whole press the grounded tip GRINDS on its spot without ever sliding out toward
screen-right and without ever lifting, and her three tails bunch low behind her, their white tips
never travelling further toward screen-left than they sit in the reference image. THE LINE OF HER
TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - her chest never squares up toward the camera; she may FOLD and SINK,
but she never TURNS. IN THE FINAL THIRTY PERCENT she eases her weight back up, draws the tip free,
and TURNS the blade back tip-UP about its own hilt inside the same closed fist to the EXACT angle
and height it has in the reference image as she rises - the low blade easing back out level at her
own belt - into the EXACT same reference stance, so that she is already standing completely still
in the reference pose well before the clip ends. One small blade, her whole weight behind it.
