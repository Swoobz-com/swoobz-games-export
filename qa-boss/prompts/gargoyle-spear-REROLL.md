# GARGOYLE SPEAR — RE-ROLL prompts (SAME kit as gargoyle-spear.md, GREEN, faces screen-right, no
# hflip). Same shared prefix/suffix as gargoyle-spear.md, reused VERBATIM below. Only the SIX state
# bodies that failed v1 are rewritten here, each with the measured reason it was rejected and the
# fix applied. Build with:
#   node qa-boss/build-prompt.mjs qa-boss/prompts/gargoyle-spear-REROLL.md <state>
#
# Character: the exact same hulking stone gargoyle with a winged stone spear, off the SAME anchor
# plate as the base kit: qa-boss/anchors/mk/gargoyle-spear-anchor-green.png. Faces screen-right
# natively, no hflip anywhere in this file. GREEN chroma (#00b140).
#
# THE SIX v1 REJECTIONS, ONE LINE EACH:
#   attack_strike_b -> a rectangular stone statue plinth / museum display base stood under his feet
#                       for the WHOLE clip, present from the very first frame through the last
#                       (anchor 0.699/0.655 - a constant, not a drift). FIX: state the no-surface ban
#                       at the FIRST frame as well as the last, and drop the "buried spike" / "cracks
#                       the floor" framing and the debris beat entirely, since that language is the
#                       likeliest thing cueing the model to invent something solid to embed the spike
#                       in.
#   attack_throw_b  -> a tiled stone pavement / flagstone floor grew in under his feet by the last
#                       frame (anchor f0 0.935 -> fLast 0.474 - clean at the start, contaminated by
#                       the end). FIX: the same no-surface ban, stated once at the open and again -
#                       harder - at the settle, exactly where v1 broke, with the debris beat dropped
#                       for the same reason as strike_b.
#   attack_block    -> FRONTAL for the entire clip: square to camera, both wings spread wide open,
#                       the spear held flat and horizontal across the chest. Anchor 0.431 at BOTH f0
#                       and fLAST - the worst score in the kit, and constant rather than drifting.
#                       FIX: the locked-angle bound is stated INSIDE the beat itself rather than left
#                       to the shared suffix alone, the spear is explicitly forbidden from ever going
#                       horizontal-across-chest, and the wing-freeze law is restated in this state's
#                       own acting line.
#   attack_block_b  -> the trailing wing membrane pushed the LEFT frame edge with a long contiguous
#                       contact run at mid-clip, far past the containment gate's threshold and the
#                       house feather band. FIX: the hunch leans IN and toward screen-right instead of
#                       straight back, and an explicit bound stops the wing crest / trailing membrane
#                       from ever travelling further toward screen-left than the reference image,
#                       restated at the deepest point of the hunch where the old push happened.
#   hit             -> pushed the LEFT edge hard early in the clip and the RIGHT edge a little later.
#                       The base kit's own FIRST-CLIP WATCHES predicted this exact failure ("hit's
#                       backward lean carrying the wing crest toward the left margin - if hit fails
#                       containment LEFT, shrink the lean, not the bound"). FIX, following that ruling
#                       exactly: the recoil is rewritten as a small, contained flinch instead of a
#                       real weighted stagger - less rotation, less distance, no compensating swing
#                       the other way.
#   attack_throw    -> loose broken-rock debris was still visibly lying on the ground at the last
#                       frame, and the beat drifted toward screen-left late in the clip. FIX: a
#                       positively-stated debris-cleared assertion placed at the point in the beat
#                       where v1 failed (the recovery), plus an explicit stay-planted bound restated
#                       through the hold and the recovery, where the drift happened.
#
# Every fix stays inside the kit's own laws: wings never spread/open/unfurl/flare/beat/lift (kit-
# wide, unchanged); he is STONE, so no cloth-sway on the tassets and no membrane-flutter; zero
# positive uses of dust/smoke/mist/haze/spray anywhere; he is the ONLY figure in frame at all times;
# every one of these six begins AND ends on the EXACT reference stance (none of them is a ko).
#
# JUDGEMENT CALL for the record: attack_block's fix below writes "his body holding the exact angle to
# camera it holds in the reference image" (the kit's established three-quarter-open phrasing) rather
# than a literal strict-profile order. The base kit's own FACING note already ruled this plate is
# three-quarter open, not true profile, and frame 0 is pinned to that reference by the anchor lock -
# ordering true strict profile against it would be the exact anchor-vs-bound conflict that
# permanently blocked ir41-kasa-oni. The catastrophic "square to camera" failure is fixed instead by
# stating the locked-angle bound INSIDE the beat and banning the horizontal-across-chest spear
# position by name, which is the same working formula the kit's ACCEPTED strike states already use.

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

## attack_strike_b (STRIKE B, butt-spike bite — v2, NO PLINTH)
# REJECTED (v1): a rectangular stone statue plinth / museum display base stood under his feet the
# WHOLE clip, present from the very first frame through the last (anchor 0.699/0.655). THE FIX: state
# the no-surface ban at the FIRST frame, not only at the end, drop the "buried spike" / "cracks the
# floor" framing that likely cued the model to invent something solid to embed the spike in, and drop
# the debris beat entirely rather than risk any stone-on-a-surface language reappearing.
STRIKE B (butt-spike bite): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right, the butt-spike already hanging low toward screen-left,
and HE STANDS ON NOTHING: there is NO plinth, NO base, NO pedestal, NO dais, NO slab, NO step and NO
platform of any kind beneath, behind or around his feet in this first frame - his bare clawed feet
touch nothing but flat empty green, exactly as they do in the reference image. THERE IS NO WIND-UP OF
ANY KIND: he does NOT lift the butt-spike first, does NOT draw it back, and does NOT raise any part
of the weapon before the blow - the spike starts from exactly where it ALREADY SITS in the reference
image and only ever travels DOWN and IN. IN THE FIRST QUARTER his knees fold and his whole stone mass
sinks STRAIGHT DOWN over both planted feet, and through that sink both stone hands drive the shaft
butt-first DOWN and IN, the spear turning a short way about his REAR hand, which stays held in close
at his own waist and never travels out away from his own body: the BUTT-SPIKE stabs down and IN
through empty air until it stops sharply just beside and ahead of his own rear foot's claws -
travelling only down and inward, never further toward screen-left than it hangs in the reference
image, the deep body sink closing the last of the distance. On the far end the barbed HEAD swings a
short way up and IN toward him as the lever turns - drawing INWARD as it lifts, never rising above
the height of his own horn-tips and never travelling further toward screen-right than it sits in the
reference image. THE BITE HAS LANDED BY THE HALFWAY POINT: the spike stops the instant it reaches
that low point beside his foot - it does NOT bury itself, does NOT crack anything, does NOT strike
any surface, and nothing bursts, chips or breaks loose anywhere in the frame. THE LINE OF HIS TWO
SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE
IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never swings round,
and his chest never squares up toward the camera; he may FOLD and SINK, but he never TURNS. He HOLDS
the sunk finish with the spike low beside his foot through the third quarter, and only in the final
second does he draw it back, the spear turning back about his rear hand to the EXACT angle and height
it has in the reference image as he rises into the EXACT same reference stance - AND AT THAT FINAL
MOMENT, EXACTLY AS AT THE FIRST, HE STANDS ON NOTHING: still no plinth, no pedestal, no base, no dais,
no slab, no step and no platform anywhere beneath him, only flat empty green under his own clawed
feet - so that he is already standing completely still in the reference pose well before the clip
ends. Short, brutal, downward.

## attack_throw_b (THROW B, horn toss — v5, CONTAINED: head-and-neck only, body does not move)
# REJECTED (v1): a tiled stone pavement / flagstone floor grew in under his feet by the last frame
# (anchor f0 0.935 -> fLast 0.474 - clean at the start, contaminated by the end). THE FIX: the same
# no-surface ban as strike_b, stated once at the open and again - harder - at the settle, since that
# is exactly where v1 broke, and the debris beat is dropped entirely for the same reason.
THROW B (horn toss): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right, and HE STANDS ON NOTHING: there is NO floor, NO tiles, NO
flagstones, NO paving and NO ground surface of any kind visible anywhere beneath or around his feet
in this first frame - only flat empty green, exactly as it is in the reference image. THE VERY FIRST
FRAME IS THE REFERENCE STANCE EXACTLY: the same bent-knee crouch, the same body height, the same head
height and the same distance from camera as the reference image - he does NOT begin standing taller,
straighter or higher in frame than the reference image, and THE LAST FRAME OF THE CLIP MATCHES THAT
FIRST FRAME EXACTLY, the same height and the same footing, as if the clip could loop. THE LINE OF HIS
TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never swings
round, and his chest NEVER squares up or opens toward the camera at any point, not even for one frame;
he may DIP and JAB, but he never TURNS. There is NO
opponent, NO second figure and NO body anywhere in the frame at any time - his horns strike NOTHING,
and NOTHING is ever caught, lifted, tossed or thrown; the jab passes through empty air only, and
nothing new ever appears in the shot. THIS IS A CONTAINED BEAT: the ONLY thing that really travels in
this whole clip is his HEAD AND NECK. HIS BODY BARELY MOVES AT ALL - his torso, hips, legs and wings
hold the reference stance from the first frame to the last, and his SILHOUETTE NEVER GROWS: he never
gets bigger in frame, never comes closer to the camera and never spreads wider than he is in the
reference image. IN THE FIRST QUARTER he DIPS his horned head a short way DOWN toward the shaft held
across his body - a small, low dip, his knees softening only a fraction beneath him - and the spear
takes no part in this beat: it stays locked in both stone hands at its exact reference angle, riding
with him and never swinging toward either side edge. HE DOES NOT COIL INTO A DEEP CROUCH, DOES NOT
ERUPT, DOES NOT DRIVE UPWARD, DOES NOT RISE, DOES NOT JUMP, DOES NOT LEAP AND DOES NOT SPRING OFF THE
GROUND at any point: he STAYS AT THE EXACT HEIGHT HE HAS IN THE REFERENCE IMAGE for the entire clip.
HIS CLAWED FEET NEVER LOSE CONTACT WITH THE GROUND FOR EVEN ONE FRAME and the soles of his feet hold
the exact same line in every single frame; the top of his horns never rises above where it sits in the
reference image and the lowest point of his body never lifts off the green.
THEN, FROM THAT STILL BODY, his horned head SNAPS forward in ONE short savage horn-jab through the
empty air on his screen-right side, horns leading, driven from his thick neck and shoulders alone while
his hips and both feet stay exactly where they are - his muzzle staying pointed toward screen-right the
whole way: his face NEVER tips up toward the sky, NEVER turns toward the camera, and his horn-tips rise
no higher than the crest of his own folded wings has in the reference image. HIS TWO WINGS STAY PRESSED
FLAT AND FOLDED AGAINST HIS BACK THROUGH THE WHOLE JAB - they do not spread, do not open and do not
swing out, and NO PART OF EITHER WING EVER TOUCHES OR CROSSES THE LEFT EDGE OF THE FRAME at any moment;
the strip of green along the left edge stays completely empty and unbroken from the first frame to the
last. THE JAB PEAKS BY THE HALFWAY POINT and it DEAD-STOPS there - the abrupt stop and the strain of
the hold are what carry the impact, not travel - and it lands on NOTHING - no floor cracks, no surface breaks, nothing bursts loose and nothing
is ever knocked up from beneath him; his foot-claws grip and flex against the bare green but nothing
chips, splits or scatters anywhere in the frame. THROUGH THE THIRD QUARTER he settles his horned head
back down onto his thick neck, the spear riding back up with him to the EXACT angle and height it has
in the reference image, and in the final quarter he settles into the EXACT same reference stance -
AND AT THAT LAST FRAME, HARDER THAN AT ANY OTHER MOMENT IN THE CLIP, HE STANDS ON NOTHING: no floor,
no tiles, no flagstones, no paving, no ground surface, no plinth and no platform of any kind has
appeared beneath, behind or around him at any point - the green beneath his own clawed feet stays
exactly as flat, empty and unbroken as it was in the very first frame, so that he is already standing
completely still in the reference pose well before the clip ends. Low, still, savage.

## attack_block A (BLOCK-COUNTER A, shaft brace — v2, LOCKED ANGLE)
# REJECTED (v1): FRONTAL for the entire clip - square to camera, both wings spread wide open, the
# spear held flat and horizontal across the chest. Anchor 0.431 at BOTH f0 and fLAST - the worst score
# in the kit, and constant rather than drifting. THE FIX: state the locked-angle bound INSIDE the beat
# itself rather than trust the suffix alone, forbid the spear from ever going horizontal-across-chest
# by name, and restate the kit-wide wing-freeze law directly in this state's own acting line.
BLOCK-COUNTER A (shaft brace): he begins in the EXACT reference stance, his body holding the exact
angle to camera it holds in the reference image and facing screen-right, his two great stone wings
FOLDED flat against his back exactly as they are in the reference image - not a crack of daylight
between the membrane and his spine. IN THE FIRST QUARTER both stone hands SLIDE IN toward each other
along the shaft - staying closed around it the whole way - and he SINKS his whole weight straight
DOWN behind it into a deep braced crouch over both planted feet, elbows tight against his own ribs,
horned head tucked down, knees taking the load - so the stone shaft stands braced across the front of
his own chest at the SAME SHALLOW DIAGONAL it holds in the reference image: IT NEVER LEVELS OUT,
NEVER GOES HORIZONTAL and NEVER SQUARES ACROSS HIS CHEST at any point in the clip, holding that one
diagonal angle from the first frame to the last. The spear does not turn and does not travel
sideways; it drops with his body and nothing else. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS
TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his
near shoulder never comes forward, his far shoulder never swings round, and his chest NEVER squares
up or opens toward the camera at any point, not even for one frame; he may SINK and BRACE, but he
never TURNS. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure
- both clawed feet grind a fraction on the stone without either one leaving the spot it stands on,
his forearms shudder under the load, his stone shoulders judder and settle straight up and down, and
his folded wings press in TIGHTER against his back - but the braced shaft itself does not move and
nothing else in his body travels. HIS WINGS STAY FOLDED FLAT AGAINST HIS BACK FOR THE WHOLE CLIP: the
ONLY motion they ever make is that tightening press-in or a small shiver under the load - they NEVER
spread, NEVER open, NEVER unfurl, NEVER flare, NEVER beat and NEVER lift even a fraction, and no gap
of green ever opens between the membrane and his spine. IN THE FINAL QUARTER he drives one short hard
shove straight UP out of his knees behind the braced shaft, rising only back to his own standing
height and no further, then both hands slide back out to the exact grips they hold in the reference
image and he flows in one eased motion back into the EXACT same reference stance, his body still
holding that same locked angle to camera it held in the very first frame. Nothing sheds and nothing
breaks. Braced, immovable, side-on.

## attack_block_b (BLOCK-COUNTER B, pauldron guard — v2, CLEAR OF LEFT EDGE)
# REJECTED (v1): the trailing wing membrane pushed the LEFT frame edge with a long contiguous contact
# run at mid-clip, far past the containment gate's threshold and the house feather band. THE FIX: the
# hunch is rewritten to lean the whole guard IN and toward screen-right instead of hunching straight
# back, and an explicit bound stops the wing crest / trailing membrane from ever travelling further
# toward screen-left than it sits in the reference image, restated at the peak of the hunch where the
# old push happened.
BLOCK-COUNTER B (pauldron guard): he begins in the EXACT reference stance, angled to camera exactly
as in the reference image and facing screen-right. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS
TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his
near shoulder never comes forward, his far shoulder never swings round, and his chest NEVER squares
up or opens toward the camera at any point, not even for one frame; he may HUNCH and SINK, but he
never TURNS. IN THE FIRST QUARTER he drops his horned head hard
toward his own chest, LIFTS his near shoulder straight up a fraction under its carved pauldron, and
hunches his whole back down and IN toward his own leading side - never rocking back toward
screen-left - so the carved pauldron and the swept stone horns are what meet the pressure, his weight
sinking straight DOWN through both planted feet - and he lowers the whole spear with the hunch to a
low dead carry in front of his own thighs, both hands still closed on it, the shaft holding the exact
angle it has in the reference image all the way down, neither end ever travelling toward either side
edge, where it hangs low and takes no part. THROUGHOUT THE HUNCH HIS FOLDED WINGS NEVER TRAVEL
FURTHER TOWARD SCREEN-LEFT THAN THEY SIT IN THE REFERENCE IMAGE: the wing crest and the trailing
membrane hold their own reference position at every single frame of the hunch, pressing IN tighter
against his back rather than swinging out toward the edge, and no part of them ever drifts left of
where they already sit. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both
clawed feet grind a fraction on the stone without leaving the spots they stand on, his neck, back and
shoulders shudder under the load straight up and down, his folded wings shiver and press in TIGHTER
against his back, and the spear stays low and dead-still and never rises and never swings for one
frame of it. AT THE DEEPEST POINT OF THE HUNCH, WHERE THE LOAD IS HEAVIEST, HIS WINGS STILL NEVER
PASS THEIR OWN REFERENCE POSITION TOWARD SCREEN-LEFT - the trailing membrane stays tucked in against
his spine, well clear of the left edge of the frame, the whole time. IN THE FINAL QUARTER he drives
straight up out of his knees with one short heavy shoulder-and-horn shove - the top of his own head
rising no higher than it sits in the reference image - then lets the spear ride back UP to the EXACT
angle and height it has in the reference image and flows in one eased motion back into the EXACT same
reference stance. Nothing sheds and nothing breaks. Compact, hunched, inboard.

## hit (HIT stagger — v2, SHRUNK LEAN)
# REJECTED (v1): pushed the LEFT edge hard early in the clip and the RIGHT edge a little later. The
# base kit's own FIRST-CLIP WATCHES predicted this exact failure ("hit's backward lean carrying the
# wing crest toward the left margin - if hit fails containment LEFT, shrink the lean, not the bound").
# THE FIX, following that ruling exactly: the recoil is rewritten as a small, contained flinch instead
# of a real weighted stagger - less rotation, less distance, no compensating swing the other way.
HIT (small flinch): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS
HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near
shoulder never comes forward, his far shoulder never swings round, and his chest NEVER squares up or
opens toward the camera at any point, not even for one frame; he may FLINCH, but he never TURNS. His
horned head and both shoulders twitch back toward
screen-LEFT in ONE small, short, contained flinch - NOT a real stagger, NOT a deep lean and NOT a
weighted recoil - the motion is SHALLOW and BRIEF, his spine barely creasing and his knees only
softening a fraction under him. BOTH FEET STAY EXACTLY WHERE THEY STAND: he does not step back, does
not skid and does not shift his weight from one foot to the other, and every bit of the flinch is
absorbed in a small backward tilt of his head and shoulders alone, never in his hips or his stance.
THE FLINCH IS SHORT: his head and shoulders travel back only a SMALL, LIMITED distance - no more than
a hand's width - and the wing crest that rides above his shoulders travels with them NO FURTHER
TOWARD SCREEN-LEFT than that same small distance, staying well clear of the left edge of the frame at
every single moment of the clip. Both stone hands clamp harder on the shaft and the whole spear
twitches a small amount straight DOWN with his body, holding the exact angle it has in the reference
image the whole way - it never turns, never swings and never rises - and his folded wings give one
small shiver against his back without ever opening even a crack and without ever travelling further
toward screen-left than they already sit. THE FLINCH PEAKS ALMOST IMMEDIATELY, WITHIN THE FIRST
EIGHTH OF THE CLIP, and for the rest of the clip he simply holds still and settles - there is no
further lean, no second recoil and no drift toward either side edge at any point. IN THE LAST THIRD
he straightens back up out of that small tilt and flows in one eased, minimal recovery back into the
EXACT same reference stance, his body never having left the small patch of ground it started on. His
snarling face leads the flinch; he holds a STRICT SIDE PROFILE from the first frame to the last,
exactly as in the reference image, and his chest never squares up or opens toward the camera at any
point. Nothing sheds and nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters,
crosses or appears in the frame at any time, and there is no light, no flare, no wisp and no streak
anywhere in the shot. Only his own body and his own weapon move, and only a little.

## attack_throw A (THROW A, dead-stop ram — v7, CONTAINED: first third is DEAD STILL, only the spear turns)
# REJECTED (v1): debris still lying on the ground at the last frame + drift toward screen-left.
# REJECTED (v2): rubble-persist and LEFT both FIXED, but a chip escaped the RIGHT edge (72px @f40,
#                ground level, measured at col959 y836-907).
# REJECTED (v3): WORSE — containment breached THREE edges (TOP 96px @f42 x816-911, LEFT 6px @f40,
#                RIGHT 50px @f38 y678-727), and the frames showed WHY: a flagstone SLAB rendered under
#                his feet from f0 (f0 floor-band 26.59% vs ~15.8% on every other clip in the kit) and
#                the chips came out HEAD-SIZED and shoulder-high, against a prompt demanding
#                "no bigger than one of his own toe-claws" and "no higher than his own knee".
#                v3 already carried FIVE debris bounds; a sixth was not a plan.
# ROOT CAUSE: the beat asked for a violent floor-ram with shattering stone ON A GREEN CHROMA PLATE, and
#                the prompt's own "the ONLY thing his weapon touches is the bare flagstone floor" is
#                what cued the slab. The state was fighting itself.
# TIM'S RULING (2026-08-06, session 31): THE RAM STOPS ON NOTHING. No floor, no chips; the weight and
#                the HOLD carry the impact. This is exactly how `attack_strike_b` is written, and both
#                clips in this kit that strike NOTHING passed clean — strike_b (extra-objects CLEAN,
#                containment CLEAR, best-in-kit stance 0.158) and throw_b (floor-growth -0.03pp,
#                1 blob, containment CLEAR). THE FIX: every floor and every debris clause deleted, the
#                no-surface ban stated at the FIRST frame and again at the LAST, and the third-quarter
#                hold rewritten to carry the impact.
THROW A (dead-stop ram): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right, and HE STANDS ON NOTHING: there is NO floor, NO flagstone, NO
tiles, NO paving, NO slab, NO plinth and NO ground surface of any kind visible anywhere beneath, behind
or around his feet in this first frame - his bare clawed feet touch nothing but flat empty green,
exactly as they do in the reference image. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS
HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his near
shoulder never comes forward, his far shoulder never swings round, and his chest NEVER squares up or
opens toward the camera at any point, not even for one frame; he may WRENCH and RAM, but he never
TURNS. There is NO opponent, NO second figure and NO body anywhere
in this clip - he seizes nothing, grips nothing new, and nothing is ever caught, carried or dragged on
the spear at any time, and HIS WEAPON TOUCHES NOTHING AT ALL from the first frame to the last.
THERE IS NO WIND-UP AND NO PREPARATION IN THIS CLIP: he does NOT gather himself, does NOT draw back,
does NOT rise, does NOT straighten and does NOT lift ANY part of himself before the ram. IN THE FIRST
THIRD HIS BODY DOES NOT MOVE AT ALL - his torso, hips, legs, feet, head and wings hold the exact
reference stance, dead still, at the exact reference height, and the ONLY thing that moves in that
first third is THE SPEAR TURNING IN HIS HANDS. His silhouette does not grow, he does not come closer
to the camera and his wings do not open a crack while the spear turns.
THROUGH THAT STILL FIRST THIRD he turns the spear a short way head-down about his locked REAR hand -
that rear hand
staying closed low on the shaft, held in close at his own waist, never travelling out away from his own
body - until the barbed head points DOWN at the empty green just ahead of his own leading foot's claws,
the head at every moment NEARER to his own body than it sits in the reference image and never further
toward screen-right, while at the far end the BUTT-SPIKE swings a short way up and IN toward his own
hip, never rising above his own hip and never travelling further toward screen-left than it sits in
the reference image. THEN he wrenches his entire stone tonnage straight DOWN through both folding knees
and RAMS the barbed head DOWN THROUGH EMPTY AIR until it STOPS SHARPLY a hand's width above the bare
green just ahead of his own leading foot's claws - THE RAM HAS LANDED BY THE HALFWAY POINT - and it
stops the instant it reaches that low point: IT DOES NOT BURY ITSELF, DOES NOT CRACK ANYTHING, DOES NOT
STRIKE ANY SURFACE, and NOTHING
bursts, chips, splits, breaks loose or scatters anywhere in the frame at any moment. THE BARBED HEAD IS
THE END THAT GOES DOWN, AND IT STAYS DOWN: from the moment it starts travelling until the final quarter
the barbed head is the LOWEST part of the spear, pointing DOWN at the green near his own leading foot,
and IT NEVER RISES ABOVE HIS OWN HIP at any point in the ram, the hold or the recovery. THERE IS NO
UPWARD WIND-UP OF HIS BODY BEFORE THE RAM: he does NOT rise, does NOT lift, does NOT grow taller and
does NOT come up onto his toes at any point before or during the drive - the ram is loaded by FOLDING
DOWN, never by going up first. HE STAYS AT THE EXACT HEIGHT HE HAS IN THE REFERENCE IMAGE OR LOWER FOR
THE ENTIRE CLIP and never above it, and HIS CLAWED FEET NEVER LOSE CONTACT WITH THE GROUND FOR EVEN ONE
FRAME - the soles of his feet hold the exact same line they hold in the reference image in every single
frame, the lowest point of his body never lifts off the green, and he never jumps, never leaps, never
hops and never springs off the ground. THE SPEAR IS
NEVER SWUNG FULLY VERTICAL, NEVER RAISED OVERHEAD, NEVER LIFTED ABOVE HIS OWN SHOULDERS AND NEVER
PLANTED BUTT-DOWN LIKE A STANDARD: it stays low and across his body on its shallow diagonal, and NO
PART OF THE SPEAR - not the barbed head, not the wing-vanes, not the shaft and not the butt-spike -
EVER TOUCHES OR CROSSES THE TOP EDGE OF THE FRAME, or rises above the crest of his own folded wings, at
any moment of the clip; the strip of green along the top edge stays completely empty and unbroken from
the first frame to the last. THERE IS NO
DEBRIS IN THIS CLIP AT ALL: no chip, no shard, no rubble, no dust, no cloud, no haze, no smoke and no
loose stone of any kind ever appears anywhere in the shot, and the green along the top, left and right
edges of the frame stays completely empty and unbroken from the first frame to the last. THE DEAD STOP
AND THE HOLD ARE WHAT CARRY THE IMPACT - his whole stone mass arrives and halts, and the weight is
read in the abrupt stop and in the strain of the hold, never in flying stone. HE STAYS EXACTLY WHERE HE
PLANTED HIMSELF FOR THE WHOLE CLIP: through the hold and through
the recovery alike he never drifts toward screen-left, never edges toward screen-right and never
travels from the spot his feet found at the ram - both feet stay on that same patch of ground from the
first frame to the last. He may FOLD and SINK, but he never TURNS - his chest never squares up toward
the camera. He HOLDS THE LOW FINISH through the third quarter, his whole weight bearing down the shaft
onto the stopped point, his stone shoulders juddering under his own load, the spear dead still and the
frame around him completely empty. Only in
the final quarter does he draw the point back up, turn the spear back about his rear
hand to the EXACT angle and height it has in the reference image and rise into the EXACT same
reference stance, staying on that same planted spot the whole time - AND AT THAT LAST FRAME, EXACTLY AS
AT THE FIRST, HE STANDS ON NOTHING: no floor, no flagstone, no tiles, no paving, no slab, no plinth and
no ground surface has appeared beneath, behind or around him at any point, and nothing whatsoever is
left lying anywhere in the frame - only he and his spear, exactly as the first frame shows them, the
green beneath his own clawed feet as flat, empty and unbroken as it was in the very first frame.
Grounded, crushing, final.
