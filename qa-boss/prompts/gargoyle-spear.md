# GARGOYLE SPEAR — MK FINAL playable. Full 13-clip kit. Written phase 143, verified phase 146.
#
# ORCHESTRATOR VERIFICATION — checked, not taken on the author's report:
#   check-prompt-sections            clean=13 problems=0
#   §5b idle vs ko tails             correctly DIVERGE (".. first frame does." / ".. in the shot.")
#   "strict side profile"            1 file hit, inside an operator note; reaches ZERO built prompts
#   throws seize nothing             no non-negated seize/grab/clamp/grasp/caught in either throw
#   §2b rotational licence           ZERO hits across ALL 13 states (the gate only checks idle +
#                                    the two strikes; this was checked everywhere)
#   §4b banned-class nouns           ZERO positive uses of dust/smoke/mist/haze/spray anywhere
#   §2c wind-up raises               only two hits, both benign: a negation ("neither heel ever
#                                    lifts") and victory's RECOVERY, which is bounded to reference
#                                    ("to the EXACT angle and height it has in the reference image")
#   wing bounds                      "never spread/open/unfurl" present in every state sampled
#   check-plate-key                  opaque 17.45% · emis 0.38% · white 0.00% · p99 5.0
#                                    -> KEYS WITH MARGIN
#   alpha mask inspected             solid, NO rectangular edge, wing membrane intact, inter-leg
#                                    negative space correct, no body holes — and the thin spear
#                                    SHAFT survives crisply, unlike lich's open-link chain, because
#                                    it is solid rather than a linked structure
#
# This is the cleanest kit delivered so far: nothing needed fixing. The author read the updated
# KIT-WRITING-BRIEF and applied §2b/§2c/§4b/§5b unprompted.
#
# MASK CONFIRMS THE AUTHOR'S EDGE READ: the WING CREST owns the TOP (above his horn-tips) and the
# trailing membrane owns the LEFT, while the spearhead owns the RIGHT. The wings are therefore
# frozen kit-wide — never spread, open, unfurl, flare, beat or lift — with only a shiver / press-in
# licensed. Do NOT write a wing-spread victory later: it is the one thing this silhouette cannot do.
#
# FIRST-CLIP WATCHES (author's, endorsed): invented cloth-sway on the stone tassets or
# membrane-flutter on the folded wings (identity drift on a STONE character, not life); the
# shaft's wing-vanes smearing into a disc in special_1; and `hit`'s backward lean carrying the wing
# crest toward the left margin — if hit fails containment LEFT, shrink the lean, not the bound.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/gargoyle-spear-anchor-green.png`, pre-screened
before this kit was written: `node qa-boss/check-plate-key.mjs` returns opaque **17.45%**, emissive
**0.38%** (all specular on stone — NO baked glow anywhere on him), white 0.00%, p99 backdrop distance
5.0 — **KEYS WITH MARGIN**. He faces SCREEN-RIGHT natively; no hflip anywhere in this kit. He is an
all-grey subject on green — nothing on him is green, so no isGreen hole risk. The two facts that shape
every line below: he is WIDER THAN HE IS TALL, and his folded WINGS own both the left edge and the top
of his bounding box at once.

## ★ GARGOYLE FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1121w x 1014h** (fills 66.0% of frame height — that is a RESOLUTION
budget: the engine upscales, so no beat may shrink him, move him off his spot or carry him away from
the camera).
  LEFT **206px** · RIGHT **209px** · HEADROOM **498px** · bottom free (foot-claws on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **1.37x** — and nothing in this kit steps, lunges, sweeps wide or
  reaches, so nothing approaches it.

**206/209px are among the tightest lateral margins in the roster, and unlike most of the roster the
subject is WIDER than it is tall. DOWN and IN are the only free directions, and every beat in this
file is built from them.**

WHO OWNS EACH EDGE:
  · **LEFT x206** — the lowest trailing TIPS of the folded WING membrane, hanging beside his rear
    leg. The spear's BUTT-SPIKE sits about 80px inside them.
  · **RIGHT x1327** — the point of the barbed SPEARHEAD.
  · **TOP y498** — the CREST of the folded wings (the wing knuckle), a little HIGHER than his own
    horn-tips (~y580).
  · **BOTTOM** — his splayed foot-claws on the floor line.

  1. **THE WINGS OWN THE LEFT EDGE AND THE TOP AT ONCE, SO THE WINGS ARE FROZEN.** A spread, flare,
     beat, flap, mantle or lift exits the frame instantly on two edges. The shared suffix folds them
     for every frame of every state, and the ONLY wing motion any acting line in this file ever
     grants is a SHIVER or a pressing-in TIGHTER against his back. There is no victory wing-spread
     and no ko wing-splay anywhere in this kit, deliberately — that is the one thing his silhouette
     cannot do.
  2. **THE SPEAR IS DOUBLE-ENDED AND SPANS ~1035px OF A 1121px SUBJECT.** Barbed head toward
     screen-right owns the right edge; butt-spike toward screen-left sits just inside the wing tips.
     Rotating one end up or out pushes the OTHER end toward an edge, so BOTH ends are bounded at
     their reference positions in the suffix, and every rotation in this kit turns the spear DOWN
     AND IN, which NARROWS the whole silhouette instead of widening it.
  3. **THE LEVER GRAMMAR: REAR HAND = FULCRUM, LEADING HAND = DRIVER.** His REAR hand grips low on
     the shaft near the butt-spike; his LEADING hand grips ahead of his chest near the head.
     Head-down turns about the locked rear hand carry the barbed head DOWN AND IN toward his own
     leading foot while the short butt lever swings up only as far as his own hip and stays inside
     its reference x. Butt-down turns carry the spike down-and-in beside his own rear foot while the
     head end draws IN toward him as it lifts, capped below his own horn-tips. Down-and-in SHORTENS
     him; that lever grammar is the whole kit.
  4. **THE SPEAR CAN NEVER GO VERTICAL OR OVERHEAD.** ~1035px of weapon against 498px of headroom,
     with a floor underneath: a vertical carry does not fit in either direction. The absolute
     ceiling for any risen part of it is the wing-crest height from the reference image, and the
     per-beat caps in the acting lines are tighter still (his hip for the butt end, his horn-tips
     for the head end).
  5. **EFFECTS ARE BROKEN FLAGSTONE ONLY, SOURCED FROM THE FLOOR** — a CONTINUOUS surface that
     cannot visibly deplete. Every debris beat carries an exact COUNT, a per-piece SIZE tied to one
     of his own parts (a toe-claw, one of his own hands) and a SPAN tied to his standing footprint
     or to the named impact point. NEVER sourced from his horns, his claws or his wing-fingers —
     those are countable identity features and chipping them is the depletion trap. And no noun from
     the banned classes anywhere in any beat: no dust, no grit, no smoke, no spark, no cloud. He has
     NO baked emissive, so the live risk is an INVENTED glow — his stone is pinned to reference
     brightness in the suffix and the energy shapes are banned there by name.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME hulking stone gargoyle from the reference image (a grotesque hewn from a single mass
> of matte grey weathered stone - body, armour and weapon all the same chiselled, pitted, age-streaked
> grey rock; a snarling demonic face fixed in an open bared-fang snarl, with a heavy scowling brow,
> deep-set eyes, a broad flattened muzzle, long pointed ears swept back, and ridged stone HORNS
> curving up and back over his skull; two great BAT WINGS of the same grey stone rising behind his
> shoulders and FOLDED DOWN his back toward screen-left, their long finger-struts closed together and
> their membrane hanging in a shut drape whose lowest tips trail beside his rear leg; an ornately
> carved stone PAULDRON with pointed-arch tracery on his near shoulder, carved stone VAMBRACES on his
> forearms, and a skirt of layered carved stone TASSETS hanging at his waist, every panel rigid rock;
> a massively muscled bare stone torso and thick digitigrade legs ending in broad clawed stone feet,
> their long talons splayed on the floor; and gripped in BOTH stone hands a long stone SPEAR carried
> across his body on a shallow diagonal - its barbed leaf-shaped SPEARHEAD high toward screen-RIGHT, a
> pair of carved stone WING-VANES flaring from the shaft just behind that head like a herald's
> standard, firmly FIXED to the shaft, and a short pointed BUTT-SPIKE low toward screen-LEFT - his
> LEADING hand closed on the shaft in front of his chest nearer the head, his REAR hand closed lower
> on the shaft nearer the butt-spike), standing on a solid saturated GREEN chroma screen (bright green
> #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His horned head, bared-fang snarl, pointed ears, folded wings, carved pauldron, vambraces and
> tassets, his bare stone hide, his clawed feet and the whole winged stone spear all stay EXACTLY the
> same the entire clip - nothing is ever added, lost or re-carved, and every carved panel on him is
> rigid stone that never bends, never flutters and never sways like cloth. The spear stays gripped in
> his own stone hands the entire clip - it is never released, never let go, never exchanged and never
> replaced by anything else, BOTH of his stone hands stay closed on the shaft in every single frame,
> and no second spear and no other weapon or new object ever appears anywhere in the shot. HIS TWO
> GREAT STONE WINGS STAY FOLDED EXACTLY AS THEY ARE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME -
> they never spread, never open, never unfurl, never flare, never beat, never flap and never lift; the
> most they ever do is shiver or press in tighter against his back, and they never travel further
> toward screen-left and never rise higher than they sit in the reference image. Every surface of him
> is matte weathered stone and stays EXACTLY as bright as it is in the reference image - nothing on
> him ever glows, lights up, brightens, flares or trails, and no glow, aura, beam, halo, ring of
> light, orb, fireball, projectile, wisp, mist, smoke, fog, fire or energy of any kind ever appears
> anywhere in the shot. The spear stays FULLY INSIDE the frame at ALL times and NEVER extends past any
> edge of the frame: the barbed HEAD never travels further toward screen-right than it does in the
> reference image, the BUTT-SPIKE never travels further toward screen-left than it does in the
> reference image, and NO PART of the spear is ever raised above the height the crest of his own
> folded wings has in the reference image. While it is in his grip the spear is NEVER swung fully
> vertical, NEVER raised overhead, NEVER thrust or reached out ahead of him and NEVER swung round so
> that its barbed head passes behind him - it only ever rides with his body, turns a short way about
> his own gripping hands, or turns in place about its own long shaft. HIS FEET STAY FLAT ON THE GROUND
> FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and never lunges out into a wide
> stance; he keeps his stance narrow and never spreads wider than about one and a quarter times his
> standing width. He stays planted on the same spot at the same distance from the camera the whole
> clip, with zero net drift in any direction. He stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and his body holds the SAME angle to camera it has in the
> reference image - it never opens further toward the viewer and never turns away. His face stays
> fixed in the same open bared-fang snarl it has in the reference image - his jaw never moves and his
> expression never changes - and he never talks, never shouts and never roars. The camera is
> absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure in
> frame at all times, nothing else added. He begins and ends on the EXACT same reference stance.
> 24fps. Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The literals below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, following lich and jin, not raiju. The KO-SUFFIX
rule strips any sentence matching `keeps the ... never drops or swaps`; this character never drops the
spear in any state (stone fingers do not relax), so the lock is phrased "stays gripped in his own
stone hands ... never released, never let go, never exchanged", which does not match the strip, stays
TRUE through a prone collapse, and sits in its own sentence so no strip takes the identity lock with
it. Verify on the built `ko` that both the identity sentence and the grip sentence survive.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not CLAWS and not
CLAWED FEET. The ko rewrite matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any
other way and the rewrite silently misses. Consequence honoured kit-wide: NO state kneels, stomps or
lifts a foot — every impact in this kit is delivered flat-footed through sinks, grinds and the weapon.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`, so
the ko rewrite rescopes it to while-standing. Do not re-word it.

(d) THE WEAPON-MOTION SENTENCE IS SCOPED `While it is in his grip` and deliberately carries NO "never
carried level / never flattens horizontal" clause: special_2 lays the whole shaft flat onto the
flagstones ON PURPOSE, and strike A's falling arc passes through shallow angles. The swing-round ban
is phrased `so that its barbed head passes behind him` (the butt already lives on his screen-left
side; the short form "never swung round behind him" would read as a ban on beats that are legal).

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko` is
rewritten by koSuffix() to end `...anywhere in the shot.`; read the built `idle` and `ko` and confirm
they DIFFER at the tail. Never copy the ko tail back into this file.

(f) TWO-HANDED THROUGHOUT: no beat in this kit ever opens a hand off the shaft. In special_1 the shaft
turns in place INSIDE the closed rings of his stone fingers; in block A the hands SLIDE along the
shaft while staying closed. "BOTH of his stone hands stay closed on the shaft in every single frame"
is therefore true in all 13 states, including prone in the ko.

(g) HE IS SOLID ROCK, NO CLOTH: the identity sentence pins every panel as rigid. Watch the first keyed
clip for the model inventing cloth-sway on the tassets or membrane-flutter on the folded wings — both
are identity drift on this character, not life.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist", no foot-to-foot weight
transfer anywhere in this file — not only in the gated states. Settles are written straight-down
through BOTH feet at once; the axis-spin in special_1 is written as "turns in place about its own long
shaft" to stay clear of the roll-verb class.

FACING, judgement call: **THREE-QUARTER OPEN toward screen-right — NOT strict profile.** Read at full
size; the evidence that decided it:
  · HEAD — strong three-quarter toward screen-right: muzzle, brow ridge and both horns commit to
    screen-right, but the far brow edge and both sides of the bared dental row read, so not edge-on.
  · TORSO — decisively OPEN: BOTH pectorals present flanking a central sternum line, the full ab
    column faces the viewer, and both shoulders read as separate volumes (the near carved pauldron
    plus the far shoulder mass behind his head).
  · HIPS — open: the carved tasset skirt hangs across the front of both thighs showing its full face.
  · FEET — the decisive test: BOTH feet show their TOPS with the talons splayed and visible, the rear
    foot turned out toward the viewer. Impossible in true profile.
So no line in this file orders "strict side profile"; every line says "angled to camera exactly as in
the reference image and facing screen-right", and the suffix bans the turn in BOTH directions. It is
NOT the frontal-plate blocker class: muzzle, horns, spearhead, both grips and the leading foot all
commit toward screen-right, and every line of attack in the kit goes that way or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his spear and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, chunks and shards of broken grey flagstone, opaque, sharp-edged, matte and lit like rock - never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist, never smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own waist and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading foot's claws toward screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a dead-still stone sentinel's guard, his weight sunk and even over both
planted clawed feet, the winged spear held steady across his body on the shallow diagonal it has in
the reference image with both stone hands closed on the shaft. He is carved stone and does not
breathe - instead ONE slow full SETTLING of his whole stone mass fills the first half of the clip and
a second fills the second half, and EVERY PART of that settling is STRAIGHT UP AND DOWN IN THE
VERTICAL PLANE ONLY: on each settling his whole weight sinks a fraction STRAIGHT DOWN through BOTH of
his planted feet at once and rises again - it NEVER transfers from one foot to the other and neither
foot ever carries more of it than the other - his shoulders sink a fraction STRAIGHT DOWN and lift
again with neither one coming forward and neither one going back, his horned head lowers a fraction
STRAIGHT DOWN on his thick neck and rises again without ever turning left or right, and the whole
spear rides DOWN with him a finger's width and back up, holding its exact reference angle throughout,
neither end ever swinging toward either side edge. The prop beat inside each settling: the stone
fingers of his REAR hand flex open a crack and re-close on the shaft one knuckle at a time, then the
stone fingers of his LEADING hand do the same - the shaft never leaves either closed palm. His folded
wings press a fraction TIGHTER in against his back on each sink and ease again - they never open even
a crack - and his carved tassets ride rigidly with his hips, because everything on him is rock. THE
LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never
swings round, and his chest never squares up toward the camera; he may SINK, but he never TURNS. His
face stays fixed in the same bared-fang snarl and his jaw does not move at all. Feet planted, silent,
patient as masonry. Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle
motion.

## attack_strike A  (falling arc of the barbed head, a clean cut through air)
STRIKE A (falling arc): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right, the spear across his body on its shallow diagonal with the
barbed head already high toward screen-right. THERE IS NO WIND-UP OF ANY KIND: he does NOT raise the
spear first, does NOT draw it back, does NOT lift it even slightly, his shoulders do NOT rise, and
the cut starts from exactly where the barbed head ALREADY SITS in the reference image and only ever
goes DOWN. IN THE FIRST QUARTER his knees fold and he DROPS his entire stone tonnage straight DOWN
over both planted feet in one committed sink, hips folding deep and chest coming down over his
leading knee - and through that same sink his REAR stone hand stays LOCKED low on the shaft, held in
close at his own waist and never travelling out away from his own body, while his LEADING hand hauls
the shaft DOWN so the whole spear TURNS head-down about that locked rear hand: the barbed head shears
DOWN through empty air on his screen-right side until it hangs low at his own shin height over the
stone ahead of his leading foot's claws, at every moment NEARER to his own body than it sits in the
reference image - it is NEVER thrust and NEVER pushed out toward screen-right, and the deeper it
drops the closer in it comes. At the far end the short BUTT-SPIKE swings a short way up and IN toward
his own hip as the lever turns - never rising above his own hip and never travelling further toward
screen-left than it sits in the reference image. THE CUT HAS LANDED BY THE HALFWAY POINT and the head
never touches the ground - this is a clean cut through air. As his weight lands, his rear foot's
claws grind hard DOWN into the stone and break EXACTLY THREE small chips of solid grey flagstone up
off the floor beside that foot, each chip no bigger than one of his own toe-claws and each one SOLID,
OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke, never haze - rising no
higher than his own ankle and spreading no wider than his own standing footprint - never past his
leading foot's claws toward screen-right, never past his rear heel toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES
OF DEBRIS IN THE FRAME AT ONCE. BOTH OF HIS FEET STAY FLAT ON THE STONE THROUGHOUT -
neither heel ever lifts. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME
ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never
comes forward, his far shoulder never swings round, and his chest never squares up toward the camera;
he may FOLD and SINK, but he never TURNS. He HOLDS the sunk finish with the head hanging low through
the third quarter while the last chips crumble away, and only in the final second does he rise
slowly, the spear turning back up about his rear hand to the EXACT angle and height it has in the
reference image, and settle into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Heavy, fast for stone, silent.

## attack_strike_b  (butt-spike bite beside the rear foot)
STRIKE B (butt-spike bite): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right, the butt-spike already hanging low toward screen-left.
THERE IS NO WIND-UP OF ANY KIND: he does NOT lift the butt-spike first, does NOT draw it back, and
does NOT raise any part of the weapon before the blow - the spike starts from exactly where it
ALREADY SITS in the reference image and only ever travels DOWN and IN. IN THE FIRST QUARTER his knees
fold and his whole stone mass sinks STRAIGHT DOWN over both planted feet, and through that sink both
stone hands drive the shaft butt-first DOWN and IN, the spear turning a short way about his REAR
hand, which stays held in close at his own waist and never travels out away from his own body: the
BUTT-SPIKE stabs down and IN until it BITES into the flagstone just beside and ahead of his own rear
foot's claws - travelling only down and inward, never further toward screen-left than it hangs in the
reference image, the deep body sink closing the last of the distance. On the far end the barbed HEAD
swings a short way up and IN toward him as the lever turns - drawing INWARD as it lifts, never rising
above the height of his own horn-tips and never travelling further toward screen-right than it sits
in the reference image. THE BITE HAS LANDED BY THE HALFWAY POINT: the spike cracks the floor where it
strikes and EXACTLY THREE chips of solid grey flagstone burst UPWARD around the buried spike, each
chip no bigger than one of his own toe-claws and each one SOLID, OPAQUE and sharp-edged - never a
puff, never a cloud, never dust, never smoke, never haze - rising no higher than his own knee,
staying within one hand's-breadth of the bite and never past his rear heel toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES
OF DEBRIS IN THE FRAME AT ONCE. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF
HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME -
his near shoulder never comes forward, his far shoulder never swings round, and his chest never
squares up toward the camera; he may FOLD and SINK, but he never TURNS. He HOLDS the sunk finish with
the spike in the stone through the third quarter while the last chips crumble away, and only in the
final second does he draw the spike free, the spear turning back about his rear hand to the EXACT
angle and height it has in the reference image as he rises into the EXACT same reference stance, so
that he is already standing completely still in the reference pose well before the clip ends. Short,
brutal, downward.

## attack_throw A  (floor-ram of the barbed head, solo-safe)
THROW A (floor-ram): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. There is NO opponent, NO second figure and NO body anywhere
in this clip - he seizes nothing, grips nothing new, and nothing is ever caught, carried or dragged
on the spear at any time; the ONLY thing his weapon touches is the bare flagstone floor. IN THE FIRST
THIRD he turns the spear a short way head-down about his locked REAR hand - that rear hand staying
closed low on the shaft, held in close at his own waist, never travelling out away from his own
body - until the barbed head points DOWN at the flagstone just ahead of his own leading foot's claws,
the head at every moment NEARER to his own body than it sits in the reference image and never further
toward screen-right, while at the far end the BUTT-SPIKE swings a short way up and IN toward his own
hip, never rising above his own hip and never travelling further toward screen-left than it sits in
the reference image. THEN he wrenches his entire stone tonnage straight DOWN through both folding
knees and RAMS the barbed head into the flagstone at that spot - THE RAM HAS LANDED BY THE HALFWAY
POINT - the point biting deep into the floor-stone, and EXACTLY FIVE chips of solid grey flagstone
burst UPWARD around the buried head, each chip no bigger than one of his own toe-claws and each one
SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke, never haze -
rising no higher than his own knee, staying within one hand's-breadth of the impact point and never
further toward screen-right than the barbed head sits in the reference image - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES
OF DEBRIS IN THE FRAME AT ONCE. He may FOLD and SINK, but he never TURNS - his chest never
squares up toward the camera. He HOLDS the low finish through the third quarter, his whole weight
bearing down the shaft onto the buried point, his stone shoulders juddering under his own load,
while the last chips crumble away. Only in the final quarter does he draw the point back up out of
the broken stone, turn the spear back about his rear hand to the EXACT angle and height it has in
the reference image and rise into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Grounded, crushing, final.

## attack_throw_b  (rising horn toss through empty air, solo-safe)
THROW B (horn toss): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. There is NO opponent, NO second figure and NO body anywhere
in the frame at any time - his horns strike NOTHING, and NOTHING is ever caught, lifted, tossed or
thrown; the jab passes through empty air only, and nothing new ever appears in the shot. IN THE FIRST
THIRD he coils STRAIGHT DOWN into a deep crouch over both planted feet, knees folding, his horned
head dipping low toward the shaft held across his body - and the spear takes no part in this beat: it
stays locked in both stone hands, riding DOWN with the crouch and holding its exact reference angle,
neither end ever swinging toward either side edge. THEN he erupts STRAIGHT UP out of both bent legs -
rising ONLY back to his own full standing height and no further, both feet staying flat and planted
on the stone - and as he rises his horned head SNAPS up in one savage horn-jab through the empty air
on his screen-right side, horns leading, his muzzle staying pointed toward screen-right the whole
way: his face NEVER tips up toward the sky, NEVER turns toward the camera, and his horn-tips rise no
higher than the crest of his own folded wings has in the reference image. THE JAB PEAKS BY THE
HALFWAY POINT. On the eruption his foot-claws grind hard into the stone and EXACTLY FIVE chips of
solid grey flagstone burst UPWARD from under his own feet, each chip no bigger than one of his own
toe-claws and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never
smoke, never haze - rising no higher than his own knee and spreading no wider than his own standing
footprint - never past his leading foot's claws toward screen-right, never past his rear heel toward
screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES
OF DEBRIS IN THE FRAME AT ONCE. THROUGH THE THIRD QUARTER
he settles his horned head back down onto his thick neck while the last chips crumble away, the spear
riding back up with him to the EXACT angle and height it has in the reference image, and in the final
quarter he settles into the EXACT same reference stance, so that he is already standing completely
still in the reference pose well before the clip ends. Coiled, erupting, savage.

## attack_block A  (shaft brace)
BLOCK-COUNTER A (shaft brace): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER both stone hands SLIDE IN toward
each other along the shaft - staying closed around it the whole way - and he SINKS his whole weight
straight DOWN behind it into a deep braced crouch over both planted feet, elbows tight against his
own ribs, horned head tucked down, knees taking the load - so the stone shaft stands braced across
the front of his own chest at the same shallow diagonal it holds in the reference image, a solid bar
between him and the pressure. The spear does not turn and does not travel sideways; it drops with his
body and nothing else. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs
the pressure - both clawed feet grind a fraction on the stone without either one leaving the spot it
stands on, his forearms shudder under the load, his stone shoulders judder and settle straight up and
down, and his folded wings press in TIGHTER against his back - but the braced shaft itself does not
move and nothing else in his body travels. IN THE FINAL QUARTER he drives one short hard shove
straight UP out of his knees behind the braced shaft, rising only back to his own standing height and
no further, then both hands slide back out to the exact grips they hold in the reference image and he
flows in one eased motion back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing breaks.
Braced, immovable, silent.

## attack_block_b  (pauldron-and-horn guard)
BLOCK-COUNTER B (pauldron guard): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST QUARTER he drops his horned head hard
toward his own chest, LIFTS his near shoulder straight up a fraction under its carved pauldron, and
hunches his whole back down over it so the carved pauldron and the swept stone horns are what meet
the pressure, his weight sinking straight DOWN through both planted feet - and he lowers the whole
spear with the hunch to a low dead carry in front of his own thighs, both hands still closed on it,
the shaft holding the exact angle it has in the reference image all the way down, neither end ever
travelling toward either side edge, where it hangs low and takes no part. HE HOLDS THAT HUNCHED GUARD
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both clawed feet grind a fraction on the stone without
leaving the spots they stand on, his neck, back and shoulders shudder under the load straight up and
down, his folded wings shiver and press in TIGHTER against his back, and the spear stays low and
dead-still and never rises and never swings for one frame of it. IN THE FINAL QUARTER he drives
straight up out of his knees with one short heavy shoulder-and-horn shove - the top of his own head
rising no higher than it sits in the reference image - then lets the spear ride back UP to the EXACT
angle and height it has in the reference image and flows in one eased motion back into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Nothing sheds and nothing breaks. Compact, hunched, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his horned head and both shoulders snap back and to screen-LEFT, his
spine folding and his knees buckling under his own dead weight - but BOTH FEET STAY EXACTLY WHERE
THEY STAND, he does not step back and he does not skid, and every bit of the recoil is absorbed in
his knees, hips and trunk instead. Both stone hands clamp harder on the shaft and the whole spear is
jolted straight DOWN with his body, holding the exact angle it has in the reference image the whole
way - it never turns, never swings and never rises - and his folded wings JOLT once against his back
and shiver without ever opening even a crack. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he
rides it off balance through the middle of the clip - his trunk pitched a short way back toward
screen-left over his rear leg with both feet still planted, his stone shoulders juddering, the spear
trembling in his locked grip. IN THE LAST THIRD he catches his balance, straightens up out of his
knees and flows in one eased recovery back into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. His snarling face
leads the recoil; his back is never shown and his chest never squares up toward the camera. Nothing
sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or
appears in the frame at any time, and there is no light, no flare, no wisp and no streak anywhere in
the shot. Only his own body and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, his
horned head drops and his shoulders slump, and he goes STRAIGHT DOWN onto both knees on the spot he
stands on without travelling forward, his legs folding beneath him like undermined masonry. Then he
pitches forward and down over his own thighs and FOLDS, his arms folding down beneath him with both
stone hands still closed on the shaft, and BY THE HALFWAY POINT he has come to rest fully prone and
motionless, folded heavily down over his own knees with his horned head lying low toward screen-right
and his snarl still pointed that way. His stone fingers never open: the spear comes down WITH him and
comes to rest lying at a slant across his own fallen body, its butt-spike down on the stone toward
screen-left and its barbed head tipped up over his own back toward screen-right, so that BOTH ends
finish NEARER his own fallen body than they sit in the reference image and neither of them is
anywhere near an edge of the frame. His wings stay FOLDED tight on his back as he falls and lie
folded on top of him where he rests - they never open, never spread and never splay out across the
ground. EXACTLY THREE small chips of solid grey flagstone are knocked UPWARD where his knees strike,
each chip no bigger than one of his own toe-claws and each one SOLID, OPAQUE and sharp-edged - never
a puff, never a cloud, never dust, never smoke, never haze - rising no higher than his own fallen
shoulder and staying within one body-width of where he lands, every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES
OF DEBRIS IN THE FRAME AT ONCE. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he does not
stir, does not lift his head, does not push up on an arm and he does NOT get back up - and the fallen
spear lies exactly where it came to rest and does not move again. He is ALONE in an empty frame -
nothing whatsoever enters, crosses or appears in the frame at any time. Only his own body and his own
weapon move.

## victory  (grounding the standard, no turn to camera)
VICTORY (grounding the standard): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right. IN THE FIRST QUARTER he turns the spear SLOWLY
butt-down about his REAR stone hand - that hand staying held in close at his own waist and never
travelling out away from his own body - while he bends both knees in one slow dignified sink: the
BUTT-SPIKE travels only DOWN and IN until he SETS it - not strikes it - onto the flagstone just
beside his own rear foot's claws, and on the far end the barbed head rises slowly, drawing IN toward
him as it lifts, never rising above the height of his own horn-tips and never travelling further
toward screen-right than it sits in the reference image: the winged spear now stands grounded like a
herald's standard, both hands still closed on the shaft. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE
HOLDS THAT GROUNDED-STANDARD POSE with the stillness of the statue he is, and only three small
motions live inside it: two slow dead settlings of his whole mass STRAIGHT DOWN through both planted
feet and back up, never transferring from one foot to the other; the stone fingers of each hand
re-closing one by one on the grounded shaft; and ONE slow short bow of his horned head STRAIGHT DOWN
and back up, his muzzle staying pointed toward screen-right throughout - he never turns his head or
his body toward the camera at any point, and his chest never squares up toward the viewer. His face
stays fixed in the same bared-fang snarl and he makes no sound. IN THE FINAL QUARTER he lifts the
butt-spike back off the stone, turns the spear back about his rear hand to the EXACT angle and height
it has in the reference image, rises out of the knee-bend and settles into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Nothing sheds and nothing breaks. Composed, monumental, patient.

## special_1  (THE HERALD'S SPIN) — the wing-vaned shaft turned in place, braked dead, the floor breaking under his claws
SPECIAL FINISHER (the herald's spin): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER both stone hands
begin TURNING the shaft in place about its own long axis - the shaft turning smoothly inside the
closed rings of his stone fingers, both hands staying wrapped around it and the spear NEVER being
released - so the two carved stone WING-VANES behind the head sweep round and round the shaft.
NEITHER END OF THE SPEAR TRAVELS AT ALL during the spin: the barbed head and the butt-spike each hold
their exact place in the air, and the whole weapon holds the exact angle and position it has in the
reference image while the shaft turns between his hands. THROUGH THE SECOND QUARTER the turning
quickens and he sinks progressively STRAIGHT DOWN into a low braced crouch over both planted feet,
elbows in tight - and the spinning vanes stay SOLID carved stone in every single frame, always
visibly the same two rigid stone wings turning, never a blur, never a disc, never any streak of
light, and never leaving the shaft. AT THE SIXTY PERCENT MARK he brakes the spin DEAD in one instant -
the wing-vanes landing EXACTLY back in the position they hold in the reference image - and in the
same instant drives his whole stone tonnage straight DOWN through his bent legs so his foot-claws
GRIND into the floor: EXACTLY FOUR chips of solid grey flagstone break UPWARD out of the floor from
under his grinding feet, each chip no bigger than one of his own toe-claws and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his
own knee and spreading no wider than his own standing footprint - never past his leading foot's claws
toward screen-right, never past his rear heel toward screen-left - every chip cracking apart and
crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. The debris is SOLID BROKEN ROCK: opaque,
sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light, never a
wisp. HE HOLDS THE BRAKED CROUCH THROUGH THE THIRD QUARTER, thighs and shoulders shuddering under the
load straight up and down, the spear dead-still at its reference angle with the vanes at their
reference set, while the last chips crumble away. IN THE FINAL QUARTER he rises slowly back into the
EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Whirling, braced, final.

## special_2  (THE FALLEN LINTEL) — the whole spear driven down flat onto the flagstones as one breaking bar
SPECIAL FINISHER (the fallen lintel): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right. THERE IS NO WIND-UP OF ANY KIND: he does
NOT lift the spear first, does NOT draw it back, and NO PART of the weapon travels upward at any
moment before the slam - it starts from exactly the height it ALREADY HAS in the reference image and
only ever goes DOWN. IN THE FIRST THIRD his hips fold and he bends double over both planted feet,
folding his whole stone mass STRAIGHT DOWN, chest coming down over his knees, his folded wings riding
down with his back and staying folded - and both stone hands carry the whole spear DOWN with him,
levelling it out as it descends so that AT THE FORTY PERCENT MARK the entire shaft SLAMS down FLAT
onto the flagstones as one breaking bar, directly below where it already hangs: the barbed head
striking the stone directly below its own reference position and never further toward screen-right,
the butt-spike directly below its own and never further toward screen-left, both stone hands still
closed on the shaft at the floor. THE FLOOR GIVES WAY UNDER THE BAR: EXACTLY SEVEN chips of solid
grey flagstone burst UPWARD from under the stretch of shaft that lies between his own two feet, each
chip no bigger than one of his own hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his own knee and spreading no wider
than his own standing footprint - never past his leading foot's claws toward screen-right, never past
his rear heel toward screen-left - every chip cracking apart and crumbling away to nothing in mid-air
as it falls. THERE ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged, matte and lit like
stone - never a glow, never a flame, never a spark of light, never a wisp. He may FOLD and SINK, but
he never TURNS - his chest never squares up toward the camera and both feet stay flat and planted.
HE HOLDS THE LANDED BAR THROUGH THE THIRD QUARTER, folded double with his whole weight bearing down
through both straight arms onto the grounded shaft, his stone shoulders juddering, while the last
chips crumble away. ONLY IN THE FINAL QUARTER does he lift the shaft back up off the stone, the spear
rising with him back to the EXACT angle and height it has in the reference image as he unfolds into
the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Flat, crushing, architectural.

## special_3  (THE CATHEDRAL PERCH) — the deep gargoyle perch-squat held while his foot-claws break the floor
SPECIAL FINISHER (the cathedral perch): he begins in the EXACT reference stance, angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER he coils his entire
stone mass STRAIGHT DOWN into the deep haunched PERCH-SQUAT of a gargoyle settling onto a cathedral
ledge - knees folding fully beneath him, haunches sinking low over both planted feet, his horned head
dropping between his shoulders, his folded wings pressing in TIGHT against his hunched back - while
the spear rides DOWN with him at its exact reference angle, both hands locked on the shaft, neither
end ever swinging toward either side edge. HE HOLDS THAT PERCH FROM THE END OF THE FIRST QUARTER
UNTIL THE SIXTY-FIVE PERCENT MARK, loading harder the whole time and never striking at all: his
thighs, back and shoulders shudder under the load straight up and down, his forearms shake against
the shaft, and THE DAMAGE COMES FROM HIS OWN FEET, NOT FROM THE WEAPON - through the whole hold the
long talons of both feet SCREW DOWN into the flagstone without either foot leaving the spot it stands
on, and the floor GIVES WAY under them in stages: EXACTLY SIX chunks of solid grey flagstone break
loose in ones and twos, spread out across the length of the hold rather than in one burst, each chunk
no bigger than one of his own hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud,
never dust, never smoke and never haze - knocked UPWARD to no higher than his own knee and spreading no
wider than his own standing footprint - never past his leading foot's claws toward screen-right,
never past his rear heel toward screen-left - every chunk cracking apart and crumbling away to
nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. The debris is SOLID BROKEN ROCK: opaque, chunky, sharp-edged, matte
and lit like stone - never a glow, never a flame, never a spark of light, never a wisp. AT THE
SIXTY-FIVE PERCENT MARK he drives one short heavy press of his whole mass straight DOWN and the perch
bottoms out, the spear riding down with him at its reference angle and taking no other part - it does
not turn, does not swing and does not rise. THE WHOLE FINAL QUARTER is his slow controlled rise back
up out of the perch, his weight easing up off his talons without either foot ever leaving the stone,
the spear riding back up with him to the EXACT angle and height it has in the reference image, into
the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Coiled, immense, patient as stone.
