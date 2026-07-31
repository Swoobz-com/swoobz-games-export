# PALE CHOIR — MK FINAL playable #4. Full 13-clip kit.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/pale-choir-anchor-magenta.png`, never the raw
`input/MK FINAL/mythic/Pale_Choir.png` and never the green padded plate sitting beside it. The raw
plate is 856x1536 with the subject at 761x1313 — L32 / R63 / T144, filling 85% of frame height. The
padded plate measures **L466 / R464 / HEADROOM 468**, verified by
`node qa-boss/measure-anchor-budget.mjs qa-boss/anchors/mk/pale-choir-anchor-magenta.png --magenta`.

**PLATE CHOICE — MAGENTA, AND THE GREEN PLATE IS UNUSABLE FOR HIM.** Both plates exist and both hold
the identical subject (bbox x466..x1071 / y468..y1511 on each; the subject pixels are BIT-IDENTICAL
between the two files, mean channel delta 0.00 and max 0 — `replate-chroma.mjs` swapped the backdrop
and touched nothing else). Three measurements decide it:

  1. **HIS FRONT FANGS ARE ACID GREEN.** 92 subject pixels satisfy the keyer's own `isGreen(r,g,b)`
     predicate, in a 14x14 patch at x836..x849 / y600..y613 — dead centre of his snarl (sample values
     rgb(43,182,20), rgb(60,199,37), rgb(35,156,7)). On a green plate `key-idle-clips.mjs` punches a
     hole straight through his teeth, and the snarl IS his face. This is the ir56 rule verbatim: that
     character is on magenta because his body is green-armoured, and pale choir's mouth is the same
     defect at smaller scale on the most expressive 200px of the character.
  2. **HE IS PURE WHITE, AND THE GREEN PLATE IS 3.3x BRIGHTER.** Relative luminance of the green plate
     rgb(8,188,3) is 136; of the magenta plate rgb(163,0,95) it is 42. A white subject has no colour
     of its own to defend, so the bounce off a bright plate lands as a saturated cast over the whole
     body — and it already has: **55.6% of his 1px edge band (2910 of 5237 px) carries a green cast**,
     baked in by the original green render.
  3. **PLATE UNIFORMITY, top-green-bin metric (the two-tone check).** Green plate: top bin 8/184/0 at
     **94.4%**, second bin 0/184/0 at 4.6%, 1140 distinct bins. Magenta plate: **100.0% in a single
     bin**, exactly ONE distinct bin. Both clear the ~70% two-tone suspect threshold — no rectangle,
     no re-plate needed on either — but the magenta plate is perfectly flat, so the border-ring colour
     `key-idle-clips.mjs` samples is exact rather than approximate.

**WATCH ITEM FOR WHOEVER KEYS HIM.** Because the re-plate did not despill, that baked green rim is
still on the subject and is now VISIBLE against magenta as a thin green outline (clearest along the
crown of his skull and his jaw). It is 1px on the anchor, not baked geometry, so it does not
propagate as a hard defect into a generated clip — but if a clip comes back with a green edge, this
anchor is where it came from, and the fix is a despilling re-plate, not a prompt change.

## ★ PALE CHOIR FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536 (MAGENTA). Full subject **606w x 1044h** (fills 68.0% of frame height), bbox
x466..x1071, y468..y1511.
  LEFT **466px** · RIGHT **464px** · HEADROOM **468px** · bottom **24px** (bare feet on the floor
  line — free, `check-containment.mjs` never counts feet-on-floor).

**HE IS THE ROOMIEST PLATE AND THE NARROWEST SUBJECT IN THE MK SET, AND THAT COMBINATION IS THE
TRAP.** 606px wide against minotaur's 1090 and skullrend's 1030, because he carries **no prop at
all** — his entire bbox is body. Read the ownership before writing any beat:
  · **RIGHT 464px** is owned by the **IVORY CLAW TIPS** of his raised bone gauntlet — x1071, on rows
    y724..731, i.e. at his own jaw height with that arm already carried forward.
  · **LEFT 466px** is owned by **HIS OWN REAR FOOT'S TALONS** — x466, on rows y1402..1413, down on
    the floor line.
  · **TOP** is the crown of his backswept skull — y468, on cols x726..755.
  · His **hips are only 276px across** (x540..x815) and his **standing footprint is 412px**
    (x466..x877). That footprint is the span anchor every effect in this file ties to.

This is the SKULLREND shape, not the minotaur shape: the two side edges belong to different things,
so **nothing trades** — pulling the claws in does not push anything out on the left, which makes
bounding the claws free, and every beat should do it.

  1. **THE ANCHOR POSITION IS THE BOUND, NOT THE FRAME EDGE — and the frame is what makes that hard
     to remember.** There IS enough raw room for one straight punch: his full arm reach is about
     450px from the shoulder, so a fully extended forward thrust puts the claw tips near x1230, still
     ~300px inside the edge. That is exactly the trap of a roomy plate. The frame will forgive a
     thrust; `check-anchor-lock` will not, and neither will the span cap once anything is added under
     it. So the suffix bounds the claw tips at their REFERENCE position and every beat is a ROTATION
     about his own shoulder and elbow — never a translation of the hand out from the body. Rotating
     the claws DOWN moves them up to 400px further from the right edge, which makes a downward rake
     geometrically *safer* than the anchor pose itself.
  2. **SPAN CAP 1.60x — THE HARD RULE, NOT THE GEOMETRY, AND HE IS THE FIRST IN THIS SET WHERE THAT
     IS TRUE.** 1536/606 = 2.53x would fit. minotaur's cap came from his axe (1.41x) and skullrend's
     from his cleaver (1.49x); pale choir has no prop to narrow it, so the roster hard rule governs:
     606 x 1.60 = 970px. The danger of a roomy plate is the inverse of a tight one — there is empty
     space to wander into, so the bound must come from HIS OWN reference silhouette and never from
     "it still fits".
  3. **TRAVEL IS THE ONE THING THAT EATS BOTH EDGES AT ONCE.** A step, a lunge or a widened stance
     carries the rear talons left and the claws right in the same frame. So the rule splits: the ARMS
     may move as much as the beat needs provided they rotate DOWN or IN; the BODY never leaves the
     spot it stands on.
  4. **HIS DIRECTION IS DOWN — AND THE BOTTOM IS ONLY 24px, WHICH IS WHY THE `ko` MUST FOLD.** A
     downward drive into the stone is always his safest beat. But there is no room to lay him out:
     pitched flat and face-down from the hip his crown alone reaches about x1302, and outstretched
     arms carry another ~250px past that — off the right edge. So his `ko` drops STRAIGHT DOWN onto
     both knees first and then folds forward over his own thighs with the legs tucked and the arms
     crumpling in under his chest. A folded prone body measures ~700-800px and clears comfortably;
     it is also the more brutal read, and it keeps his claws well inside their reference bound
     instead of contradicting the suffix.
  5. **HEADROOM 468px is his LOOSEST budget, not his tightest — and it is still the only edge a raise
     can break.** His crown sits at y468 and his raised gauntlet tops out at y648, a full 180px below
     it, so a bounded raise has room. Nothing in this kit needs one: the beats live at chest height
     and below, and both hands are capped at his own collarbone or his own crown.
  6. **EVERY EFFECT CARRIES THREE LEGS — COUNT, SIZE, SPAN — AND THE SIZE AND SPAN ARE HIS OWN
     BODY.** An exact count ("EXACTLY THREE"), a per-object size tied to one of his own parts ("no
     bigger than his own closed bone fist", "no bigger than one of his own ivory claws"), and a span
     tied to his 412px STANDING FOOTPRINT ("never past his leading foot, never past his rear heel").
     Never the gap between his feet — a crouch widens that. Effects are **SOLID MATERIAL**: broken
     grey floor-stone and pale chalk grit. Never a glow, flame, aura or mist.
  7. **HIS DEBRIS IS STONE, NEVER BONE — a deliberate divergence from skullrend.** Skullrend's kit
     sheds splintered bone shards. Pale choir's entire arsenal IS bone, worn on his forearms, so bone
     debris anywhere near him reads as HIS OWN GAUNTLET BREAKING APART. Nothing in this file sheds
     bone, and the add-on bans whole bones, skulls and skeletons outright.
  8. **He carries NO baked emissive feature.** The only saturated colour anywhere on him is the acid
     green of his front fangs, and it is pigment, not light. The suffix pins it to reference
     brightness rather than trying to dim something.

Shared prefix:
> The EXACT SAME towering pale ghoul-brute from the reference image (identical chalk-white bone-grey
> hide stretched over enormous slabbed muscle with heavy vein and tendon relief across his arms,
> chest and thighs, a long smooth hairless cranium sweeping back from his brow into a blunt bony
> crest, one small pointed ear, a deep hollowed eye socket under a heavy shelf of brow with a small
> dark eye set in it, no nose but two open nostril slits, deep vertical creases cut down his cheeks,
> and a heavy jutting lower jaw fixed in a wide silent snarl showing a double row of pale bone teeth
> with ACID-GREEN front fangs and gums; a dull gold flat-strap harness with one strap over each
> shoulder crossing his bare chest and meeting a small gold keeper plate at his sternum, running down
> to a dull gold waist belt with a pointed gold pendant plate, a dark olive-brown loincloth over dark
> shorts with a long pale tan strap-tongue hanging down the front of his thigh; on the forearm he
> carries raised and forward, a dark hide wrist-wrap under two banded straps and a heavy BONE
> KNUCKLE-CAGE bristling with long curved IVORY CLAWS; on his other forearm, carried lower and
> further out, a huge SKELETAL BONE HAND - an oversized gauntlet built of real hand bones, a long
> pierced bone plate over the back of it and jointed finger-bones splayed open with blunt pointed
> tips, worn over a dark leather cuff; and bare feet with long curved ivory talons on the toes),
> standing on a solid saturated MAGENTA chroma screen (deep magenta #a3005f, NOT pink, NOT purple,
> absolutely nothing green in the BACKGROUND; the acid green stays only on his own front fangs).

Shared suffix (carries the prompt laws — every state inherits these):
> His chalk-white hide, backswept bone skull, acid-green fangs, gold harness and belt, loincloth, the
> clawed bone gauntlet on one forearm, the skeletal bone hand on the other and the ivory talons on
> his bare feet all stay EXACTLY the same the entire clip. He keeps the clawed bone gauntlet and the
> skeletal bone hand strapped to his forearms the whole time and never drops or swaps them. The acid
> green of his fangs and the dull gold of his harness stay exactly as dim as they are in the
> reference image - nothing on him ever glows, brightens, flares, trails or throws light onto
> anything. Both arms stay FULLY INSIDE the frame at ALL times and NEVER extend past any edge of the
> frame: the IVORY CLAW TIPS of the clawed gauntlet and the BONE FINGERTIPS of the skeletal hand
> never travel further toward screen-right than the claw tips do in the reference image, and his REAR
> FOOT and REAR HEEL never travel further toward screen-left than they do in the reference image.
> Neither hand is EVER raised above the crown of his own skull, and neither arm is EVER punched,
> thrust or straightened out to full reach away from his body - every swing turns about his own
> shoulder and elbow so the claws and bone fingertips arc DOWN and IN toward his own body rather than
> reaching out ahead of it. HIS FEET
> STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and never
> lunges out into a wide stance; he keeps his stance narrow and never spreads wider than about one
> and a quarter times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and his body holds the SAME angle to camera it has in the
> reference image - it never opens further toward the viewer and never turns away. His mouth stays
> exactly as it is in the reference image - his jaw never opens, never closes and never chatters, and
> he never talks, never shouts, never roars and never sings. The camera is absolutely locked, no
> zoom, no pan, his full body always fully in frame, he is the ONLY figure in frame at all times,
> nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; at the end there is no shed, torn, broken or kicked-up material anywhere in the shot.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. Four literals above are load-bearing for `ko` and must not be re-worded. The KO-SUFFIX
RULE strips (a) the weapon-lock SENTENCE, matched on `keeps the ... never drops or swaps` — it is
written as its OWN sentence so the strip cannot take the identity lock with it as collateral; (b) the
anchor lock, matched on `begins and ends on the EXACT same reference stance`; (c) it REWORDS `HIS
FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` — spell it any other way (TALONS, CLAWED FEET) and
that rewrite silently misses and a prone collapse ships with its feet locked flat; and (d) it rescopes
`he keeps his stance narrow and never spreads wider than` to WHILE ON HIS FEET, so a prone body does
not break the stance-width clause. The `ko` here loses nothing real to (a): his gauntlets are STRAPPED
to his forearms, so unlike minotaur and skullrend he does not drop a weapon at all, and the identity
lock in the preceding sentence still holds them on him.
DELIBERATE DIVERGENCE from the minotaur suffix, following skullrend: the debris law ends "at the end
there is no shed, torn, broken or kicked-up material anywhere in the shot" instead of "the last frame
shows ONLY the fighter and what the fighter holds, exactly as the first frame does". Pale choir does
not HOLD anything — he WEARS his arsenal — so the old tail is both inaccurate for him and, on a `ko`,
re-asserts the anchor that the ko rewrite just stripped.
FACING, judgement call: **PARTLY OPEN, not strict profile — verified at full size, not on a contact
sheet.** His HEAD is a clean strict profile facing screen-right: one eye, full profile of crown, brow,
nostril slits, jaw and snarl. His TORSO is not — both shoulders read as separate masses, both harness
straps are visible on the front of the chest with the sternum keeper plate square to camera, and both
arms clear the silhouette with their own separate volumes. His HIPS are open too: both thighs read as
distinct volumes with the leading quadriceps presented to camera, the belt's hanging strap-tongue
falls down the MIDDLE of the visible thigh rather than along the silhouette edge, and BOTH bare feet
show their full tops with every toe and talon visible. So no line in this file orders "strict side
profile", which would order the model to re-pose him toward pure profile mid-clip and fight his own
anchor; every line says "angled to camera exactly as in the reference image and facing screen-right",
and the suffix bans the turn in BOTH directions.
NO BITE BEAT ANYWHERE, on purpose: the suffix locks his jaw shut, so a bite, a roar or — despite his
name — a sung note would contradict a law he already carries. His snarl is fixed and the name stays
ironic.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN TORN FLOOR-STONE AND CHALK GRIT the magenta stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his two bone gauntlets and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real slabs, chunks, shards and grains of broken grey floor-stone and pale chalk grit, opaque, sharp-edged and lit like rock - never a glow, never a flame, never an aura, never mist or smoke, and never a bone, a fang, a skull, a skeleton or any whole intact object. NOTHING anywhere in the shot is magenta or pink except the empty background itself. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own chest and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading foot, never past his rear heel - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a low coiled predator stance, his weight sunk and even over both planted
taloned feet, both bone gauntlets carried out ready exactly as in the reference. ONE full slow breath
fills the first half of the clip and a second fills the second half: on each one his ribs and his
slabbed chest swell and sink, the heavy vein and tendon relief on his arms and thighs tightens and
eases, his shoulders roll up and settle back down, his long bone skull lowers a fraction on his thick
neck the way a hunting animal sizes up the ground in front of it and rises again, the jointed
finger-bones of the skeletal hand spread a fraction wider and close again, the ivory claws of the
other gauntlet flex in toward their own knuckle-cage and out, and his weight rolls slowly from his
rear foot onto his leading foot and back. The long pale strap-tongue at his belt sways faintly with
him and the gold harness shifts across his chest. His jaw stays shut and does not move at all. Feet
planted, silent and menacing. Returns to the exact start pose so it loops seamlessly. Slow,
controlled, subtle motion.

## attack_strike A  (cross-body claw rake)
STRIKE A (cross-body claw rake): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he coils his weight
down onto his rear leg and rolls the clawed bone gauntlet back and UP only as far as his own near
shoulder, the whole gauntlet turning about his elbow so the IVORY CLAW TIPS come IN toward his own
throat and never further out than they sit in the reference; then he drives up out of his hips and
rips those claws DOWN across the front of his own body in one heavy committed diagonal, from that
shoulder to the outside of his leading knee, his skull and both shoulders snapping down with it and
the skeletal bone hand driving down past his own ribs as a counterweight. The claws finish low and
close, nearer his body than they sit in the reference. His rear foot grinds on the stone as he drives
and scuffs ONE thin scuff of pale chalk grit UP off the floor, the grains no bigger than sand, rising
no higher than his own ankle and staying inside his own standing footprint - never past his leading
foot, never past his rear heel - every grain crumbling away to nothing in mid-air as it falls;
nothing else sheds and nothing else breaks, these are clean edges. THE RAKE HAS LANDED BY THE HALFWAY
POINT OF THE CLIP; the whole second half is his slow controlled haul of both gauntlets back out to
the EXACT height and angle they have in the reference image and his settle back into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Fast for his size, silent, savage.

## attack_strike_b  (low bone-hand backhand)
STRIKE B (low bone-hand backhand): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER he drops his whole trunk into
a low heavy crouch over both planted feet and swings the SKELETAL BONE HAND down and forward along
the floor to just beside his own leading foot, no further toward screen-right than that foot, with
the palm-bones turned to the floor and the clawed gauntlet hauled IN tight against his own chest. Then he RIPS the bone hand back and IN across the front of
his own shins toward his own rear hip in one short flat savage arc at shin height, staying in front
of his body the whole way and never swinging behind him, the jointed bone fingertips dragging across
the stone the entire pull while his hips and shoulders drive it. EXACTLY THREE chips of grey
floor-stone are torn UP off the ground by those fingertips, each one no bigger than one of his own
ivory claws, all three staying inside his own standing footprint - never past his leading foot, never
past his rear heel - rising no higher than his own knee, and all three cracking apart and crumbling
away to nothing IN MID-AIR AS THEY FALL, gone before any piece reaches the floor. The bone hand never
leaves the low line and finishes tucked in at his own hip, far nearer his body than it sits in the
reference. THE BACKHAND IS COMPLETE BY THE HALFWAY POINT; the whole second half is his slow rise back
out of the crouch, both gauntlets riding back out to the EXACT height and angle they have in the
reference image, and his settle back into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Low, dragging, vicious.

## attack_throw A  (bone-hand seize and drive-down, solo-safe)
THROW A (bone-hand seize and drive-down): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; he hauls the clawed bone gauntlet DOWN and
IN across his own thighs where it hangs low and still, nearer his body than it sits in the reference,
and closes the jointed bone fingers of the SKELETAL HAND around an unseen weight at his own chest
height in EMPTY AIR, WITHOUT reaching further out than that hand already sits in the reference image
- there is NO opponent and no second figure, nothing else in the frame at any time. THE GRIP IS SET
BY THE END OF THE FIRST THIRD; then he wrenches his shoulders, spine and hips DOWN in one brutal
committed drive and slams that weight into the stone beside his own leading foot, his knees folding
deep and his whole mass going down behind it, so THE SLAM HAS LANDED BY THE HALFWAY POINT. EXACTLY
FOUR chips of grey floor-stone are knocked UPWARD off the ground where that weight comes down, each
no bigger than his own closed bone fist, all four staying inside his own standing footprint - never
past his leading foot, never past his rear heel - rising no higher than his own knee, and every one
of them cracking apart and crumbling away to nothing IN MID-AIR AS IT FALLS, gone before any piece
reaches the floor. The whole second half is his slow heavy rise back up, both gauntlets riding back
out to the EXACT height and angle they have in the reference image, into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Brutal, grounded, final.

## attack_throw_b  (claw hook and haul-down, solo-safe)
THROW B (claw hook and haul-down): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST THIRD he rolls the clawed bone
gauntlet over about his own elbow so the IVORY CLAWS point DOWN, and hooks them under an unseen
weight at his own hip height in EMPTY AIR, his hand never travelling further toward screen-right than
it sits in the reference image, with NO opponent, no second figure and nothing else in the frame at
any time. Then he hauls that weight DOWN and IN across the front of his own thighs toward his own
rear hip - staying in front of his body the whole way, never swinging behind him and never carrying
his hand past his own rear hip - dropping his whole weight onto his rear leg and folding his trunk
over the pull, while the SKELETAL BONE HAND clamps down over his own clawed wrist to double the
wrench, so THE HAUL HAS FINISHED BY THE HALFWAY POINT with both gauntlets tucked in low at his own
hip. EXACTLY THREE chips of grey floor-stone are knocked UPWARD off the ground under that weight as
it comes down, each no bigger than one of his own ivory claws, all three staying inside his own
standing footprint - never past his leading foot, never past his rear heel - rising no higher than
his own knee, and all three cracking apart and crumbling away to nothing IN MID-AIR AS THEY FALL,
gone before any piece reaches the floor. The whole second half is his slow rise, both gauntlets
rolling back out to the EXACT height and angle they have in the reference image, and his settle back
into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Heavy, hooking, brutal.

## attack_block A  (crossed-gauntlet guard)
BLOCK-COUNTER A (crossed-gauntlet guard): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER he brings both
forearms IN and ACROSS the front of his own chest into a hard braced X-guard - the clawed bone
gauntlet outermost with its ivory claws turned DOWN and pulled in nearer his body than in the
reference, the flat pierced bone plate of the SKELETAL HAND braced behind it - both elbows tight to
his ribs, his long skull tucked down between his shoulders and his weight settling back onto his rear
leg. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure - his
taloned feet grind a fraction on the stone without either one leaving the spot it stands on, his
forearms shake under the load, his shoulders roll and reset and his chest heaves - but the guard
itself does not move and nothing else in his body travels. IN THE FINAL QUARTER he drives the braced
X one short heavy shove forward out of his chest, short enough that the claw tips are still nearer
his body at the end of it than they are in the reference, and flows in one eased motion back into the
EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Nothing sheds and nothing breaks. Braced, immovable, silent.

## attack_block_b  (skull-crown guard)
BLOCK-COUNTER B (skull-crown guard): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER he hauls both
gauntlets DOWN and IN to his own hips, drops his chin hard to his chest and rolls both shoulders
forward so the long backswept BONE CROWN of his skull is what meets the pressure, his back curved and
his weight settling onto his rear leg, the ivory claws and the bone fingertips low and still at his
sides. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - his taloned feet grind
a fraction on the stone without leaving the spot they stand on, his neck, back and shoulders shudder
under the load, his ribs heave, and both gauntlets stay low and dead-still at his hips and never rise
and never swing for one frame of it. IN THE FINAL QUARTER he drives up out of his knees and shrugs
one short heavy shoulder-and-skull shove forward, the crown of his skull rising no higher than it
sits in the reference image, then flows in one eased motion back into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Nothing sheds and nothing breaks. Braced, compact, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his skull and shoulders snap back and to screen-LEFT, his long bone
crown swinging with the recoil, his spine folding and his knees buckling under his own weight - but
BOTH FEET STAY EXACTLY WHERE THEY STAND, he does not step back and he does not skid, and every bit of
the recoil is absorbed in his knees, hips and trunk instead. Both gauntlets are jarred DOWN and IN
across his own thighs and finish nearer his body than they sit in the reference, the ivory claws
curling in toward their own knuckle-cage and the jointed bone fingers snapping shut. THE RECOIL PEAKS
BY THE END OF THE FIRST QUARTER and he rides it off balance through the middle of the clip - his
weight rolling back over his rear leg, the pale strap-tongue at his belt whipping, his shoulders
juddering and his chest heaving. IN THE LAST THIRD he catches his balance, straightens up out of his
knees and flows in one eased recovery back into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. His chest and face
lead the recoil; his back is never shown. Nothing sheds and nothing breaks. He is ALONE in an empty
frame - nothing whatsoever enters, crosses or appears in the frame at any time, and there is no
light, no flare and no streak anywhere in the shot. Only his own body moves.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him and he
drops STRAIGHT DOWN onto both knees on the spot he stands on, without travelling forward, his skull
falling and both arms collapsing in loose against his own chest. Then he pitches forward and down
over his own thighs and FOLDS - his legs staying tucked beneath him, his arms crumpling in under his
own chest - and BY THE HALFWAY POINT he has come to rest fully prone and motionless, folded down over
his own knees with his head lying beside his leading foot. Both bone gauntlets stay strapped to his
forearms underneath him and nothing whatsoever comes off him. ONE thin scuff of pale chalk grit is
knocked UPWARD off the floor where he lands, the grains no bigger than sand, rising no higher than
his own fallen shoulder and staying within one body-width of where he comes down, every grain
crumbling away to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES
COMPLETELY STILL, face down and heavy - he does not stir, does not lift his head, does not push up on
an arm and he does NOT get back up. He is ALONE in an empty frame - nothing whatsoever enters,
crosses or appears in the frame at any time. Only his own body moves.

## victory  (the silent choir)
VICTORY (silent choir): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he draws BOTH gauntlets
slowly IN toward his own sternum and sinks his whole weight DOWN into a low settled crouch over both
planted feet, his trunk folding down from the hips and his shoulders dropping, his chest already
heaving. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW FOLDED POSE with both hands pressed
against his own chest and closes them one joint at a time - the jointed bone fingers of the skeletal
hand curling shut finger by finger, the ivory claws of the other gauntlet folding in against their
own knuckle-cage - while his ribs swell and sink with two slow deep breaths and his long bone skull
lowers over his own closed hands. His jaw stays shut the entire time; it never opens, never chatters
and never moves to speak or to sing. His feet, hips and shoulders stay exactly where they are, he
does not step, does not pivot and does not straighten up, and neither hand rises above his own
collarbone at any moment. IN THE FINAL QUARTER he opens both hands, lets them ride slowly back out to
the EXACT height and angle they have in the reference image and rises back into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Nothing sheds and nothing breaks. Silent, reverent, spent.

## special_1  (PALE HARROW) - the ivory claws driven into the stone and ripped back
SPECIAL FINISHER (pale harrow): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he coils his whole body into a
deep braced crouch over both planted feet with his skull dropping between his shoulders, and rolls
the clawed bone gauntlet back and UP only as far as his own near shoulder, the claws turning IN
toward his own throat; then he drives those IVORY CLAWS DOWN into the stone floor just in front of
his own leading foot with everything he has, the whole gauntlet turning about his shoulder and elbow
so the tips travel down and IN toward his own body and never further toward screen-right than they
sit in the reference. AT THE FORTY PERCENT MARK the claws bite in and he RIPS them back and IN across
the stone toward his own rear heel in one short savage drag, staying in front of his body the whole
way and never swinging behind him. EXACTLY THREE flat slabs of grey floor-stone are torn UP off the
ground by the claws as they come, one off each claw, each slab no bigger than his own closed bone
fist, all three staying inside his own standing footprint - never past his leading foot, never past
his rear heel - knocked UPWARD to no higher than his own knee, and all three cracking apart and
crumbling away to nothing IN MID-AIR AS THEY FALL, gone before any piece reaches the floor. The slabs
are SOLID BROKEN STONE: opaque, flat, sharp-edged, lit like rock - never a glow, never a flame, never
a ring of light. HE HOLDS THE DEEP CROUCH THROUGH THE WHOLE THIRD QUARTER, his shoulders heaving and
the claws still resting on the ground where the drag ended. IN THE FINAL QUARTER he lifts both
gauntlets back out to the EXACT height and angle they have in the reference image and rises slowly
back into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Silent, savage, final.

## special_2  (OSSUARY GRIP) - the skeletal hand punched into the floor, a fistful torn up and crushed
SPECIAL FINISHER (ossuary grip): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; in the first moments he hauls the clawed bone
gauntlet DOWN and IN across his own thighs and it stays there low, still and nearer his body than it
sits in the reference FOR THE WHOLE REST OF THE CLIP - it never rises, never swings and takes no part
in this beat. IN THE FIRST QUARTER he cocks the SKELETAL BONE HAND IN to his own chest, never back
past his own hip, and sinks his hips into a low braced crouch over both planted feet; then he punches
that bone hand straight DOWN into the stone beside his own leading foot with his whole mass folding
down behind it from the shoulders and hips, and AT THE FORTY PERCENT MARK the jointed bone fingers
drive into the floor and CLOSE. He hauls that closed bone fist back UP to his own hip height with a
fistful of the floor caught inside it, never higher, and AT THE SIXTY PERCENT MARK he spreads the
bone fingers and CRUSHES what he tore loose between them: EXACTLY FIVE chunks of grey floor-stone
burst UPWARD out from between his own finger-bones, each no bigger than one of his own ivory claws,
all five staying inside his own standing footprint - never past his leading foot, never past his rear
heel - rising no higher than his own chest, and every one of them cracking apart and crumbling away
to nothing IN MID-AIR AS IT FALLS, gone before any piece reaches the floor. The chunks are SOLID
BROKEN STONE: opaque, chunky, sharp-edged, lit like rock - never a glow, never a flame, never a
shockwave of light. THE WHOLE FINAL QUARTER is his slow heavy rise back up out of the crouch, both
gauntlets riding back out to the EXACT height and angle they have in the reference image, and his
settle into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Savage, blunt, final.

## special_3  (BONE CHOIR) - both gauntlets locked into one cage, held under load, then driven down
SPECIAL FINISHER (bone choir): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he draws BOTH forearms IN to his
own sternum and INTERLOCKS them - the long ivory claws of one gauntlet threading down between the
jointed finger-bones of the skeletal hand and closing, so the two lock together into one solid closed
cage of bone held hard against his own chest, neither hand ever rising above his own collarbone - and
he sinks his entire body into a deep coiled crouch over both planted feet, his skull dropping over
the locked cage, his back arching and his weight grinding down through both taloned feet. HE HOLDS
THAT COILED CROUCH FROM THE END OF THE FIRST QUARTER UNTIL THE SIXTY PERCENT MARK, loading harder the
whole time - his back, neck and shoulders shuddering under the load, his ribs heaving, his forearms
shaking against each other, and neither foot leaving the spot it stands on. THEN AT THE SIXTY PERCENT
MARK he releases all of it and drives the locked bone cage straight DOWN into the stone in front of
his own leading foot in one short brutal hammer, his whole weight slamming down behind it from the
shoulders and hips, his hands never travelling further toward screen-right than his own leading knee.
EXACTLY SIX shards of grey floor-stone are blasted UPWARD around his locked fists, each shard no
bigger than his own closed bone fist, all six staying inside his own standing footprint - never past
his leading foot, never past his rear heel - rising no higher than his own chest, and every one of
them cracking apart and crumbling away to nothing IN MID-AIR AS IT FALLS, gone before any piece
reaches the floor. The shards are SOLID BROKEN STONE: opaque, jagged, sharp-edged, lit like rock -
never a glow, never a flame, never a ring of light. THE WHOLE FINAL THIRD OF THE CLIP is his heavy
controlled rise back up, his forearms unlocking and both gauntlets riding back out to the EXACT
height and angle they have in the reference image, into the EXACT same reference stance, so that he
is already standing completely still in the reference pose well before the clip ends. Coiled, silent,
final.
