# IR-08 BONEPIPE GRUNT — XGundam roster. Full 13-clip kit. Written 2026-07-31.

Generated OFF THE PADDED PLATE `qa-boss/anchors/xg/ir08-bonepipe-grunt-anchor-green.png`, read at
FULL SIZE before anything was written. The frame budget below is the caller's measurement and is
authoritative; every pixel position in the rules is this author's read off the full-size render,
good to about ±15px. He is WIDER THAN HE IS TALL (1115w x 1022h) on the tightest lateral margins in
the set (210/211px) — but he is only MILDLY prop-extended: his body mass is ~830px of the width and
the mace overhangs his leading fist by only ~285px, the INVERSE of oni-tetsubo's ratio (body 401 /
prop 622). Both of his safe move families — the down-and-in mace rotation about his own fixed fist,
and the pre-cocked piston punch whose full extension stays ~175px INSIDE the x his mace tip already
owns — NARROW him or cost zero span. VERDICT: KIT WRITTEN; no re-plate needed on geometry, and no
BLOCKED marker on purpose. He faces SCREEN-RIGHT natively, PARTLY OPEN 3/4 (evidence in the facing
note under the shared blocks) — no line in this file orders strict side profile. Two FIRST-CLIP
watch items, neither a writing blocker: the olive-drab-on-green key margin (rule 9) and the
chain-bead keying (rule 7).

## ★ IR-08 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1115w x 1022h** (fills 66.5% of frame height).
  LEFT **210px** · RIGHT **211px** · HEADROOM **490px** · bottom free (boot soles on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **1.38x**.

**WHO OWNS EACH EDGE (author's read off the render, ±15px):**
  · **LEFT x210** — his REAR BOOT HEEL on the floor line. The cocked rear elbow reaches only ~x350;
    the heel, not the arm, is the left-edge owner.
  · **RIGHT x1324** — the mace's TERMINAL SPIKE, carried LOW, at about (1320, 1400).
  · **TOP y490** — the crown of his domed helmet, at about x780.
  · **BODY vs PROP SPLIT:** body mass including the chain-wrapped leading fist spans x210..~x1040 ≈
    **830px**; the mace overhangs that fist by **~285px** to x1324. Roughly 75% body / 25% prop.
  · **MACE LEVER:** from the leading fist at ~(1030, 1250) to the terminal spike ≈ **330px** at
    ~27 degrees below horizontal.

  1. **THE LEADING FIST IS THE FULCRUM AND IT NEVER TRAVELS RIGHT OR UP.** The mace only ever turns
     about that fist, twists about its own haft axis, or rides down and up with his body. The fist's
     own travel is what would carry the tip off frame (+200px of fist travel toward screen-right puts
     the tip past the edge), so the law block caps the fist at its reference x and its reference
     height. DOWN and IN are its only free directions — and the bottom edge is free.
  2. **DOWN-AND-IN IS PRIVILEGED; THE RISE IS BANNED.** Rotating the head down-in about the fixed
     fist, the tip meets the stone at ~x1227 — ~95px INSIDE its own reference x — so the bite NARROWS
     him (the lich deep-reap class). Rotating the head UP toward horizontal pushes the tip to ~x1360,
     PAST its reference x mid-arc; a rigid tip crossing its own bound mid-beat is a beat-vs-bound
     fight, so NO beat in this kit raises the head past its reference hang, and the law block bans
     the rise past reference while leaving the recovery turn (stone back up to the reference hang)
     legal — three beats need that return.
  3. **THE PISTON FIST IS LATERALLY FREE.** Cocked at ~(600, 620); a full straight extension reaches
     ~x1150 at shoulder height — still ~175px INSIDE the x the mace tip already owns — so a straight
     punch adds ZERO lateral span. Capped anyway at the mace tip's reference x and at helmet-dome
     height, and thrown BY THE ARM ALONE so the shoulder line never squares to camera.
  4. **WIND-UPS ARE BANNED BY GEOMETRY, AND THE PLATE PRE-LOADS EVERY BEAT.** 210/211px is the
     tightest lateral budget in the roster, and the anchor already banks the wind-up: the fist is
     cocked, the mace already hangs low. Every beat in this file is a straight thrust, a plant, a
     drop, a brace, or an in-place rotation about his own grip — no overhead raise, no backswing, no
     sweep, no lunge, no step. Proven on oni-tetsubo: the wind-up is part of the beat, and it is
     where containment dies.
  5. **HEADROOM 490px IS THE ONE ROOMY DIRECTION AND NOTHING USES IT.** The rise ban (rule 2) makes
     it moot; nothing in the kit goes above his own helmet dome.
  6. **SPAN: 1.38x.** The plate's own cap (1.38x) is SMALLER than the roster cap (1.60x) and the
     smaller wins: 1115 x 1.38 ≈ the full 1536 frame. Nothing here steps, lunges or reaches, so
     nothing approaches it.
  7. **THE CHAIN IS THE ONE NON-RIGID PART:** coils wound around the leading vambrace plus ONE slack
     hanging loop attached to the vambrace at both of its ends. It swings and it lags; it is bounded
     WITH the vambrace in every clause, never separately. WATCH (first-clip check, lich precedent):
     open chain links key as separated beads — inspect the FIRST keyed clip for a speckled or
     dropped chain before the other twelve are fired.
  8. **BAKED EMISSIVE:** one small RED EYE-LIGHT in the visor slit, nothing else lit anywhere on
     him. The law block pins its SIZE, SHAPE and brightness and bans a SECOND light by name.
  9. **PLATE WATCH — OLIVE-DRAB ON GREEN.** His armor is desaturated grey-olive, the nearest hue to
     the key colour in this roster. `check-plate-key.mjs` was NOT run by this author — run it BEFORE
     the first fire, and inspect the first keyed clip for eaten panel highlights; if the keyer bites
     into the armor, this plate goes to Tim's magenta re-plate list. Every effect in this kit is
     grey stone, grey grit or dark rust ON PURPOSE — nothing green is ever added to the shot.
 10. **HE IS A MECH WITH NO GUN.** Rule §0A: no beat fires, launches or throws anything; both fists
     stay attached to his arms (the rocket-punch trope is banned by name in the law block); and the
     "bonepipe" hose bundle is IDENTITY, not an effect source — venting steam is banned material, so
     the pipes flex and shiver but never vent.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME hulking heavy assault mech grunt from the reference image (a huge round-shouldered,
> wider-than-tall suit of matte scratched olive-grey steel power armor with riveted seams, round bolt
> fittings and darker gunmetal joints; a smooth domed HELMET set low between the shoulders, a single
> narrow dark VISOR SLIT across its face with one small RED EYE-LIGHT glowing at the near end of that
> slit, and a round bolt plate on the helmet's cheek; a massive barrel chest of layered curved plates
> over a segmented plate belly; a bundle of ribbed black HOSES looping from his backplate around his
> flank into his belly armor; his REAR arm - the arm on the screen-left side - held cocked back at
> shoulder height beside its huge rounded pauldron, elbow drawn behind, its heavy squared GAUNTLET
> FIST closed with segmented worn-brass knuckle plates, knuckles toward screen-right; his LEADING arm
> reaching down and forward, its forearm sheathed in a heavy vambrace WRAPPED IN COILS OF DARK STEEL
> CHAIN with one slack LOOP of that chain hanging down beneath the forearm, attached to the vambrace
> at both of its ends; and that LEADING gauntlet fist closed around the top of the haft of a short
> heavy MACE of dark weathered steel - a straight metal haft angling DOWN toward screen-right from
> his fist into a cylindrical head studded with rows of short pyramid SPIKES and one longer terminal
> SPIKE continuing straight off its end - the whole weapon carried LOW, its spiked head hanging down
> near the stone ahead of his leading boot; massive armored legs with plated thighs, a small
> rectangular access hatch on the rear thigh plate, round bolted knee cops, and heavy BLACK BOOTS
> with thick lugged tread soles, planted in a wide braced stance - rear leg stretched long back
> toward screen-left, leading leg forward and bent, both soles flat on the ground), standing on a
> solid saturated GREEN chroma screen (bright green #00b140, nothing pink or magenta in the
> BACKGROUND; the only light anywhere on him is the small red eye-glow in his visor slit).

Shared suffix (carries the prompt laws — every state inherits these):
> His domed helmet and visor slit, his scratched olive-grey plate armor with its riveted seams, the
> black ribbed hose bundle looped around his flank, the chain coils and the hanging chain loop on his
> leading vambrace, his worn-brass knuckle plates, his plated legs and heavy black lugged boots, and
> the whole dark steel spiked mace all stay EXACTLY the same the entire clip. The mace stays locked
> inside his LEADING gauntlet fist the entire clip - it is never released, never let go, never
> exchanged and never replaced by anything else, and that leading fist is closed on its haft in every
> single frame. The single small RED EYE-LIGHT in his visor slit stays EXACTLY the same SIZE, the
> same SHAPE and the same brightness it has in the reference image - it never grows, never flares,
> never blinks out and never throws light onto anything - and NO SECOND LIGHT ever appears anywhere
> in the shot; no glow, aura, beam, halo, ring of light, orb, fireball, flame, spark, wisp, mist,
> smoke, steam, exhaust or energy of any kind ever appears anywhere in the shot. He has no gun and
> nothing to throw: he never fires and never launches anything, NOTHING ever detaches from his body
> or his weapons and flies - no projectile, no bullet, no rocket, no shockwave - both gauntlet fists
> stay attached to his own arms at all times, the chain coils stay wrapped on his leading vambrace
> with the hanging loop attached to that vambrace at both of its ends, no link ever comes off the
> chain, no spike ever comes off the mace and no plate ever cracks off his armor. The mace stays
> FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame: his LEADING fist
> never travels further toward screen-right than it sits in the reference image and never rises above
> the height it has in the reference image, the mace's spiked HEAD and terminal SPIKE never travel
> further toward screen-right than the tip hangs in the reference image, and NO PART of the mace ever
> rises above the height his own LEADING ELBOW has in the reference image. His REAR fist never
> travels further toward screen-right than the mace's tip hangs in the reference image and never
> rises above the height of his own helmet dome in the reference image. While it is in his grip the
> mace is NEVER raised overhead, NEVER swung up past the angle and height it has in the reference
> image, NEVER thrust or reached out ahead of him toward screen-right and NEVER swung round so that
> its spiked HEAD passes behind him - it only ever turns DOWNWARD and INWARD a short way about his
> own leading fist and back up no further than its reference angle, twists in place about its own
> haft axis, or rides straight down and straight back up with his own body. HIS FEET STAY FLAT ON THE
> GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops, never steps and never lunges;
> he keeps his stance narrow and never spreads wider than about one and a quarter times his standing
> width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera,
> and his body holds the SAME angle to camera it has in the reference image - it never opens further
> toward the viewer and never turns away. His helmet stays sealed the entire clip - it never opens
> and nothing behind the visor ever shows - and he never talks, never shouts and never roars. The
> camera is absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY
> figure in frame at all times, nothing else added. He begins and ends on the EXACT same reference
> stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it crumbles to nothing in mid-air or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KNOCKED-UP STONE AND GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his mace, his chains and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, chunks and grains of split grey floor-stone and hard grey grit, opaque, sharp-edged, matte and lit like rock - never a glow, never a flame, never a spark of light, never a wisp, never mist, smoke, steam or a cloud of dust, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles - the only light in the shot is the small red eye-light his visor already has in the reference image, and it never changes. All of it is knocked UPWARD off the stone and stays low and close to him, rising no higher than his own KNEE, never travelling further toward screen-right than the mace's tip hangs in the reference image and never further toward screen-left than his own rear boot heel, and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor again and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT, SIZE AND SPAN, and that per-beat bound is the one to obey.

ACTION add-on (every state except idle - the one-shot lock):
He performs ONLY the action this prompt describes and performs it exactly ONCE, with exactly the blows, bites, cracks, thumps, shoves and settlings the acting line states and never one more - he never repeats the sequence from the top, never chains it into a combo, never speeds up into a flurry, and never adds an extra punch, an extra swing of the mace, an extra step, an extra turn or any flourish the acting line does not name. When the described action is complete he spends every remaining frame exactly where the acting line leaves him, completely still in that final pose.

NB, deliberately OUTSIDE the blockquotes and above the first state heading - operator notes, never
sent to the model. SIX literals above are load-bearing and must not be re-worded:

(a) THE WEAPON LOCK IS WRITTEN TO SURVIVE THE ko, FOLLOWING LICH AND JIN, NOT RAIJU. The builder's
ko rewrite strips any sentence matching "keeps the ... never drops or swaps"; this character must
NOT drop the mace (a mech fist stays closed), so the lock is phrased "stays locked inside his
LEADING gauntlet fist ... never released, never let go, never exchanged", which does not match the
strip, stays TRUE through a prone collapse, and sits in its own sentence so no strip can take the
identity lock as collateral.

(b) "HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP" is spelled with FEET, exactly - the ko
rewrite matches that literal and turns it into FEET NEVER LEAVE THE GROUND. Spell it any other way
and a prone collapse ships with its feet locked flat.

(c) The stance clause uses the canonical "he keeps his stance narrow and never spreads wider than",
so the ko rewrite rescopes it to WHILE HE IS ON HIS FEET. It is deliberately NOT pre-scoped here.

(d) The weapon-motion sentence is scoped "While it is in his grip" and deliberately carries NO
"never touches the ground" and NO "never flattens level with the ground" clause - strike_b,
special_1 and victory BITE or PLANT the head into the stone on purpose, and the ko ends with the
mace lying on the stone. The rise ban is "never up PAST its reference angle and height", not "never
up", because those same three beats must turn the head back UP to its reference hang to end on the
anchor. The leading-fist rightward/height caps are the real containment law (budget rule 1); the ko
keeps them true by folding that fist DOWN and IN, nearer his body.

(e) The debris tail is the STANDING form, sourced from the lich suffix (the passing exemplar), NEVER
from any assembled ko - per §5b the builder rewrites the ko tail on its own. VERIFY per kit: build
BOTH idle and ko and confirm idle ends "...exactly as the first frame does." while ko ends
"...anywhere in the shot." This author could not run node; that check belongs to the caller.

(f) DEBRIS SOURCES ARE CONTINUOUS SURFACES ONLY - split grey floor-stone, boot-ground grit, and dry
surface rust off the chain links (throw_b) - so nothing countable ever depletes: the chain loses no
links, the mace loses no spikes, the armor loses no plates, and the law block says so by name.

FACING, judgement call - PARTLY OPEN 3/4 toward screen-right, read at FULL SIZE. Evidence: the visor
slit wraps around the near cheek of the dome with the red eye-light visible at its near end (a true
profile shows a slit edge-on); BOTH shoulder volumes read separately (huge rounded rear pauldron on
screen-left, layered near shoulder on screen-right); the chest carapace presents its riveted front
seams at an angle to camera; the hose bundle wraps his flank toward the viewer; and the decisive
foot test - BOTH boot tops/insteps are visible in the wide brace, impossible in strict profile. So
no line in this file orders "strict side profile"; every line says "his body angled to camera
exactly as in the reference image and facing screen-right", and the law block bans the turn in both
directions. His helmet, his mace, his knuckles and his leading boot all commit toward screen-right,
so this is NOT the frontal-plate blocker class.

ARM NAMING IS SCREEN-RELATIVE ON PURPOSE. In a 3/4 view, anatomical left/right invites a mirror
error, so the prefix pins each weapon to a screen-relative arm: the REAR arm (screen-left) is the
cocked piston fist; the LEADING arm carries the chain-wrapped vambrace and the mace. Every acting
line uses those two names and no others.

## idle
IDLE COMBAT-READY LOOP: a dead-still machine guard, his weight sunk and even over both planted
boots, the mace hanging LOW ahead of him at the exact angle it has in the reference and his REAR
fist held cocked beside the pauldron. He does not breathe - instead ONE full slow SETTLING of his
whole armored mass fills the first half of the clip and a second fills the second half, and EVERY
PART of that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each one his whole
weight sinks a fraction STRAIGHT DOWN through BOTH boots at once and rises again - his weight NEVER
transfers from one boot to the other and neither boot ever carries more of it than the other - his
barrel chest eases down and up as though the suit relaxes a notch, his domed helmet lowers a
fraction STRAIGHT DOWN and rises again without ever turning left or right, and the ribbed hose
bundle at his flank flexes with it. Once in each half, the fingers of his LEADING gauntlet re-close
on the mace haft one plate at a time in a slow mechanical ripple, and the mace rides DOWN with the
settling a finger's width and back up, holding the exact angle it has in the reference the whole
time, its spiked head never leaving its low hang; the hanging chain loop under his vambrace sways
faintly with each settling and comes still again. His REAR fist stays cocked beside the pauldron and
does not travel. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS STAY EXACTLY AS THEY ARE
IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far
shoulder never swings round, and his chest never squares up toward the camera. Nothing sheds and
nothing breaks. Feet planted, silent, patient. Returns to the exact start pose so it loops
seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (piston jab, fired from the cocked fist)
STRIKE A (piston jab): he begins in the EXACT reference stance, his body angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he sinks his whole mass a short
way STRAIGHT DOWN through both planted boots, knees folding, and FIRES the already-cocked REAR fist
STRAIGHT forward toward screen-right at its own shoulder height in one committed piston stroke - the
arm alone slides straight out like a ram, dead level, no wind-up and no backswing, and THE LINE OF
HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS STAY EXACTLY AS THEY ARE IN THE REFERENCE IMAGE while
it travels. The fist punches through EMPTY AIR - there is NO opponent, NO target and no second
figure, and nothing whatsoever appears in front of his knuckles at any time - and it never travels
further toward screen-right than the mace's TIP hangs in the reference image and never rises above
its own shoulder height. His LEADING fist and the whole mace stay dead-still at the exact angle and
height they have in the reference, taking no part. As the stroke reaches full extension his leading
boot grinds hard down into the stone and EXACTLY THREE grains of hard grey grit are knocked UPWARD
beside that boot, each grain no bigger than one link of his own chain, rising no higher than his own
knee and spreading no wider than his own standing footprint - never past his leading boot toe toward
screen-right, never past his rear boot heel toward screen-left - every grain crumbling away to
nothing in mid-air as it falls. THE STROKE IS AT FULL EXTENSION BY THE ONE-THIRD MARK and he HOLDS
it there, locked and level, until just past the halfway point; then the piston RETRACTS along the
exact same straight line at the same speed, the fist re-cocking beside the pauldron by the
three-quarter mark, and the final quarter is his slow settle back up into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Mechanical, straight-line, brutal.

## attack_strike_b  (mace bite, the head turned down into the stone)
STRIKE B (mace bite): he begins in the EXACT reference stance, his body angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER his LEADING wrist TURNS the
mace a short way about his own leading fist - the fist itself stays exactly where it sits in the
reference - swinging the spiked HEAD DOWN and IN toward his own leading boot with no wind-up, no
raise and no backswing, while his whole mass folds DOWN behind it, knees bending deep and chest
driving down over his leading knee; BY THE FORTY PERCENT MARK the spiked head BITES into the
flagstone directly beneath where it hangs in the reference image, a short way ahead of his own
leading boot. EXACTLY THREE chips of split grey floor-stone are knocked UPWARD off the bite point,
each chip no bigger than one SPIKE of his own mace head, rising straight up no higher than his own
knee, never travelling further toward screen-right than the mace's tip hangs in the reference image
and never further toward screen-left than his own leading boot, every chip crumbling away to nothing
in mid-air as it falls. His REAR fist stays cocked beside the pauldron and does not travel, and the
hanging chain loop swings once against his vambrace and stills. HE HOLDS the sunk stance with the
head resting in the stone through the third quarter of the clip, his armored shoulders heaving and
the hose bundle flexing, while the last chips crumble away; only in the final second does the wrist
turn the head back UP off the stone to the EXACT angle and height the mace has in the reference
image and his mass rise back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Short, heavy, final.

## attack_throw A  (press-down bar, solo-safe)
THROW A (press-down bar): he begins in the EXACT reference stance, his body angled to camera exactly
as in the reference image and facing screen-right; IN THE FIRST THIRD his REAR forearm swings IN and
DOWN from beside the pauldron until it lies as a level horizontal BAR in the empty air in front of
his own chest plates - moving toward his own body the whole way, its fist never reaching further
toward screen-right than his own leading shoulder - and that air is EMPTY: there is NO opponent, no
second figure, no body being thrown, and nothing whatsoever appears above, under or in front of that
forearm at any time. THE BAR IS SET BY THE END OF THE FIRST THIRD; then he WRENCHES the whole
forearm bar STRAIGHT DOWN in one committed drive to his own knee height, hips folding deep, his
entire armored mass dropping behind it, and THE DRIVE HAS BOTTOMED OUT BY THE HALFWAY POINT. Under
that drop both boots grind hard into the stone and EXACTLY FOUR grains of hard grey grit are knocked
UPWARD between his own two boots, each grain no bigger than one link of his own chain, rising no
higher than his own knee and spreading no wider than his own standing footprint - never past his
leading boot toe toward screen-right, never past his rear boot heel toward screen-left - every grain
crumbling away to nothing in mid-air as it falls. His LEADING fist and the mace ride straight down a
short way with his sinking body, holding the exact angle they have in the reference, and THE LINE OF
HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS STAY EXACTLY AS THEY ARE IN THE REFERENCE IMAGE
throughout. He HOLDS the low finish through the third quarter while the last grains crumble away; in
the final quarter the rear forearm swings back UP and OUT to its exact cocked position beside the
pauldron and he rises into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Grounded, crushing, silent.

## attack_throw_b  (chain crack-down, solo-safe)
THROW B (chain crack-down): he begins in the EXACT reference stance, his body angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST THIRD he drops his hips and
WRENCHES his LEADING forearm - vambrace, chain coils, mace fist and all - one hand's width STRAIGHT
DOWN and IN toward his own belt, so the slack chain LOOP hanging under that vambrace snaps out and
whips TAUT downward; BY THE FORTY-FIVE PERCENT MARK the lowest links of that loop CRACK against the
flagstone just inside his own leading boot. The chain catches nothing, hooks nothing and drags
nothing - it strikes bare stone through EMPTY AIR, with NO opponent, no second figure and no body
being thrown anywhere in the shot - and the loop stays attached to his vambrace at both of its ends
the entire clip. The mace rides down with that fist at the exact angle it has in the reference, its
terminal spike dipping to just above the stone and never touching it, never travelling toward
screen-right at all. EXACTLY FOUR flakes of dry dark rust are knocked UPWARD off the chain links as
they crack the stone, each flake no bigger than one link of his own chain, rising no higher than his
own knee and spreading no wider than his own standing footprint - never past his leading boot toe
toward screen-right, never past his rear boot heel toward screen-left - every flake crumbling away
to nothing in mid-air as it falls. His REAR fist stays cocked beside the pauldron and does not
travel. He HOLDS the low wrenched finish through the third quarter, the chain loop swinging itself
still against the vambrace while the last flakes crumble away; in the final quarter the leading
forearm rises the same hand's width back and the loop settles into its exact reference hang, and he
rises into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Snapping, rooted, savage.

## attack_block A  (forearm wall)
BLOCK-COUNTER A (forearm wall): he begins in the EXACT reference stance, his body angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER his REAR forearm
swings IN and UP a short way until it stands as a vertical BAR in front of his own chest and visor -
its fist rising no higher than his own helmet dome and never reaching further toward screen-right
than his own leading shoulder - its elbow tucking down against his own chest plates, while his whole
mass sinks a stage STRAIGHT DOWN into the wide stance, knees taking the load. HE HOLDS THAT WALL
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs pressure from ahead: both boots grind a
fraction on the stone without either one leaving the spot it stands on, the braced forearm SHAKES
under load without moving from its line, his shoulders judder, the hose bundle at his flank shivers
and the hanging chain loop trembles - but nothing visible strikes him, nothing appears in the frame,
and his LEADING fist and the whole mace hang LOW and dead-still at their exact reference angle,
taking no part. IN THE FINAL QUARTER he drives one short heavy shove STRAIGHT UP out of his knees
behind the braced forearm, rising only back to his own standing height and no further; then the rear
forearm swings back DOWN and OUT to its exact cocked position beside the pauldron and he settles
into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Nothing sheds and nothing breaks. Braced, immovable,
mechanical.

## attack_block_b  (hull-down guard)
BLOCK-COUNTER B (hull-down): he begins in the EXACT reference stance, his body angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER his whole armored
mass drops STRAIGHT DOWN into a deep hull-down crouch over both planted boots - knees folding hard,
his domed helmet tucking STRAIGHT DOWN between both risen shoulders, both shoulders shrugging
STRAIGHT UP around it - so that the rounded plates of his own shoulders and back become the shield;
his REAR fist stays cocked where it is, and his LEADING fist and the mace ride straight down with
the crouch, the spiked head sinking to just above the stone at its exact reference angle, never
touching it. HE HOLDS THAT HULL-DOWN CROUCH THROUGH THE WHOLE MIDDLE HALF OF THE CLIP, absorbing
pressure on the armor itself: the plates judder, the hose bundle flexes, the chain loop trembles
against the vambrace, both boots grind a fraction on the stone without leaving the spots they stand
on - and nothing visible strikes him and nothing appears in the frame. IN THE FINAL QUARTER he
drives STRAIGHT UP out of the crouch in one heavy rise, helmet lifting back level, shoulders
settling, the mace riding back up to the EXACT angle and height it has in the reference image, and
he settles into the EXACT same reference stance, so that he is already standing completely still in
the reference pose well before the clip ends. Nothing sheds and nothing breaks. Compact, armored,
immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, his body angled to camera exactly as in the
reference image and facing screen-right; his domed helmet and both shoulders snap BACK toward
screen-LEFT and his spine folds, knees buckling under his own weight - but BOTH BOOTS STAY EXACTLY
WHERE THEY STAND, he does not step back and he does not skid, and every bit of the recoil is
absorbed in his knees, hips and trunk instead. His LEADING fist clamps harder on the haft and the
whole mace is JOLTED straight DOWN a short way with his body, holding the exact angle it has in the
reference - it never rotates up, never swings and never rises - while the hanging chain loop snaps
out and swings back in against the vambrace, never further toward screen-left than his own leading
elbow, and his REAR fist stays cocked beside the pauldron. THE RECOIL PEAKS BY THE END OF THE FIRST
QUARTER and he rides it through the middle of the clip - his weight rocking straight back deep over
his rear boot, the hose bundle shivering, his chest plates juddering. IN THE LAST THIRD he catches
it, drives back up out of his knees and settles in one eased recovery into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip
ends. Nothing sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters,
crosses or appears in the frame at any time, and there is no flash, no streak and no spark anywhere
in the shot. Only his own body and his own weapons move.

## ko  (cause-free collapse, ends on the ground)
KO (collapse): he begins in the EXACT reference stance, his body angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath
him, his domed helmet drops and both shoulders slump, and he goes STRAIGHT DOWN onto both knees on
the very spot he stands, without travelling forward or back, his boots staying grounded behind him
as his legs fold. Then he pitches forward and DOWN over his own knees and FOLDS, and BY THE HALFWAY
POINT he has come to rest fully prone and motionless on the stone, chest plates down, helmet lying
toward screen-right and still turned toward screen-right, both arms folded down beneath and beside
his own chest. His LEADING fist stays closed on the mace haft the whole way down: the mace comes
down WITH him and comes to rest lying on the stone in front of his fallen chest, its spiked HEAD and
terminal SPIKE finishing NEARER his own fallen body than they hang in the reference image and
pointing low toward screen-right, its haft under his closed fist - that fist finishing DOWN and IN,
nearer his own body than it sits in the reference image - so that no part of him or the mace is
anywhere near any edge of the frame. His REAR fist folds down beneath his chest. ONE thin scuff of
hard grey grit is knocked UPWARD off the stone where his chest plates come down, the grains no
bigger than one link of his own chain, rising no higher than his own fallen shoulder and staying
within one body-width of where he lands, every grain crumbling away to nothing in mid-air as it
falls. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he does not stir, does not
lift his helmet, does not push up on an arm and he does NOT get back up - and the fallen mace lies
exactly where it came to rest and does not move again. He is ALONE in an empty frame - nothing
whatsoever enters, crosses or appears in the frame at any time. Only his own body and his own
weapons move.

## victory  (tip-plant and chest-thump, no turn to camera)
VICTORY (tip-plant and chest-thump): he begins in the EXACT reference stance, his body angled to
camera exactly as in the reference image and facing screen-right. IN THE FIRST QUARTER his LEADING
wrist turns the mace a short way about his own leading fist - the fist staying exactly where it sits
in the reference - swinging the spiked head DOWN and IN until the terminal SPIKE comes to rest
planted on the flagstone directly beneath where the head hangs in the reference image, a short way
ahead of his own leading boot, the haft standing like a planted cane under his closed fist; at the
same time his whole mass settles a fraction STRAIGHT DOWN and even through both planted boots. FOR
THE WHOLE MIDDLE HALF OF THE CLIP he holds that planted stand and celebrates like a machine: his
REAR forearm folds IN toward his own body - elbow and forearm only, THE LINE OF HIS TWO SHOULDERS
AND THE LINE OF HIS TWO HIPS STAYING EXACTLY AS THEY ARE IN THE REFERENCE IMAGE - and its fist
THUMPS its knuckles TWICE, slow and heavy, against his own chest plates, the hose bundle shivering
and the hanging chain loop swaying and stilling after each thump; between the two thumps he is
dead-still, and after the second his domed helmet dips ONCE straight down in a short nod and lifts
again no higher than it sits in the reference image. He never steps, never pivots, never lifts
either boot, never raises either fist above his own helmet dome and never turns his helmet or his
body toward the camera at any point. IN THE FINAL QUARTER the rear fist returns OUT and BACK to its
exact cocked position beside the pauldron, the leading wrist turns the mace head back UP off the
stone to the EXACT angle and height it has in the reference image, and he settles into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Nothing sheds and nothing breaks. Heavy, satisfied, machine-still.

## special_1  (BONE DRILL) — the terminal spike bitten into the flagstone and bored in place about his own fist
SPECIAL FINISHER (bone drill): he begins in the EXACT reference stance, his body angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST QUARTER his LEADING wrist
turns the mace about his own leading fist - the fist staying exactly where it sits in the reference
- swinging the spiked HEAD DOWN and IN with no wind-up and no raise until, BY THE TWENTY-FIVE
PERCENT MARK, the terminal SPIKE BITES into the flagstone directly beneath where the head hangs in
the reference image, a short way ahead of his own leading boot, while his whole mass folds DOWN
behind it, knees bending deep. FROM THE TWENTY-FIVE PERCENT MARK TO THE SIXTY-FIVE PERCENT MARK HE
DRILLS: his wrist TWISTS the haft about its own long axis in hard mechanical quarter-turns, one
after another, grinding the spiked head deeper into the stone in place - the head never slides
toward screen-right or screen-left, it only bores DOWN - and his whole armored mass ratchets one
notch lower with every twist, chest driving down over his leading knee, boots grinding without
leaving their spots. Across that drilling, EXACTLY SIX chips of split grey floor-stone are torn
UPWARD off the bite point in ones and twos - never all at once - each chip no bigger than one SPIKE
of his own mace head, rising straight up no higher than his own knee, never travelling further
toward screen-right than the mace's tip hangs in the reference image and never further toward
screen-left than his own leading boot, every chip crumbling away to nothing in mid-air as it falls.
The debris is SOLID BROKEN ROCK: opaque, chipped, sharp-edged, matte and lit like stone - never a
glow, never a flame, never a spark of light, never a wisp. His REAR fist stays cocked beside the
pauldron the entire clip and does not travel. AT THE SIXTY-FIVE PERCENT MARK the drilling stops and
HE HOLDS the deep sunk stance, spike still seated in the stone, his shoulders heaving and the hose
bundle flexing, while the last chips crumble away; only in the final second does the wrist draw the
spike UP out of the stone and turn the head back to the EXACT angle and height the mace has in the
reference image, and he rises into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Grinding, relentless, final.

## special_2  (PISTON RATCHET) — three descending piston blows, the whole mass ratcheting into a crouch
SPECIAL FINISHER (piston ratchet): he begins in the EXACT reference stance, his body angled to
camera exactly as in the reference image and facing screen-right; he throws THREE short piston blows
with his REAR fist, each one angled forty-five degrees DOWNWARD and forward toward screen-right,
each fired straight from its cocked position beside the pauldron with no wind-up and no backswing,
the arm sliding straight out and straight back like a ram: THE FIRST BLOW at his own chest height
lands by the TWENTY PERCENT MARK, THE SECOND at his own belt height by the FORTY PERCENT MARK, THE
THIRD at his own knee height by the SIXTY PERCENT MARK - and with each blow his whole armored mass
RATCHETS one full stage lower, knees folding deeper and chest driving further down over his leading
knee, so that by the third blow he is in a deep crouch. Every blow drives through EMPTY AIR - there
is NO opponent, NO target and no second figure, and nothing whatsoever appears in front of his
knuckles at any time - and the fist never travels further toward screen-right than his own leading
boot toe, never drops lower than his own knee height, and re-cocks along the same straight line
between blows. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS STAY EXACTLY AS THEY ARE
IN THE REFERENCE IMAGE throughout - the arm alone throws the blows. His LEADING fist and the mace
ride straight down with the deepening crouch at their exact reference angle, the spiked head sinking
to just above the stone, never touching it. Under the three blows his boots grind hard and EXACTLY
SIX grains of hard grey grit are knocked UPWARD beside them in ones and twos across the clip, each
grain no bigger than one link of his own chain, rising no higher than his own knee and spreading no
wider than his own standing footprint - never past his leading boot toe toward screen-right, never
past his rear boot heel toward screen-left - every grain crumbling away to nothing in mid-air as it
falls. The debris is SOLID: opaque, hard, matte grit - never a glow, never a spark of light, never a
wisp. HE HOLDS the deep third-blow crouch, fist extended low, from the SIXTY PERCENT MARK to the
EIGHTY PERCENT MARK while the last grains crumble away; in the final fifth the fist re-cocks beside
the pauldron and he rises, the mace riding back up to the EXACT angle and height it has in the
reference image, into the EXACT same reference stance, so that he is already standing completely
still in the reference pose well before the clip ends. Three strokes, descending, merciless.

## special_3  (QUAKE FIST) — the cocked fist driven down into the stone inside his own footprint
SPECIAL FINISHER (quake fist): he begins in the EXACT reference stance, his body angled to camera
exactly as in the reference image and facing screen-right; IN THE FIRST THIRD he drives his REAR
fist in ONE committed piston stroke DOWN and a short way forward toward his own leading boot - no
wind-up, no raise and no backswing, the fist travelling DOWNWARD the whole way from its cocked
position beside the pauldron - while his entire armored mass folds down behind it, knees folding
deep, chest coming down over his thighs, and BY THE ONE-THIRD MARK his knuckle plates meet the
flagstone just inside his own leading boot, INSIDE his own standing footprint. The floor gives way
under them: EXACTLY SEVEN chunks of split grey floor-stone burst UPWARD around his buried fist, each
chunk no bigger than one knuckle plate of his own gauntlet, rising no higher than his own knee and
spreading no wider than his own standing footprint - never past his leading boot toe toward
screen-right, never past his rear boot heel toward screen-left - every chunk cracking apart and
crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, chunky,
sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light, never a
wisp, and no shockwave, no ring and no cloud of dust of any kind. His LEADING fist and the mace ride
straight down with the fold at their exact reference angle, the spiked head resting just above the
stone, taking no part, and the hanging chain loop swings once and stills. HE HOLDS the deep folded
stance with his fist seated in the broken stone FROM THE ONE-THIRD MARK TO THE SEVENTY PERCENT MARK,
his back and shoulders heaving, the hose bundle flexing, while the last chunks crumble away; THE
WHOLE FINAL THIRD is his slow controlled rise - the rear fist re-cocking back UP along its same line
to its exact position beside the pauldron, the mace riding back up to the EXACT angle and height it
has in the reference image, his mass settling into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. One stroke,
colossal, absolute.
