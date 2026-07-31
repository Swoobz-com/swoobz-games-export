# RAIJU NAGINATA — MK FINAL playable #5. Full 13-clip kit. Phase 105.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/raiju-naginata-anchor-green.png`. He was carried on
the roster as BLOCKED on a "two-tone plate". That block is LIFTED, and the numbers are below — but read
the WATCH item at the end of the budget before the first clip is trusted.

## ★ RAIJU FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **1134w x 1044h** (fills 68.0% of frame height), bbox x202..x1335,
y468..y1511.
  LEFT **202px** · RIGHT **200px** · HEADROOM **468px** · bottom 24px, free (hind paws on the floor line).

**WHO OWNS EACH EDGE — this is the whole kit in one line: BOTH LATERAL EDGES BELONG TO THE POLEARM, NOT
TO HIM.**
  · LEFT edge x202 is the brass **BUTT-SPIKE tip**, occupying just 3 rows (y1006..y1008).
  · RIGHT edge x1335 is the **BLADE TIP**, occupying just 14 rows (y606..y619).
  · TOP edge y468 is his own **EAR-TIP**, 4 columns wide (x572..x575).
  · BOTTOM y1511 is his rear-paw claws (x289..x293).
His own body is nowhere near an edge: his STANDING FOOTPRINT runs x224..x777 (554px, rear-paw claws to
leading-paw claws), leaving 224px of clear plate on his left and 759px on his right. **He is not the
containment risk. The 1200px pole is.** Bound the two TIPS, never his paws.

  1. **THE WEAPON IS 1200px LONG AGAINST 468px OF CEILING — 2.56x the headroom.** Butt-spike (202,1007)
     to blade tip (1335,612), lying 19.2 degrees above horizontal. It may NEVER go vertical and NEVER go
     overhead. His grip sits at about (850,781): **514px of blade in front of the paw, 686px of shaft
     behind it.** Those two levers are the arithmetic every beat below is checked against.
  2. **THE ANCHOR POSE SITS EXACTLY ON BOTH LATERAL BOUNDS AT ONCE — so the shaft can only get STEEPER,
     never shallower.** At 19.2 degrees the tip lands on x1335 and the spike lands on x202 to the pixel.
     Rotate the shaft toward horizontal by ANY amount and BOTH ends move outward together: at 10 degrees
     the tip is at x1356 and the spike at x174; flat level with the ground it is x1364 and x164. That is
     29px past the right bound and 38px past the left one AT THE SAME TIME. So: **no beat in this file
     ever swings the shaft through or below horizontal.** The suffix says it as "its shaft never flattens
     out level with the ground".
  3. **IT IS A DOUBLE-ENDED LEVER — every degree one end moves, the other moves 1.33x as far.** A
     "small" tilt is not small at the far tip. ONE ceiling bounds both: **neither end ever rises above
     the height his own EAR-TIPS have in the reference image.** That keeps all 1200px of pole out of the
     468px of headroom entirely, and it is satisfiable — a tip-up tilt to that ceiling is a 16-degree
     rotation, no more.
  4. **A TIP-UP TILT IS LATERALLY SAFER THAN THE ANCHOR ITSELF, AND IT IS HOW HE HITS THE GROUND.**
     Steepening to 35 degrees pulls the blade tip IN from x1335 to x1271 and pushes the butt-spike IN
     from x202 to x288 — both further from their edges — while driving the spike DOWN 393px. Add a 320px
     body sink and the spike reaches the floor at (288,1494) with the blade still at (1271,806), inside
     every bound. **That is the character's signature move and it is geometrically privileged.**
  5. **THE SPIKE IS HIS GROUND WEAPON; THE BLADE IS HIS AIR WEAPON.** The rear lever is longer than the
     front one, so at any positive angle the butt-spike reaches the stone FIRST — the blade edge cannot
     be driven into the floor without crossing the banned horizontal band. Every floor-splitting beat in
     this kit therefore comes from the BUTT-SPIKE, his CLAWS, or his own paws grinding. The blade cuts
     air. This is a constraint, not a compromise: it is what makes his kit read differently from every
     other polearm on the roster.
  6. **DOWN IS THE ONLY FREE DIRECTION FOR THE WHOLE WEAPON.** Sliding it toward screen-left saves the
     blade and busts the spike; sliding it toward screen-right saves the spike and busts the blade. Only
     a straight DOWNWARD drop moves neither end toward an edge — and the bottom edge is free, since
     `check-containment.mjs` treats paws-on-floor as expected and never counts it. So his committed
     motion is a body SINK, and the weapon rides down with him at its own angle.
  7. **SPAN: 1.35x is the cap.** `measure-anchor-budget.mjs` computes max spanPeak 1.35x for this plate
     and the hard roster rule caps at 1.60x — the smaller wins, so **1.35x**. In pixels that is 1531 of a
     1536 frame: his total lateral growth budget across the whole clip is 402px, split 202 left and 200
     right, and the two prop tips already hold both. A lunge widens BOTH ways and busts it. Nothing in
     this kit lunges, thrusts or reaches.
  8. **HE CARRIES NO BAKED GLOW — VERIFIED, NOT EYEBALLED.** Over all 279,640 subject pixels there are
     **ZERO** with all three channels at 250 or above; 285px (0.10%) reach 235 on all three, 880px (0.31%)
     reach 225. The brightest pixel on the whole character is 245/254/255 at x1325,y628 — one specular hit
     on the honed edge of the blade. Inside the blade box (x1020..x1335, y560..800, 14,433 subject px):
     zero at 250, 228 at 235, i.e. 1.6% of the blade. Probing the chroma outward from the blade: 1px off
     the tip reads 14/122/52 and 20/124/59 — DARKER than the screen, which is an anti-aliased contact
     edge, not a bloom — converging to flat plate green by 4-16px; straight up off the blade spine at
     x1300 it is flat plate (5/150/24) by 16px. Off his BODY there is no transition at all: 1px off his
     back reads 0/170/22 and 1px off his head 0/170/24, the plate colour exactly. **The kitsune-blocker
     class does NOT apply.** His pale blade is polished steel with a temper line, and the cyan on his fur
     is a rim LIGHT in the plate's own lighting — neither is emissive.
  9. **THE REAL RISK IS AN INVENTED DISCHARGE, NOT AN EXISTING ONE.** He is a lightning-beast with a
     white blade, so the model will reach for arcs, bolts, sparks and crackle unprompted. The suffix
     therefore pins the edge, the temper line, the steel rings and the fur rim-light to reference
     brightness and bans lightning BY NAME, and every effect in this kit is opaque matte rock.
 10. **PLATE — the two-tone flag is CLEARED, with one standing watch item.** The metric that flagged him
     still flags him: his top 8-level green bin (0/160/16) holds only 62.87% of the backdrop, below the
     ~70% two-tone suspect threshold. But that is the wrong metric — what `key-idle-clips.mjs` actually
     keys against is the BORDER-SAMPLED screen colour, here 2/164/21, and against THAT: **99.18% of
     backdrop pixels sit within 29, and 99.86% within TIGHT=45.** The single worst pixel is 70.0 away at
     x273,y1509 — a contact shadow under his rear paw, an edge pixel, not the rectangle. Keying the plate
     with the real TIGHT=45 / LOOSE=70 border-seeded algorithm produces a clean silhouette with no
     rectangular edge. **Do NOT re-plate him.**
     **WATCH — the only open risk on this character:** all of the above was measured on the STILL. A
     generated clip carries compression and motion blur that can widen the spread past TIGHT. **The FIRST
     keyed clip must be inspected for a rectangular alpha edge before the other twelve are fired.**

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME towering bipedal white tiger-beast from the reference image (identical thick white and
> pale-grey fur marked all over with dark slate-blue tiger stripes across his shoulders, chest, flanks,
> arms and thighs, an enormous slabbed feline musculature with heavy shoulder and thigh mass, a broad
> feline head carried in profile with a short white muzzle, a small dark-pink nose, one pale ice-blue eye
> under a heavy brow, long white cheek-ruffs, two tall pointed ears with pale pink inner ear, and jaws
> open in a fixed silent snarl showing long white fangs and dark gums; a stiff spiked crest of dark
> slate-blue fur running from between his ears down the back of his neck and out over his shoulders; a
> heavy scratched STEEL COLLAR - a wide dented pale-steel band, gouged and battle-worn - locked around
> the base of his thick neck; long white forearms, big padded paws and blunt dark-grey claws on both his
> hands and his broad splayed hind paws; and gripped in his leading paw a long NAGINATA - a straight
> shaft wrapped in olive-brown cord binding, banded with polished pale-steel rings, a squat brass ferrule
> where the blade seats, a long single-edged curved steel blade with a dark grey body, a bright honed
> pale edge and a wavy temper line running its length, and a conical brass BUTT-SPIKE on the far end of
> the shaft - the whole weapon carried across his body on a low diagonal, blade forward and high toward
> screen-right, butt-spike back and low toward screen-left), standing on a solid saturated GREEN chroma
> screen (bright green #00b140, nothing pink or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> His white and slate-blue striped fur, his spiked crest, his cheek-ruffs and pointed ears, his pale
> ice-blue eye, the scratched steel collar at his neck, his dark claws and the naginata all stay EXACTLY
> the same the entire clip. He keeps the naginata gripped in his own paw the whole time and never drops
> or swaps it. The pale honed edge of the blade, its wavy temper line, the polished steel rings on the
> shaft, the brass ferrule and the pale blue-white rim light along his fur all stay exactly as bright as
> they are in the reference image and never brighten, flare, spark, arc, crackle, trail or throw light
> onto anything, and no lightning, glow, flame, aura, beam, halo, mist, smoke or energy of any kind ever
> appears anywhere in the shot. The naginata stays FULLY INSIDE the frame at ALL times and NEVER extends
> past any edge of the frame: the BLADE TIP never travels further toward screen-right than it does in the
> reference image, the BUTT-SPIKE never travels further toward screen-left than it does in the reference
> image, and NEITHER END of the naginata is EVER raised above the height his own EAR-TIPS have in the
> reference image. While it is in his grip the naginata is NEVER swung fully vertical, NEVER raised
> overhead, NEVER thrust or reached out ahead of him and NEVER swung round so that its BLADE passes
> behind him - it only ever drops with his body, tilts a short way about his own grip, or turns in
> place, and its shaft never flattens out level with the ground. His REAR PAW never travels further toward screen-left than it does
> in the reference image. HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, never
> leaps, never hops and never lunges out into a wide stance; he keeps his stance narrow and never spreads
> wider than about one and a quarter times his standing width. He stays FACING SCREEN-RIGHT the entire
> clip and NEVER rotates or turns to face the camera, and his body holds the SAME angle to camera it has
> in the reference image - it never opens further toward the viewer and never turns away. His jaws stay
> exactly as they are in the reference image - fixed in the same open snarl, never opening wider, never
> closing and never chattering - and he never talks, never shouts, never roars and never bites. The
> camera is absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY
> figure in frame at all times, nothing else added. He begins and ends on the EXACT same reference
> stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. FIVE literals above are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS ITS OWN SENTENCE. The KO-SUFFIX RULE strips it on `keeps the ... never drops or
swaps`. Raiju DOES drop the naginata when he goes down, so the strip is wanted — and writing it as a
standalone sentence is what stops the strip taking the identity lock with it as collateral.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not PAWS. The ko
rewrite matches that exact literal; spell it "PAWS" and the rewrite silently misses and a prone collapse
ships with its feet locked flat.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`, so
the ko rewrite rescopes it to WHILE HE IS ON HIS FEET. Verified: his ko builds it once, not twice.

(d) THE POLEARM-MOTION SENTENCE IS SCOPED `While it is in his grip`. Without that scope it is a direct
contradiction on the ko — a naginata lying on the stone beside a fallen fighter IS flat and level with
the ground, and the unscoped sentence would forbid exactly what the ko acting line orders. The scope
makes the whole sentence vacuous the instant the weapon leaves his paw, and changes nothing for the
other twelve states. The same sentence bans the swing-round as `so that its BLADE passes behind him`
and NOT as the shorter "never swung round behind him", which was the first wording and which
CONTRADICTED three of his own acting lines on the read-through: his butt-spike is ALREADY behind him in
the anchor, so `strike_b`, `victory` and `special_1` all correctly swing the far end of the shaft DOWN
behind him, and the short wording read as a ban on exactly that. Naming the BLADE keeps the law that
actually matters — a blade swept round to his back drags his torso square to camera — without forbidding
the butt end from doing its job.

(e) THE DEBRIS TAIL FOLLOWS SKULLREND/PALE-CHOIR/JIN, not minotaur: it ends "at the end there is no
shed, torn, broken or kicked-up material anywhere in the shot" rather than "the last frame shows ONLY
the fighter and what the fighter holds". On his ko he holds nothing — the naginata is on the stone
beside him — so the minotaur tail would be an order to make his own dropped weapon disappear. Law 7
(first==last) is carried per-state instead: every non-ko action line ends "back into the EXACT same
reference stance".

FACING, judgement call: **PARTLY OPEN, not strict profile — read at FULL SIZE and confirmed on three
separate crops, not off a contact sheet.** His HEAD is a clean strict profile facing screen-right: one
pale-blue eye, full profile of brow, muzzle, nose and open snarl, both ears pricked with the near ear
larger. His TORSO is not — his chest and belly present a broad frontal plane with the midline running
down the centre of the visible mass rather than along a silhouette edge, and both shoulders read as
separate volumes with the trailing arm carried back and clear of the body. His HIPS and LEGS are open
further still: both thighs read as distinct volumes with clear air between them, and **BOTH hind paws
show their full TOPS with every claw splayed across the width** — impossible in true profile, where one
foot would sit edge-on behind the other. So no line in this file orders "strict side profile", which
would order the model to re-pose him toward pure profile mid-clip and fight his own anchor; every line
says "angled to camera exactly as in the reference image and facing screen-right", and the suffix bans
the turn in BOTH directions. This is the same verdict as minotaur-axe, skullrend-orcus, pale-choir and
jin-goldenhand — four of six MK plates and now five — and it is NOT the frontal-plate blocker (IR-41
class): his face, his stance line and his whole line of attack are committed to screen-right.

HE IS ONE-PAWED ON THE SHAFT, on purpose: the plate shows the naginata gripped by his LEADING paw only,
with the shaft running back beneath his trailing arm and past his hip, and his trailing forepaw hanging
free and closed at hip height about 150px clear of the shaft. That free paw is a real second weapon and
three states use it. When a beat needs two paws on the shaft he CLAPS the free one on — which is not a
swap and does not touch the weapon lock.

NO BITE AND NO ROAR ANYWHERE, on purpose: his jaws are already open in the reference and the suffix
freezes them there, so a bite, a roar or a snap would contradict a law he already carries.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN KICKED GRIT AND SPLIT FLOOR-STONE the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his naginata and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chips, shards and grains of broken grey floor-stone and hard grey grit, opaque, sharp-edged, matte and lit like rock - never a glow, never a flame, never a spark of light, never an arc, never a bolt, never an aura, never mist or smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own chest and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading paw toward screen-right, never past his rear paw toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a heavy rooted predator stance, his weight sunk and even over both planted hind
paws, the naginata held steady across his body on the low diagonal it has in the reference. ONE full slow
breath fills the first half of the clip and a second fills the second half: on each one his slabbed chest
and ribs swell and sink, the stripes over his shoulders and flanks shift with the muscle beneath, his
shoulders lift STRAIGHT up and settle back down, his broad head lowers a fraction on his thick neck the way a
hunting cat sizes up the ground in front of it and rises again, his ears swivel back and prick forward,
the claws of his free trailing paw flex open and close, and his whole weight sinks a fraction STRAIGHT DOWN through BOTH of his planted paws at once and rises again, and it NEVER transfers from one to the other. The whole naginata rides DOWN with him a finger's width and back up on
every breath, holding the same angle throughout, and the spiked crest along his neck and his long
cheek-ruffs ripple faintly as he moves. His jaws stay fixed in the same open snarl and do not move at
all. Paws planted, silent and coiled. Returns to the exact start pose so it loops seamlessly. Slow,
controlled, subtle motion.

## attack_strike A  (falling edge)
STRIKE A (falling edge): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he loads his weight back over
his rear paw, his hind legs coiling and his shoulders lifting STRAIGHT up; then he DROPS his entire mass straight
DOWN over both planted paws in one committed sink, his hips folding deep and his chest coming down over
his leading knee, and he hauls the whole naginata DOWN with him at the exact angle it holds in the
reference so the honed edge shears down through the air from his own chest height to below his own knee.
The weapon does not rotate and does not travel sideways; it falls because HE falls. As he lands his
weight his rear paw grinds hard DOWN into the stone on his screen-LEFT side and rips EXACTLY THREE grains of hard
grey grit UP off the floor, each grain no bigger than one of his own claws, rising no higher than his own
hock and spreading no wider than his own standing footprint - never past his leading paw toward
screen-right and never past his rear paw toward screen-left - every grain crumbling away to nothing in
mid-air as it falls; nothing else sheds and nothing else breaks, this is a clean edge. THE CUT HAS
LANDED BY THE HALFWAY POINT OF THE CLIP; he HOLDS the sunk stance through the third quarter, shoulders
heaving, while the last grains crumble away, and only in the final second does he rise slowly and settle
back into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Fast for his size, heavy, silent.

## attack_strike_b  (rising edge, spike into the stone)
STRIKE B (rising edge): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he sinks his hips into a low braced crouch
over both planted paws and coils his shoulders back toward screen-left; then he drives up out of his hind
legs and SNAPS the blade TIP UP in one short savage rising cut, the whole shaft turning about his own
gripping paw - the tip rising no higher than the height his own ear-tips have in the reference image -
while the far end of the shaft swings DOWN behind him and the brass BUTT-SPIKE punches DOWN into the
stone beside his rear paw, on his screen-LEFT side. His hips and shoulders drive the turn and his whole trunk rises out of the crouch
behind it. Where the spike bites it knocks EXACTLY THREE chips of split grey floor-stone UPWARD, each
chip no bigger than one of his own claws, rising no higher than his own knee and spreading no wider than
his own standing footprint - never past his leading paw toward screen-right and never past his rear paw
toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THE CUT IS COMPLETE BY
THE HALFWAY POINT; he HOLDS the finish with the spike still set in the stone through the third quarter
while the last chips crumble away, and only in the final second does he draw the weapon back to the
EXACT angle and height it has in the reference image and settle into the EXACT same reference stance, so
that he is already standing completely still in the reference pose well before the clip ends. Fast,
rising, brutal.

## attack_throw A  (shaft press, solo-safe)
THROW A (shaft press): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he claps his free trailing paw onto the
shaft so the naginata is held in both paws across the front of his own chest, and CLAMPS an unseen weight
between the shaft and his own chest at his own chest height in EMPTY AIR - there is NO opponent and no
second figure, and nothing else is in the frame at any time. THE CLAMP IS SET BY THE END OF THE FIRST
THIRD; then he wrenches his shoulders, spine and hips straight DOWN in one committed drive, his hind legs
folding deep and his whole mass going down behind it, rolling the shaft a short way STEEPER as it goes so
that the lower length of the shaft and the brass butt-spike drive DOWN into the stone together beside his
rear paw, on his screen-LEFT side, and THE SLAM HAS LANDED BY THE HALFWAY POINT. EXACTLY FIVE chips of split grey
floor-stone and hard grit are knocked UPWARD where the shaft comes down, each chip no longer than one of
his own claws, rising no higher than his own knee and spreading no wider than his own standing footprint
- never past his leading paw toward screen-right and never past his rear paw toward screen-left - every
piece crumbling away to nothing in mid-air as it falls. He HOLDS the low finish through the third quarter
while the last chips crumble away, and only in the final second does he rise, take his free paw off the
shaft and let the naginata ride back to the EXACT angle and height it has in the reference image, into
the EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Grounded, crushing, final.

## attack_throw_b  (claw seize and drive-down, solo-safe)
THROW B (claw seize and drive-down): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST THIRD he brings his free trailing paw IN
across his own chest and CLOSES it on an unseen weight at his own chest height in EMPTY AIR - never
reaching further toward screen-right than his own leading shoulder, and with NO opponent, no second
figure and nothing else in the frame at any time. Then he drops his hips under it and folds his whole
mass straight DOWN, hauling that closed paw down and IN past his own leading thigh and slamming the
weight into the stone beside his leading paw, his hind legs collapsing into a deep crouch and his
shoulders driving down behind the throw, so THE THROW HAS LANDED BY THE HALFWAY POINT. The naginata rides
straight DOWN with his body at the exact angle it holds in the reference and takes no part in this beat -
it never rotates and never swings. EXACTLY FIVE chips of split grey floor-stone are knocked UPWARD where
the weight comes down, each chip no longer than one of his own claws, rising no higher than his own knee
and spreading no wider than his own standing footprint - never past his leading paw toward screen-right
and never past his rear paw toward screen-left - every piece crumbling away to nothing in mid-air as it
falls. He HOLDS the low finish through the third quarter while the last chips crumble away, and only in
the final second does he rise back into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Fast, rooted, savage.

## attack_block A  (shaft brace)
BLOCK-COUNTER A (shaft brace): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he claps his free trailing paw onto the
shaft so the naginata is held in both paws, and SINKS his whole weight straight DOWN behind it into a
deep braced crouch, both elbows tight to his ribs, his chin tucked and his hind legs taking the load - so
the cord-wrapped shaft stands braced across the front of his own chest at the same angle it holds in the
reference, a solid bar between him and the pressure. The weapon does not rotate and does not travel
sideways; it drops with his body and nothing else. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF
THE CLIP as he absorbs the pressure - both hind paws grind a fraction on the stone without either one
leaving the spot it stands on, his forearms shake under the load, his shoulders roll and reset, his ribs
heave and the striped muscle across his back tightens and eases - but the braced shaft itself does not
move and nothing else in his body travels. IN THE FINAL QUARTER he drives one short hard shove straight
UP out of his hind legs behind the braced shaft, rising only back to his own standing height and no
further, then takes his free paw off the shaft and flows in one eased motion back into the EXACT same
reference stance. Nothing sheds and nothing breaks. Braced, immovable, silent.

## attack_block_b  (collar guard)
BLOCK-COUNTER B (collar guard): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he drops his chin hard toward his own
chest, rolls his leading shoulder up and forward and hunches his whole back over it so the heavy
scratched STEEL COLLAR at his neck is what meets the pressure, his spiked crest standing up along his
nape, his weight settling back over his rear paw - and he hauls the naginata DOWN and still at his own
side, where it hangs low, dead and taking no part. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE
HALF OF THE CLIP - both hind paws grind a fraction on the stone without leaving the spot they stand on,
his neck, back and shoulders shudder under the load, his ribs heave, and the naginata stays low and
dead-still and never rises and never swings for one frame of it. IN THE FINAL QUARTER he drives up out of
his hind legs and shrugs one short heavy shoulder-and-collar shove, the top of his own head rising no
higher than it sits in the reference image, then lets the weapon ride back to the EXACT angle and height
it has in the reference image and flows in one eased motion back into the EXACT same reference stance.
Nothing sheds and nothing breaks. Braced, compact, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his head and shoulders snap back and to screen-LEFT, his muzzle flying up,
his spiked crest whipping, his spine folding and his hind legs buckling under his own weight - but BOTH
HIND PAWS STAY EXACTLY WHERE THEY STAND, he does not step back and he does not skid, and every bit of the
recoil is absorbed in his knees, hips and trunk instead. His free trailing paw is jarred IN tight against
his own ribs and its claws snap shut. The naginata is jolted straight DOWN with his body and holds the
angle it has in the reference the whole way - it never rotates, never swings and never rises. THE RECOIL
PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance through the middle of the clip - his
weight rolling back over his rear paw toward screen-left, his cheek-ruffs and crest whipping, his
shoulders juddering and his ribs heaving. IN THE LAST THIRD he catches his balance, straightens up out of
his hind legs and flows in one eased recovery back into the EXACT same reference stance, so that he is
already standing completely still in the reference pose well before the clip ends. His chest and face
lead the recoil; his back is never shown. Nothing sheds and nothing breaks. He is ALONE in an empty frame
- nothing whatsoever enters, crosses or appears in the frame at any time, and there is no light, no
flare, no arc and no streak anywhere in the shot. Only his own body and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his hind legs give way beneath him, his
head drops, his shoulders slump, his grip opens and the naginata falls out of his paw. He goes down onto
his knees and chest on the spot he stands on without travelling forward, his paws never leaving the
stone as he folds down over them. BY THE HALFWAY POINT he has crumpled heavily forward and down and come
to rest fully prone and motionless, face down and heavy, still turned toward screen-right, and the
naginata has come to rest on the stone across his own fallen body with its blade toward screen-right and
its butt-spike toward screen-left, BOTH ends lying nearer his body than they sit in the reference image
and neither end anywhere near an edge of the frame. ONE thin scuff of hard grey grit is knocked UPWARD
off the floor where he lands, the grains no bigger than one of his own claws, rising no higher than his
own fallen shoulder and staying within one body-width of where he comes down, every grain crumbling away
to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he
does not stir, does not lift his head, does not push up on a paw and he does NOT get back up - and the
fallen naginata lies exactly where it came to rest and does not move again. He is ALONE in an empty frame
- nothing whatsoever enters, crosses or appears in the frame at any time. Only his own body and his own
fallen weapon move.

## victory  (blade flick, no roar)
VICTORY (blade flick): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he snaps the blade TIP UP once
in one short crisp flick about his own gripping paw and lets it fall straight back to the angle it holds
in the reference, the way a swordsman shakes an edge clean - the tip rising no higher than the height his
own ear-tips have in the reference image and the far end of the shaft swinging a short way DOWN behind
him and back - and at the same time he sinks his weight DOWN and even over both planted hind paws, his
shoulders dropping and his chest already heaving. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT
LOW SETTLED CARRY and only his head, ears and chest move - his ribs swell and sink with two slow deep
breaths, his ears flatten back and prick forward again, the spiked crest along his neck settles, and his
head dips once in a short controlled bow and lifts again no higher than it sits in the reference image.
His paws, hips and shoulders stay exactly where they are: he does not step, does not pivot, does not
straighten up onto his toes, does not lift the weapon and does not turn his head or his body toward the
camera at any point. His jaws stay fixed in the same open snarl and he makes no sound. IN THE FINAL
QUARTER he rises slowly, letting the naginata ride back to the EXACT angle and height it has in the
reference image, and settles into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing breaks.
Composed, coiled, spent.

## special_1  (STORM ANCHOR) — the butt-spike driven through the flagstone, his whole weight on it
SPECIAL FINISHER (storm anchor): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he coils his whole body back and DOWN
over his rear paw, his hind legs folding, his shoulders lifting STRAIGHT up and his head dropping between them.
Then he releases all of it at once: he drives his entire mass straight DOWN into a deep sunk stance and
at the same moment rolls the shaft STEEPER about his own gripping paw - the blade end rising a short way
and drawing IN closer to his own body, no higher than the height his own ear-tips have in the reference
image, while the far end of the shaft drives DOWN behind him - and he punches the brass BUTT-SPIKE clean
DOWN through the flagstone beside his rear paw, on his screen-LEFT side, with everything he has. AT THE HALFWAY POINT the stone
SPLITS around the spike: EXACTLY SEVEN chips of solid broken grey floor-stone are blasted UPWARD around
it, each chip no longer than one of his own claws, rising no higher than his own knee and spreading no
wider than his own standing footprint - never past his leading paw toward screen-right and never past his
rear paw toward screen-left - every piece crumbling away to nothing in mid-air as it falls. The debris is
SOLID BROKEN ROCK: opaque, chipped, sharp-edged, matte and lit like stone - never a glow, never a flame,
never a spark of light, never an arc. HE HOLDS THE SUNK STANCE THROUGH THE WHOLE THIRD QUARTER with the
spike still buried in the split stone and his whole weight leaning down onto the planted shaft, his
shoulders heaving and the striped muscle in his thighs shuddering, while the last chips crumble away.
Only in the final second does he draw the spike back out of the stone, let the naginata ride back to the
EXACT angle and height it has in the reference image and rise into the EXACT same reference stance, so
that he is already standing completely still in the reference pose well before the clip ends. Rooted,
crushing, final.

## special_2  (THUNDERCLAW) — the free paw's claws driven into the stone and ripped back
SPECIAL FINISHER (thunderclaw): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; in the first moments the naginata rides straight DOWN with
his body at the exact angle it holds in the reference and STAYS there, low and still, FOR THE WHOLE REST
OF THE CLIP - it never rotates, never rises and never swings, and takes no part in this beat. IN THE
FIRST QUARTER he sinks his hips into a deep braced crouch over both planted hind paws and cocks his free
trailing paw IN to his own chest with the claws splayed wide, never drawn back past his own rear hip;
then he drives those claws straight DOWN into the stone in front of his own leading paw with his whole
mass folding down behind them from the shoulders and hips, and AT THE FORTY PERCENT MARK they bite in.
He RIPS them back and IN across the stone toward his own rear paw, travelling toward screen-LEFT in one
short savage drag, staying in front of his own body the whole way and never swinging behind him, and
stopping well short of that rear paw. EXACTLY FIVE slabs of solid grey floor-stone are torn UPWARD off
the ground by the claws as they come, each slab no bigger than his own closed paw, rising no higher than
his own knee and spreading no wider than his own standing footprint - never past his leading paw toward
screen-right and never past his rear paw toward screen-left - every slab cracking apart and crumbling
away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, flat, sharp-edged, matte
and lit like stone - never a glow, never a flame, never a spark of light, never a bolt. HE HOLDS THE DEEP
CROUCH THROUGH THE WHOLE THIRD QUARTER, shoulders heaving and the claws still resting on the stone where
the drag ended, while the last slabs crumble away. Only in the final second does he draw that paw back
in, rise slowly and settle into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Low, savage, final.

## special_3  (WHITEBLADE FALL) — a coiled crouch held under load, then his whole mass dropped behind the edge
SPECIAL FINISHER (whiteblade fall): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he coils his entire body into a deep
sunk crouch over both planted hind paws - his hind legs folding hard beneath him, his back arching, his
head dropping between his shoulders, his gripping paw locking down on the cord binding and his free
trailing paw clamped in tight against his own ribs. HE HOLDS THAT COILED CROUCH FROM THE END OF THE FIRST
QUARTER UNTIL THE FIFTY PERCENT MARK, loading harder the whole time - his thighs, back and shoulders
shuddering under the load, his ribs heaving, his weight grinding down through both hind paws without
either one leaving the spot it stands on. THEN AT THE FIFTY PERCENT MARK he releases everything in ONE
committed drop of his whole mass, folding his hips and chest straight DOWN and hauling the entire
naginata DOWN with him at the exact angle it holds in the reference, so the honed edge shears down
through the air in one flat falling cut from above his own shoulder to below his own knee. The weapon
does not rotate and does not travel sideways; it falls because HE falls, and all of his weight lands
through both hind paws at once. The flagstone SPLITS beneath them: EXACTLY SIX chunks of solid broken
grey floor-stone are blasted UPWARD around his paws, each chunk no bigger than his own closed paw, rising
no higher than his own knee and spreading no wider than his own standing footprint - never past his
leading paw toward screen-right and never past his rear paw toward screen-left - every chunk cracking
apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque,
chunky, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light,
never a flash. HE HOLDS THE LANDED CROUCH THROUGH THE WHOLE THIRD QUARTER, shoulders heaving over the
split stone, while the last chunks crumble away. Only in the final second does he rise slowly, the
naginata riding back up with him to the EXACT angle and height it has in the reference image, into the
EXACT same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Coiled, immense, final.
