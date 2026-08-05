# LICH SCYTHE — RE-ROLL prompts (browser Unlimited Seedance, GREEN, faces right)
# Same shared prefix/suffix as lich-scythe.md (qa-boss/anchors/mk/lich-scythe-anchor-green.png). He
# faces SCREEN-RIGHT natively; no hflip anywhere in this kit. Only the TWO state bodies below are
# rewritten, each with the measured reason its v1 was rejected. Build with:
#   node qa-boss/build-prompt.mjs qa-boss/prompts/lich-scythe-REROLL.md <state>
#
# attack_throw (dead-weight drive) — the END pose collapses: fLASTall 0.274 against f0all 0.923. It
# must RETURN to the exact reference stance by the final frame. v1's text already said "only in the
# final second does he rise into the EXACT same reference stance ... well before the clip ends" and
# still measured 0.274 — so a one-line return promise budgeted at "the final second" is not enough on
# this beat. THE FIX gives the recovery the WHOLE SECOND HALF of the clip and asserts the rise is
# COMPLETE, not merely begun, by the last frame.
# ⚠ lich note: his scythe spans nearly the full width of the plate and BOTH lateral edges belong to the
# weapon (see his FRAME BUDGET in lich-scythe.md, rule 1), so the swing arc stays well inboard here too
# — v1 ALSO pushed LEFT 59px on this throw. The suffix already bounds both ends directionally and that
# bound was already ignored once, so per the standing rule (a bound never beats a beat; narrow the
# action instead) this rewrite adds a RIGID-LOCK clause describing HOW the weapon holds its lateral
# position through the load/drive/rise instead of repeating the suffix's directional wording a second
# time.
#
# special_1 (grave furrow) — END pose broken, fLASTall 0.512. Same class of fix: the recovery gets the
# whole second half of the clip, asserted as COMPLETE by the last frame. The furrow itself is also
# named explicitly as something that must be gone by the final frame — it never opens as a visible
# scar in the floor to begin with, so there is nothing left over to fail to vanish.

Character: a towering undead lich-king — bare weathered ivory-bone skull, deep empty eye sockets, a
violet flame burning in his near eye socket and a taller one out of his spiked iron crown, a deep
dusty-purple hood and layered robe with torn ragged hems, bare pale ribcage showing through, skeletal
hands and taloned feet, gripping a long two-handed bone-and-steel scythe carried on a low diagonal.
Faces: right (native, no hflip). GREEN chroma. MK FINAL playable #6.
Anchor: qa-boss/anchors/mk/lich-scythe-anchor-green.png.

Shared prefix:
> The EXACT SAME towering undead lich-king from the reference image (identical bare weathered ivory-bone
> SKULL for a head with deep empty eye sockets, an open nasal cavity, high sharp cheekbones and a fixed
> lipless grin of squared bone teeth, a small VIOLET FLAME burning in his near eye socket; a tall spiked
> CROWN of dark tarnished iron and bone sitting low on that skull, its long points swept up and back, a
> violet gem in its front plate, and a taller VIOLET FLAME burning up out of the crown between those
> points; a deep dusty-purple HOOD fallen back onto a high stiff collar edged in pale bone-grey and
> antique gold; a long layered dusty-purple ROBE over a dark under-tunic, every hem torn into ragged
> points and every panel edged in pale bone-grey and antique gold banding, worn open down the front so
> his bare pale RIBCAGE and sternum show through; a long gold-edged TABARD panel hanging down the middle
> of the robe to his knees and a wide purple SASH at his waist under a bone-grey buckle plate; a layered
> bone-grey and steel PAULDRON on one shoulder and a spiked bone shoulder-guard set with a violet gem on
> the other; bare SKELETAL HANDS of pale finger bones, both forearms wrapped in purple cloth and dark
> leather straps; and bare SKELETAL FEET with four long curved ivory TALONS on each, the ankles bound in
> purple wrap under gold-edged cuffs; and gripped in BOTH of those bone hands a long two-handed SCYTHE -
> a pale bone HAFT bound with dark leather at both grips, a heavy knobbed BONE BUTT at its far end with
> a short steel CHAIN hanging from it carrying one curved bone TALON CHARM, and at its near end a short
> spine of bone vertebrae running into a broad bone SOCKET-HEAD with a hooked bone BACK-SPUR curving up
> and back, from which sweeps a long single-edged crescent BLADE of pale weathered steel, its back
> notched and its inner edge honed bright, the point curling down and back in toward him - the whole
> weapon carried across his body on a low diagonal, blade forward and high toward screen-right, bone
> butt and chain back and low toward screen-left), standing on a solid saturated GREEN chroma screen
> (bright green #00b140, nothing pink or magenta in the BACKGROUND; the violet stays only on his own
> crown flame, his own eye socket and his own two gems).

Shared suffix (carries the prompt laws — every state inherits these):
> His bone skull, spiked iron crown, hood, the dusty-purple robe with its torn hems and gold banding,
> his bare ribcage, sash and tabard, his pauldron and spiked shoulder-guard, his wrapped forearms, his
> skeletal hands, his taloned feet and the whole bone-and-steel scythe all stay EXACTLY the same the
> entire clip. The scythe stays gripped in his own skeletal hands the entire clip - it is never
> released, never let go, never exchanged and never replaced by anything else, and his LEADING bone hand
> is closed on the haft in every single frame. The VIOLET FLAME in his crown and the smaller one in his
> eye socket stay EXACTLY the same SIZE and the same SHAPE they have in the reference image - they never
> grow, never billow, never spread, never leave his own skull and never throw light onto anything - and
> they, his two violet gems, the honed edge of the blade and the antique gold banding on his robe all
> stay exactly as bright as they are in the reference image and never brighten, flare, spark or trail.
> NO SECOND FLAME EVER APPEARS ANYWHERE IN THE SHOT - the only fire in the whole clip is the one already
> burning in his crown and eye socket in the reference image - and no glow, aura, beam, halo, ring of
> light, wisp, spirit, mist, smoke or energy of any kind ever appears anywhere in the shot. The scythe
> stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame: the BLADE never travels
> further toward screen-right than it does in the reference image, the knobbed BONE BUTT and the hanging
> chain and its bone charm never travel further toward screen-left than they do in the reference image,
> and NO PART of the scythe is EVER raised above the height his own CROWN SPIKES have in the reference
> image. His LEADING bone hand never rises above the height it has in the reference image, and his REAR
> FOOT never travels further toward screen-left than it does in the reference image. While it is in his
> grip the scythe is NEVER swung fully vertical, NEVER raised overhead, NEVER thrust or reached out
> ahead of him and NEVER swung round so that its BLADE passes behind him - it only ever drops with his
> body, turns a short way about his own gripping hands, or rolls in place about its own shaft. HIS FEET
> STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and never lunges
> out into a wide stance; he keeps his stance narrow and never spreads wider than about one and a
> quarter times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or
> turns to face the camera, and his body holds the SAME angle to camera it has in the reference image -
> it never opens further toward the viewer and never turns away. His jaws stay exactly as they are in
> the reference image - fixed in the same lipless grin, never opening, never closing and never
> chattering - and he never talks, never shouts, never screams and never laughs. The camera is
> absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure in
> frame at all times, nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN SPLIT FLOOR-STONE AND GRAVE-STONE GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his scythe and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real slabs, chunks, chips and grains of broken grey floor-stone and hard grey grave-stone grit, opaque, sharp-edged, matte and lit like rock - never a glow, never a flame, never a spark of light, never a wisp, never a spirit, never an aura, never mist or smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles, and NO SECOND FLAME ever appears - the only fire in the shot is the violet flame already burning in his crown and eye socket in the reference image, and it never grows and never spreads. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own ribcage and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading foot toward screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## attack_throw A  (dead-weight drive — v2, HARD RETURN TO THE REFERENCE STANCE)
THROW A (dead-weight drive): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right. HE NEVER CHANGES HIS GRIP: his LOWER bone hand stays
locked on the haft held in close at his own waist and his LEADING bone hand stays exactly where it
grips in the reference image - he does NOT slide either hand along the haft, does NOT draw his hands
together, and does NOT bring the shaft up across his chest. THE SCYTHE NEVER DRIFTS: through the load,
the drive and the rise alike, both the blade end and the knobbed bone-butt end stay LOCKED at the exact
lateral position they hold in the reference image - neither end ever creeps toward screen-left or
screen-right by even a few pixels, at any point in the clip, including during the recovery - and the
whole weapon holds the EXACT low diagonal angle it has in the reference image for the entire clip.
IN THE FIRST QUARTER he simply loads: his knees fold and his weight sinks. IN THE SECOND QUARTER he
wrenches his shoulders, spine and hips straight DOWN in one committed drive, his knees folding deep and
his whole dead mass going down behind it into a deep sunk stance, and it is HIS OWN TALONED FEET that
drive into the stone, so THE SLAM HAS LANDED BY THE HALFWAY POINT. THE SCYTHE ONLY EVER FALLS WITH HIM:
it rides straight DOWN at the reference angle, it does NOT rotate, it is NEVER carried level or
horizontal, it is NEVER thrust, pushed or reached out ahead of him toward screen-right, and the BLADE
NEVER travels further toward screen-right than it does in the reference image. Nothing is held, caught,
seized or carried at any point - there is NO opponent, no second figure and no object of any kind
anywhere in the frame at any time, and the space around him stays completely empty green.
EXACTLY FIVE chips of split grey floor-stone are knocked UPWARD where his talons come down, each chip
no bigger than one of his own FINGER BONES, never a slab and never a boulder, and each one SOLID,
OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising
no higher than his own knee and spreading no wider than his own standing footprint, never past his
leading foot toward screen-right and never past his rear heel toward screen-left, every piece crumbling
away to nothing in mid-air as it falls, all of it gone well before the halfway point. THERE ARE NEVER
MORE THAN FIVE PIECES OF DEBRIS IN THE FRAME AT ONCE.
BOTH OF HIS FEET STAY FLAT ON THE STONE THROUGHOUT - neither heel ever lifts. THE LINE OF HIS TWO
SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE
IN EVERY SINGLE FRAME - he may FOLD and SINK, but he never TURNS. THE ENTIRE SECOND HALF OF THE CLIP IS
SPENT RISING: starting immediately once the slam lands, he straightens up out of the deep sunk stance
smoothly and without pause, and the rise is COMPLETE - not merely begun - well before the clip ends, so
that BY THE FINAL FRAME he is already standing fully upright and motionless in the EXACT same reference
stance, his weight even over both feet, the scythe at the exact angle and height it holds in the
reference image, matching the very first frame of the clip. Grounded, crushing, final.

## special_1  (GRAVE FURROW) — v2, HARD RETURN TO THE REFERENCE STANCE, NO SCAR LEFT BEHIND
SPECIAL FINISHER (grave furrow): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he coils his whole body back and DOWN
over his rear foot, his knees folding, his shoulders drawing IN and DOWN with neither one coming forward
and neither one going back, and his crowned skull dropping between them. THE LINE OF HIS TWO SHOULDERS
AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY
SINGLE FRAME - he may COIL, FOLD and SINK, but he never TURNS. Then he releases all of it at once: he
drives his entire dead mass straight DOWN into a deep sunk stance and at the same moment hauls the
LEADING bone hand DOWN past his own hip, turning the whole scythe blade-first toward the floor about his
own LOWER bone hand, which stays locked on the haft close in at his own waist and never travels out away
from his own body. The far end travels the other way - the knobbed BONE BUTT and its hanging chain swing
UP and round toward his own body, finishing higher and nearer him than they hang in the reference image
and never rising above the height his own crown spikes have there - while the POINT of the crescent
drives DOWN and bites into the flagstone right beside his own leading foot. BY THE THIRTY PERCENT MARK
it is in the stone, and he REAPS it back and IN across the floor toward his own rear heel, travelling
toward screen-LEFT in one short savage drag, the hook staying inside his own standing footprint the
whole way and stopping well short of that rear heel. EXACTLY SIX slabs of solid broken grey floor-stone
are torn UPWARD out of the furrow behind the point as it comes, each one no bigger than one of his own
FINGER BONES, never a boulder, and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud,
never dust, never smoke and never haze - rising no higher than his own knee and spreading no wider than
his own standing footprint - never past his leading foot toward screen-right and never past his rear
heel toward screen-left - every slab cracking apart and crumbling away to nothing in mid-air as it
falls, all six gone well before the halfway point of the clip. The debris is SOLID BROKEN ROCK: opaque,
flat, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light, never
a wisp. THE DRAG LEAVES NO OPEN SCAR BEHIND IT: the flagstone settles back FLUSH the instant the point
passes over it, so nothing is ever visible along the furrow's path except the debris itself, which is
already gone well before the halfway point of the clip - there is no crater, no gouge, no crack and no
groove left showing in the floor at any moment after that. THE ENTIRE SECOND HALF OF THE CLIP IS SPENT
ON THE RECOVERY: he draws the point back up off the flagstone, lets the scythe ride back to the EXACT
angle and height it has in the reference image, and rises into the EXACT same reference stance - and
that rise is COMPLETE, not merely begun, well before the clip ends, so that BY THE FINAL FRAME he is
already standing fully upright and motionless in the EXACT same reference stance, matching the very
first frame of the clip pixel for pixel, with bare unmarked stone beneath him. Low, dragging, final.
