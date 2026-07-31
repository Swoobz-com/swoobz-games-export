# IR-13 JUNKYARD KING — XG roster. Full 13-clip kit. (written phase 135)
#
# ORCHESTRATOR VERIFICATION, phase 135 — checked, not taken on report:
#   check-prompt-sections.mjs         clean=13  problems=0  (incl. the new KO-CONTAMINATED check)
#   idle tail / ko tail               correctly DIVERGE — the ko-rewritten tail was not copied back
#   "strict side profile"             0 occurrences, confirmed
#   throws seize nothing              no seize/grab/hook/clamp/grasp in either built throw; the only
#                                     "grip" hits are his own weapon handle, and both throws carry
#                                     "NO opponent, no second figure, no body being thrown"
#   check-plate-key                   opaque 9.74% · emis 0.45% (the molten crack) · white 0.02% ·
#                                     p99 7.3 · max 70 -> KEYS WITH MARGIN
#   alpha mask inspected              solid silhouette, NO rectangular alpha edge, cleaver solid,
#                                     the raised claw-hand's finger gaps preserved, inter-leg
#                                     negative space correct, no body holes
#
# FIRST-CLIP WATCHES (mine, on top of the author's):
#   1. FACING IS THE RISK ON THIS PLATE. He is broad and reads fairly frontal; the author called
#      PARTLY OPEN with good evidence (both feet showing their tops, both pauldrons as separate
#      volumes, chest panel to camera) and correctly used the oni-proven form "his body angled
#      toward screen-right exactly as it is in the reference image" rather than "strict side
#      profile". Watch check-frontturn hard on clip 1 — and remember lich idle v1 failed exactly
#      here, where the BEAT licensed a rotation the bound had already forbidden twice.
#   2. The molten-orange crack is baked emissive. It measures small (0.45%) on the still, but
#      compression plus motion can bloom it; check it does not spread onto the plate.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir13-junkyard-king-anchor-green.png`, read at FULL
SIZE before anything was written. He faces SCREEN-RIGHT natively; no hflip anywhere in this kit. No
phase number is stamped on this file — the caller should stamp the current one. TWO pre-fire checks
this file does NOT carry numbers for, because they were not run at authoring time: (1) run
`node qa-boss/check-plate-key.mjs` on the plate before the first fire; (2) inspect the FIRST keyed
clip in two places — the molten-orange CRACK on his helmet (a small baked emissive; it does not
visibly bloom on the still, but compression plus motion can change that) and the gaps between the
long articulated fingers of his open claw hand (thin elements key the way lich's chain did: watch
for speckle or a dropped fingertip). Neither is a blocker on writing; both are first-clip watch
items.

## ★ IR-13 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **596w x 1044h** (fills 68.0% of frame height), bbox x470..x1066,
y468 down to the floor line (~y1512).
  LEFT **470px** · RIGHT **470px** · HEADROOM **468px** · bottom free (feet on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).

**He is prop-TUCKED and the ROOMIEST plate in the whole set — 470px each side and 468px of ceiling —
so he is NOT in the no-raise straitjacket that oni-tetsubo and thorn-warden need. This kit spends a
slice of that ceiling ON PURPOSE, on a TIP-bounded over-the-shoulder arc, which is his whole
signature. The tip is bounded, never the hands.**

**WHO OWNS EACH EDGE (read off the full-size plate, not machine-measured):**
  · **TOP y468** — the squared TIP of the shouldered scrap cleaver, which sits HIGHER than his
    helmet crown.
  · **LEFT x470** — the same cleaver's tip/spine corner, pointing up-back toward upper screen-left;
    his rear orange boot at the floor line is the runner-up.
  · **RIGHT x1066** — the spread fingertips of his raised open claw hand at chest height; his
    leading claw-foot's toes are next, lower down.
  · **BOTTOM** — both feet on the floor line, free.
  · His **STANDING FOOTPRINT** runs from his rear boot's heel to his leading claw-foot's toes. All
    effect spans in this file are tied to it — never to "the gap between his feet", which a crouch
    widens.

  1. **THE CLEAVER IS SHORT FOR A TWO-EDGE OWNER: handle included it is about ONE of his own
     torso-lengths, gripped one-handed at his own chest — and that arithmetic is the kit.** With the
     grip held at chest height, a FULL vertical pass of the blade puts the tip only about one
     HELMET-HEIGHT above where the tip already sits in the reference — roughly 140px of a 468px
     ceiling, with ~330px still spare. So the over-the-shoulder chop arc is legal BY CONSTRUCTION,
     and the ceiling law is written as a property of the TIP: never more than one of his own
     helmet-heights above its reference height. The bound and the arc point the same way; neither
     fights the other.
  2. **THE FORWARD BOUND IS HIS OWN RAISED HAND.** The tip's screen-right limit is the vertical line
     of his own raised claw hand's reference fingertips — the subject's own rightmost point, x1066,
     still 470px clear of the frame edge. The chop arc's horizontal instant puts the tip at roughly
     that line and no further, because every arc in this kit is a TIGHT BENT-ELBOW arc: the grip
     drops and pulls IN toward his hip as the blade falls, so the tip sweeps steeply instead of
     reaching. Per beat the LANDINGS are narrower still — beside or inside his own leading foot's
     toes. The acting lines do NOT restate the lateral bounds; each lives ONCE in the shared block,
     which is where it belongs (restating a bound has never once worked — the object is narrowed
     instead).
  3. **THE LEVEL CARRY DOES NOT EXIST IN THIS KIT.** A blade held LEVEL in front of his chest would
     carry the tip past the forward bound, so every low carry is written STEEP: gripping hand at his
     own waist, tip down-forward hanging just above the floor inside the line of his own leading
     foot's toes. The saw states are built on that steep carry, and steep is also what the sawtooth
     beats want — beat and bound agree.
  4. **DOWN AND IN ARE THE FREE DIRECTIONS.** The bottom edge is free, the lateral margins are huge,
     and every committed beat is a sink, a chop, a rip toward his own rear heel, or a vertical
     compression. Zero net drift in every state; nothing translates him sideways.
  5. **HE IS A RESOLUTION BUDGET, NOT A CONTAINMENT RISK.** 596px wide in a 1536 frame is the
     narrowest subject in the set, and the engine upscales — so NO state shrinks him further: no
     retreating steps, no crouch-walking away from camera, no beat that pulls him toward the
     background. Sinks are vertical, in place, camera locked.
  6. **THE REAL RISKS ON THIS PLATE ARE INVENTION, NOT GEOMETRY:** (a) "junkyard" invites the model
     to dress the set — tyres, barrels, scrap piles — so the empty-green law and a named junk-object
     ban live in the finisher block; (b) a robot invites gunfire and rocket-punches — firing,
     launching and detaching are banned BY NAME in the shared block; (c) the molten crack invites
     bloom — its size, shape and brightness are frozen. Max span 1.60x = 953px peak; the worst
     momentary span in this kit is the chop mid-arc (rear boot heel to descending tip), read at
     roughly 800px. Nothing else comes close.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME hulking scrap-built junkyard war-robot from the reference image (a tall
> broad-shouldered humanoid machine of weathered RUST-ORANGE armour plate bolted over a dark oily
> gunmetal endoskeleton of pistons, hoses and cables; a smooth rounded GUNMETAL-GREY HELMET with a
> sealed featureless faceplate, a jagged MOLTEN-ORANGE CRACK glowing down its near side and a small
> round port on its cheek; a thick cabled neck; squared rust-orange PAULDRONS on both shoulders,
> their edges chipped down to bare steel; a chest of layered rust-orange plates with one scuffed
> OFF-WHITE painted panel on the near pectoral, open below to a dark exposed mechanical midriff of
> pistons and a segmented spine; angular rust-orange hip plates over a narrow mechanical waist;
> mismatched legs - the REAR leg armoured in rust-orange thigh plate and ending in a heavy squared
> rust-orange BOOT-FOOT, the LEADING leg armoured in scuffed grey-white thigh and shin plate and
> ending in a bare dark-iron three-toed CLAW-FOOT, its exposed ankle carrying one small BLUE-painted
> valve cap, black cables running down the calf; his REAR arm crossing his chest so its dark
> mechanical hand grips the short cloth-wrapped HANDLE of his weapon in front of his upper chest;
> his LEADING arm raised toward screen-right, elbow bent, its bare dark-gunmetal CLAW HAND held OPEN
> at his own upper-chest height, long articulated fingers spread and half-curled in a beckoning
> taunt; and resting back over his REAR shoulder that weapon: a massive SCRAP CLEAVER about the
> length of his own torso - a huge squared single-edged blade of layered, riveted junk steel, grey
> gunmetal with darker banding and bolted patch-plates, a stepped straight spine, a blunt
> squared-off TIP, and a row of jagged SAWTEETH cut into its lower edge near the heel - its broad
> flat facing the camera and its tip pointing up and back toward the upper screen-LEFT corner),
> standing in a wide braced stance on a solid saturated GREEN chroma screen (bright green #00b140,
> nothing pink or magenta in the BACKGROUND; nothing anywhere on him is green, and the molten-orange
> glow stays only in the crack on his own helmet).

Shared suffix (carries the prompt laws — every state inherits these):
> His sealed gunmetal helmet with its molten-orange crack, his chipped rust-orange pauldrons and
> chest plates, the scuffed off-white panel on his chest, his dark exposed piston-and-cable midriff,
> his orange hip plates, his mismatched legs - the orange-booted rear leg and the grey-shinned
> leading leg with its dark-iron claw-foot and small blue ankle cap - his bare dark articulated claw
> hand, and the whole layered scrap cleaver with its sawtooth edge, its bolted patch-plates and its
> wrapped handle all stay EXACTLY the same the entire clip. The scrap cleaver stays gripped in his
> own REAR hand the entire clip - it is never released, never let go, never exchanged and never
> replaced by anything else, that rear hand is closed on the wrapped handle in every single frame,
> and no second weapon and no other object ever appears in either of his hands. Both hands stay
> attached to his own arms and every plate stays attached to his own body at ALL times - nothing
> detaches from him, nothing is launched and nothing flies off him; the cleaver is a dead slab of
> junk steel, not a gun - it has no barrel and no muzzle, it never fires, and nothing ever leaves it
> or leaves his hands. The jagged MOLTEN-ORANGE CRACK glowing on his helmet stays EXACTLY the same
> SIZE, the same SHAPE and the same brightness it has in the reference image - it never grows, never
> spreads, never brightens, never flickers and never throws light onto anything - and NO OTHER light
> ever appears: no glow, aura, beam, halo, ring of light, orb, fireball, projectile, missile,
> bullet, muzzle-flash, spark of light, ember, flame, wisp, mist, smoke, steam, exhaust or energy of
> any kind ever appears anywhere in the shot, and nothing ever leaks, sprays or drips from him. The
> scrap cleaver stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the
> frame: its squared TIP never travels further toward screen-left than it sits in the reference
> image, never travels further toward screen-right than the fingertips of his own raised claw hand
> reach in the reference image, and never rises more than one of his own helmet-heights above the
> height it has in the reference image; every swing is a TIGHT BENT-ELBOW arc kept close over his
> own body, and the cleaver is never thrown, never spun end over end, never twirled and never moved
> across to his other shoulder. His LEADING claw hand never rises above the crown of his own helmet,
> and apart from the single beat where an acting line has it brace the flat of the blade, it never
> touches the cleaver. HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never
> leaps, never hops and never lunges out into a wide stance; he keeps his stance narrow and never
> spreads wider than about one and a quarter times his standing width. He stays FACING SCREEN-RIGHT
> the entire clip and NEVER rotates or turns to face the camera, and his body holds the SAME angle
> to camera it has in the reference image - it never opens further toward the viewer and never turns
> away. His helmet stays sealed shut and never opens - he has no face and no mouth, and he never
> speaks, never shouts and never roars. The camera is absolutely locked, no zoom, no pan, his full
> body always fully in frame, he is the ONLY figure in frame at all times, nothing else added, and
> nothing is ever picked up off the ground. He begins and ends on the EXACT same reference stance.
> 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. FIVE literals above are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, FOLLOWING LICH AND JIN, NOT RAIJU. The
KO-SUFFIX RULE strips any sentence matching `keeps the ... never drops or swaps`; this character
must NOT drop his weapon on the way down — a powered-down machine's hand stays closed — so the lock
is phrased "stays gripped in his own REAR hand ... never released, never let go, never exchanged",
which (i) does not match the strip, (ii) stays TRUE through a prone collapse, and (iii) sits in its
own sentence so no strip can take the identity lock as collateral. Build the ko and confirm both the
identity sentence and the grip sentence are still in it.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET — never TOES, never
CLAW-FOOT — because the ko rewrite matches that exact literal. Spell it any other way and a prone
collapse ships with its feet ordered flat.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`,
so the ko rewrite rescopes it to WHILE HE IS ON HIS FEET. It appears exactly once.

(d) THE DEBRIS TAIL IS THE STANDING FORM, ending "exactly as the first frame does." The builder
rewrites that tail for `ko` only. NEVER copy a built ko's tail back into the shared block — that
exact defect shipped in seven kits. Check per kit: build BOTH `idle` and `ko` and confirm `idle`
ends "...exactly as the first frame does." while `ko` ends "...anywhere in the shot."

(e) THE WEAPON-MOTION LAW IS THREE TIP BOUNDS PLUS THE BENT-ELBOW RULE, AND THE ACTING LINES DO NOT
RESTATE THE LATERAL BOUNDS. The ceiling bound (one helmet-height above the tip's reference height)
equals the real geometry of a full vertical pass with the grip at his chest — see rule 1 of the
budget block — so the chop and the heave arcs are legal without any per-line lateral caveats. There
is deliberately NO "never raised overhead" clause: the over-the-shoulder pass IS his kit, and the
tip ceiling is the law that contains it. There is also NO ban on the tip sitting behind him — its
reference seat already points up-back — only on moving the cleaver across to his other shoulder.

FACING, judgement call: **PARTLY OPEN, NOT STRICT PROFILE — read at FULL SIZE, not off a contact
sheet.** Verdict and evidence: his HELMET points toward screen-right with the molten crack presented
on the near side, but the dome reads three-quarter, not edge-on; his CHEST is decisively open — BOTH
pauldrons show as separate armoured volumes and the scuffed off-white panel presents its face to
camera; BOTH arms are fully visible at once (rear hand on the handle in front of his chest, leading
arm raised), impossible in true profile; his HIPS and LEGS are open — both thighs present their
plate faces, and BOTH feet show their tops (the rear boot turned out toward the viewer, the leading
claw-foot presenting its instep and all three toes). So NO line in this file orders "strict side
profile" — every line says "his body angled toward screen-right exactly as it is in the reference
image", and the shared block bans the turn in BOTH directions. It is NOT the frontal-plate blocker
class: his helmet, his raised hand, his leading claw-foot and every line of attack all commit toward
screen-right.

HANDS: he is ONE-HANDED on the weapon. The REAR hand never leaves the handle in any state including
ko. The LEADING claw hand touches the cleaver in exactly ONE beat in the whole kit — the
attack_throw brace under the spine — and in every other state it never touches the weapon.

THROWS ARE SOLO-SAFE BY CONSTRUCTION: nothing is ever seized, grabbed, gripped, hooked or held in
either throw — the leading hand stays OPEN with its fingers spread in both, or braces his OWN blade,
and both acting lines carry "NO opponent, no second figure, no body being thrown" as a second guard.

ACTION add-on (every state except idle):
It is ONE single action and nothing else: he does NOT spin, does NOT turn, does NOT repeat the move,
his back NEVER faces the camera, and he keeps facing the SAME direction the entire clip.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN TORN-UP SCRAP DEBRIS the green stays completely empty and unbroken; the ONLY
things visible are HIS OWN body, his scrap cleaver and HIS OWN debris. Every piece of debris is
SOLID MATERIAL - real chips, splinters, flakes and chunks of torn grey junk-steel and rust-brown
scrap-grit ripped up off the yard floor, opaque, jagged-edged, matte, lit like old iron, and NEVER
green - never a glow, never a spark of light, never an ember, never a flame, never a wisp, never
mist, smoke or steam, and never a whole intact object: no tyre, no barrel, no pipe, no cog, no car
part and no pile of junk ever appears anywhere in the shot. NOTHING anywhere in the shot ever lights
up, flashes or crackles - the only glow anywhere is the molten-orange crack already on his helmet in
the reference image, and it never grows, never brightens and never spreads. All of it is knocked
UPWARD and stays low and close to him, rising no higher than his own knee and spreading no wider
than HIS OWN STANDING FOOTPRINT in the reference stance - never past his leading foot toward
screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing
in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the
left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW
HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a heavy dead-still machine guard, weight sunk and even over both planted
feet, the scrap cleaver resting shouldered at the exact angle it has in the reference and his rear
hand closed on the wrapped handle. He does not breathe - instead ONE full slow mechanical SETTLING
of his whole frame fills the first half of the clip and a second fills the second half: on each one
his whole weight sinks a fraction STRAIGHT DOWN through BOTH of his planted feet at once and rises again, and it NEVER transfers from one to the other while the pistons at
his waist and knees compress a fraction and re-extend, his pauldrons ride up a fraction and settle,
his helmet dips a touch toward screen-right the way a scrapper sizes up a load and lifts again, his
rear hand hitches the shouldered cleaver a thumb's width up off the pauldron and re-seats it with a
small dead-metal settle - the blade holding its exact reference angle throughout - and the long
articulated fingers of his raised claw hand curl inward one after another in one slow beckoning rake
and spread back open into their exact reference curl. His feet never move from their spots. Silent,
patient, taunting. Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle
motion.

## attack_strike  (guillotine drop, a clean chop through air)
STRIKE (guillotine drop): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER OF THE CLIP he loads: his
knees fold a short way, his weight banks back over the rear boot, his rear hand lifts the cleaver
just clear of the pauldron, and his raised claw hand pulls in against his chest out of the blade's
path, fingers still spread. Then he UNSHOULDERS it in one committed chop: the blade sweeps
forward-and-over in a TIGHT bent-elbow arc close over his own helmet - the tip climbing no more than
one of his own helmet-heights above where it sits in the reference image as it passes - and falls
hard DOWN in front of him in the vertical plane of his own leading shoulder, his gripping hand
dropping to his own waist and pulling IN toward his hip as the blade falls, his whole mass sinking
behind it, until the squared tip stops a hand's width above the floor just beside his own leading
foot's toes. It is a clean cut through EMPTY AIR: the blade never touches the ground and nothing
sheds off the blade. As his mass lands, the rear boot grinds hard DOWN into the yard floor and kicks
EXACTLY THREE grains of rust-brown scrap-grit UP off the floor beside that boot, each grain no
bigger than one of his own claw-toes, rising no higher than his own ankle and spreading no wider
than his own standing footprint - never past his leading foot toward screen-right and never past his
rear heel toward screen-left - every grain crumbling away to nothing in mid-air as it falls. THE
CHOP HAS LANDED BY THE HALFWAY POINT OF THE CLIP; he HOLDS the sunk finish through the third
quarter, blade low and dead-still, shoulders heavy over it, the last grains crumbling away; and only
in the final second does he heave the cleaver back up over the same tight path into its EXACT
reference seat on his rear shoulder and rise into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. Heavy,
mechanical, final.

## attack_strike_b  (sawtooth rip, the low draw-cut)
STRIKE B (sawtooth rip): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER he rolls the cleaver
forward off his rear shoulder and brings it DOWN across the front of his body into a low STEEP carry
- gripping hand at his own waist, the blade angled hard down-forward so its squared tip hangs just
above the floor inside the line of his own leading foot's toes, the row of jagged SAWTEETH turned
back toward his own rear boot - while his knees sink and his raised claw hand pulls back against his
chest, fingers spread. THEN AT THE THIRTY PERCENT MARK he RIPS it: one short savage saw-stroke, the
whole blade dragged IN toward his own rear boot, teeth leading, the tip staying low and travelling
toward screen-LEFT until the handle is beside his own rear hip - the stroke stays in front of his
own body, the tip never swings behind him, and it is a clean draw-cut through EMPTY AIR at shin
height: the teeth never touch the floor, nothing sheds and nothing breaks. THE RIP IS COMPLETE BY
THE HALFWAY POINT; he HOLDS the low coiled finish through the third quarter, blade low across his
front, arms hard, pistons settling; and only in the final second does he heave the cleaver back up
over the same path into its EXACT reference seat on his rear shoulder and rise into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Low, grinding, vicious.

## attack_throw  (scrap-heave, over-the-shoulder toss mime, solo-safe)
THROW (scrap-heave): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image; IN THE FIRST THIRD he tips the cleaver forward off his rear
shoulder into a low STEEP carry in front of his own thighs - gripping hand at his own waist, the
broad FLAT of the blade turned to face UP like a loading shovel, the squared tip down-forward
hanging just above the floor inside the line of his own leading foot's toes - and brings his LEADING
claw hand across to brace flat UNDER the blade's spine near the heel: this is the one beat where
that hand touches the weapon. The flat of the blade carries NOTHING but EMPTY AIR - there is NO
opponent, no second figure, no body being thrown, and nothing whatsoever rests on, rides above or
appears near the blade at any time. THEN he HEAVES: both arms and his whole trunk drive the cleaver
UP and BACK in one committed bent-elbow arc close over his own helmet - a toss over the shoulder
with NOTHING in it, nothing visible ever leaving the blade and nothing ever appearing behind him -
his hips extending, knee pistons driving, his weight surging from leading foot to rear boot without
either foot leaving its spot, and the blade lands back in its EXACT reference seat on his rear
pauldron BY THE SIXTY PERCENT MARK. His leading claw hand leaves the spine as the blade seats and
swings back OUT to its raised open reference curl by the seventy percent mark. He HOLDS the finished
stance for the rest of the clip, pistons settling, pauldrons riding down, so that he is already
standing completely still in the EXACT same reference stance well before the clip ends. Nothing
sheds and nothing breaks. Grounded, crushing, dismissive.

## attack_throw_b  (king's dismissal, open-hand spike, solo-safe)
THROW B (king's dismissal): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; the cleaver takes NO part in this beat - it
stays seated on his rear shoulder, riding his body only, never rotating, never rising, his rear hand
closed on the handle throughout. IN THE FIRST QUARTER his raised claw hand sweeps UP to the crown of
his own helmet and NO higher, elbow high, the long fingers SPREAD WIDE OPEN - there is nothing in
that hand, NO opponent, no second figure, no body being thrown, and nothing whatsoever appears in
the air around it. THEN he SPIKES it: the open hand whips DOWN and across the front of his chest in
one violent overhand arc, the palm driving down until it finishes just beside his own LEADING KNEE,
fingers still spread open every single frame and never closing on anything - his shoulders and whole
trunk folding hard down behind the arm, knees sinking deep, waist pistons compressing, his helmet
dropping with the drive. THE SPIKE BOTTOMS OUT BY THE FORTY PERCENT MARK; he HOLDS the folded finish
through the third quarter, arm down and rigid, frame low; and only in the final second does he rise
and let the arm swing back UP into its raised open reference curl, into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Nothing sheds and nothing breaks. Fast, scornful, final.

## attack_block  (junk-wall brace)
BLOCK-COUNTER (junk-wall brace): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER he hauls the handle
forward and DOWN a short way so the cleaver slides off the top of his rear pauldron and stands
SLANTED across the front of his body as a wall of layered junk steel - the heel down in front of his
own leading hip, the squared tip up-back level with his own helmet and NO higher than the tip sits
in the reference image, the broad flat facing toward screen-right - while his knees sink, his weight
drops straight down behind the plate, his helmet tucks in behind the blade's spine and his free claw
hand pulls back against his chest, fingers spread, never touching the blade. HE HOLDS THAT WALL
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure - both feet grind a fraction on
their spots without either one leaving it, his forearm judders, the blade wall shivers under load
but holds its slant and never rises, his pauldrons rattle and the cables at his waist tremble. IN
THE FINAL QUARTER he drives one short hard SHOVE of the whole wall a hand's width toward
screen-right out of his knees, then heaves the cleaver back up onto its EXACT reference seat on his
rear shoulder and flows back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing breaks.
Braced, immovable, silent.

## attack_block_b  (pauldron bunker)
BLOCK-COUNTER B (pauldron bunker): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; the cleaver takes NO part - it stays seated on
his rear shoulder, dead-still at its reference angle, his rear hand closed on the handle throughout.
IN THE FIRST QUARTER he turtles: his helmet drops toward his chest, his LEADING pauldron rolls up
and forward to meet the pressure, his free claw forearm snaps up as a horizontal bar across the
front of his own collar - hand OPEN, fingers spread, never rising above the crown of his own helmet
- and his weight banks back over the rear boot, knees bent and loaded. HE HOLDS THAT BUNKER THROUGH
THE WHOLE MIDDLE HALF OF THE CLIP - both feet grind a fraction on their spots without leaving them,
his neck and shoulders shudder under the load, the chest plates judder, and the shouldered cleaver
rides the shudder without ever rising or swinging - a machine bolted to the spot. IN THE FINAL
QUARTER he drives one short heavy SHOULDER-SHOVE up and toward screen-right out of his knees, the
pauldron leading and his crown rising no higher than it sits in the reference image, then settles
back, the forearm dropping and the claw hand opening back OUT into its raised reference curl, into
the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Nothing sheds and nothing breaks. Compact, braced, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, his body angled toward screen-right exactly
as it is in the reference image; his helmet and both pauldrons snap back and toward screen-LEFT, his
spine folds and his knees buckle under his own weight - but BOTH FEET STAY EXACTLY WHERE THEY STAND,
he does not step back and he does not skid, and every bit of the recoil is absorbed in his knees,
hips and trunk instead. His rear hand clamps harder on the handle and the shouldered cleaver is
jolted straight DOWN with his body, holding its exact reference angle the whole way - it never
rotates, never swings and never rises - while his raised claw arm flails once up and back at its own
shoulder height, fingers splaying wide. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he
rides it off balance through the middle of the clip - weight rolled back over the rear boot, waist
pistons compressing hard, chest plates rattling, cables whipping lightly against his legs. IN THE
LAST THIRD he catches it, straightens up out of his knees and flows in one eased recovery back into
the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. His chest and helmet lead the recoil; his back is never shown.
Nothing sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses
or appears in the frame at any time, and there is no new light, no flare, no wisp and no streak
anywhere in the shot. Only his own body and his own weapon move.

## ko  (systems-down collapse, ends on ground)
KO (systems-down collapse): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST THIRD OF THE CLIP the strength
goes out of the machine - his helmet drops, his pauldrons slump, the pistons at his knees and waist
give way in two heavy jolts, and he goes STRAIGHT DOWN onto both knees on the spot he stands on
without travelling forward, his legs folding and staying tucked beneath him. Then he pitches forward
and down over his own thighs and FOLDS, his arms folding beneath him with his rear hand still closed
on the wrapped handle, and BY THE HALFWAY POINT he has come to rest fully prone and compact, folded
heavily over his own knees with his helmet lying low beside his own leading knee, still turned
toward screen-right. His rear hand never opens: the cleaver comes down WITH him and comes to rest
lying at a shallow slant across his own fallen back, its squared tip toward upper screen-LEFT and
its heel still in his gripping hand beneath his chest, so that BOTH ends of the blade finish NEARER
his own fallen body than they sit in the reference image and neither of them is anywhere near an
edge of the frame. ONE thin scuff of rust-brown scrap-grit is knocked UPWARD off the floor where his
knees come down, the grains no bigger than one of his own claw-toes, rising no higher than his own
fallen shoulder and staying within one body-width of where he lands, every grain crumbling away to
nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he
does not stir, does not lift his helmet, does not push up on an arm and he does NOT get back up -
and the fallen cleaver lies exactly where it came to rest and does not move again. He is ALONE in an
empty frame - nothing whatsoever enters, crosses or appears in the frame at any time. Only his own
body and his own weapon move.

## victory  (crown of the heap, no turn to camera)
VICTORY (crown of the heap): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image. IN THE FIRST QUARTER OF THE CLIP he plants his
weight down even over both feet and PRESSES the whole shouldered cleaver straight UP off his rear
pauldron by about the width of his own open hand - the blade holding its exact reference angle as it
lifts, his gripping arm locking it there like a hoisted trophy - while his chest rises and his
pauldrons square. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT HOIST and works his taunt: the
long articulated fingers of his raised claw hand curl inward one after another in ONE slow
deliberate beckoning rake - the exact gesture of his reference pose made huge and unhurried - and
spread back open, his helmet dips once in a short victor's nod and lifts back no higher than it sits
in the reference image, and his weight rolls once from rear boot to leading claw-foot and back while
the waist pistons breathe. His feet, hips and shoulders stay where they are: he does not step, does
not pivot, does not lift either foot and does not turn his helmet or his body toward the camera at
any point. IN THE FINAL QUARTER he lets the cleaver settle back DOWN into its EXACT reference seat
on his rear pauldron and eases into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing breaks.
Still, towering, crowned.

## special_1  (SCRAPFALL) — the guillotine drop committed into the yard floor
SPECIAL FINISHER (scrapfall): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER he coils his whole
machine mass back and DOWN over the rear boot - knees folding, waist pistons compressing, his rear
hand lifting the cleaver just clear of the pauldron, his raised claw hand pulling in against his
chest with fingers spread. Then he releases all of it at once: the blade sweeps forward-and-over in
one TIGHT bent-elbow arc close over his own helmet - the tip climbing no more than one of his own
helmet-heights above where it sits in the reference image as it passes - and comes down like a
dropped guillotine, his gripping hand driving to his own waist and pulling IN toward his hip, his
entire mass slamming down into a deep sunk stance behind the fall, and the squared TIP BITES INTO
the yard floor just inside the line of his own leading foot's toes. THE BITE LANDS AT THE FORTY
PERCENT MARK: EXACTLY FIVE splinters of torn grey junk-steel burst UPWARD from the bite point, each
splinter no bigger than one of his own articulated fingers, rising no higher than his own knee and
spreading no wider than his own standing footprint - never past his leading foot toward screen-right
and never past his rear heel toward screen-left - every splinter crumbling away to nothing in
mid-air as it falls. The debris is SOLID TORN SCRAP: opaque, jagged-edged, matte and lit like old
iron - never a glow, never a spark of light, never an ember, never a wisp. HE HOLDS THE DEEP SUNK
STANCE THROUGH THE WHOLE THIRD QUARTER, the blade standing planted in the floor with his weight
leaning down onto the handle, shoulders heaving, the last splinters crumbling away; and only in the
final second does he draw the tip back up out of the floor, heave the cleaver up over the same tight
path into its EXACT reference seat on his rear shoulder and rise into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Executioner-heavy, vertical, final.

## special_2  (SAWTOOTH TITHE) — the saw set into the floor and ripped back toward his rear heel
SPECIAL FINISHER (sawtooth tithe): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER he rolls the cleaver
forward off his rear shoulder into the low STEEP carry - gripping hand at his own waist, the blade
angled hard down-forward, the sawteeth turned back toward his own rear boot - and sinks his knees
until the squared tip rests just above the floor inside the line of his own leading foot's toes, his
raised claw hand pulling back against his chest with fingers spread. AT THE THIRTY PERCENT MARK he
SETS the row of jagged SAWTEETH down INTO the yard floor just inside his own leading foot and RIPS
the blade back IN toward his own rear heel in one short savage saw-stroke toward screen-LEFT - the
teeth tearing a shallow furrow through the scrap, his whole trunk hauling behind the pull, the
stroke staying inside his own standing footprint and stopping well short of that rear heel. BY THE
HALFWAY POINT the stroke is done and EXACTLY SIX chips of rust-brown scrap and torn grey junk-steel
have been ripped UPWARD out of the furrow behind the teeth, each chip no bigger than one of his own
articulated fingers, rising no higher than his own knee and spreading no wider than his own standing
footprint - never past his leading foot toward screen-right and never past his rear heel toward
screen-left - every chip crumbling away to nothing in mid-air as it falls. The debris is SOLID TORN
SCRAP: opaque, jagged-edged, matte and lit like old iron - never a glow, never a spark of light,
never an ember, never a wisp. HE HOLDS THE LOW FINISHED STROKE THROUGH THE WHOLE THIRD QUARTER,
teeth still down in the end of the furrow, arms rigid, frame coiled low, the last chips crumbling
away; and only in the final second does he lift the teeth up out of the furrow, heave the cleaver
back up into its EXACT reference seat on his rear shoulder and rise into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Low, tearing, final.

## special_3  (PISTON QUAKE) — the hydraulic compression that cracks the floor under his own feet
SPECIAL FINISHER (piston quake): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; the cleaver takes NO part beyond riding his
body - it stays seated on his rear shoulder at its exact reference angle the entire clip, never
rotating, never swinging, never rising, his rear hand closed on the handle throughout. IN THE FIRST
QUARTER he COILS: his whole machine mass drops into a deep hydraulic crouch over both planted feet -
knee pistons folding hard, waist pistons compressing visibly, helmet dropping between the pauldrons,
back rounding over - and his raised claw hand closes finger by finger into a crushing FIST at his
own chest height. HE HOLDS THAT LOADED CROUCH FROM THE END OF THE FIRST QUARTER TO THE SIXTY-FIVE
PERCENT MARK, bearing down harder the whole time and never striking at all: his thighs and shoulders
shudder under the load, the chest plates rattle, the cables at his legs tremble, and THE DAMAGE
COMES FROM HIS OWN FEET - the three dark-iron toes of his leading claw-foot and the edge of his rear
boot GRIND DOWN into the yard floor without either foot ever leaving the spot it stands on, and the
floor gives way under them in stages: EXACTLY SIX chunks of compacted rust-brown scrap-grit break
loose in ones and twos spread across the length of the hold, each chunk no bigger than one of his
own clenched fists, knocked UPWARD to no higher than his own knee and spreading no wider than his
own standing footprint - never past his leading foot toward screen-right and never past his rear
heel toward screen-left - every chunk crumbling away to nothing in mid-air as it falls. The debris
is SOLID COMPACTED SCRAP: opaque, chunky, matte and lit like old iron - never a glow, never a spark
of light, never an ember, never a wisp. AT THE SIXTY-FIVE PERCENT MARK the crouch BOTTOMS OUT in one
final short heavy drop, the whole frame jolting down a hand's width, the shouldered cleaver riding
down with him and taking no other part. THE WHOLE FINAL QUARTER is his slow controlled rise back to
full height, the claw hand spreading finger by finger back open into its raised reference curl, his
weight easing up without either foot lifting, into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. Coiled, seismic,
final.
