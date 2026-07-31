# HYDRA FLAIL — MK FINAL playable #7. Full 13-clip kit. Phase 112.

Written OFF THE PADDED PLATE `qa-boss/anchors/mk/hydra-flail-anchor-green.png`, which was padded in phase
107 and pre-screened before this kit was written. **No re-plate, no re-pad.** `node
qa-boss/check-plate-key.mjs` returns opaque **13.29%**, p99 backdrop distance **5.4**, max 70 against the
keyer's `TIGHT=45 / LOOSE=70`, and the rendered alpha at
`qa-boss/frames/platekey/hydra-flail-anchor-green-alpha.png` is a clean silhouette — no rectangle, no
interior holes in the body. He faces SCREEN-RIGHT natively; no hflip anywhere in this kit. The three
things the pre-screen did NOT catch are rules 2, 9 and 10 below, and rule 2 is the one that governs the
whole file.

## ★ HYDRA FRAME BUDGET — applies to EVERY clip of his

Plate 1536x1536. Full subject **1094w x 1042h** (fills 67.8% of frame height), bbox x222..x1315,
y468..y1509.
  LEFT **222px** · RIGHT **220px** · HEADROOM **468px** · bottom **26px**, free (taloned feet on the floor
  line — `check-containment.mjs` treats feet-on-floor as expected and never counts it).

**THESE ARE TIGHT LATERAL MARGINS — the same class as raiju (L202/R200) and about 90px per side LESS
than lich. Lateral room is SCARCE and is to be treated as already spent.**

**WHO OWNS EACH EDGE:**
  · **LEFT x222**, rows y1360..y1367 (8px) — the back of his own **REAR HEEL**, down at ankle height. His
    own body, not the weapon.
  · **RIGHT x1315**, rows y882..y885 (4px) — the snout tip of the **MIDDLE BONE SKULL** on the middle
    chain. The weapon, at full stretch.
  · **TOP y468**, cols x570..x601 — the crest of the dorsal scute-ridge on his **TALLEST SERPENT NECK**.
    His own body.
  · **BOTTOM y1509**, cols x298..x363 — his rear foot's claws on the floor line.
  · **STANDING FOOTPRINT x236..x805 = 570px** (rear heel to leading toe-claws). That is the span anchor
    every effect in this file ties to. Never "the gap between his feet", which a sink widens.
  · **BODY ONLY** (everything left of the fist) is **x222..x799 = 578w x 1042h**. The chain flail adds
    another **516px** of pure weapon to the right of that. Half of his width is a chained prop.

  1. **THE FLAIL'S GEOMETRY, MEASURED, BECAUSE A CHAIN HAS NONE OF ITS OWN.** He grips a short
     leather-wrapped HANDLE in ONE scaled fist, centred about **(765, 890)**, with a steel pommel cap and
     a hanging D-RING at its butt at **x650** and a steel CHAIN-COLLAR at its far end at **x828..x859**,
     call it **(845, 890)**. Three separate steel chains fan out from that collar to three bone skulls:
       · **UPPER skull** x1120..x1265, y764..y853 — chain 289px at 18 degrees ABOVE horizontal, far tip x1265
       · **MIDDLE skull** x1120..x1315, y866..y959 — chain 275px DEAD LEVEL, far tip **x1315**
       · **LOWER skull** x1120..x1257, y958..y1064 — chain 300px at 24 degrees BELOW horizontal, far tip x1257
     Collar to far tip on the longest run is **470px**. Skull centres sit ~360px out.
  2. **HE HAS ZERO SCREEN-RIGHT BUDGET, AND THE ARITHMETIC IS THE WHOLE FILE.** The middle chain is
     ALREADY dead-straight and dead-level: 845 + 275 + 196 = **x1316**, i.e. the anchor pose already holds
     the assembly at its maximum horizontal extension. Rotating either of the other two chains down/up to
     level would put their tips at x1279 and x1283 — still INSIDE the middle skull. **So the middle
     skull's reference position is a hard ceiling that no swing can beat while the hand stays put, and
     every pixel of screen-right reach he owns is already spent.** Any lash, whip, thrust or straight
     extension toward screen-right overruns immediately, and so does a TRANSLATION of the hand: with only
     220px of right margin, the fist advancing 220px puts the middle skull off the frame with zero chain
     motion at all. **That is why the suffix bounds BOTH the SKULLS and the FIST — a chain's head position
     is hand + chain, and bounding one leg of that sum bounds nothing.**
  3. **BOUND THE HEADS, NOT THE HANDS AND NOT "THE CHAIN'S LENGTH" — AND REMEMBER A HEAD SWUNG OUT AND
     BACK CAN BEAT ITS OWN RESTING REACH.** A rigid prop is fixed by stating one angle; a chain is not.
     Its reach is set by how hard it is swung, it can wrap, trail, whip and extend far past the hand, and
     under momentum it straightens to its FULL length in whatever direction it is travelling. Vertically
     that is real: a head whipped straight UP from the collar reaches y419 — **49px ABOVE his tallest
     serpent neck**, higher than any part of him. So the ceiling law bounds the flail at **his own bronze
     SHOULDER ARMOUR's reference height**, not at his head, and the acting lines never send a head up.
  4. **DOWN AND IN (toward screen-LEFT, toward his own body) ARE THE ONLY FREE DIRECTIONS, AND THEY MAKE
     HIM SMALLER.** Hang the whole assembly straight down off the collar and the subject spans about
     x222..x950 = **728px against the anchor's 1094px**: the signature move SHRINKS him by 366px. The
     bottom edge is free. Every strike, throw, block and finisher in this file therefore travels DOWN,
     or IN toward screen-left, or both.
  5. **THE HEADS CANNOT REACH THE FLOOR UNLESS HE SINKS — SO EVERY SLAM IS A WHOLE-BODY MOVE BY
     ARITHMETIC, NOT BY EXHORTATION.** From the collar at y890, an assembly rotated straight down puts the
     skull near-ends at y1170 and their far tips at y1360. The floor line is y1509. **The heads hang about
     150px SHORT of the stone with his hand where it stands**, so nothing he does with the flail touches
     the ground unless his hips, knees and whole mass drop with it. That is the body-commitment gate
     satisfied by geometry.
  6. **THE ANCHOR IS A HELD POSE THAT GRAVITY DOES NOT SUPPORT.** The artist drew three chains fanned out
     level off a horizontal handle; real chains would hang. So the return to anchor is the expensive part
     of every flail beat, and the cheap kit is the one that moves the flail LEAST. Five of the thirteen
     states (strike_b, throw_b's start, block_b, hit, victory) keep the flail essentially where it stands
     and move HIS BODY instead; the rest state the return explicitly as his arm driving back out to its
     exact reference position with the three chains riding back out to the EXACT fan, angle and height
     they have in the reference image.
  7. **PREFER TAUT OVER WHIPPING — AND THIS IS A KEYING DECISION AS MUCH AS A CONTAINMENT ONE.** In the
     rendered alpha the chains resolve as a **beaded, near-broken strand**: measured across the keyed mask
     the links come out as separate opaque runs of only **8 to 26px** with visible plate showing through
     the link eyes (at x1100 the upper chain reads as two 8px blobs with a gap between them). A generated
     clip adds compression and motion blur on top of that, and an 8px link smeared at speed keys straight
     out. **When a link drops, the skull on the far end reads as a DETACHED PROJECTILE in the keyed clip
     even though it was attached in the render — so the alpha risk and the banned-projectile risk are the
     same risk.** Both are bought off the same way: beats where the chains are BAR-TAUT and the whole
     assembly rotates or falls as ONE PIECE with his arm, and none where a chain whips loose. Written into
     every acting line, not restated as a bound.
  8. **SPAN: 1.40x, AND FOR ONCE THE PLATE IS THE BINDING CONSTRAINT.** `measure-anchor-budget.mjs`
     computes max spanPeak 1.40x for this plate; the roster hard rule caps at 1.60x and the SMALLER wins,
     so 1.40x governs — the first plate in the MK set where that is true. 1094 x 1.40 = 1532px of a 1536
     frame. Nothing here steps, lunges, thrusts or reaches, and most beats collapse the flail inward, so
     nothing approaches it.
  9. **THE EMISSIVE IS POLISHED BRONZE, AND IT IS NOT A FLAME.** `check-plate-key.mjs` reports **0.70%**
     emissive on the keyed subject (2195 of 313658 opaque pixels) against its BRIGHT>=215 / SATURATED>=70
     hue-agnostic screen. Located and clustered: **170 separate blobs**, hue entirely in the 0-60 band
     (warm gold), mean channel values around 232/190/152, **ZERO pure-white pixels anywhere on him**, and
     the largest single blob is only **63x23px**. The top five, which are 54% of it, are the specular
     rim-lights on his BRONZE ARMOUR: the top rim of his chest harness (x576..x638 / y818..y840), the face
     of his forearm vambrace (x644..x732 / y832..y864), the scale plates of his hip skirt (x420..x463 /
     y1101..y1146), and his shoulder harness (x380..x421 / y674..y709). It reads emissive because polished
     copper stays SATURATED as it brightens, which is exactly the case the hue-agnostic screen was written
     to catch and exactly the case it cannot distinguish from a cool flame. **This is NOT the
     kitsune-blocker class**: probing the chroma straight up off the brightest bronze reaches flat plate by
     64px with his own body in between, and probing up off the middle skull reads a 4px anti-aliased
     contact edge and then flat plate — no bloom, no spill. So the suffix pins the highlights by **SIZE and
     SHAPE**, not merely brightness, and separately bans the two things a bone-skull flail invites by name:
     **lit eye sockets** and **anything at all lighting up**.
 10. **HIS OWN BODY IS GREEN AND HE IS ON A GREEN SCREEN — WHICH IS A COLOUR RULE FOR THE EFFECTS, NOT A
     PLATE PROBLEM.** The keyer is distance-based and it is comfortable: the CLOSEST subject pixel to the
     sampled screen colour sits at distance **45.0** against `TIGHT=45`, only **220 of 313658** subject
     pixels are within 60 of it, and the rendered alpha has no holes. But **26132 of his own pixels
     (8.33%) satisfy the `isGreen()` predicate** that `pad-anchor-plate.mjs` and `check-containment.mjs`
     use, so those tools under-measure him by exactly that much — verified harmless here, because the
     isGreen bbox and the keyed bbox differ by 2px, at the feet, which are free. **The live consequence is
     for EFFECTS: anything green he throws would key out to nothing.** Every effect in this kit is
     therefore GREY broken floor-stone and grey grit, never a scale, never a leaf, never anything of his
     own colour. And the shared prefix tells the model his scales keep their own deep forest and emerald
     green rather than taking the flat bright green of the screen behind him.
 11. **EFFECTS ARE SOLID GREY STONE, AND THE THREE LEGS ARE MANDATORY.** Every effect in this kit carries
     an exact **COUNT**, a per-object **SIZE** tied to one of his own parts (one of his own foot-claws, or
     his own closed fist), and a **SPAN** tied to his **570px STANDING FOOTPRINT** — never past his leading
     foot toward screen-right, never past his rear heel toward screen-left — plus a HEIGHT bound and the
     crumble-in-mid-air-as-it-falls tail. Opaque, sharp-edged, matte and lit like rock. Never a glow, never
     a flame, never a spark, never a wisp, never mist or smoke.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME towering reptilian HYDRA WARRIOR from the reference image (identical heavily muscled
> humanoid serpent body covered in overlapping scales - dark forest-green over his back, shoulders and
> outer limbs, brighter emerald down his chest and arms, pale sage-green underneath - and THREE long
> scaled SERPENT NECKS rising from his shoulders, each ridged along its top with raised dorsal scutes and
> pale olive-cream underneath, each ending in a wedge-shaped viper head with a blunt rounded snout, a
> raised brow ridge, one slit amber eye with a black vertical pupil, and jaws held WIDE OPEN on a pale pink
> mouth, a row of small white teeth and two long curved ivory FANGS in the upper jaw - the tallest neck
> arching highest and furthest back, the second lower and in front of it, the third shortest and lowest,
> all three heads turned toward screen-right; wearing weathered BRONZE and dark leather armour - a curved
> bronze shoulder harness with a wide spaulder over his far shoulder whose top rim carries five upright
> ivory TUSK-SPIKES, bronze-edged leather straps crossing his chest, a bronze SCALE-MAIL cuirass of
> overlapping diamond plates over his belly and hips, a wide dark leather BELT and a second narrower strap
> carrying two long ivory CLAWS hanging point-down and a bronze BEAST-SKULL boss with two tusks at his hip,
> a long dark leather TABARD panel marked with a bronze chevron running down the middle to his knees, a
> heavy bronze VAMBRACE on his leading forearm with three curved bronze CLAW-BLADES along its outer edge,
> bronze-and-leather THIGH GUARDS on both legs each set with a bronze beast-skull-and-tusk boss, buckled
> leather straps down both shins, and bare taloned FEET with four toes each ending in a long pale ivory
> CLAW; and gripped in his single scaled leading FIST a CHAIN FLAIL - a short dark
> leather-wrapped HANDLE with a steel pommel cap and a hanging steel D-RING at its butt end, and at its far
> end a heavy steel COLLAR from which THREE separate STEEL CHAINS of thick oval links fan out toward
> screen-right, each chain ending in a pale weathered BONE SKULL of a fanged beast with a cracked domed
> cranium, deep empty eye sockets and jaws gaping open on two long curved upper fangs and a row of small
> teeth, the three skulls carried at three staggered heights - the upper one highest, the middle one
> furthest out toward screen-right, the lower one hanging down and back), standing on a solid saturated
> GREEN chroma screen (bright green #00b140, nothing pink or magenta anywhere; his own scales keep their
> own deep forest and emerald green and never take on the flat bright green of the screen behind him).

Shared suffix (carries the prompt laws — every state inherits these):
> His three serpent heads and their ridged necks, his green scales, his bronze shoulder harness with its
> five ivory tusk-spikes, his bronze scale-mail, his belt with its two ivory claws and its bronze skull
> boss, his leather tabard panel, his bronze vambrace and its three claw-blades, his thigh guards, his shin
> straps and his taloned feet all stay EXACTLY the same the entire clip. The chain flail stays gripped in
> his own scaled fist the entire clip - it is never released, never let go, never thrown, never exchanged
> and never replaced by anything else - and all three of its steel chains stay bolted to the collar on its
> handle in every single frame. Each of the THREE bone skulls stays bolted to the end of its OWN steel
> chain in every single frame: no skull is ever detached, released, thrown or launched, none of them ever
> flies loose or travels through the air on its own, and every chain stays one unbroken run of steel links
> from the collar to its own skull. The three chains only ever move because his own arm and body move them:
> they never whip loose, never lash out, never snake through the air and never tangle. He has EXACTLY THREE
> serpent heads and EXACTLY THREE chained bone skulls for the whole clip: no fourth head, no fourth chain
> and no fourth skull ever appears anywhere in the shot, and no head ever splits, divides, regrows or
> multiplies. His bronze armour is POLISHED METAL that only CATCHES light: the small hot highlights already
> sitting on the top rim of his shoulder harness, on the face of his forearm vambrace and across the scale
> plates over his hips stay exactly the same SIZE, the same SHAPE and exactly as bright as they are in the
> reference image - they never spread, never travel, never brighten, never flare and never throw light onto
> anything. NOTHING anywhere on him or on his weapon ever lights up: the deep eye sockets of all three bone
> skulls stay dark and empty in every frame, his own three eyes stay exactly as they are in the reference
> image, and no glow, aura, flame, spark, beam, halo, ring of light, wisp, mist, smoke, venom, spray or
> energy of any kind ever appears anywhere in the shot or comes out of any mouth. The whole chain flail
> stays FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame: no chain and no
> bone skull EVER travels further toward screen-right than the MIDDLE skull does in the reference image,
> EVER travels further toward screen-left than his own REAR HEEL does in the reference image, or is EVER
> raised above the height his own bronze SHOULDER ARMOUR has in the reference image. His gripping FIST
> never travels further toward screen-right than it does in the reference image. The flail only ever
> travels DOWNWARD, or INWARD toward his own body, or back to exactly the fan, angle and height it has in
> the reference image - it never swings back over his own three necks, never passes behind his own back or
> shoulders, is never swung fully vertical, never raised overhead and never spun or whirled round.
> His three serpent NECKS and all three of their HEADS never rise above the height his tallest neck has in
> the reference image, never draw back further toward screen-left than his own REAR HEEL stands in the
> reference image and never reach further toward screen-right than the steel COLLAR on his own flail
> handle sits there, and his REAR FOOT never travels further toward screen-left than it does in the
> reference image. HIS FEET STAY FLAT ON
> THE GROUND FOR THE ENTIRE CLIP - he never jumps, never leaps, never hops and never lunges out into a wide
> stance; he keeps his stance narrow and never spreads wider than about one and a quarter times his
> standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER rotates or turns to face the
> camera, and his body holds the SAME angle to camera it has in the reference image - it never opens
> further toward the viewer and never turns away. All three of his jaws stay exactly as they are in the
> reference image - held open in the same fixed gape, never opening wider, never closing, never biting shut
> on anything and never chattering - and he never talks, never shouts, never screams and never laughs. The
> camera is absolutely locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure
> in frame at all times, nothing else added. He begins and ends on the EXACT same reference stance. 24fps.
> Anything that sheds, tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame - it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or visible anywhere in the frame at the end; at the end there is no shed, torn, broken or kicked-up material anywhere in the shot.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. SIX literals above are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, FOLLOWING JIN AND LICH AND NOT RAIJU. The KO-SUFFIX
RULE strips any sentence matching `keeps the ... never drops or swaps`, because most of the roster DROPS
the weapon on the way down. **This one must not** — he never lets go of the flail in any state — so the
lock is phrased "stays gripped in his own scaled fist ... never released, never let go, never thrown,
never exchanged", which (i) matches neither the trailing-clause strip nor the whole-sentence strip, (ii)
stays TRUE through a prone collapse, and (iii) sits in its own separate sentence so no strip can take the
identity lock with it as collateral. Verified: his built `ko` still carries both sentences.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not TALONS and not CLAWED
FEET. The ko rewrite matches that exact literal; spell it any other way and the rewrite silently misses
and a prone collapse ships with its feet locked flat. Same reason `he keeps his stance narrow and never
spreads wider than` is the canonical wording — verified: his ko builds it once, rescoped, not twice.

(c) THE CHAIN-MOTION SENTENCE IS PHRASED AS A BAN ON THE FAILURE MODE, NOT AS A POSITIVE "STAYS TAUT"
STATE, AND THAT IS DELIBERATE. A blanket "all three chains stay DRAWN TIGHT the entire clip" would be
FALSE on the `ko`, where the flail falls with him and the chains fold and gather on the stone — the exact
acting-line-versus-law contradiction class that cost five phases. "They never whip loose on their own,
never lash, never snake" is true standing AND prone. The TAUT requirement, which is what actually protects
the beaded chain in the alpha, is carried per-beat in the twelve acting lines that need it.

(d) THE HEIGHT BOUND IS `above the height his own bronze SHOULDER ARMOUR has in the reference image`, not
"above his shoulder". The reference-anchored form is vacuously true once he is prone; the bare form would
read against his shoulder's CURRENT height and would forbid the flail lying beside his fallen body.

(e) THE JAWS ARE LOCKED OPEN, NOT SHUT. All three mouths gape in the reference image, so the no-talking
law is spelled "held open in the same fixed gape, never opening wider, never closing, never biting shut".
**This is why no state in this kit contains a BITE**: a clamp or a grab with the mouths would contradict a
law the same prompt carries. `attack_strike_b` is a fanged strike that closes on nothing, and the two
throws are made with his forearm claw-blades and with the chains instead.

(f) THE DEBRIS TAIL FOLLOWS SKULLREND / PALE-CHOIR / JIN / RAIJU / LICH, not minotaur: it ends "at the end
there is no shed, torn, broken or kicked-up material anywhere in the shot" rather than "the last frame
shows ONLY the fighter and what the fighter holds". Law 7 (first == last) is carried per-state instead:
every non-`ko` action line ends "back into the EXACT same reference stance".

FACING, judgement call: **PARTLY OPEN.** Read at FULL SIZE on four separate crops taken from the plate at
native resolution, never off a contact sheet. Verdict and the evidence that decided it:
  · **HEADS — strict PROFILE, all three.** Each of the three viper heads presents one slit amber eye, the
    full profile line of brow, snout and lower jaw, and an edge-on jaw hinge. This is the cleanest-profile
    head group in the MK set.
  · **TORSO — partly open.** The round bronze breast section of his harness presents its FACE rather than
    its edge, the diamond scale-mail over his belly shows its full patterned face, both belt straps run
    across the front with their two ivory claws presented full-length, and the far shoulder's spaulder
    reads as a separate armoured volume behind the near one with all five of its tusk-spikes resolved.
  · **HIPS — decisively open.** The bronze scale tasset presents its whole face; the bronze beast-skull
    boss on his belt shows its full face and BOTH of its tusks; and the long leather TABARD panel with its
    bronze chevron hangs down the MIDDLE of the visible thigh mass showing its full face, which cannot
    happen in true profile.
  · **FEET — the decisive crop, exactly as it was on pale-choir, jin and lich. BOTH taloned feet show
    their full TOPS with all four toes fanned and all four ivory claws visible** — the rear foot presents
    its whole toe-fan across the top of the foot and the leading foot presents its whole instep and
    toe-fan. In true profile one foot would sit edge-on behind the other.
So no line in this file orders "strict side profile", which would order the model to re-pose him toward
pure profile mid-clip and fight his own anchor; every line says "angled to camera exactly as in the
reference image and facing screen-right", and the suffix bans the turn in BOTH directions. **It is NOT the
frontal-plate blocker (IR-41 class):** all three of his heads are turned to screen-right, his whole weapon
is carried out to screen-right, his gripping arm drives that way, his leading foot points that way, and
every line of attack in the kit is committed to screen-right or straight down. This is the same verdict as
minotaur-axe, skullrend-orcus, pale-choir, jin-goldenhand, raiju-naginata and lich-scythe — now seven of
eight MK plates.

HE IS ONE-HANDED ON THE FLAIL AND HIS FAR ARM IS NOT AVAILABLE. The plate shows the far arm as a dark
green upper arm hanging down behind his torso with a small bronze spur and a strap band, disappearing
behind the belt and tasset — **the far HAND is occluded and never visible**. So no state in this kit asks
that hand to do anything, because the model would have to invent it. Where a grip is needed, the beat uses
the three curved bronze CLAW-BLADES on his leading vambrace or the chains themselves, both of which are
plainly visible in the reference image.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN BROKEN FLOOR-STONE AND GREY GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his chain flail and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real slabs, chunks, chips and grains of broken GREY floor-stone and hard grey grit, opaque, sharp-edged, matte and lit like rock, and never green and never scaled - never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist or smoke, never venom or spray, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles, and no fourth chain, fourth skull or fourth serpent head ever appears. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own knee and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading foot toward screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a heavy rooted guard, his weight sunk and even over both planted taloned feet, the
chain flail held steady out ahead of him toward screen-right at exactly the angle it has in the reference
and his scaled fist closed on the handle. ONE full slow breath fills the first half of the clip and a
second fills the second half: on each one his scaled chest and ribs swell and settle, his shoulders roll
up under the bronze harness and drop back down, and his weight rolls slowly from his rear foot onto his
leading foot and back. His THREE serpent necks do not move together - on the first breath the tallest neck
sinks a fraction and its S-curve tightens while the lowest head slides forward a finger's width and
settles, and on the second the middle neck rolls once along its own length and the tallest lifts back to
exactly the height it has in the reference image, all three heads staying turned toward screen-right the
whole time. The three chains stay drawn tight and ride DOWN with his arm a finger's width and back up on
every breath, holding their fan, and the three bone skulls swing faintly at the far end and settle again.
His three jaws stay fixed in the same open gape and do not move at all. The long leather tabard panel and
the two ivory claws on his belt sway with him. Feet planted, silent and patient. Returns to the exact
start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (dead drop, the three skulls hammered into the stone)
STRIKE A (dead drop): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he loads his weight back over
his rear foot, his knees folding and his shoulders rolling up under the bronze harness, and the three
chains draw BAR-TAUT along their fan. Then he DROPS his entire mass straight DOWN over both planted feet
in one committed sink, his hips folding deep, his scaled chest coming down over his leading knee and all
three serpent necks sinking with him, and he hauls his gripping fist DOWN past his own hip so the whole
flail swings DOWN and IN as ONE RIGID PIECE about his own fist - the three chains staying bar-taut the
entire way, never going loose and never whipping - and the three bone skulls come down together and hammer
the stone just inside his own leading foot. The heads cannot reach the floor unless HE goes down with
them, so the sink is the strike. As they land, EXACTLY THREE chips of split grey floor-stone are knocked
UPWARD where they strike, each chip no bigger than one of his own foot-claws, rising no higher than his own
ankle and spreading no wider than his own standing footprint - never past his leading foot toward
screen-right and never past his rear heel toward screen-left - every chip crumbling away to nothing in
mid-air as it falls; nothing else sheds and nothing else breaks. THE HAMMER HAS LANDED BY THE HALFWAY
POINT OF THE CLIP; he HOLDS the sunk stance through the third quarter with the three skulls resting where
they struck and his ribs heaving, while the last chips crumble away, and only in the final second does he
rise slowly and drive his arm back out to exactly where it stands in the reference image, the three chains
riding back out to the EXACT fan, angle and height they have there, into the EXACT same reference stance,
so that he is already standing completely still in the reference pose well before the clip ends. Heavy,
falling, brutal.

## attack_strike_b  (triple fang, his own three heads driven down)
STRIKE B (triple fang): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER all THREE serpent necks SINK and their
S-curves tighten and gather in low over his own shoulders - coiling DOWNWARD, never rearing up and never
drawing back - while his knees bend, his weight loads over his rear foot and his shoulders roll forward.
Then all three heads STRIKE DOWN together in one committed snap, fangs leading, driving from his own
shoulder height to a point in the air just above his own leading foot, his whole trunk folding forward and
down behind them and his hips dropping into a low braced stance - a clean strike through EMPTY AIR that
touches nothing and closes on nothing, all three jaws staying open in the same fixed gape the whole way.
The flail takes NO part in this beat: his gripping fist stays exactly where it stands in the reference
image, the three chains stay bar-taut at their fan and only ride down a finger's width as his shoulders
drop, and the three bone skulls hang steady and never swing. His rear foot's four claws screw down into the
stone as he commits and rip EXACTLY THREE grains of hard grey grit UP off the floor beside that foot, each
grain no bigger than one of his own foot-claws, rising no higher than his own ankle and spreading no wider
than his own standing footprint - never past his leading foot toward screen-right and never past his rear
heel toward screen-left - every grain crumbling away to nothing in mid-air as it falls. THE STRIKE IS
COMPLETE BY THE HALFWAY POINT; he HOLDS the low folded finish through the third quarter with all three
heads down and still while the last grains crumble away, and only in the final second do the three necks
rise back to exactly the heights and curves they hold in the reference image and he settles into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Fast, snapping, vicious.

## attack_throw A  (chain cinch and drive-down, solo-safe)
THROW A (chain cinch): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he sweeps his gripping fist a short way IN
toward his own chest and turns it over, so the three bar-taut chains close and CINCH shut across an unseen
weight at his own chest height in EMPTY AIR, the three bone skulls swinging IN toward his own body and
gathering behind it - there is NO opponent and no second figure, and nothing else is in the frame at any
time. THE CINCH IS SET BY THE END OF THE FIRST THIRD; then he wrenches his shoulders, spine and hips
straight DOWN in one committed drive, his knees folding deep, all three necks sinking and his whole mass
going down behind it, and the cinched weight is driven into the stone just inside his own leading foot, so
THE SLAM HAS LANDED BY THE HALFWAY POINT. The chains stay drawn tight through the whole drive and travel
only downward and toward screen-left. EXACTLY FIVE chips of split grey floor-stone and hard grit are
knocked UPWARD where the weight comes down, each chip no bigger than his own closed fist, rising no higher
than his own knee and spreading no wider than his own standing footprint - never past his leading foot
toward screen-right and never past his rear heel toward screen-left - every piece crumbling away to
nothing in mid-air as it falls. He HOLDS the low finish through the third quarter while the last chips
crumble away, and only in the final second does he rise, driving his arm back out to exactly where it
stands in the reference image and letting the three chains run back out to the EXACT fan, angle and height
they have there, into the EXACT same reference stance, so that he is already standing completely still in
the reference pose well before the clip ends. Grounded, crushing, final.

## attack_throw_b  (claw-blade hook and cross-body haul, solo-safe)
THROW B (claw-blade hook): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he rolls his gripping forearm over so the
three curved bronze CLAW-BLADES on his vambrace come round and under, and HOOKS them into an unseen weight
at his own chest height in EMPTY AIR - never reaching further toward screen-right than that fist sits in
the reference image, with NO opponent, no second figure and nothing else in the frame at any time. Then he
drops his hips under it and folds his whole mass straight DOWN, hauling that hooked forearm down and IN
across the front of his own thighs and on toward his own REAR foot - travelling toward screen-LEFT, staying
in front of his own body the whole way, never swinging behind him - and drives the weight into the stone
just inside that rear foot, his knees collapsing into a deep crouch and all three necks sinking behind the
pull, so THE THROW HAS LANDED BY THE HALFWAY POINT. The three chains stay bar-taut through the whole haul
and the three bone skulls ride DOWN and IN with the forearm as one piece, never rising and never swinging
loose. EXACTLY FIVE chips of split grey floor-stone are knocked UPWARD where the weight comes down, each
chip no bigger than his own closed fist, rising no higher than his own knee and spreading no wider than
his own standing footprint - never past his leading foot toward screen-right and never past his rear heel
toward screen-left - every piece crumbling away to nothing in mid-air as it falls. He HOLDS the low
cross-body finish through the third quarter while the last chips crumble away, and only in the final
second does he roll the forearm back over, drive his arm out to exactly where it stands in the reference
image and let the three chains run back out to the EXACT fan, angle and height they have there, into the
EXACT same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Fast, rooted, savage.

## attack_block A  (chain knot, the whole flail gathered against his own thigh)
BLOCK-COUNTER A (chain knot): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he hauls his gripping fist IN hard against
his own ribs and SINKS his whole weight straight DOWN behind it into a deep braced crouch, his elbow
clamped to his side, his knees taking the load and all three necks dropping low over his shoulders - and
the three chains, still drawn tight, swing DOWN and IN with the fist and hang straight down off the collar
under their own weight, so the three heavy bone skulls gather hard against the front of his own leading
thigh, where he clamps them still with his forearm. The whole weapon collapses in toward him and finishes
far nearer his own body than it sits in the reference image: a short solid knot of steel chain and bone
braced between him and the pressure. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he
absorbs the pressure - both taloned feet grind a fraction on the stone without either one leaving the spot
it stands on, his forearm shakes under the load, his shoulders roll and reset, his scaled ribs judder and
the leather tabard panel shivers - but the gathered knot of chain and bone does not move and nothing else
in his body travels. IN THE FINAL QUARTER he drives one short hard shove straight UP out of his knees
behind that braced knot, rising only back to his own standing height and no further, then drives his arm
back out to exactly where it stands in the reference image and lets the three chains run back out to the
EXACT fan, angle and height they have there, flowing in one eased motion back into the EXACT same
reference stance. Nothing sheds and nothing breaks. Braced, compact, immovable.

## attack_block_b  (spaulder guard, the three necks tucked away)
BLOCK-COUNTER B (spaulder guard): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER all THREE serpent necks fold DOWN and
tuck in hard behind the big bronze SPAULDER, their heads dropping low against his own chest and out of the
way, while he rolls his leading shoulder up and forward and hunches his whole back over it so the curved
bronze plate and its five ivory tusk-spikes are what meet the pressure, his weight settling back over his
rear foot - and he hauls the whole flail DOWN and still at his own side, where the three chains hang taut
and dead off the collar and the three bone skulls hang low and take no part. HE HOLDS THAT HUNCHED GUARD
THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both taloned feet grind a fraction on the stone without
leaving the spot they stand on, his neck, back and shoulders shudder under the load, his scaled ribs
judder, the three tucked heads shudder with him without ever lifting, and the flail stays low and
dead-still and never rises and never swings for one frame of it. IN THE FINAL QUARTER he drives up out of
his knees and shrugs one short heavy shoulder-and-spaulder shove, the top of that bronze plate rising no
higher than it sits in the reference image, then lets the three necks rise back to exactly the heights and
curves they hold in the reference image and drives his arm back out so the three chains run back out to
the EXACT fan, angle and height they have there, flowing in one eased motion back into the EXACT same
reference stance. Nothing sheds and nothing breaks. Braced, low, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference image
and facing screen-right; all three serpent necks and both shoulders snap back and to screen-LEFT, the
three heads whipping back and DOWN over his own shoulders, his spine folding and his knees buckling under
his own weight - but BOTH
FEET STAY EXACTLY WHERE THEY STAND, he does not step back and he does not skid, and every bit of the
recoil is absorbed in his knees, hips and trunk instead. His scaled fist clamps harder on the handle and
the whole flail is jolted straight DOWN with his body, the three chains staying drawn tight and holding
their fan the entire way - they never go loose, never whip and never rise - while the three bone skulls
shudder and swing a short way DOWN and IN toward him and settle again, never travelling further toward
screen-left than his own rear heel stands in the reference image. THE RECOIL PEAKS BY THE END OF THE FIRST
QUARTER and he rides it off balance through the middle of the clip - his weight rolling back over his rear
foot toward screen-left, the leather tabard panel and the two ivory claws on his belt whipping, his
shoulders juddering and his scaled ribs heaving, the three necks whipping and gathering low over his own
shoulders. IN THE LAST THIRD he catches his
balance, straightens up out of his knees and flows in one eased recovery back into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before the
clip ends. His chest and all three faces lead the recoil; his back is never shown. Nothing sheds and
nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame
at any time, and there is no light, no flare, no wisp and no streak anywhere in the shot. Only his own body
and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference image
and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, all three serpent
necks go slack and their heads drop, his shoulders slump, and he goes STRAIGHT DOWN onto both knees on the
spot he stands on without travelling forward, his legs folding and staying tucked beneath him. Then he
pitches forward and down over his own thighs and FOLDS, his gripping arm folding down beneath him with his
scaled fist still closed on the handle, and BY THE HALFWAY POINT he has come to rest fully prone and
motionless, folded heavily down over his own knees with all three heads lying on the stone beside his
leading foot, still turned toward screen-right. His fist never opens: the flail comes down WITH him, and
because a chain has no shape of its own the three chains FOLD and GATHER as they fall, so all three bone
skulls come to rest lying on the stone close beside his own fallen body, every skull still bolted to its
own chain and every chain still bolted to the collar, and all three finish NEARER his own fallen body than
they sit in the reference image and none of them is anywhere near an edge of the frame. ONE thin scuff of
hard grey grit is knocked UPWARD off the floor where he comes down, the grains no bigger than one of his
own foot-claws, rising no higher than his own fallen shoulder and staying within one body-width of where
he lands, every grain crumbling away to nothing in mid-air as it falls. FOR THE WHOLE SECOND HALF OF THE
CLIP HE LIES COMPLETELY STILL - he does not stir, does not lift any of his three heads, does not push up
on an arm and he does NOT get back up - and the fallen flail lies exactly where it came to rest and does
not move again. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame
at any time. Only his own body and his own weapon move.

## victory  (the coiled stillness, no raise and no turn to camera)
VICTORY (coiled stillness): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he lets his gripping arm settle a
short way DOWN and IN toward his own hip, so the three chains ride DOWN as one piece and the three bone
skulls sink and come to rest nearer his own body than they sit in the reference image - and at the same
moment he sinks his weight DOWN and even over both planted feet, his shoulders dropping and his scaled ribs
settling. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW SETTLED CARRY and only his three necks,
his shoulders and his ribs move - his ribs swell and sink twice in two slow deep breaths, his shoulders
roll once and settle, the three bone skulls swing to a complete stop at the end of their chains, and the
three heads settle one after another: the tallest neck dips once in a short controlled bow and lifts again
no higher than it sits in the reference image, the middle head rolls once along its own length and stills,
and the lowest head slides forward a finger's width and stops. His feet, hips and shoulders stay exactly
where they are: he does not step, does not pivot, does not straighten up onto his toes, does not lift the
flail, does not raise it overhead, does not swing it and does not turn any of his three heads or his body
toward the camera at any point. All three jaws stay fixed in the same open gape and he makes no sound. IN
THE FINAL QUARTER he drives his arm back out to exactly where it stands in the reference image and lets
the three chains run back out to the EXACT fan, angle and height they have there, settling into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Nothing sheds and nothing breaks. Composed, patient, spent.

## special_1  (THE WINDING) — the three chains wound short onto his own vambrace and the shortened bundle driven into the stone
SPECIAL FINISHER (the winding): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he turns his gripping fist over and WINDS
the three chains IN around his own bronze VAMBRACE, turn after turn, hauling them in hand-over-forearm and
never letting them go slack for a frame, so the three bone skulls are dragged IN toward him along the way
until all three are gathered hard against the outside of his own forearm - the whole long assembly
shortened to a single short knot of chain and bone at his own wrist, and his entire silhouette pulling in
and NARROWING as it goes. Every turn of chain travels only toward screen-LEFT and toward his own body, and
nothing rises. THEN AT THE FORTY-FIVE PERCENT MARK he drives his whole mass straight DOWN in one committed
sink, hips folding deep, knees driving out, all three necks dropping and his shoulders coming down behind
his arm, and he drives that shortened bundle of chain and bone straight DOWN into the flagstone just inside
his own leading foot with everything he has. The floor gives way under it: EXACTLY FIVE chunks of solid
broken grey floor-stone burst UPWARD around the bundle, each chunk no bigger than his own closed fist,
rising no higher than his own knee and spreading no wider than his own standing footprint - never past his
leading foot toward screen-right and never past his rear heel toward screen-left - every chunk cracking
apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque,
chunky, sharp-edged, matte, grey and lit like stone - never green, never a glow, never a flame, never a
spark of light, never a wisp. HE HOLDS THE DEEP SUNK STANCE THROUGH THE WHOLE THIRD QUARTER with the wound
bundle still pressed into the broken stone and his whole weight leaning down onto that forearm, his
shoulders heaving and his scaled ribs shuddering, while the last chunks crumble away. Only in the final
second does he lift the bundle off the stone, rise, and let the three chains run back OFF his forearm and
out to the EXACT fan, angle and height they have in the reference image, into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip ends.
Coiling, shortening, crushing.

## special_2  (THE THREE ANVILS) — one sink, three staggered impacts walking back across his own footprint
SPECIAL FINISHER (the three anvils): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST FIFTH he coils his whole body back and DOWN
over his rear foot, his knees folding, his shoulders rolling up and all three serpent necks sinking low
between them, and the three chains draw BAR-TAUT along their fan. Then he releases it all in ONE committed
downward sink - his entire mass dropping over both planted feet, his hips folding deep and his gripping
fist hauling DOWN past his own hip - and because his three chains hang at three different lengths and
angles the three bone skulls do NOT land together: they come down in a staggered rank, one after another,
walking back across his own footprint toward screen-LEFT. THE UPPER SKULL STRIKES FIRST, AT ABOUT THE
THIRTY-FIVE PERCENT MARK, on the stone just inside his own leading foot; THE MIDDLE SKULL LANDS AT THE
HALFWAY POINT, a stride further in toward screen-left; AND THE LOWER SKULL LANDS LAST, AT ABOUT THE
SIXTY-FIVE PERCENT MARK, in close beside his own rear foot and stopping well short of his rear heel. All
three chains stay drawn tight through the whole walk and the assembly rotates and falls as ONE PIECE about
his own fist - no chain goes loose and no chain whips. EXACTLY SIX chips of solid broken grey floor-stone
are knocked UPWARD in three pairs, two at each impact, each chip no bigger than his own closed fist, rising
no higher than his own knee and spreading no wider than his own standing footprint - never past his leading
foot toward screen-right and never past his rear heel toward screen-left - every chip cracking apart and
crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, flat,
sharp-edged, matte, grey and lit like stone - never green, never a glow, never a flame, never a spark of
light, never a wisp. He stays sunk and low from the first impact to the last and rides each one down
harder, his shoulders heaving and his scaled ribs shuddering, and he HOLDS that deep sunk finish while the
last chips crumble away. Only in the final second does he rise and drive his arm back out to exactly where
it stands in the reference image, the three chains riding back out to the EXACT fan, angle and height they
have there, into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Walking, hammering, relentless.

## special_3  (THE PINNED CHAIN) — the middle chain trapped under his own foot-claws and the heads dragged in against it
SPECIAL FINISHER (the pinned chain): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he sinks his whole weight straight
DOWN over both planted feet and lays the flail DOWN with him, his gripping fist dropping past his own hip
and the three chains riding down as one piece, until all three bone skulls come to rest flat on the stone
just past his own leading foot and the MIDDLE chain lies stretched across the flagstone hard against that
foot's four ivory claws. AT THE THIRTY PERCENT MARK he screws those four long claws DOWN over the middle
chain and PINS it flat to the floor, that foot never leaving the spot it stands on and never coming off
the stone. THEN, FROM THE THIRTY-FIVE PERCENT MARK TO THE SIXTY PERCENT MARK, he hauls his gripping fist
back and IN toward his own rear hip against that pinned link - travelling toward screen-LEFT, staying in
front of his own body the whole way - so the whole assembly goes bar-taut in one hard triangle between his
fist, his pinned claws and the stone, and all three bone skulls are DRAGGED in low across the flagstone,
crossing back inside his own leading foot and on toward his own rear heel in one savage flat drag,
stopping well short of that rear heel. His hips and shoulders drive the haul, his whole trunk leans back
into it and all three serpent necks sink and gather with him. EXACTLY SIX slabs of solid broken grey
floor-stone are torn UPWARD out of the drag behind the skulls, the tearing beginning only once they have
crossed back inside his own leading foot, each slab no bigger than his
own closed fist, rising no higher than his own knee and spreading no wider than his own standing footprint
- never past his leading foot toward screen-right and never past his rear heel toward screen-left - every
slab cracking apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK:
opaque, flat, sharp-edged, matte, grey and lit like stone - never green, never a glow, never a flame, never
a spark of light, never a wisp. HE HOLDS THE STRAINING TRIANGLE THROUGH THE WHOLE THIRD QUARTER with the
chain still trapped under his claws and his whole weight leaning back against it, his forearm shaking, his
shoulders heaving and his scaled ribs shuddering, while the last slabs crumble away. Only in the final
second does he ease the pressure off those claws without that foot ever leaving the stone, rise, and drive
his arm back out to exactly where it stands in the reference image so the three chains run back out to the
EXACT fan, angle and height they have there, into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Low, straining, final.
