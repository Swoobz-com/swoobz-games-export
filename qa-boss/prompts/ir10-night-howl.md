# IR-10 NIGHT HOWL — XGundam roster. Full 13-clip kit. Phase 276.

Written OFF THE PADDED PLATE `qa-boss/anchors/xg/ir10-night-howl-anchor-green.png`, read at FULL SIZE
alongside the raw source `input/MK FINAL/XGundam not sorted/IR-10 Night Howl.png` before anything below
was written. He faces SCREEN-RIGHT natively; no hflip anywhere in this kit. He is a lean, digitigrade
war-beast — a crouched, wolf-shaped combat machine, not a bulky humanoid gundam — carrying ONE weapon
(a two-ended fanged cleaver) in one hand and his own bare claw in the other. THIS KIT CARRIES NO
DEBRIS AND NO SURFACE OF ANY KIND — see the GROUND note below the shared blocks before writing or
reading any state; it is the load-bearing decision behind every acting line in this file.

## ★ NIGHT HOWL FRAME BUDGET — measured, applies to EVERY clip of his

Plate ~1536x1536 (canvas size back-derived from the measured fill: 1044h / 0.68 ≈ 1536, the roster's
standard padded-plate canvas). Full subject **886w x 1044h** (fills 68.0% of frame height — measured,
phase 276 pre-kit screen). Eyeballed off the full-size padded plate — `measure-anchor-budget.mjs` was
NOT run for this file, so treat the split below as an estimate, not a machine-measured pixel count:
  LEFT/RIGHT roughly **300-325px each** of the ~650px total lateral margin (subject sits close to
  centred) · HEADROOM roughly **450-470px** of the ~492px total vertical margin (his feet sit close to
  the bottom edge of the padded canvas, so the bulk of the margin sits above him, not below).

**opaque 12.74% · emis 0.42% · white 0.01% · p99 7.3 against plate green rgb(36,245,18) — KEYS WITH
MARGIN, the best-behaved of the four newly-screened plates (phase 276): a clean solid silhouette with
correct inter-limb negative space. His only identity light is CYAN (optics + trim) — no magenta or
pink anywhere on him, so the magenta-suppress keyer risk (phase 206) does not apply to this character.**

  1. **LATERAL ROOM IS THE ROOMIEST RATIO IN THIS SET** — roughly 650px of margin against an 886px-wide
     subject (~73%), well past the "tight" threshold this brief warns about — so no state in this kit
     needs a narrow-stance straitjacket. DOWN and IN stay the default direction anyway, because nothing
     in this kit reaches for an edge.
  2. **HEADROOM (~450-470px) IS MODERATE, NOT TIGHT, BUT THE WEAPON IS ALREADY CARRIED LOW** — chest
     height, both fangs hanging toward screen-left in the reference image — so no line in this kit names
     a start height above where the cleaver already sits, and the tip ceiling is capped at the height of
     his own ear-fins (the tallest point on his own silhouette), never higher.
  3. **BOUND THE FANG TIPS, NOT THE WEAPON HAND** — same lesson as every prior kit: the hand can obey a
     cap while a long prong overruns it. Both the LONG FANG and the SHORT FANG carry their own ceiling
     in the shared suffix.
  4. **HE IS TALLER THAN HE IS WIDE** (886x1044) — unlike the wide, low silhouettes elsewhere in this
     roster, nothing here needs the "wider than tall" caution gargoyle needed. Zero net drift is still
     the rule: nothing in this kit steps or travels — every beat is a sink, a rise or a rotation about
     his own two feet.
  5. **NO DEBRIS AND NO SURFACE ANYWHERE IN THIS KIT** — see the GROUND note below the shared blocks.
     Every impact in every one of the 13 states is absorbed into his own body, never into a floor.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME lean mechanical war-beast from the reference image (a crouched, wolf-like combat
> machine standing on digitigrade legs bent back like a beast's hind legs, his whole frame plated in
> dark charcoal-black gunmetal armour with lighter grey wear-scuffs along its edges; a long
> forward-jutting snout fixed in an open snarl baring a row of sharp grey metal fangs, his jaw locked in
> that one position; two swept-back ear-fins rising from the crown of his head like a wolf's pricked
> ears rendered in armour plate; twin round cyan OPTIC LENSES glowing steady in his face, his only
> light; a broad armoured chest with a circular vented node at its centre and thin jagged cyan trim
> slashes running down both sides of his chest and across his abdomen; angular pauldrons on both
> shoulders, plated forearms each carrying the same thin cyan slash trim, and thighs and shins carrying
> matching cyan accent slashes; three-toed clawed mechanical feet, dark iron, articulated; his WEAPON
> hand - gauntleted in the same dark plate - closed around the wrapped central grip of his
> DOUBLE-FANGED CLEAVER, held across his body at chest height on a shallow diagonal toward screen-left:
> the LONG FANG, a broad curved sawtooth blade of dull grey serrated steel, projecting DOWN from the
> grip, and the SHORT FANG, a smaller straight serrated spike of the same dull grey steel, projecting UP
> from the same grip the opposite way - the two fangs are the ONLY weapon he carries, one prop with two
> ends, never two separate weapons; and his other hand, the bare CLAW hand - no gauntlet, exposed dark
> mechanical digits ending in long hooked black talons - held open at chest height, fingers spread),
> standing in a low stalking crouch on a solid saturated GREEN chroma screen (bright green #24f512,
> nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His dark charcoal-black plating, his grey wear-scuffs, his snarling snout with its fixed row of grey
> fangs, his swept-back ear-fins, his twin cyan optic lenses, every cyan trim slash on his chest, arms,
> thighs and shins, his dark clawed feet, his bare CLAW hand and the whole double-fanged cleaver all stay
> EXACTLY the same the entire clip - nothing is ever added, lost, re-plated or repainted. The
> double-fanged cleaver stays gripped in his own WEAPON hand the entire clip - it is never released,
> never let go, never exchanged and never replaced by anything else, his WEAPON hand stays closed on the
> grip in every single frame, and no second weapon and no other object of any kind ever appears anywhere
> in the shot; his CLAW hand stays his own bare hand throughout and never picks up, grips or becomes a
> weapon of any kind. Every cyan optic and every cyan trim slash on him stays EXACTLY as bright as it is
> in the reference image - nothing on him ever glows brighter, flares, pulses or throws light onto
> anything - and no other light of any kind ever appears anywhere in the shot: no glow, aura, beam,
> halo, ring of light, orb, projectile, muzzle-flash, spark of light, ember, flame, wisp, mist, smoke,
> haze or energy of any kind. The cleaver stays FULLY INSIDE the frame at ALL times and NEVER extends
> past any edge of the frame: neither fang ever travels further toward screen-left than it sits in the
> reference image, and no part of either fang is ever raised above the height his own ear-fins have in
> the reference image; while it is in his grip the cleaver is NEVER swung fully vertical, NEVER raised
> overhead and NEVER thrust out to full reach beyond his own leading foot - it only ever turns a short
> way about his own gripping hand or rides with his body. NO SURFACE OF ANY KIND EVER APPEARS IN THIS
> CLIP - no plinth, pedestal, base, dais, slab, step or platform, no floor, no tiles and no paving ever
> appears beneath, behind or around him at any moment, whether he is standing or fallen; only flat empty
> green is ever visible around him, exactly as it is in the reference image. HIS FEET STAY EXACTLY WHERE
> THEY START FOR THE WHOLE CLIP - he never jumps, never leaps, never hops and never lunges into a wide
> stance; he keeps his stance narrow and never spreads wider than about one and a quarter times his
> standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the
> camera, and his body holds the SAME angle to camera it has in the reference image - it never opens
> further toward the viewer and never turns away. His snarling jaw stays fixed exactly as it is in the
> reference image - it never opens further, never closes and never moves - and he never talks, never
> shouts, never roars and makes no sound of any kind. The camera is absolutely locked, no zoom, no pan,
> his full body always fully in frame, he is the ONLY figure in frame at all times, nothing else added.
> He begins and ends on the EXACT same reference stance. 24fps.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The notes below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO SURVIVE THE ko, following gargoyle-spear and ir13-junkyard-king, not
raiju. The KO-SUFFIX rule strips any sentence matching `keeps the ... never drops or swaps`; this
character's WEAPON hand never opens on the way down (a powered mechanical grip does not relax), so the
lock is phrased "stays gripped in his own WEAPON hand ... never released, never let go, never
exchanged", which does not match the strip, stays TRUE through a prone collapse, and sits in its own
sentence so no strip takes the identity lock with it as collateral. Verify on the built `ko` that both
the identity sentence and the grip sentence survive.

(b) THIS KIT USES NO "FEET STAY FLAT ON THE GROUND" LITERAL AND NO DEBRIS-VANISH TAIL, BY DESIGN. The
word GROUND is a floor-invention risk on this character (see the GROUND note below), so the feet law is
phrased "HIS FEET STAY EXACTLY WHERE THEY START", which needs no ko-time rewrite — it stays TRUE
through a collapse without modification, and koSuffix() has nothing to rewrite here, which is correct,
not a gap. Likewise there is no debris-vanish tail, because this kit carries no debris anywhere (see the
GROUND note): `idle` and `ko` therefore diverge in their own acting-line content, not in a rewritten
shared tail — verify by reading them end to end, not by grepping for a tail phrase.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`, so
the ko rewrite rescopes it to WHILE HE IS ON HIS FEET. It appears exactly once, inside the feet
sentence.

(d) THE WEAPON-MOTION LAW IS A TIP CEILING (his own ear-fin height) PLUS THREE NEVER-CLAUSES (never
vertical, never overhead, never thrust to full reach) — no lateral cap is restated per acting line,
because the lateral margins on this plate are the roomiest in the set (see the FRAME BUDGET) and nothing
in this kit reaches for an edge.

FACING, judgement call: THREE-QUARTER OPEN toward screen-right - NOT strict profile. Read at full size;
the evidence that decided it:
  · HEAD - the snout and both ear-fins commit hard toward screen-right, but the far side of the jaw and
    both cyan optic lenses read at once, which strict profile would not allow.
  · CHEST - open: the circular vented node sits centred with a cyan trim slash flanking it on both sides
    in a near-symmetric pair, and a second armoured volume (the far pauldron) reads above and behind the
    head.
  · STANCE - a stalking crouch with the leading leg planted forward and the rear leg trailing back on a
    real diagonal, not stacked directly behind it the way true profile would show.
So no line in this file orders "strict side profile"; every line says "his body angled toward
screen-right exactly as it is in the reference image", and the suffix bans the turn in both directions.

WEAPON, judgement call: HE CARRIES ONE WEAPON, NOT TWO. The "dual blades" archetype note (phase 276
screen) describes the CLEAVER itself, which has two bladed ends — the LONG FANG and the SHORT FANG — on
a single shared grip: it is one prop, held one-handed, the same structural shape as gargoyle-spear's
double-ended spear, not two separate held weapons. His other hand is his own bare CLAW hand, never a
second weapon; every state in this file says so explicitly so the model cannot arm that hand with an
invented second blade — a sibling kit lost a clip exactly this way.

GROUND, a hard rule for this kit, not a judgement call. HE STANDS ON NOTHING. The padded plate shows him
on flat green with no floor, tile, plinth or platform of any kind under him, and
`gargoyle-spear-REROLL.md` proved that a surface invents itself the moment an acting line gives the
model an impact to render against — its v1 `attack_strike_b` grew a stone statue plinth under his feet
for the whole clip, and its v1 `attack_throw_b` grew a tiled pavement by the last frame; both were
rejected and rewritten with the surface ban stated at the START of the clip, not only the end. So THIS
KIT CARRIES NO DEBRIS AND NO SURFACE IMPACT ANYWHERE, in any of the 13 states: every strike, throw and
finisher here cuts, thrusts or rakes through EMPTY AIR only, and every impact is absorbed into his own
body — a weight-sink, a joint-judder, a plating rattle — never into a floor. "NO SURFACE OF ANY KIND"
lives once in the shared suffix (every state), and is restated a second time, at the point of highest
risk, in `attack_strike_b`, `attack_throw`, `attack_throw_b` and `ko` — the states whose beats most
invite a surface (a driven thrust, a downward-ending mime, a collapse).

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
The green stays completely empty and unbroken around him at all times - the ONLY thing visible in the frame is HIS OWN body and his own double-fanged cleaver; no debris of any kind is ever created, nothing is ever kicked up, cracked, broken loose or scattered, and no dust, no smoke, no mist, no haze, no spray, no glow, no spark of light, no flame, no beam and no aura of any kind ever appears anywhere in the shot. NO SURFACE OF ANY KIND ever appears beneath, behind or around him - no plinth, pedestal, base, dais, slab, step, platform, floor, tiles or paving of any kind is ever visible; only flat empty green is ever seen around him, exactly as in the reference image. Nothing new ever enters the frame and no second weapon or object of any kind ever appears.

## idle
IDLE COMBAT-READY LOOP: a predator's dead-still guard, his weight sunk and even over both planted feet,
the double-fanged cleaver held steady at the exact diagonal it has in the reference image, his WEAPON
hand closed on the grip. He does not breathe - instead ONE slow full mechanical SETTLING of his whole
frame fills the first half of the clip and a second fills the second half, and EVERY PART of that
settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each settling his whole weight sinks a
fraction STRAIGHT DOWN through both of his planted feet at once and rises again - it NEVER transfers
from one foot to the other - his shoulders sink a fraction STRAIGHT DOWN and lift again with neither one
coming forward nor going back, and his snouted head lowers a fraction STRAIGHT DOWN and rises again
without ever turning left or right. The prop beat inside each settling: the long articulated fingers of
his CLAW hand curl inward one at a time into a loose fist and spread back open, and his WEAPON hand's
grip re-tightens a notch on the cleaver and eases again - the cleaver never leaves that closed hand and
holds its exact reference angle throughout, neither fang ever swinging toward either side edge. THE LINE
OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never
swings round, and his chest never squares up toward the camera; he may SINK, but he never TURNS. His
snarling jaw stays fixed and does not move at all. His cyan optics stay exactly as bright as they are in
the reference image, never pulsing or flaring. Feet planted, silent, patient as a stalking beast.
Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (the long fang scythe, a clean cut through air)
STRIKE A (long fang scythe): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image, the cleaver on its shallow diagonal with the LONG
FANG already hanging low toward screen-left. THERE IS NO WIND-UP OF ANY KIND: he does NOT raise the
cleaver first, does NOT draw it back, does NOT lift it even slightly, and the cut starts from exactly
where the LONG FANG ALREADY SITS in the reference image and only ever goes DOWN and IN. IN THE FIRST
QUARTER his knees fold and he drops his whole frame straight DOWN over both planted feet in one
committed sink, and through that same sink his WEAPON hand hauls the grip DOWN and IN toward his own hip
so the LONG FANG scythes DOWN through EMPTY AIR on his screen-right side until it hangs low at his own
shin height, at every moment NEARER to his own body than it sits in the reference image - it is NEVER
thrust out toward screen-right, and the deeper it drops the closer in it comes; on the far end the SHORT
FANG swings a short way up and in toward his own chest as the grip turns, never rising above the height
of his own ear-fins and never travelling further toward screen-right than it sits in the reference
image. At the same moment his CLAW hand snaps forward in one short empty rake beside the falling
cleaver, fingers spread, closing on NOTHING and touching nothing. THE CUT HAS LANDED BY THE HALFWAY
POINT and the fang touches nothing - this is a clean cut through EMPTY AIR only. As his weight lands,
his whole frame JUDDERS once, hard, absorbed entirely in his own knees and shoulders - nothing is kicked
up, nothing cracks and nothing appears beneath him. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS
TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near
shoulder never comes forward, his far shoulder never swings round, and his chest never squares up toward
the camera; he may FOLD and SINK, but he never TURNS. He HOLDS the sunk finish with the fang hanging low
through the third quarter, and only in the final second does he rise slowly, the cleaver turning back up
about his WEAPON hand to the EXACT angle and height it has in the reference image, and settle into the
EXACT same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Fast, low, savage.

## attack_strike_b  (the short fang thrust)
STRIKE B (short fang thrust): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image, and HE STANDS ON NOTHING in this first frame
exactly as in every other - no floor, no plinth, no platform of any kind beneath his own feet, only flat
empty green. THERE IS NO WIND-UP OF ANY KIND: he does NOT draw the cleaver back first and does NOT raise
any part of it before the blow - the SHORT FANG starts from exactly where it ALREADY SITS in the
reference image and only ever drives forward and IN. IN THE FIRST QUARTER his rear leg drives his whole
frame forward a short way over his own leading foot - without either foot leaving the small spot it
stands on - while his WEAPON hand punches the grip forward so the SHORT FANG stabs through EMPTY AIR on
a short, flat, direct line in front of his own chest, never travelling further toward screen-right than
the reach of his own leading foot's claws; on the far end the LONG FANG swings a short way back and up
toward his own rear shoulder as the grip turns, never rising above the height of his own ear-fins and
never travelling further toward screen-left than it sits in the reference image. THE THRUST STOPS DEAD
AT ITS OWN FULL REACH BY THE HALFWAY POINT - it does not bury itself, does not strike any surface and
nothing bursts, chips or appears anywhere in the frame; it simply stops in EMPTY AIR. His CLAW hand
stays drawn back tight against his own chest throughout, fingers spread, taking no part. He HOLDS that
full-reach stop through the third quarter, his frame rigid and juddering under its own held tension, and
only in the final second does he draw the SHORT FANG back, the cleaver turning about his WEAPON hand to
the EXACT angle and height it has in the reference image, and settle into the EXACT same reference
stance - AND AT THAT FINAL MOMENT, EXACTLY AS AT THE FIRST, HE STANDS ON NOTHING: still no floor, no
plinth and no platform of any kind beneath him, only flat empty green under his own feet - so that he is
already standing completely still in the reference pose well before the clip ends. Sharp, direct, final.

## attack_throw A  (the rising claw rake, solo-safe)
THROW A (rising claw rake): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image. There is NO opponent, NO second figure and NO body anywhere in
this clip - his CLAW hand seizes NOTHING, grips nothing new, and nothing is ever caught, carried or
dragged at any time; the cleaver takes no part in this beat and stays locked in his WEAPON hand at its
exact reference angle throughout, never rotating and never rising. IN THE FIRST THIRD his CLAW hand
drops low beside his own hip, fingers curling shut into a loose fist, while his knees sink and load.
THEN he DRIVES upward: the fist snaps open into spread claws and RAKES straight up through EMPTY AIR on
his screen-right side in one savage rising sweep, rising no higher than the crown of his own head, his
whole frame rising with it out of his bent knees - both feet staying exactly where they stand the entire
time. THE RAKE PEAKS BY THE HALFWAY POINT: the claws close on NOTHING and stay empty in every single
frame - there is nothing above him, nothing is lifted, nothing is thrown and nothing appears beneath him
at any point. He HOLDS the raised finish through the third quarter, arm high and rigid, frame juddering
under the hold; and only in the final quarter does he draw the CLAW hand back down to its exact
reference curl at chest height and settle into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Nothing sheds and nothing
breaks. Vertical, savage, empty-handed.

## attack_throw_b  (the low claw drag, solo-safe)
THROW B (low claw drag): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image, and HE STANDS ON NOTHING in this first frame - no floor, no
ground surface, no plinth or platform of any kind visible anywhere beneath or around his feet, only flat
empty green, exactly as in the reference image. There is NO opponent, NO second figure and NO body
anywhere in the frame at any time - his CLAW hand drags NOTHING, and nothing is ever caught, lifted or
dragged; the cleaver takes no part in this beat and stays locked in his WEAPON hand at its exact
reference angle throughout. IN THE FIRST THIRD his CLAW hand rises to shoulder height, fingers spread
wide, while his knees bend and his frame coils. THEN he DRAGS it DOWN: the open claws sweep down and IN
through EMPTY AIR in one hard controlled pull, finishing low beside his own leading hip, his whole frame
sinking with the pull - both feet staying exactly where they stand throughout. THE DRAG LANDS ON NOTHING
BY THE HALFWAY POINT - no floor cracks, no surface breaks, nothing bursts loose and nothing is ever
knocked up from beneath him; his claws simply close on EMPTY AIR and stay empty in every single frame.
He HOLDS the low finish through the third quarter, claws closed, frame coiled and juddering; and only in
the final quarter does he open the CLAW hand back out to its raised reference curl and rise into the
EXACT same reference stance - AND AT THAT LAST FRAME, HARDER THAN AT ANY OTHER MOMENT IN THE CLIP, HE
STANDS ON NOTHING: no floor, no plinth and no platform of any kind has appeared beneath, behind or
around him at any point - the green beneath his own feet stays exactly as flat, empty and unbroken as it
was in the very first frame - so that he is already standing completely still in the reference pose well
before the clip ends. Nothing sheds and nothing breaks. Low, dragging, empty-handed.

## attack_block A  (the cleaver brace)
BLOCK-COUNTER A (cleaver brace): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; IN THE FIRST QUARTER both hands come together -
his CLAW hand crossing in to grip the cleaver's own spine just above his WEAPON hand - and he SINKS his
whole weight straight DOWN behind it into a deep braced crouch over both planted feet, elbows tight
against his own ribs, snout tucked down, knees taking the load - so the cleaver stands braced across the
front of his own chest at the same shallow diagonal it holds in the reference image, both fangs held
dead-still. The cleaver does not turn and does not travel sideways; it drops with his body and nothing
else. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure - both
feet grind a fraction on the small spot they stand on without either one leaving it, his forearms
shudder under the load, his plating rattles and settles straight up and down. IN THE FINAL QUARTER he
drives one short hard shove straight UP out of his knees behind the braced cleaver, then his CLAW hand
releases the spine and opens back OUT to its reference curl as he flows in one eased motion back into
the EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Nothing sheds and nothing breaks. Braced, immovable, silent.

## attack_block_b  (the claw guard)
BLOCK-COUNTER B (claw guard): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; the cleaver takes NO part - it stays locked in his
WEAPON hand at its exact reference angle throughout, never rotating, never rising. IN THE FIRST QUARTER
his snouted head drops toward his own chest, his near shoulder lifts a fraction under its pauldron, and
he snaps his CLAW arm up as a bar across the front of his own collar - fingers spread, never rising
above the crown of his own head - while his weight sinks straight DOWN through both planted feet. HE
HOLDS THAT GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both feet grind a fraction on the small
spot they stand on without leaving it, his neck and shoulders shudder under the load, his plating
rattles, and the cleaver rides the shudder without ever rising or swinging. IN THE FINAL QUARTER he
drives one short heavy shoulder-shove up out of his knees, the crown of his own head rising no higher
than it sits in the reference image, then settles back, his CLAW arm dropping and opening back out to
its reference curl, into the EXACT same reference stance, so that he is already standing completely
still in the reference pose well before the clip ends. Nothing sheds and nothing breaks. Compact,
braced, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, his body angled toward screen-right exactly as
it is in the reference image; his snouted head and both shoulders snap back and toward screen-LEFT, his
spine folding and his knees buckling under his own weight - but BOTH FEET STAY EXACTLY WHERE THEY STAND,
he does not step back and he does not skid, and every bit of the recoil is absorbed in his knees, hips
and trunk instead. His WEAPON hand clamps harder on the grip and the cleaver is jolted straight DOWN
with his body, holding its exact reference angle the whole way - it never turns, never swings and never
rises - while his CLAW hand flails once up and back at its own shoulder height, fingers splaying wide.
THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance through the middle of the
clip - his trunk pitched a short way back over his rear leg, both feet still planted, his plating
juddering, the cleaver trembling in his locked grip. IN THE LAST THIRD he catches his balance, straightens
up out of his knees and flows in one eased recovery back into the EXACT same reference stance, so that
he is already standing completely still in the reference pose well before the clip ends. His snarling
face leads the recoil; his back is never shown and his chest never squares up toward the camera. Nothing
sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears
in the frame at any time, and there is no light, no flare, no wisp and no streak anywhere in the shot.
Only his own body and his own weapon move.

## ko  (systems-down collapse, ends on ground)
KO (systems-down collapse): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image; IN THE FIRST THIRD OF THE CLIP the strength goes out of his
frame - his head drops, his shoulders slump, his knees give way in one heavy jolt, and he goes STRAIGHT
DOWN onto both knees on the small spot he stands on without travelling forward, his legs folding beneath
him. Then he pitches forward and down over his own thighs and FOLDS, his arms folding beneath him with
his WEAPON hand still closed on the cleaver's grip, and BY THE HALFWAY POINT he has come to rest fully
prone and motionless, folded heavily over his own knees with his snouted head lying low toward
screen-right. His WEAPON hand never opens: the cleaver comes down WITH him and comes to rest lying at a
slant across his own fallen body, both fangs finishing NEARER his own fallen body than they sit in the
reference image and neither of them anywhere near an edge of the frame. His CLAW hand lies open and
still beneath him, fingers loose. AS HE COMES TO REST, EXACTLY AS THROUGH THE WHOLE CLIP, HE LIES ON
NOTHING - no floor, no plinth, no platform and no ground surface of any kind is ever visible beneath his
fallen body; only flat empty green is ever seen around him, exactly as it was under his own feet in the
reference image. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he does not stir, does
not lift his head, does not push up on an arm and he does NOT get back up - and the fallen cleaver lies
exactly where it came to rest and does not move again. He is ALONE in an empty frame - nothing
whatsoever enters, crosses or appears in the frame at any time. Only his own body and his own weapon
move.

## victory  (fang display, no turn to camera)
VICTORY (fang display): he begins in the EXACT reference stance, his body angled toward screen-right
exactly as it is in the reference image. IN THE FIRST QUARTER he lifts the whole cleaver straight UP off
its resting diagonal by about the width of his own WEAPON hand - the cleaver holding its exact reference
angle as it lifts, his gripping arm locking it there like a raised trophy - while his chest rises and his
shoulders square a fraction. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT RAISED CLEAVER and
works a slow deliberate display: the long articulated fingers of his CLAW hand curl and drag once,
slowly, against each other at chest height - claw scraping claw in one unhurried grinding pass - and
spread back open, his snouted head dips once in a short controlled nod and lifts back no higher than it
sits in the reference image, never tipping back toward the sky. His feet, hips and shoulders stay where
they are: he does not step, does not pivot, does not lift either foot and does not turn his head or his
body toward the camera at any point; his jaw stays fixed in its reference snarl and he makes no sound of
any kind. IN THE FINAL QUARTER he lets the cleaver settle back DOWN onto its EXACT reference diagonal and
eases into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Nothing sheds and nothing breaks. Still, coiled, silent.

## special_1  (THE DOUBLE FANG WINDMILL) — the cleaver turned in place about his own gripping hand, braked dead
SPECIAL FINISHER (the double fang windmill): he begins in the EXACT reference stance, his body angled
toward screen-right exactly as it is in the reference image; IN THE FIRST QUARTER his WEAPON hand begins
TURNING the cleaver in place about its own central grip - the grip turning smoothly inside his closed
hand, that hand never releasing it - so the LONG FANG and the SHORT FANG sweep round and round each
other. NEITHER FANG TRAVELS BEYOND ITS OWN REFERENCE REACH during the turn: the whole weapon holds its
exact reference position and angle while the grip turns inside his hand, and it is never a blur, never a
disc, never a streak of light - always visibly the same two solid grey serrated fangs turning. THROUGH
THE SECOND QUARTER the turning quickens and he sinks progressively STRAIGHT DOWN into a low braced
crouch over both planted feet, his CLAW hand pulled tight against his own chest, elbow in. AT THE SIXTY
PERCENT MARK he brakes the turn DEAD in one instant - both fangs landing EXACTLY back in the position
they hold in the reference image - and in the same instant drives his whole frame straight DOWN through
his bent legs in one hard juddering compression, absorbed entirely in his own knees and shoulders. HE
HOLDS THE BRACED STOP THROUGH THE THIRD QUARTER, thighs and shoulders shuddering under the load straight
up and down, the cleaver dead-still at its reference angle. IN THE FINAL QUARTER he rises slowly back
into the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Whirling, braced, silent.

## special_2  (THE TWIN FANG CROSS-REND) — the long fang down-cut immediately followed by the short fang up-cut
SPECIAL FINISHER (the twin fang cross-rend): he begins in the EXACT reference stance, his body angled
toward screen-right exactly as it is in the reference image. THERE IS NO WIND-UP OF ANY KIND: he does
NOT raise the cleaver first and NO PART of it travels upward at any moment before the strike - it starts
from exactly where it ALREADY SITS in the reference image. IN THE FIRST THIRD his WEAPON hand drives the
LONG FANG DOWN and IN through EMPTY AIR on his screen-right side in one hard committed cut, his whole
frame sinking behind it, until the fang hangs at his own shin height, at every moment nearer to his own
body than it sits in the reference image and never further toward screen-right. THE INSTANT THAT CUT
STOPS, AT THE FORTY PERCENT MARK, he REVERSES the grip in one continuous motion and drives the SHORT
FANG UP and IN through EMPTY AIR on the same side in a second hard cut, rising no higher than the height
of his own ear-fins, his CLAW hand snapping out beside it in an empty raking gesture, fingers spread,
closing on nothing. BOTH CUTS TOGETHER LAND BY THE SIXTY PERCENT MARK and touch nothing at any point -
no surface, nothing bursts and nothing appears anywhere in the frame; each stop is absorbed as a hard
judder through his own frame. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME
ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE THROUGHOUT - he may FOLD and SINK, but he never TURNS.
HE HOLDS the second cut's finish through the rest of the third quarter, frame rigid, both fangs still;
and only in the final quarter does he draw the cleaver back through the same path into its EXACT
reference angle as he rises into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Two cuts, one beast, final.

## special_3  (THE BEAST BIND) — the deep haunched crouch held and loaded, released in one drop
SPECIAL FINISHER (the beast bind): he begins in the EXACT reference stance, his body angled toward
screen-right exactly as it is in the reference image; the cleaver takes NO part beyond riding his body -
it stays locked in his WEAPON hand at its exact reference angle the entire clip, never rotating, never
rising. IN THE FIRST QUARTER he COILS: his whole frame drops into a deep haunched crouch over both
planted feet - knees folding fully beneath him, haunches sinking low, his snouted head dropping between
his shoulders - while his CLAW hand closes finger by finger into a crushing FIST at his own chest height.
HE HOLDS THAT LOADED CROUCH FROM THE END OF THE FIRST QUARTER UNTIL THE SIXTY-FIVE PERCENT MARK, bearing
down harder the whole time and never striking at all: his thighs, back and shoulders shudder under the
load straight up and down, his plating rattles, the fist at his chest trembles with the strain - both
feet staying exactly on the small spot they stand on the entire time, nothing beneath them ever
breaking, cracking or appearing. AT THE SIXTY-FIVE PERCENT MARK the crouch BOTTOMS OUT in one final short
heavy compression, his whole frame jolting down a hand's width, absorbed entirely in his own knees. THE
WHOLE FINAL QUARTER is his slow controlled rise back to full height, the CLAW hand spreading finger by
finger back open into its reference curl, his weight easing up without either foot lifting, into the
EXACT same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Coiled, seismic, silent.
