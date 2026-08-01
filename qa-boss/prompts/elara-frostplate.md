# ELARA FROSTPLATE — MK FINAL playable. Full 13-clip kit. Written 2026-08-01 against KIT-WRITING-BRIEF (§2b/§2c/§4b/§4c/§5b applied, plus the three new rules: bound-vs-anchor, hands-by-function, suffix hygiene).
#
# FIRST-CLIP WATCHES (author's):
#   · THE NAME-TRAP — "Frostplate" invites ICE. Her plate shows NONE: no frost, no crystals, no
#     snow, nothing emissive (emissive 0.21). Frost, ice shards, icicles, snow, frost cloud,
#     breath-fog, mist and vapour are banned BY NAME in the suffix; if any ice or fog appears the
#     clip is dead — reroll, do not negotiate with it.
#   · KNIGHT-GENRE INVENTION — a helmet, shield, cloak, cape, plume or banner appearing from
#     nowhere, or the SIDEARM leaving its scabbard. All banned by name in the suffix; any one of
#     them is an identity kill.
#   · THE TIP at only 214px of margin — the single most exposed pixel in the kit. Two states END
#     on a hard outward stop AT the reference extension (strike B, special_3). Watch the first
#     fired one of each for overshoot past the reference tip.
#   · LEFT EDGE 212px — owned LOW by the sheathed sidearm's scabbard tip behind her legs. hit and
#     ko therefore absorb DOWNWARD on the spot, never pitching back toward screen-left. If
#     containment LEFT ever flags, shrink the fold, not the bound.
#   · THE FREE HAND — its reference station is tucked behind the small of her back. It relocates
#     deliberately in exactly FOUR states (block A and special_1's flat-palm press on the blade's
#     FLAT, throw A's empty-air close, victory's hand-over-gauntlet vigil) and returns every time.
#     If a render shows it CLOSING AROUND the blade or the hilt, that is a re-grip defect.
#   · STEEL BLOOM — polished silver plate plus gold trim is the brightest thing on her. If a
#     render "lights" an impact by brightening armour or blade it reads as bloom and keys badly;
#     brightness is pinned to the reference in the suffix. Check white/p99 on the first keyed clip.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/elara-frostplate-anchor-green.png`, pre-screened
before this kit was written: opaque 7.90, emissive 0.21 (nothing baked-lit on her anywhere), transl
6.01 with 26% green-dominant pixels — the green-dominant share (grey hood and silver steel carrying
chroma spill) inflates that translucency figure, which is an upper bound; settled, and no prompt
language addresses it. She faces SCREEN-RIGHT in this plate as fired; this kit assumes no hflip.
The two facts that shape every line below: the width budget is nearly spent in frame 0 — 212px
left under the sidearm's scabbard tip, 214px right under the longsword's tip, so the working
ceiling for every beat is the reference span itself — and the drawn longsword rides HIGH, its arm
fully extended at her shoulder with the tip at her own CHIN height, so the kit's ceiling is the
crown of her own hood (a shoulder cap would contradict frame 0) and its grammar is DOWN and IN.

## ★ ELARA FRAME BUDGET — measured, applies to EVERY clip of hers

Plate 1536x1536. Full subject **~1110w x ~922h** (fills 60% of frame height — comfortable
vertically; that is a RESOLUTION budget too: the engine upscales, so no beat may shrink her, move
her off her spot or carry her away from the camera).
  LEFT **212px** · RIGHT **214px** · HEADROOM **590px** · bottom free (sabaton soles on the floor
  line — `check-containment.mjs` treats feet-on-floor as expected and never counts it).
  Max spanPeak that still fits: **1.38x** standing span — that is the FULL FRAME, not slack. The
  reference silhouette already spends both margins, so the working ceiling for every beat is the
  reference span itself: nothing ever extends past either reference extreme, and the widest beat
  in this kit (throw B's bounded trunk-drive, sword hugged in) stays inside the reference span.

WHO OWNS EACH EDGE:
  · **RIGHT x1322** — the TIP of the drawn longsword, at her own chin height: the forward-most
    point of the whole subject and the single most exposed pixel in the kit.
  · **LEFT x212** — the sheathed SIDEARM's scabbard tip, LOW behind her trailing leg, with her
    rear sabaton's heel just inside it.
  · **TOP y590** — the crown of her own grey HOOD. The whole longsword rides below it, tip at
    her chin.
  · **BOTTOM** — her sabaton soles on the floor line.

  1. **THE WIDTH IS SPENT, SO THE KIT NEVER REACHES.** Every attacking beat travels DOWN and IN
     toward her own body; nothing steps, lunges, leans wide or extends past either reference
     extreme. Body commitment is spent on full-mass sinks, deep folds, one bounded trunk-drive,
     one explosive inward compression-and-release, and sustained loaded holds — never on
     lateral reach.
  2. **BOUND THE TIP, NOT THE HANDS — AND THE CEILING IS THE HOOD, NOT THE SHOULDER.** The
     reference tip already rides ABOVE her shoulder line (at her chin), so a shoulder cap would
     contradict frame 0. Kit-wide: the tip never travels further toward screen-right than it
     sits in reference, never rises above the crown of her own hood, and the longsword never
     goes vertical and never overhead — a full sword length against 590px of headroom does not
     fit upright. Block A's half-sword wall and special_3's rising cut deliberately ride NEAR
     that hood-crown cap.
  3. **THE BLADE GRAMMAR.** Every longsword motion in the kit is one of exactly three things: a
     slide along its own reference line (in toward her body, or back out no further than the
     reference extension), a short turn about her own wrist and gripping fist (falling arcs,
     the guards, the grounded point), or riding with her own sinking and rising body. Her sword
     fist stays in the band between her own chin and her own thigh in every standing state.
  4. **GRIPS ARE FIXED; THE SIDEARM NEVER LEAVES ITS SCABBARD.** The sword hand never opens,
     never slides, never re-seats. The FREE hand's reference station is tucked behind the small
     of her back beside the sidearm's pommel; it relocates deliberately in exactly four states
     (block A press, special_1 press, throw A empty-air close, victory vigil rest), each stated
     in-beat with its return, and it NEVER closes around the longsword's blade or hilt — the two
     presses are FLAT-PALM on the blade's flat. The sheathed sidearm stays fully sheathed in all
     13 states, riding with her hips.
  5. **EFFECTS ARE BROKEN FLAGSTONE ONLY, SOURCED FROM THE FLOOR** — a continuous surface that
     cannot visibly deplete — never chipped off her own armour, which is a countable identity
     feature, and NEVER anything icy: no frost, no shards of ice, no snow, ever. Every debris
     sentence carries an exact COUNT, a per-piece SIZE tied to one of her own small parts (a
     gauntlet knuckle), a SPAN tied to her standing footprint or the named impact point, a
     POPULATION bound, and the inline solidity clause in the same sentence. No banned-class
     noun anywhere in any beat: no dust, no smoke, no spark, no grit, no flash, no spray, no
     mist, no vapour.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME elven knight from the reference image (a tall slender ELF woman in ornate full
> plate armour - pale skin, a calm stern face in profile with a straight nose and set lips, long
> POINTED ELF EARS, and white-blonde hair swept back under a soft GREY cloth HOOD-COIF that covers
> the crown and back of her head and drapes down over the back of her neck to her shoulders; her
> armour polished SILVER-STEEL inlaid everywhere with fine GOLD filigree scrollwork: layered gold-
> edged PAULDRONS on both shoulders, articulated arm plates with ornate elbow couters, steel
> GAUNTLETS, a fitted cuirass, a brown leather belt with straps at her waist, a skirt of long
> ornate TASSETS over dark under-breeches, full leg plates at thigh, knee and shin, and pointed
> gold-trimmed steel SABATONS; standing in a wide fencing stance, leading foot toward screen-right;
> gripped in her fully extended gauntleted SWORD HAND an ornate LONGSWORD held out toward
> screen-RIGHT at her own shoulder height - its GOLD hilt with curved quillons and a ring guard at
> her fist, its long straight slender polished blade running on a shallow just-rising line with its
> TIP at her own chin height, the furthest-right point of her; her FREE arm bent behind her, its
> gauntlet tucked at the small of her back; and sheathed at the back of her belt a SECOND short
> sword, her SIDEARM - its gold pommel and wrapped grip showing above her hip, its long slim dark
> SCABBARD angling steeply DOWN toward screen-LEFT behind her legs, its tip the furthest-left point
> of her), standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing pink
> or magenta anywhere).

Shared suffix (carries the prompt laws — every state inherits these):
> Her grey hood, pointed elf ears, calm stern face, every silver plate and gold filigree line on
> her, both pauldrons, her gauntlets, belt, tassets, leg plates and sabatons, the whole drawn
> longsword and the sheathed sidearm at her belt all stay EXACTLY the same the entire clip -
> nothing is ever added, lost, re-coloured or re-shaped, NO helmet, shield, cloak, cape, plume,
> banner, wings or any new weapon ever appears, every plate of her armour is rigid steel that
> never bends and never flutters, and the grey hood keeps the exact fall it has in the reference
> image and rides with her head - it never streams, never billows, never lifts away, never blows
> back and never slips, and NO wind or moving air of any kind ever appears in the shot. The
> longsword stays gripped in her gauntleted sword hand the entire clip - it is never released,
> never let go, never exchanged, never sheathed and never replaced by anything else, her sword
> hand stays closed on its hilt in every single frame and never slides along it, never re-seats
> and never changes its grip, and no second longsword and no other weapon or new object ever
> appears anywhere in the shot; the SIDEARM at her belt stays fully sheathed in its scabbard the
> entire clip, rides with her hips, and is never drawn, never unsheathed, never removed and never
> raised. Every surface of her stays EXACTLY as bright as it is in the reference image - the
> polished blade and armour never shine brighter, never glint into a flash, never flare and never
> bloom, nothing on her ever glows or lights up, and no glow, aura, beam, halo, ring of light,
> orb, fireball, projectile, wisp, mist, vapour, smoke, fog, fire or energy of any kind ever
> appears anywhere in the shot; NO ice, NO frost, NO ice shards, NO icicles, NO snow, NO frost
> cloud, NO breath-fog and NO crystal of any kind ever appears anywhere in the shot, and her
> armour never turns icy, never frosts over and never turns to crystal or glass - it stays
> exactly the solid polished steel of the reference image. The longsword stays FULLY INSIDE the
> frame at ALL times and NEVER extends past any edge of the frame: its tip never travels further
> toward screen-right than it sits in the reference image, the sidearm's scabbard tip never
> travels further toward screen-left than it sits in the reference image, and NO PART of the
> longsword is ever raised above the crown of her own hood. While it is in her grip the longsword
> is NEVER swung fully vertical, NEVER raised overhead and NEVER swung round so that its tip
> passes behind her - it only ever slides along its own line, turns a short way about her own
> wrist and gripping fist, or rides with her own sinking and rising body. HER FEET STAY FLAT ON
> THE GROUND FOR THE ENTIRE CLIP - she never jumps, never leaps, never hops, never steps and
> never lunges out into a wide stance; she keeps her stance narrow and never spreads wider than
> about one and a quarter times her standing width. She stays planted on the same spot at the
> same distance from the camera the whole clip, with zero net drift in any direction. She stays
> FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the camera, and her body
> holds the SAME angle to camera it has in the reference image - it never opens further toward
> the viewer and never turns away. Her face keeps the same calm stern expression it has in the
> reference image - it never changes - and she never talks, never shouts and never cries out. The
> camera is absolutely locked, no zoom, no pan, her full body always fully in frame, she is the
> ONLY figure in frame at all times, nothing else added. She begins and ends on the EXACT same
> reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line
into the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. The literals below are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, following hector and shiro. The KO-SUFFIX
rule strips any sentence matching `keeps the ... never drops or swaps`; this character never drops
the longsword in any state (her gauntleted fingers never open), so the lock is phrased "stays
gripped in her gauntleted sword hand ... never released, never let go, never exchanged, never
sheathed", which does not match the strip, stays TRUE through a prone collapse, and sits in its own
sentence so no strip takes the identity lock with it. Verify on the built `ko` that both the
identity sentence and the grip sentence survive.

(b) `HER FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not SABATONS —
the ko rewrite matches that exact literal ("FEET NEVER LEAVE THE GROUND"); spell it any other way
and the rewrite silently misses. Consequence honoured kit-wide: NO standing state kneels, stamps
or lifts a sabaton — every impact is delivered flat-footed through sinks, folds, grinds and the
blade. The only knees-to-ground in the kit is the ko collapse, which the rewritten ko suffix
governs.

(c) THE STANCE CLAUSE USES THE CANONICAL `she keeps her stance narrow and never spreads wider
than`, so the ko rewrite rescopes it to while-standing and carries her pronouns through. Do not
re-word it. The ratio stays at one and a quarter: her subject width is set by the blade tip and
the scabbard tip, which are bounded to their reference extremes separately, so the feet never
need more.

(d) THE WEAPON-MOTION SENTENCE deliberately does NOT contain hector's "never thrust or reached
out ahead of him" clause — every elara recovery re-extends the blade OUT to the reference line,
and strike B and special_3 END on a hard outward stop AT it. The outward bound is carried entirely
by the tip cap in the containment sentence ("never further toward screen-right than it sits in
the reference image"), stated ONCE there and at most once per beat. THE CEILING IS THE CROWN OF
HER OWN HOOD kit-wide, NOT her shoulders: the reference tip already rides above her shoulder line
at her chin, so a shoulder cap would contradict frame 0 (the ir41 bound-vs-anchor class). Block A
and special_3 deliberately ride NEAR the hood-crown cap — do not tighten it later without reading
those two states.

(e) THE DEBRIS TAIL ends `exactly as the first frame does.` — the NON-ko form. The assembled `ko`
is rewritten by koSuffix() to end `...anywhere in the shot.`; build BOTH `idle` and `ko` and
confirm they DIFFER at the tail. Never copy the ko tail back into this file.

(f) THE FREE HAND'S reference station is tucked behind the small of her back beside the sidearm's
pommel. It relocates deliberately in exactly FOUR states — block A (flat-palm press on the FLAT of
the blade at its midpoint), special_1 (the same press for the stake-drive), throw A (a close on
empty air at her own chest height), victory (resting closed over the back of her own sword-hand
gauntlet) — each stated in-beat, each returning it behind her back before the anchor return. It
NEVER closes around the longsword's blade or hilt in any state: both presses are open flat palms
on the flat of the blade, and the vigil rest is hand-on-her-own-gauntlet, so the sword hand's
grip never changes in all 13 states, including prone in the ko. The sidearm is never touched in
any state.

(g) HER ONLY CLOTH IS THE GREY HOOD (plus dark under-breeches): the suffix pins it to ride with
her head with NO wind ever. Watch the first keyed clip for invented hood-billow, hair streaming
out from under it, or a blown drape — that is identity drift plus a key hazard, not life.

(h) ROTATIONAL-LICENCE HYGIENE, file-wide: no "roll", no "pivot", no "twist" and no foot-to-foot
weight transfer anywhere in this file — not only in the gated states. Settles are written
straight-down through BOTH feet at once; every blade beat is a slide along its own line or "turns
a short way about" her own wrist, the exemplars' accepted lever forms.

(i) COUNT vs POPULATION COHERENCE: every single-burst beat here has POPULATION EQUAL TO ITS SPAWN
COUNT (strike A 3/3, strike B 3/3, throw A 4/4, throw B 3/3, ko 3/3, special_1 5/5). The two
STAGED beats carry a population below their clip totals with the stagger stated in the same
sentence: special_2 tolls SIX chips in three staged pairs (never more than TWO at once) and
special_3 breaks FOUR in two staged pairs (never more than TWO at once).

(j) THE LEFT EDGE HAS NO RECOIL ROOM: 212px, owned low by the sidearm's scabbard tip behind her
trailing leg. hit and ko therefore absorb DOWNWARD on the spot — the trunk folds over planted
hips instead of pitching back toward screen-left, and the ko names the scabbard tip's leftward
bound during the collapse. If a fired hit drifts left, shrink the fold; the bound is already
correct.

FACING, judgement call: **NEAR-PROFILE toward screen-right, a few degrees CLOSED (turned slightly
away from camera) — NOT a strict profile**, so no line in this file orders "strict side profile".
The evidence, read at full size:
  · HEAD — the most profile-true part of her: straight nose, brow, chin and one visible eye
    silhouette cleanly against the green, one pointed ear reading side-on.
  · TORSO — the tell: the camera reads the BACK of her cuirass and the hood's back drape; her
    chest line is hidden past the near pauldron and the extended sword arm — a few degrees past
    side-on, closed away from the viewer, shiro's direction rather than hector's.
  · WAIST — the free arm crosses BEHIND her back between backplate and camera, and the sidearm's
    hilt at the back of her belt reads fully, which a strict profile would foreshorten.
  · FEET — the decisive test: the leading sabaton points screen-right nearly side-on, but the
    REAR sabaton is turned out toward the viewer and shows the segmented plates of its instep
    top. One clear instep is enough to fail strict profile.
So every acting line says "her body angled to camera exactly as it is in the reference image and
facing screen-right", and the suffix bans the turn in BOTH directions. Her face, blade line,
leading foot and every line of attack commit toward screen-right or straight down.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HER OWN BROKEN FLAGSTONE the green stays completely empty and unbroken; the ONLY things
visible are HER OWN body, her longsword, her sheathed sidearm and HER OWN debris. Every piece of
debris is SOLID MATERIAL - real chips and shards of broken grey flagstone, opaque, sharp-edged,
matte and lit like stone - never a glow, never a flame, never a spark of light, never a wisp,
never an aura, never mist, never smoke, never ice, never frost, never snow, and never a whole
intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles. All of it is
knocked UPWARD and stays low and close to her, rising no higher than her own waist and spreading
no wider than HER OWN STANDING FOOTPRINT - never past the toe of her leading sabaton toward
screen-right, never past the heel of her rear sabaton toward screen-left - and every piece
crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of
it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE
STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a duellist's dead-steady extended guard, her weight sunk and even over
both planted feet, the drawn longsword held out at full arm's reach on the exact shallow line it
holds in the reference image, her free gauntlet tucked at the small of her back. ONE slow full
SETTLING of her whole armoured frame fills the first half of the clip and a second fills the
second half, and EVERY PART of that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY:
on each settling her whole weight sinks a fraction STRAIGHT DOWN through BOTH of her planted feet
at once and rises again - it NEVER transfers from one foot to the other and neither foot ever
carries more of it than the other - her shoulders sink a fraction STRAIGHT DOWN and lift again
with neither one coming forward and neither one going back, her hooded head lowers a fraction
STRAIGHT DOWN on her neck and rises again without ever turning left or right, and the extended
longsword rides DOWN with her a finger's width and back up, holding its exact reference line
throughout. The prop beat inside each settling: the very TIP of the extended blade dips a
half-fist's width STRAIGHT DOWN off its reference line and rises back onto it in one slow
controlled breath of point-discipline - the tip never travelling further toward screen-right than
it sits in the reference image and never rising above the line it holds there - then the long
blade goes from that faint dip to PERFECTLY dead-still level, and the stilling of the point IS
the beat; through it the fingers of her sword hand re-close on the gold hilt one knuckle at a
time WITHOUT the hand ever leaving its grip or sliding along it, and the fingers of her free
gauntlet press and re-close at the small of her back without leaving it. She breathes slow and
even, the rise of her chest barely lifting the cuirass, straight up and down. Her grey hood
holds the exact fall it has in the reference image, swaying only a hair's width with her own
settling and returning to the same fall. THE LINE OF HER TWO SHOULDERS AND THE LINE OF HER TWO
HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - her
near shoulder never comes forward, her far shoulder never swings round, and her chest never
squares up toward the camera; she may SINK, but she never TURNS. Her face keeps its calm stern
set and her gaze stays fixed toward screen-right down the blade. Feet planted, silent, patient.
Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (the falling arc - the point carved down and in, stopped dead through air)
STRIKE A (the falling arc): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right, the drawn longsword already
extended toward screen-right with its tip at her own chin height. THERE IS NO WIND-UP OF ANY
KIND: she does NOT raise the blade first, does NOT draw it back, does NOT lift it even slightly,
her shoulders do NOT rise, and NO PART of the longsword travels upward before the cut - the cut
starts from the exact line the blade ALREADY HOLDS in the reference image and only ever travels
DOWN and IN. IN THE FIRST QUARTER her knees fold and her whole armoured mass sinks STRAIGHT DOWN
over both planted feet, and through that sink her sword arm turns the longsword about her own
wrist and folding elbow, her fist sinking to her own hip: the TIP carves one long falling arc
DOWN and IN through empty air until the blade hangs tip-low at her own shin height, the point
stopped dead just above the flagstone ahead of the toe of her leading sabaton WITHOUT touching
it - the tip at every moment NEARER to her own body than it sits in the reference image, NEVER
thrust and NEVER pushed out toward screen-right, and the deeper the arc falls the closer in it
comes, the whole blade staying in the same vertical plane it holds in the reference image with
its full length always seen side-on. THE CUT HAS LANDED BY THE HALFWAY POINT and the blade never
touches the ground - a clean arc through air, stopped dead by her own control. As her weight
lands, her rear sabaton grinds hard DOWN into the stone and breaks EXACTLY THREE small chips of
hard grey flagstone up off the floor beside that foot, each chip no bigger than one knuckle of
her own gauntlet and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never
dust, never smoke and never haze - rising no higher than her own knee and spreading no wider
than her own standing footprint - never past the toe of her leading sabaton toward screen-right,
never past the heel of her rear sabaton toward screen-left - every chip crumbling away to
nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT
ONCE. BOTH OF HER FEET STAY FLAT ON THE STONE THROUGHOUT - neither heel ever lifts. THE LINE OF
HER TWO SHOULDERS AND THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE
REFERENCE IMAGE IN EVERY SINGLE FRAME - her near shoulder never comes forward, her far shoulder
never swings round, and her chest never squares up toward the camera; she may FOLD and SINK, but
she never TURNS. She HOLDS the sunk finish with the blade hanging low through the third quarter
while the last chips crumble away, and only in the final quarter does she rise slowly, the
longsword turning back up about her own wrist to the EXACT extension and line it has in the
reference image, and settle into the EXACT same reference stance, so that she is already
standing completely still in the reference pose well before the clip ends. Clean, falling,
absolute.

## attack_strike_b  (the recalled thrust - drawn back along its own line, driven out to the reference stop)
STRIKE B (the recalled thrust): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right, the drawn longsword
already extended toward screen-right on its reference line. THERE IS NO WIND-UP OF ANY KIND
ABOVE THAT LINE: she does NOT raise the blade, her shoulders do NOT rise, and NO PART of the
longsword travels upward at ANY moment in the clip - every motion of the blade is a slide along
its own line. IN THE FIRST THIRD her sword arm HAULS the longsword straight back IN along the
exact line it holds in the reference image: her elbow folds, her fist comes back beside her own
ribs, and the whole blade slides back with it until its tip has come back more than a forearm's
length toward her from where it sits in the reference image - the whole longsword at every
moment of this recall NEARER to her own body than it sits in the reference image, its full
length always seen side-on, loaded like a drawn-back spear. THEN, JUST BEFORE THE HALFWAY POINT,
her knees fold and her whole armoured mass drops STRAIGHT DOWN over both planted feet in one
committed sink as her sword arm DRIVES the longsword back OUT along the same line in one hard
level thrust through empty air - and stops it DEAD at the EXACT extension and line it has in the
reference image, never one finger further toward screen-right and never rising above that line,
the stop so absolute that the long blade quivers once from hilt to tip. THE THRUST HAS STOPPED
BY THE FIFTY-FIVE PERCENT MARK. As her mass lands, her leading sabaton grinds hard DOWN into the
stone and breaks EXACTLY THREE small chips of hard grey flagstone up off the floor beside that
foot, each chip no bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE and
sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising no
higher than her own knee and spreading no wider than her own standing footprint - never past the
toe of her leading sabaton toward screen-right, never past the heel of her rear sabaton toward
screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE NEVER MORE
THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. THE LINE OF HER TWO SHOULDERS AND THE LINE OF
HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE
FRAME - her near shoulder never comes forward, her far shoulder never swings round, and her
chest never squares up toward the camera; she may FOLD and SINK, but she never TURNS. FROM THE
SIXTY PERCENT MARK she is already holding the blade on its reference line: through the third
quarter the quiver dies out of the steel and the last chips crumble away while she rises slowly
out of the sink, and in the final quarter she settles into the EXACT same reference stance, so
that she is already standing completely still in the reference pose well before the clip ends.
Recalled, driven, stopped dead.

## attack_throw A  (the empty gauntlet - a close on empty air, solo-safe)
THROW A (the empty gauntlet): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in this clip - nothing is ever caught, hooked, seized, lifted,
dragged, carried or thrown, and no object of any kind ever appears anywhere in the frame. IN THE
FIRST THIRD her sword arm HAULS the longsword IN along its own line to a close guarding carry -
her fist beside her own ribs, the blade riding with it, the whole longsword at every moment of
this clip NEARER to her own body than it sits in the reference image - while DELIBERATELY her
free gauntlet leaves the small of her back and rises open to her own chest height, close in
front of her own breastplate. THEN her knees fold and her whole armoured mass drops STRAIGHT
DOWN over both planted feet in one committed sink as that open free gauntlet sweeps a short flat
arc toward screen-right through the EMPTY AIR at her own chest height and CLOSES ON NOTHING,
stopping dead above the toe of her own leading sabaton - the gauntlet never travelling further
toward screen-right than that toe below it - THAT HAND CLOSES ON EMPTY AIR AND STAYS EMPTY IN
EVERY SINGLE FRAME: nothing is held, caught, squeezed, dragged or carried in it, and it comes
away still empty. THE CLOSE HAS LANDED BY THE HALFWAY POINT. As her mass lands, her leading
sabaton grinds hard DOWN into the stone and breaks EXACTLY FOUR chips of hard grey flagstone up
off the floor beside that foot, each chip no bigger than one knuckle of her own gauntlet and
each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust, never smoke
and never haze - rising no higher than her own knee and spreading no wider than her own standing
footprint - never past the toe of her leading sabaton toward screen-right, never past the heel
of her rear sabaton toward screen-left - every chip crumbling away to nothing in mid-air as it
falls. THERE ARE NEVER MORE THAN FOUR PIECES OF DEBRIS IN THE FRAME AT ONCE. She may FOLD and
SINK, but she never TURNS - her chest never squares up toward the camera and both feet stay flat
and planted. She HOLDS the sunk finish through the third quarter, empty gauntlet closed in the
air, blade close, while the last chips crumble away, and only in the final quarter does her free
gauntlet return to its station at the small of her back as her sword arm extends the longsword
slowly back OUT along its own line to the EXACT extension and line it has in the reference image
and she rises into the EXACT same reference stance, so that she is already standing completely
still in the reference pose well before the clip ends. Compact, iron, empty-handed.

## attack_throw_b  (the pauldron drive - armoured shoulder through empty air, solo-safe)
THROW B (the pauldron drive): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right. There is NO opponent, NO second
figure and NO body anywhere in the frame at any time - her pauldron strikes NOTHING, and NOTHING
is ever caught, lifted, tossed or thrown; the drive passes through empty air only, and nothing
new ever appears in the shot. IN THE FIRST THIRD she coils STRAIGHT DOWN into a deep crouch over
both planted feet, knees folding, chin tucking behind her leading pauldron - and her sword arm
hugs the longsword IN tight, her fist coming back beside her own ribs and the blade riding with
it, so that every part of the longsword draws NEARER her own body than it sits in the reference
image and stays there for the whole middle of the clip, while her free gauntlet stays tucked at
the small of her back. THEN she DRIVES her whole trunk a short way toward screen-right in one
hard armoured shoulder-drive through the empty air on her screen-right side, leading pauldron
first, BOTH feet staying flat and planted exactly where they stand - the drive travels through
her hips and trunk alone, a short way only, her leading shoulder never travelling further toward
screen-right than the toe of her own leading sabaton below it, and even at the peak of the drive
every part of the hugged longsword stays NEARER her own body than it sits in the reference
image. BOTH shoulders travel together the same distance, so THE LINE OF HER TWO SHOULDERS AND
THE LINE OF HER TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY
SINGLE FRAME - her chest never squares up toward the camera; she may LEAN and SINK, but she
never TURNS. THE DRIVE PEAKS BY THE HALFWAY POINT. On the drive her rear sabaton grinds hard
into the stone and breaks EXACTLY THREE chips of hard grey flagstone up off the floor beside
that foot, each chip no bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE
and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising
no higher than her own knee and spreading no wider than her own standing footprint - never past
the toe of her leading sabaton toward screen-right, never past the heel of her rear sabaton
toward screen-left - every chip crumbling away to nothing in mid-air as it falls. THERE ARE
NEVER MORE THAN THREE PIECES OF DEBRIS IN THE FRAME AT ONCE. THROUGH THE THIRD QUARTER she draws
her trunk back upright over her planted hips while the last chips crumble away, and in the final
quarter she extends the longsword back OUT along its own line to the EXACT extension and line it
has in the reference image and settles into the EXACT same reference stance, so that she is
already standing completely still in the reference pose well before the clip ends. Coiled,
driving, armoured.

## attack_block A  (the half-sword wall - hilt in, flat palm on the blade, a braced steel bar)
BLOCK-COUNTER A (the half-sword wall): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER
she SINKS her whole weight straight DOWN into a braced crouch over both planted feet, knees
taking the load, and her sword arm draws the longsword IN to a close guard across her own front:
her fist comes back in front of her own ribs and the blade turns a short way up about her own
wrist to a shallow rising diagonal, its tip rising no higher than the crown of her own hood and
never one finger above it, the whole longsword at every moment NEARER to her own body than it
sits in the reference image - a bright steel bar set between her and the pressure. DELIBERATELY
her free gauntlet leaves the small of her back and presses OPEN and FLAT against the FLAT of the
blade at its midpoint, bracing the bar from behind in the armoured half-sword way - that palm
stays open and flat on the flat steel, its fingers never close around the blade, it never
touches the edge and it never slides along the steel, and the sword hand's grip on the hilt
never changes. SHE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as she absorbs the
pressure - both sabatons grind a fraction on the stone without either one leaving the spot it
stands on, her braced forearms shudder under the load, her shoulders judder and settle straight
up and down, her chin tucks a fraction behind the bar - but the braced blade itself holds its
diagonal DEAD-STILL, and nothing else in her body travels. IN THE FINAL QUARTER she drives one
short hard shove straight UP out of her knees behind the braced blade, rising only back to her
own standing height and no further, her free gauntlet returns to its station at the small of her
back, the longsword turns back down about her own wrist and slides OUT to the EXACT extension
and line it has in the reference image, and she flows in one eased motion back into the EXACT
same reference stance, so that she is already standing completely still in the reference pose
well before the clip ends. Nothing sheds and nothing breaks. Braced, immovable, silent.

## attack_block_b  (the hanging ward - hilt high, blade slanted down across her front, one-handed)
BLOCK-COUNTER B (the hanging ward): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right; IN THE FIRST QUARTER her
hooded head drops a fraction, her near shoulder LIFTS STRAIGHT up a fraction under its pauldron
and her whole back hunches DOWN over it, her weight sinking straight DOWN through both planted
feet - and through that hunch her sword arm turns the longsword tip-DOWN about her own wrist
into a low hanging ward: her fist rises close in front of her own near pauldron, never above it,
and the blade slants DOWN across the front of her own body until its tip hangs low ahead of her
leading shin, one hand's-breadth ABOVE the stone and never touching it, the whole longsword at
every moment NEARER to her own body than it sits in the reference image - the long blade now a
slanted steel fence across her legs and trunk, her free gauntlet staying tucked at the small of
her back. SHE HOLDS THAT HUNCHED WARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both sabatons
grind a fraction on the stone without leaving the spots they stand on, her neck, back and
shoulders shudder under the load straight up and down - and the hanging blade stays DEAD-STILL,
never swinging, never rising and never dipping to touch the floor, for every frame of it. IN THE
FINAL QUARTER she drives straight up out of her knees with one short heavy shove - the crown of
her own hood rising no higher than it sits in the reference image - and the longsword turns back
up about her own wrist and slides OUT to the EXACT extension and line it has in the reference
image as she flows back into the EXACT same reference stance, so that she is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing
breaks. Low, hunched, immovable.

## hit  (the buckled ride - absorbed straight down on the spot, quick recover)
HIT (the buckled ride): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right; the blow lands and her hooded
head snaps a fraction back and DOWN, both shoulders drop together, her spine folds and her knees
buckle STRAIGHT DOWN under it - but BOTH FEET STAY EXACTLY WHERE THEY STAND, she does not step
back and she does not skid, her hips stay over their own spot, and every bit of the recoil is
absorbed DOWNWARD into her knees, hips and folding trunk. Her sword hand clamps harder on the
gold hilt and the extended longsword is jolted straight DOWN with her folding body, holding the
exact angle it has in the reference image the whole way - it never turns, never swings and never
rises, its tip dipping with her and never travelling further toward screen-right than it sits in
the reference image; her free gauntlet stays clamped at the small of her back, and the sheathed
sidearm rides with her hips. Her grey hood is thrown a hand's width by the jolt and settles
straight back to the exact fall it has in the reference image. THE RECOIL PEAKS BY THE END OF
THE FIRST QUARTER and she rides it folded low through the middle of the clip - trunk bowed over
her planted hips, shoulders juddering straight up and down, the extended blade trembling in her
locked grip - her chest never squaring up toward the camera and her back never shown. IN THE
LAST THIRD she catches herself, straightens up out of her knees and flows in one eased recovery
back into the EXACT same reference stance, so that she is already standing completely still in
the reference pose well before the clip ends. Nothing sheds and nothing breaks. She is ALONE in
an empty frame - nothing whatsoever enters, crosses or appears in the frame at any time, and
there is no light, no flare, no wisp and no streak anywhere in the shot. Only her own body and
her own weapons move.

## ko  (cause-free collapse, ends on ground)
KO (the lowered point): she begins in the EXACT reference stance, her body angled to camera
exactly as it is in the reference image and facing screen-right; IN THE FIRST THIRD OF THE CLIP
her knees give way beneath her, her hooded head drops and her shoulders slump, and she goes
STRAIGHT DOWN onto both armoured knees on the spot she stands on without travelling forward, her
leg plates folding beneath her under the weight of her own armour. Then she pitches slowly
forward and down over her own thighs and FOLDS, and BY THE HALFWAY POINT she has come to rest
fully prone and motionless, folded down over her own knees with her hooded head low toward
screen-right and her face still pointed that way. Her gauntleted fingers never open: the
longsword comes down WITH her and comes to rest lying on the stone at a shallow slant ahead of
her, still gripped in her sword hand, its blade pointing toward screen-right along the ground
with its tip finishing NEARER to her own fallen body than it sits in the reference image and
nowhere near any edge of the frame; her free gauntlet comes to rest at her side, and the
sheathed sidearm rides down with her hips and stays in its scabbard, its scabbard tip never
travelling further toward screen-left than it sits in the reference image. EXACTLY THREE small
chips of hard grey flagstone are knocked UPWARD where her armoured knees strike the stone, each
chip no bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE and sharp-edged -
never a puff, never a cloud, never dust, never smoke and never haze - rising no higher than her
own fallen shoulder and staying within one body-width of where she lands, every chip crumbling
away to nothing in mid-air as it falls. THERE ARE NEVER MORE THAN THREE PIECES OF DEBRIS IN THE
FRAME AT ONCE. FOR THE WHOLE SECOND HALF OF THE CLIP SHE LIES COMPLETELY STILL - she does not
stir, does not lift her head, does not push up on an arm and she does NOT get back up - the
fallen longsword lies exactly where it came to rest and does not move again, and her grey hood
lies fallen forward and dead-still with her. She is ALONE in an empty frame - nothing whatsoever
enters, crosses or appears in the frame at any time. Only her own body and her own weapons move.

## victory  (the vigil of the point - the sword grounded, hand over gauntlet, one bow, no turn)
VICTORY (the vigil of the point): she begins in the EXACT reference stance, her body angled to
camera exactly as it is in the reference image and facing screen-right. IN THE FIRST QUARTER she
turns the longsword SLOWLY tip-down about her own wrist, her fist sinking to her own thigh, and
SETS the point down - not strikes it - onto the flagstone just ahead of the toe of her leading
sabaton, the blade coming to stand before her on a steep slant, never fully vertical, its tip
travelling only DOWN and IN and at every moment NEARER to her own body than it sits in the
reference image; and DELIBERATELY her free gauntlet leaves the small of her back and comes to
rest closed over the BACK of her own sword-hand gauntlet on the hilt - hand over hand on her own
grounded sword, a knight's graveside vigil, the free hand touching only her own gauntlet and
never the blade. FOR THE WHOLE MIDDLE HALF OF THE CLIP SHE HOLDS THAT VIGIL, and only three
small motions live inside it: two slow settlings of her whole armoured frame STRAIGHT DOWN
through both planted feet and back up, never transferring from one foot to the other; the
fingers of her free gauntlet re-closing one by one over her own sword-hand gauntlet; and ONE
slow short bow of her hooded head STRAIGHT DOWN and back up, her face staying pointed toward
screen-right throughout - she never turns her head or her body toward the camera at any point,
and her chest never squares up toward the viewer. Her expression stays calm and stern and she
makes no sound. IN THE FINAL QUARTER her free gauntlet returns to its station at the small of
her back, she lifts the point back off the stone, the longsword turns back up about her own
wrist to the EXACT extension and line it has in the reference image, and she rises out of the
knee-bend and settles into the EXACT same reference stance, so that she is already standing
completely still in the reference pose well before the clip ends. Nothing sheds and nothing
breaks. Composed, solemn, knightly.

## special_1  (THE OATHKEEPER'S STAKE) — half-sworded point driven into the floor, her whole mass poured down it
SPECIAL FINISHER (the oathkeeper's stake): she begins in the EXACT reference stance, her body
angled to camera exactly as it is in the reference image and facing screen-right. THERE IS NO
WIND-UP OF ANY KIND: she does NOT raise the blade first, does NOT draw it back, and NO PART of
the longsword travels upward before the drive - it starts from the line it ALREADY HOLDS in the
reference image and only ever goes DOWN and IN. IN THE FIRST QUARTER her sword arm turns the
longsword tip-DOWN about her own wrist until the point aims at the flagstone just ahead of the
toe of her leading sabaton, her fist riding in at her own chest, while DELIBERATELY her free
gauntlet leaves the small of her back and presses OPEN and FLAT against the FLAT of the blade at
its midpoint - the palm stays open and flat on the flat steel, its fingers never close around
the blade, it never touches the edge and it never slides along the steel - so the sword is now
held like a short armoured stake in the half-sword way. FROM THE QUARTER MARK she DRIVES the
point straight DOWN into the flagstone at that spot with one full-mass fold - knees folding
deep, hips sinking, chest coming down over her leading knee, both feet flat and planted - and
THE BITE HAS LANDED BY THE HALFWAY POINT: the point cracks the floor where it strikes and
EXACTLY FIVE chips of hard grey flagstone burst UPWARD around the buried point, each chip no
bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE and sharp-edged - never a
puff, never a cloud, never dust, never smoke and never haze - rising no higher than her own
knee, staying within one hand's-breadth of the bite and never further toward screen-right than
the buried point itself - every chip crumbling away to nothing in mid-air as it falls. THERE ARE
NEVER MORE THAN FIVE PIECES OF DEBRIS IN THE FRAME AT ONCE. FROM THE HALFWAY POINT TO THE
SEVENTY-FIVE PERCENT MARK she bears DOWN the staked blade in a braced hold, her shoulders
juddering straight up and down under her own weight, the grounded point GRINDING on its spot
without ever sliding and without ever lifting; she may FOLD and SINK, but she never TURNS - her
chest never squares up toward the camera. IN THE FINAL QUARTER she eases her weight back up,
draws the point free of the broken stone, her free gauntlet returns to its station at the small
of her back, the longsword turns back up about her own wrist to the EXACT extension and line it
has in the reference image, and she rises into the EXACT same reference stance, so that she is
already standing completely still in the reference pose well before the clip ends. Two-handed,
downward, final.

## special_2  (THE THREE MEASURES) — three measured point-bites tolling the same stone
SPECIAL FINISHER (the three measures): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right. THERE IS NO WIND-UP
OF ANY KIND: she does NOT raise the blade first and does NOT draw it back - each bite starts
from the line the longsword ALREADY HOLDS in the reference image and travels only DOWN and IN.
ACROSS THE FIRST SIXTY PERCENT OF THE CLIP she carves the point down into the flagstone just
ahead of the toe of her leading sabaton THREE times, slow and measured as a tolling bell - on
each bite her knees fold and her whole armoured mass sinks a short way STRAIGHT DOWN over both
planted feet as her sword arm turns the longsword tip-DOWN about her own wrist, her fist sinking
toward her own hip, the point carving the same falling arc DOWN and IN through empty air to BITE
the stone at the same spot each time - and between bites the longsword turns back up about her
own wrist only to the extension and line it holds in the reference image, never higher and never
further out. EACH BITE knocks EXACTLY TWO chips of hard grey flagstone UPWARD around the buried
point, each chip no bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE and
sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising no
higher than her own knee, staying within one hand's-breadth of the bite and never further toward
screen-right than the buried point itself - and BOTH chips of each bite crumble away to nothing
in mid-air before the next bite lands, so THERE ARE NEVER MORE THAN TWO PIECES OF DEBRIS IN THE
FRAME AT ONCE and SIX chips break in total across the clip, in three staged pairs, never in one
burst. AFTER THE THIRD BITE she holds the final bite dead-still through the third quarter, point
in the stone, her shoulders juddering straight up and down under her own braced weight, while
the last chips crumble away, and IN THE FINAL QUARTER she draws the point free, the longsword
turns back up about her own wrist to the EXACT extension and line it has in the reference image,
and she rises into the EXACT same reference stance, so that she is already standing completely
still in the reference pose well before the clip ends. Measured, ceremonial, inevitable.

## special_3  (THE WARDEN'S CROSS) — two crossing carves through empty air, sealed on the reference line
SPECIAL FINISHER (the warden's cross): she begins in the EXACT reference stance, her body angled
to camera exactly as it is in the reference image and facing screen-right. ACROSS THE FIRST TWO
THIRDS OF THE CLIP she carves TWO short crossing cuts through the EMPTY AIR close in front of
her own chest, and the crossing cuts touch NOTHING and leave NOTHING in the air - no mark, no
trace, no shape and no light of any kind, only the moving steel itself. THE FIRST CUT: from the
line the blade ALREADY HOLDS in the reference image, with no raise and no draw-back of any kind,
her sword arm turns the longsword about her own wrist and the tip carves one short falling
diagonal DOWN and IN no longer than her own forearm, ending ahead of her own belt, driven by her
knees folding and her whole mass sinking STRAIGHT DOWN over both planted feet; on it her rear
sabaton grinds hard into the stone and knocks EXACTLY TWO chips of hard grey flagstone up beside
that foot, each chip no bigger than one knuckle of her own gauntlet and each one SOLID, OPAQUE
and sharp-edged - never a puff, never a cloud, never dust, never smoke and never haze - rising
no higher than her own knee and spreading no wider than her own standing footprint. THE SECOND
CUT: driving straight UP out of that sink to her full standing height, her sword arm turns the
blade back about her own wrist and the tip carves the crossing rising diagonal UP and IN no
longer than her own forearm, ending ahead of her own face, rising no higher than the crown of
her own hood and never travelling further toward screen-right than the tip sits in the reference
image; on it her leading sabaton grinds hard into the stone and knocks EXACTLY TWO more chips up
beside that foot under the same bounds, each one SOLID, OPAQUE and sharp-edged - never a puff,
never a cloud, never dust, never smoke and never haze. BOTH chips of the first cut crumble away
to nothing in mid-air before the second cut ends, so THERE ARE NEVER MORE THAN TWO PIECES OF
DEBRIS IN THE FRAME AT ONCE and FOUR chips break in total across the clip, in two staged pairs,
never in one burst. AT THE TWO-THIRDS MARK the longsword stops DEAD back on the EXACT extension
and line it has in the reference image, never one finger further toward screen-right, the stop
so absolute that the long blade quivers once from hilt to tip - and FOR THE WHOLE FINAL THIRD
she stands already in the EXACT reference stance while the quiver dies out of the steel, the
last chips crumble to nothing in mid-air, and one slow settling sinks her shoulders STRAIGHT
DOWN a fraction and lifts them again, so that she is standing completely still in the reference
pose well before the clip ends. Both feet stay flat on the stone throughout; she may SINK, but
she never TURNS. Two cuts, one seal, stillness.
