
# ★ ORCHESTRATOR VERIFICATION (phase 166) — checked, not taken on the author's report:
#   check-prompt-sections   clean=13 problems=0
#   §5b idle vs ko tails    correctly DIVERGE
#   ko survives koSuffix     identity sentence AND grip lock both present in the built `ko` — the
#                            author phrased the lock "never released / never let go / never
#                            exchanged" specifically to dodge the strip pattern, and it worked
#   debris bounds            every debris sentence carries count + size + span + POPULATION +
#                            inline solidity. Burst beats have population == spawn; the two STAGED
#                            beats (special_2, special_3) have population < spawn WITH the stagger
#                            stated in the same sentence ("GIVES WAY IN STAGES ... break loose in
#                            ones and twos ... never in one burst"). That is CORRECT and it is more
#                            precise than a blanket equality — see below.
#
# THIS AUTHOR CAUGHT A DEFECT I HAD PUT IN THE EXEMPLAR. It declined to copy gargoyle-spear's
# throws because they read "EXACTLY FIVE ... NEVER MORE THAN THREE" — a contradiction inside one
# acting line. It was right: I created those in phase 158 with a blanket population-bound insert
# that used a fixed word per sentence-pattern instead of each beat's own spawn count. Four states
# were contradictory. Repaired in phase 166.
#
# AND THE FIRST REPAIR OVER-CORRECTED. Forcing population == spawn everywhere destroyed the STAGED
# bound on gargoyle special_3, which deliberately breaks SIX chunks "in ones and twos ... rather
# than in one burst" and therefore must cap the population BELOW the total. Restored to THREE.
# The rule is not "population equals spawn" — it is:
#     BURST beat  -> population == spawn
#     STAGED beat -> population < spawn, and the staging must be stated in the same sentence
# HECTOR WARHAMMER — MK FINAL playable. Full 13-clip kit. Written 2026-08-01 against KIT-WRITING-BRIEF (§2b/§2c/§4b/§4c/§5b applied).
#
# FIRST-CLIP WATCHES (author's):
#   · KNIGHT-GENRE INVENTION — a helmet, cloak, cape, shield or plume appearing from nowhere.
#     All are banned by name in the suffix; if one appears the clip is dead on identity — reroll.
#   · WHITE-ARMOUR BLOOM — his plates are near-white. If a render "lights" an impact by
#     brightening the armour it reads as bloom and keys badly; brightness is pinned to the
#     reference in the suffix. Check white/p99 on the first keyed clip.
#   · hit/ko recoil travels toward screen-LEFT, where his rear pauldron and rear boot own the
#     x400 edge with 400px of room. If containment LEFT ever flags, shrink the fold, not the bound.
#   · THE FULCRUM HANDS — strike B and special_1 turn about the LEADING hand; throw A, special_2
#     and victory turn about the REAR hand. Watch that the stationary hand really stays pinned at
#     his waist/hip: if a fulcrum hand drifts out from the body, BOTH ends of the weapon travel.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/hector-warhammer-anchor-green.png`, pre-screened
before this kit was written: `node qa-boss/check-plate-key.mjs` returns opaque **12.12%**, emissive
**0.01%** (nothing baked-lit on him anywhere), white 0.01%, p99 backdrop distance 5.4 — **KEYS WITH
MARGIN**, padded at the FULL 0.68 standard fill. He faces SCREEN-RIGHT natively; no hflip anywhere in
this kit. He is a white-and-steel subject on green — nothing on him is green, no isGreen hole risk.
The two facts that shape every line below: he has the ROOMIEST margins of any plate that has produced
an accepted clip (400/399/468), and the ENTIRE weapon sits BELOW his own shoulder line in reference.

## ★ HECTOR FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **~737w x ~1044h** (fills 68% of frame height — that is a RESOLUTION
budget: the engine upscales, so no beat may shrink him, move him off his spot or carry him away from
the camera).
  LEFT **400px** · RIGHT **399px** · HEADROOM **468px** · bottom free (boot soles on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **2.08x** — nothing in this kit approaches it; the widest beat
  (throw B's bounded lean) stays under ~1.2x.

WHO OWNS EACH EDGE:
  · **LEFT x400** — his trailing side: the toe of his REAR BOOT and the trailing edge of his rear
    PAULDRON/elbow. The BUTT-SPIKE tip hangs a little INSIDE them.
  · **RIGHT x1137** — the tip of the short SPIKE on the hammer HEAD (the forward-most point of the
    whole subject).
  · **TOP y468** — his own black HAIR. The whole warhammer rides at his chest, well below it.
  · **BOTTOM** — his boot soles on the floor line.

  1. **THE ROOMIEST PLATE IN THE ROSTER, AND THE FREEDOM IS SPENT ON DEPTH, NOT REACH.** Every
     attacking beat still travels DOWN and IN, because the anchor return — not the frame edge — is
     what fails a clip. Nothing in this kit steps, lunges, reaches out or swings wide; the body
     commitment is full-tonnage sinks, deep folds, a bounded trunk-drive and sustained loaded holds.
  2. **WEAPON CEILING: THE WHOLE WEAPON LIVES BELOW HIS SHOULDER LINE AND STAYS THERE KIT-WIDE.**
     NO PART of the warhammer ever rises above his own shoulders, and it never goes vertical or
     overhead (~700px of weapon against 468px of headroom does not fit either way up). The only
     raise licences in the kit are counter-rises of the OFF end while the working end is down —
     victory's butt-end rise and strike B / special_1's head-end rise — all capped at his own
     shoulders or lower and all drawing IN as they lift.
  3. **THE LEVER GRAMMAR.** Head-down beats turn about the locked REAR hand (held in at his hip):
     the squared head travels DOWN AND IN toward his own leading boot, and the short butt lever
     swings up no higher than his own belt, never past its reference x toward screen-left.
     Butt-down beats turn about the LEADING hand (held in at his waist): the butt-spike bites
     down-and-in beside his own rear boot, and the head end draws IN toward him as it lifts, capped
     at his own shoulders, never past its reference x toward screen-right. Down-and-in SHORTENS the
     silhouette; that grammar is the whole kit.
  4. **THE GRIP NEVER MOVES ALONG THE HAFT — IN ANY STATE.** A re-grip is a containment event:
     re-centring the hands maximises the projection of BOTH ends (measured this session — it
     produced the widest frame of the session on another kit). Both gloved hands hold their exact
     reference stations in every frame of all 13 states; every lever beat is a turn about a
     stationary grip, and block A braces by sinking BEHIND the haft, not by sliding hands together.
  5. **EFFECTS ARE BROKEN FLAGSTONE ONLY, SOURCED FROM THE FLOOR** — a CONTINUOUS surface that
     cannot visibly deplete — NEVER chipped off his own white armour, which is a countable identity
     feature. Every debris sentence carries an exact COUNT, a per-piece SIZE tied to one of his own
     small parts (a gloved knuckle, a boot toe-cap), a SPAN tied to his standing footprint or the
     named impact point, a POPULATION bound ("THERE ARE NEVER MORE THAN N PIECES OF DEBRIS IN THE
     FRAME AT ONCE"), and the inline solidity clause in the same sentence. No banned-class noun
     anywhere in any beat: no dust, no smoke, no spark, no grit, no flash, no spray. (The concept
     note's "struck sparks-of-stone" is rendered as solid struck stone CHIPS — "spark" is a banned
     noun under §4b and never appears in a beat.)

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME human knight from the reference image (a broad, powerfully built man in full plate
> armour of matte WHITE-enamelled steel with polished silver-steel trim - bare-headed, with short
> cropped black hair, heavy dark brows, a stern clean-shaven weathered face set in a fixed frown and
> a pale scar over his brow; big layered white PAULDRONS edged in steel on BOTH shoulders with his
> upper arms bare below them, steel elbow-guards and white steel vambraces strapped in brown leather
> on his forearms, and brown leather GLOVES; a white steel CUIRASS bearing a small silver-and-blue
> heraldic INSIGNIA on the breastplate, brown leather straps, and a broad brown waist-belt with a
> round silver BUCKLE-DISC; layered white tassets and a short white armoured skirt with silver
> edging over dark breeches, white steel knee and shin plates, and sturdy brown leather BOOTS; and
> gripped in BOTH gloved hands a massive two-handed WARHAMMER carried across his body on a shallow
> diagonal - its heavy squared STEEL HEAD toward screen-RIGHT at his own chest height with a short
> pointed steel SPIKE projecting from the head toward screen-right, a long dark leather-wrapped
> wooden HAFT running down across his waist, and a pointed steel BUTT-SPIKE low toward screen-LEFT
> beside his own rear thigh - his LEADING gloved hand closed on the haft ahead of his waist nearer
> the head, his REAR gloved hand closed lower on the haft near the butt-spike at his own hip),
> standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing pink or magenta
> anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His bare scarred head, short black hair, stern set face, both layered pauldrons, the silver-and-blue
> insignia on his breastplate, his belt and its round silver disc, every white plate and brown strap
> on him, his gloves, his boots and the whole two-handed warhammer all stay EXACTLY the same the
> entire clip - nothing is ever added, lost, re-coloured or re-shaped, NO helmet, cloak, cape, shield
> or plume ever appears, and every plate of his armour is rigid steel that never bends and never
> flutters; the short armoured skirt at his hips hangs heavy, rides with his hips, and never billows,
> never flares and never swings wide. The warhammer stays gripped in his own gloved hands the entire
> clip - it is never released, never let go, never exchanged and never replaced by anything else,
> BOTH of his gloved hands stay closed on the haft in every single frame, NEITHER hand ever slides
> along the haft, re-seats or changes its station on it, and no second hammer and no other weapon or
> new object ever appears anywhere in the shot. Every surface of him stays EXACTLY as bright as it is
> in the reference image - his white armour never shines brighter, never flares and never blooms,
> nothing on him ever glows or lights up, and no glow, aura, beam, halo, ring of light, orb,
> fireball, projectile, wisp, mist, smoke, fog, fire or energy of any kind ever appears anywhere in
> the shot. The warhammer stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge
> of the frame: the squared head and its spike never travel further toward screen-right than they do
> in the reference image, the butt-spike never travels further toward screen-left than it does in the
> reference image, and NO PART of the warhammer is ever raised above the height of his own shoulders.
> While it is in his grip the warhammer is NEVER swung fully vertical, NEVER raised overhead, NEVER
> thrust or reached out ahead of him and NEVER swung round so that its head passes behind him - it
> only ever rides with his body or turns a short way about his own gripping hands. HIS FEET STAY FLAT
> ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops, never steps and never
> lunges out into a wide stance; he keeps his stance narrow and never spreads wider than about one
> and a quarter times his standing width. He stays planted on the same spot at the same distance from
> the camera the whole clip, with zero net drift in any direction. He stays FACING SCREEN-RIGHT the
> entire clip and NEVER rotates or turns to face the camera, and his body holds the SAME angle to
> camera it has in the reference image - it never opens further toward the viewer and never turns
> away. His face keeps the same stern set expression it has in the reference image - it never
> changes - and he never talks, never shouts and never cries out. The camera is absolutely locked, no
> zoom, no pan, his full body always fully in frame, he is the ONLY figure in frame at all times,
> nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The literals below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, following gargoyle and lich. The KO-SUFFIX rule
strips any sentence matching `keeps the ... never drops or swaps`; this character never drops the
hammer in any state (his gloved fingers never open), so the lock is phrased "stays gripped in his own
gloved hands ... never released, never let go, never exchanged", which does not match the strip,
stays TRUE through a prone collapse, and sits in its own sentence so no strip takes the identity lock
with it. Verify on the built `ko` that both the identity sentence and the grip sentence survive.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not BOOTS — the ko
rewrite matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any other way and the
rewrite silently misses. Consequence honoured kit-wide: NO standing state kneels, stamps or lifts a
boot — every impact is delivered flat-footed through sinks, folds and the weapon. The only
knees-to-ground in the kit is the ko collapse, which the rewritten ko suffix governs.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`,
so the ko rewrite rescopes it to while-standing. Do not re-word it. The ratio stays at one and a
quarter despite the 400px margins — nothing in this kit needs more.

(d) THE WEAPON-MOTION SENTENCE IS SCOPED `While it is in his grip` and the ceiling is HIS OWN
SHOULDERS kit-wide. Three states deliberately ride AT that cap (strike B and special_1's head-end
counter-rise, victory's butt-end rise); do not tighten the cap later without reading those states.
The swing-round ban is phrased `so that its head passes behind him` (the butt-spike already lives on
his screen-left side; a bare "never swings behind him" would read as a ban on beats that are legal).

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko` is
rewritten by koSuffix() to end `...anywhere in the shot.`; build BOTH `idle` and `ko` and confirm
they DIFFER at the tail. Never copy the ko tail back into this file.

(f) TWO-HANDED AND FIXED-STATION THROUGHOUT: no beat in this kit ever opens a hand off the haft or
slides a grip along it (budget rule 4). The idle's finger beat flexes fingers WITHOUT the hand
leaving its station and the haft never leaves either closed palm, so "BOTH of his gloved hands stay
closed on the haft in every single frame" is true in all 13 states, including prone in the ko.

(g) HE IS RIGID PLATE PLUS ONE SHORT HEAVY SKIRT, NO CLOAK: the identity sentence pins the plates
rigid and bounds the skirt (rides with the hips, never billows). Watch the first keyed clip for
invented cape-sway, plume-flutter or a spawned helmet — identity drift, not life.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist" and no foot-to-foot
weight transfer anywhere in this file — not only in the gated states. Settles are written
straight-down through BOTH feet at once; every lever beat is "turns a short way about" a stationary
hand, the exemplar's accepted form.

(i) COUNT vs POPULATION COHERENCE (deliberate divergence from the exemplar): every single-burst beat
here has POPULATION EQUAL TO ITS SPAWN COUNT (3/3, 5/5, 4/4), because "burst of five, never more
than three at once" is a self-contradiction the model resolves at random. Only the STAGED beats
(special_1's tolls, special_2/3's staged breaks) carry a population below the total, and each states
its stagger explicitly.

FACING, judgement call: **NEAR-PROFILE THREE-QUARTER toward screen-right — close to strict profile,
but NOT one**, so no line in this file orders "strict side profile". The evidence, read at full size:
  · HEAD — the most profile-true part of him: nose, brow and jaw silhouette cleanly against the
    green with a single visible eye and ear; only a sliver of the far brow reads.
  · TORSO — the tell that breaks strict profile: the silver-and-blue INSIGNIA on the breastplate
    FRONT reads clearly, which an edge-on chest would hide, and both pauldrons read as separate
    volumes (the big near pauldron plus the far shoulder's plates beyond his chin).
  · HIPS — the round silver BUCKLE-DISC on the FRONT of his belt is visible: the belt front is
    angled a few degrees toward camera.
  · FEET — the decisive test: his REAR boot is turned out toward the viewer and shows its
    instep/top; the LEADING boot points screen-right nearly side-on. One clear instep is enough to
    fail strict profile.
So every acting line says "angled to camera exactly as in the reference image and facing
screen-right", and the suffix bans the turn in BOTH directions. He is NOT the frontal-plate blocker
class: face, chest seam, hammer head, both grips and the leading boot all commit toward screen-right,
and every line of attack in the kit goes that way or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his warhammer and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, chunks and shards of broken grey flagstone, opaque, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist, never smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own waist and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading boot's toe toward screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a veteran knight's dead-steady guard, his weight sunk and even over both
planted feet, the warhammer held steady across his body on the shallow diagonal it has in the
reference image with both gloved hands closed at their stations. ONE slow full SETTLING of his whole
armoured mass fills the first half of the clip and a second fills the second half, and EVERY PART of
that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each settling his whole weight
sinks a fraction STRAIGHT DOWN through BOTH of his planted feet at once and rises again - it NEVER
transfers from one foot to the other and neither foot ever carries more of it than the other - his
shoulders sink a fraction STRAIGHT DOWN and lift again with neither one coming forward and neither
one going back, his bare head lowers a fraction STRAIGHT DOWN on his neck and rises again without
ever turning left or right, and the whole warhammer rides DOWN with him a finger's width and back up,
holding its exact reference angle throughout, neither end ever swinging toward either side edge. The
prop beat inside each settling: the gloved fingers of his REAR hand flex open a crack and re-close on
the leather wrap one knuckle at a time WITHOUT the hand ever leaving its station on the haft, then
the gloved fingers of his LEADING hand do the same - the haft never leaves either closed palm and
neither grip ever slides along it. He breathes slow and even, the rise of his chest barely lifting
the cuirass, straight up and down. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD
THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder
never comes forward, his far shoulder never swings round, and his chest never squares up toward the
camera; he may SINK, but he never TURNS. His face keeps its set stern frown and his gaze stays fixed
toward screen-right. Feet planted, silent, patient as a standing guard. Returns to the exact start
pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (falling crush of the squared head, stopped dead through air)
STRIKE A (falling crush): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right, the warhammer across his body on its shallow diagonal with
the squared head already toward screen-right at his own chest height. THERE IS NO WIND-UP OF ANY
KIND: he does NOT raise the hammer first, does NOT draw it back, does NOT lift it even slightly, his
shoulders do NOT rise, and the crush starts from exactly where the squared head ALREADY SITS in the
reference image and only ever goes DOWN. IN THE FIRST QUARTER his knees fold and he DROPS his entire
armoured tonnage straight DOWN over both planted feet in one committed sink, hips folding deep and
chest coming down over his leading knee - and through that same sink his REAR gloved hand stays
LOCKED at its station low on the haft, held in close at his own hip and never travelling out away
from his own body, while his LEADING hand hauls the haft DOWN so the whole warhammer TURNS head-down
about that locked rear hand: the squared steel head CRUSHES down through empty air on his
screen-right side until it hangs low at his own shin height over the flagstone just ahead of his
leading boot's toe, at every moment NEARER to his own body than it sits in the reference image - it
is NEVER thrust and NEVER pushed out toward screen-right, and the deeper it drops the closer in it
comes. At the far end the short BUTT-SPIKE swings a short way up and IN toward his own rear hip as
the lever turns - never rising above his own belt and never travelling further toward screen-left
than it sits in the reference image. THE CRUSH HAS LANDED BY THE HALFWAY POINT and the head never
touches the ground - a clean crush through air, stopped dead by his own control. As his weight lands,
his rear boot grinds hard DOWN into the stone and breaks EXACTLY THREE small chips of hard grey
flagstone up off the floor beside that boot, each chip no bigger than one of his own gloved knuckles
and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and
never haze - rising no higher than his own ankle and spreading no wider than his own standing
footprint - never past his leading boot's toe toward screen-right, never past his rear heel toward
screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN
THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. BOTH OF HIS FEET STAY FLAT ON THE STONE THROUGHOUT -
neither heel ever lifts. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME
ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never
comes forward, his far shoulder never swings round, and his chest never squares up toward the camera;
he may FOLD and SINK, but he never TURNS. He HOLDS the sunk finish with the head hanging low through
the third quarter while the last chips crumble away, and only in the final second does he rise
slowly, the warhammer turning back up about his rear hand to the EXACT angle and height it has in the
reference image, and settle into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Heavy, disciplined, silent.

## attack_strike_b  (butt-spike bite beside the rear boot)
STRIKE B (butt-spike bite): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right, the butt-spike already hanging low toward screen-left
beside his rear thigh. THERE IS NO WIND-UP OF ANY KIND: he does NOT lift the butt-spike first, does
NOT draw it back, and does NOT raise any part of the weapon before the blow - the spike starts from
exactly where it ALREADY HANGS in the reference image and only ever travels DOWN and IN. IN THE FIRST
QUARTER his knees fold and his whole armoured mass sinks STRAIGHT DOWN over both planted feet, and
through that sink his REAR hand presses the butt-spike DOWN and IN, the warhammer turning a short way
about his LEADING hand, which stays at its station on the haft, held in close at his own waist and
never travelling out away from his own body: the BUTT-SPIKE stabs down and IN until it BITES into the
flagstone just beside and ahead of his own rear boot's toe - travelling only down and inward, never
further toward screen-left than it hangs in the reference image, the deep body sink closing the last
of the distance. On the far end the squared HEAD swings a short way up and IN toward him as the lever
turns - drawing INWARD as it lifts, never rising above the height of his own shoulders and never
travelling further toward screen-right than it sits in the reference image. THE BITE HAS LANDED BY
THE HALFWAY POINT: the spike cracks the floor where it strikes and EXACTLY THREE chips of hard grey
flagstone burst UPWARD around the buried spike, each chip no bigger than one of his own gloved
knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never
smoke and never haze - rising no higher than his own knee, staying within one hand's-breadth of the
bite and never past his rear heel toward screen-left - every chip crumbling away to nothing in
mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. THE LINE
OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never
swings round, and his chest never squares up toward the camera; he may FOLD and SINK, but he never
TURNS. He HOLDS the sunk finish with the spike in the stone through the third quarter while the last
chips crumble away, and only in the final second does he draw the spike free, the warhammer turning
back about his leading hand to the EXACT angle and height it has in the reference image as he rises
into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Short, brutal, downward.

## attack_throw A  (overturn ram of the squared head into the floor, solo-safe)
THROW A (overturn ram): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. There is NO opponent, NO second figure and NO body anywhere
in this clip - nothing is ever caught, hooked, carried or dragged on the hammer at any time; the ONLY
thing his weapon touches is the bare flagstone floor. IN THE FIRST THIRD he turns the warhammer a
short way head-down about his locked REAR hand - that rear hand staying closed at its station low on
the haft, held in close at his own hip, never travelling out away from his own body - until the
squared steel head points DOWN at the flagstone just ahead of his own leading boot's toe, the head at
every moment NEARER to his own body than it sits in the reference image and never further toward
screen-right, while at the far end the BUTT-SPIKE swings a short way up and IN toward his own rear
hip, never rising above his own belt and never travelling further toward screen-left than it sits in
the reference image. THEN he wrenches his entire armoured tonnage straight DOWN through both folding
knees and RAMS the squared head into the flagstone at that spot - THE RAM HAS LANDED BY THE HALFWAY
POINT - the steel face biting into the floor-stone, and EXACTLY FIVE chips of hard grey flagstone
burst UPWARD around the struck head, each chip no bigger than the steel toe-cap of his own boot and
each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and
never haze - rising no higher than his own knee, staying within one hand's-breadth of the impact and
never further toward screen-right than the head sits in the reference image - every chip crumbling
away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN FIVE PIECES OF DEBRIS IN THE FRAME
AT ONCE. He may FOLD and SINK, but he never TURNS - his chest never squares up toward the camera and
both feet stay flat and planted. He HOLDS the low finish through the third quarter in a half-sunk
brace, his whole weight bearing down the haft onto the grounded head, his shoulders juddering
straight up and down under his own load, while the last chips crumble away. Only in the final quarter
does he draw the head back up out of the broken stone, turn the warhammer back about his rear hand to
the EXACT angle and height it has in the reference image and rise into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Grounded, crushing, final.

## attack_throw_b  (armoured shoulder-check through empty air, solo-safe)
THROW B (shoulder-check): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. There is NO opponent, NO second figure and NO body anywhere
in the frame at any time - his pauldron strikes NOTHING, and NOTHING is ever caught, lifted, tossed
or thrown; the drive passes through empty air only, and nothing new ever appears in the shot. IN THE
FIRST THIRD he coils STRAIGHT DOWN into a deep crouch over both planted feet, knees folding, chin
tucking behind his leading pauldron - and he hugs the haft IN tight against his own breastplate as he
coils, both gloved hands staying closed at their stations, so that every part of the warhammer draws
NEARER his own body than it sits in the reference image and stays there for the whole middle of the
clip. THEN he DRIVES his whole trunk a short way toward screen-right in one hard armoured
shoulder-check through the empty air on his screen-right side, leading pauldron first, BOTH feet
staying flat and planted exactly where they stand - the drive travels through his hips and trunk
alone, a short way only, his leading shoulder never travelling further toward screen-right than his
own leading boot's toe below it, and even at the peak of the check every part of the hugged warhammer
stays NEARER his own body than it sits in the reference image. BOTH shoulders travel together the
same distance, so THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO
CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his chest never squares up toward the
camera; he may LEAN and SINK, but he never TURNS. THE CHECK PEAKS BY THE HALFWAY POINT. On the drive
his boots grind hard into the stone and EXACTLY FOUR chips of hard grey flagstone burst UPWARD from
under his own boots, each chip no bigger than one of his own gloved knuckles and each one SOLID,
OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising
no higher than his own knee and spreading no wider than his own standing footprint - never past his
leading boot's toe toward screen-right, never past his rear heel toward screen-left - every chip
crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN
THE FRAME AT ONCE. THROUGH THE THIRD QUARTER he draws his trunk back upright over his planted hips
while the last chips crumble away, and in the final quarter he eases the haft back out to the EXACT
place it holds in the reference image and settles into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. Coiled, driving,
armoured.

## attack_block A  (the wall - braced behind the haft)
BLOCK-COUNTER A (the wall): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he SINKS his whole weight straight
DOWN behind the haft into a deep braced crouch over both planted feet, elbows pulling in tight
against his own ribs, chin tucking, knees taking the load - both gloved hands stay closed at their
exact reference stations, NEITHER hand sliding along the haft, so the haft stands braced across the
front of his own body at the same shallow diagonal it holds in the reference image, a solid bar
between him and the pressure. The warhammer does not turn and does not travel sideways; it drops with
his body and nothing else. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he
absorbs the pressure - both boots grind a fraction on the stone without either one leaving the spot
it stands on, his forearms shudder under the load, his shoulders judder and settle straight up and
down, his bowed head holds a fraction behind the haft - but the braced haft itself does not move and
nothing else in his body travels. IN THE FINAL QUARTER he drives one short hard shove straight UP out
of his knees behind the braced haft, rising only back to his own standing height and no further, and
flows in one eased motion back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing breaks.
Braced, immovable, silent.

## attack_block_b  (pauldron guard, hammer parked low)
BLOCK-COUNTER B (pauldron guard): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER he drops his bare head hard
toward his own chest, LIFTS his near shoulder straight up a fraction under its layered pauldron, and
hunches his whole back down over it so the big white pauldron is what meets the pressure, his weight
sinking straight DOWN through both planted feet - and he lowers the whole warhammer with the hunch to
a low dead carry in front of his own thighs, both gloved hands still closed at their stations, the
haft holding the exact angle it has in the reference image all the way down, neither end ever
travelling toward either side edge, where it hangs low and takes no part. HE HOLDS THAT HUNCHED GUARD
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both boots grind a fraction on the stone without leaving
the spots they stand on, his neck, back and shoulders shudder under the load straight up and down,
and the warhammer stays low and dead-still and never rises and never swings for one frame of it. IN
THE FINAL QUARTER he drives straight up out of his knees with one short heavy shoulder shove - the
top of his own head rising no higher than it sits in the reference image - then lets the warhammer
ride back UP to the EXACT angle and height it has in the reference image and flows in one eased
motion back into the EXACT same reference stance, so that he is already standing completely still in
the reference pose well before the clip ends. Nothing sheds and nothing breaks. Compact, hunched,
immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his bare head and both shoulders snap back and to screen-LEFT, his
spine folding and his knees buckling under the blow's weight - but BOTH FEET STAY EXACTLY WHERE THEY
STAND, he does not step back and he does not skid, and every bit of the recoil is absorbed in his
knees, hips and trunk instead. Both gloved hands clamp harder on the haft and the whole warhammer is
jolted straight DOWN with his body, holding the exact angle it has in the reference image the whole
way - it never turns, never swings and never rises. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER
and he rides it off balance through the middle of the clip - his trunk pitched a short way back
toward screen-left over his rear leg with both feet still planted, his shoulders juddering, the
hammer trembling in his locked grip. IN THE LAST THIRD he catches his balance, straightens up out of
his knees and flows in one eased recovery back into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. His scarred face
leads the recoil, jaw set; his back is never shown and his chest never squares up toward the camera.
Nothing sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses
or appears in the frame at any time, and there is no light, no flare, no wisp and no streak anywhere
in the shot. Only his own body and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, his
bare head drops and his shoulders slump, and he goes STRAIGHT DOWN onto both knees on the spot he
stands on without travelling forward, his legs folding beneath him under the weight of his own plate.
Then he pitches forward and down over his own thighs and FOLDS, his arms folding down beneath him
with both gloved hands still closed on the haft, and BY THE HALFWAY POINT he has come to rest fully
prone and motionless, folded heavily down over his own knees with his bare head lying low toward
screen-right and his face still pointed that way. His gloved fingers never open: the warhammer comes
down WITH him and comes to rest lying at a slant across his own fallen body, its butt-spike down on
the stone toward screen-left and its squared head resting low over his own back toward screen-right,
so that BOTH ends finish NEARER his own fallen body than they sit in the reference image and neither
of them is anywhere near an edge of the frame. EXACTLY THREE small chips of hard grey flagstone are
knocked UPWARD where his armoured knees strike, each chip no bigger than one of his own gloved
knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never
smoke and never haze - rising no higher than his own fallen shoulder and staying within one
body-width of where he lands, every chip crumbling away to nothing in mid-air as it falls. THERE ARE
NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. FOR THE WHOLE SECOND HALF OF THE CLIP HE
LIES COMPLETELY STILL - he does not stir, does not lift his head, does not push up on an arm and he
does NOT get back up - and the fallen warhammer lies exactly where it came to rest and does not move
again. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at
any time. Only his own body and his own weapon move.

## victory  (the grounded vigil, no turn to camera)
VICTORY (the grounded vigil): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right. IN THE FIRST QUARTER he turns the warhammer SLOWLY
head-down about his REAR gloved hand - that hand staying at its station, held in close at his own
hip, never travelling out away from his own body - while he bends both knees in one slow dignified
sink: the squared steel head travels only DOWN and IN until he SETS it - not strikes it - onto the
flagstone just ahead of his own leading boot's toe, and on the far end the BUTT-SPIKE rises slowly,
drawing IN toward him as the lever turns, never rising above the height of his own shoulders and
never travelling further toward screen-left than it sits in the reference image: the warhammer now
stands grounded head-down before him on its steep slant, never fully vertical, a knight standing
vigil over his own weapon, both gloved hands still closed at their stations on the haft. FOR THE
WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT GROUNDED VIGIL, and only three small motions live inside
it: two slow settlings of his whole armoured mass STRAIGHT DOWN through both planted feet and back
up, never transferring from one foot to the other; the gloved fingers of each hand re-closing one by
one at their stations on the haft; and ONE slow short bow of his bare head STRAIGHT DOWN and back up,
his face staying pointed toward screen-right throughout - he never turns his head or his body toward
the camera at any point, and his chest never squares up toward the viewer. His expression stays set
and stern and he makes no sound. IN THE FINAL QUARTER he lifts the squared head back off the stone,
turns the warhammer back about his rear hand to the EXACT angle and height it has in the reference
image, rises out of the knee-bend and settles into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. Nothing sheds and
nothing breaks. Composed, solemn, knightly.

## special_1  (THE TOLLING) — three measured butt-spike strikes toll the flagstone like a bell
SPECIAL FINISHER (the tolling): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY KIND: he does NOT lift the
butt-spike first and does NOT draw it back - each toll starts from the height the spike ALREADY HAS
and travels only DOWN and IN. ACROSS THE FIRST SIXTY PERCENT OF THE CLIP he strikes the butt-spike
down into the flagstone beside and ahead of his own rear boot's toe THREE times, slow and measured as
a tolling bell - on each toll his knees fold and his whole armoured mass sinks a short way STRAIGHT
DOWN over both planted feet as his REAR hand presses the spike down and IN, the warhammer turning a
short way about his LEADING hand held in close at his own waist at its station, the spike biting the
stone at the same spot each time and lifting between tolls only back to the height it hangs at in the
reference image, never higher, while at the far end the squared head swings a short way up and IN
toward him and back, drawing INWARD each time it lifts, never rising above the height of his own
shoulders and never travelling further toward screen-right than it sits in the reference image. EACH
TOLL knocks EXACTLY TWO chips of hard grey flagstone UPWARD around the bite, each chip no bigger than
one of his own gloved knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a
cloud, never dust, never smoke and never haze - rising no higher than his own knee, staying within
one hand's-breadth of the bite and never past his rear heel toward screen-left - and BOTH chips of
each toll crumble away to nothing in mid-air before the next toll lands, so THERE ARE NEVER MORE THAN
TWO PIECES OF DEBRIS IN THE FRAME AT ONCE and SIX chips break in total across the clip. AFTER THE
THIRD TOLL he holds the final bite dead-still through the third quarter, spike in the stone, his
shoulders juddering straight up and down under his own braced weight, while the last chips crumble
away, and IN THE FINAL QUARTER he draws the spike free, turns the warhammer back about his leading
hand to the EXACT angle and height it has in the reference image and rises into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Measured, ceremonial, final.

## special_2  (THE SIEGE PRESS) — the squared head set to the floor and his whole tonnage poured down the haft
SPECIAL FINISHER (the siege press): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY KIND: he does NOT raise
the hammer first, does NOT draw it back, and NO PART of the weapon travels upward before the press -
it starts from exactly the height it ALREADY HAS in the reference image and only ever goes DOWN. IN
THE FIRST QUARTER he turns the warhammer head-down about his locked REAR hand - that hand staying at
its station, held in close at his own hip, never travelling out away from his own body - and SETS the
squared steel head down onto the flagstone just ahead of his own leading boot's toe, the head at
every moment NEARER his own body than it sits in the reference image and never further toward
screen-right, the BUTT-SPIKE swinging a short way up and IN toward his own rear hip, never rising
above his own belt and never travelling further toward screen-left than it sits in the reference
image. FROM THE QUARTER MARK TO THE SEVENTY PERCENT MARK he POURS his whole armoured tonnage down the
haft: hips folding, chest coming down over his leading knee, both arms straightening as he bears
down, both feet flat and planted, and under the grinding steel face the floor GIVES WAY IN STAGES -
EXACTLY SIX chips of hard grey flagstone break loose in ones and twos spread across the length of the
press, never in one burst, each chip no bigger than the steel toe-cap of his own boot and each one
SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze -
knocked UPWARD no higher than his own knee, staying within one hand's-breadth of the grounded head
and never further toward screen-right than the head sits in the reference image - every chip cracking
apart and crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF
DEBRIS IN THE FRAME AT ONCE. Through the whole press the grounded head GRINDS on its spot without
ever sliding out toward screen-right and without ever lifting, his shoulders judder straight up and
down under the load, and he may FOLD and SINK, but he never TURNS - his chest never squares up toward
the camera. IN THE FINAL THIRTY PERCENT he eases his weight back up off the haft, draws the head back
up out of the broken stone, turns the warhammer back about his rear hand to the EXACT angle and
height it has in the reference image and rises into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. Slow, crushing,
inexorable.

## special_3  (THE WHITE KEEP) — the deep fortress crouch held while the floor gives way under his own boots
SPECIAL FINISHER (the white keep): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER he coils his entire armoured
mass STRAIGHT DOWN into a deep fortress crouch over both planted feet - knees folding fully, haunches
sinking low, his bare head sinking low between his shoulders - while the warhammer rides DOWN with
him at its exact reference angle, both gloved hands locked at their stations, neither end ever
swinging toward either side edge. HE HOLDS THAT CROUCH FROM THE END OF THE FIRST QUARTER UNTIL THE
SIXTY-FIVE PERCENT MARK, loading harder the whole time and never striking at all: his thighs, back
and shoulders shudder under the load straight up and down, his forearms shake against the haft, and
THE DAMAGE COMES FROM HIS OWN BOOTS, NOT FROM THE WEAPON - through the whole hold both boots GRIND
DOWN into the flagstone without either one leaving the spot it stands on, and the floor GIVES WAY
under them in stages: EXACTLY SIX chips of hard grey flagstone break loose in ones and twos, spread
out across the length of the hold rather than in one burst, each chip no bigger than one of his own
gloved knuckles and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - knocked UPWARD to no higher than his own knee and spreading no wider
than his own standing footprint - never past his leading boot's toe toward screen-right, never past
his rear heel toward screen-left - every chip cracking apart and crumbling away to nothing in mid-air
as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. AT THE SIXTY-FIVE
PERCENT MARK he drives one short heavy press of his whole mass straight DOWN and the crouch bottoms
out, the warhammer riding down with him at its reference angle and taking no other part - it does not
turn, does not swing and does not rise. THE WHOLE FINAL QUARTER is his slow controlled rise back up
out of the crouch, both boots never leaving the stone, the warhammer riding back up with him to the
EXACT angle and height it has in the reference image, into the EXACT same reference stance, so that
he is already standing completely still in the reference pose well before the clip ends. Coiled,
armoured, immovable.
