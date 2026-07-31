# IR-12 ROSE LANCE — XGundam roster. Full 13-clip kit. Phase 96.

Written OFF THE PADDED PLATE `qa-boss/anchors/xg/ir12-rose-lance-anchor-green.png`, which was padded this
phase from `input/MK FINAL/XGundam not sorted/IR-12 Rose Lance.png` and pre-screened before this kit was
written. **No re-plate, no re-pad.** `node qa-boss/check-plate-key.mjs` returns opaque **8.42%**, p99
backdrop distance **5.2**, max 70 against the keyer's `TIGHT=45 / LOOSE=70`, emissive **0.82%**, and the
rendered alpha at `qa-boss/frames/platekey/ir12-rose-lance-anchor-green-alpha.png` is a clean silhouette —
no rectangle, no interior holes. He faces SCREEN-RIGHT natively; no hflip anywhere in this kit. He is the
ROOMIEST plate in the whole project laterally and the TIGHTEST in the one axis nobody would guess, and
rules 1 and 2 below are the whole file.

## ★ IR-12 FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536 GREEN. Full subject **468w x 1044h** (fills 68.0% of frame height), bbox x534..x1001,
y468..y1511.
  LEFT **534px** · RIGHT **534px** · HEADROOM **468px** · bottom **24px**, free (boots on the floor line —
  `check-containment.mjs` treats feet-on-floor as expected and never counts it).

**534px PER SIDE IS THE ROOMIEST LATERAL MARGIN IN THE PROJECT — versus raiju's 202 and hydra's 222. He is
a SLIM, TALL, PROP-TUCKED figure: 468px wide in a 1536 frame, and most of that width is not even him.**
`measure-anchor-budget.mjs` computes max spanPeak that still fits = **3.28x**; the roster hard rule caps at
1.60x and the SMALLER wins, so **1.60x** governs — 468 x 1.60 = 749px of a 1536 frame. Width is the one
thing he is rich in.

**WHO OWNS EACH EDGE — and his own body owns nothing but the floor:**
  · **TOP y468**, cols x534..x535 — the **LANCE POINT**. The weapon.
  · **LEFT x534**, row y468 — the **SAME PIXEL**. One point owns two edges at once.
  · **RIGHT x1001**, rows y962..y977 — the outer rim of his **ROSE SHIELD**. The other prop.
  · **BOTTOM y1511**, cols x754..x771 — his rear boot's sole on the floor line.
  · **STANDING FOOTPRINT x654..x915 = 262px** — rear heel to leading toe-cap. NARROW (hydra's is 570px).
  · **BOOT-LENGTH ~150px** (leading boot 149px, rear boot 116px). This is the UNIT every bound in this
    file is written in, because it is the only body landmark he has that is both small and unambiguous.
  · **HIS ARMOURED BODY ALONE** (no lance, no shield) is **x628..x915 = 288w x 936h** — 256px across at the
    chest, 198px at the hips, 184px at the thighs. **The lance adds 106px of pure weapon to screen-left and
    the shield 136px to screen-right. He is under 290px wide and the props make him 468.**

 1. **HIS CEILING BELONGS TO THE LANCE, NOT TO HIM, AND THE 468px IS A LIE ABOUT HIS HEAD.** The lance is
    carried UPRIGHT in his near fist and its point is the TOPMOST PIXEL OF THE WHOLE SUBJECT. Measured:
      · **LANCE POINT (534, 468)** — top-left corner of the subject, both extremes at once.
      · **HIS OWN CROWN (710, 576)** — the tip of the rearmost horn-fin on his helmet crest.
      · **THE POINT SITS 108px ABOVE HIS OWN HEAD.** Headroom above his crown is 576px; above the point it
        is 468px, and 468px is the number that governs.
      · **GRIP: his near gauntleted FIST at his own hip, centred (700, 1025)**, butt-end emerging at
        (722, 1058). **FIST-TO-POINT = 581px** (dx 166, dy 557); the whole lance is about **616px**.
      · **LEAN: 17 degrees back from vertical**, point up and toward screen-LEFT.
 2. **FIST RISE IS TIP RISE, ONE FOR ONE — AND THAT ARITHMETIC IS WHY NO BEAT IN THIS FILE RAISES THE
    LANCE.** The point leaves the top of the frame when the fist rises 468px, i.e. the instant his gripping
    fist reaches **y557** — which is **the height of his own helmet crest**. So: *the moment his lance hand
    comes up as high as his own head, the point is already off the top of the frame.* A raise to his own
    shoulder (fist to y800) leaves the point at y243, inside the frame but under the 200px margin law by
    43px. **Bound the POINT, never the hands** — a 616px polearm lets the hands obey a height bound while
    the tip overruns, which is what cost renders on raiju (naginata) and shaped lich-scythe — and then bound
    the FIST as well, because a rigid prop's tip position is hand PLUS shaft and bounding one leg of that
    sum bounds nothing.
 3. **THE ONLY RAISE IN HIS WHOLE ROTATION IS 24px, AND HE PAYS IT BACK BY SINKING.** Rotating the point
    forward through TRUE VERTICAL lifts it from y468 to **y444** — 24px, and every degree past vertical
    LOWERS it. So the lance may roll forward and down freely, provided his gripping fist SINKS with it
    through the upright, which is also the body commitment the gate wants. Rotating the point BACKWARD is
    the expensive direction: it crosses x200 at **59 degrees back from vertical**, so it never leans back
    past its reference angle at all.
 4. **A LEVEL THRUST DOES NOT EXIST FOR HIM, AND THIS IS THE NUMBER THAT SURPRISES EVERYONE.** Level the
    lance to horizontal about the fist WITHOUT MOVING THE HAND and the point is already at **x1281** — 254px
    from the frame edge and **55px** from the x1336 safety line. Fifty-five pixels is the entire travel
    budget of a level thrust. Carried at his own KNEE (y1220) it is barely better: the point sits at x1247
    at rest, and one boot-length of advance puts it at **x1397, past x1336**. **Forward reach is bought with
    DEPTH:** carried DOWN ON THE FLAGSTONE (y1500) the point sits at **x1035** at rest and one boot-length
    of advance lands it at **x1185** — 351px of right margin and 151px inside x1336. **His couch is a GROUND
    couch. Every forward drive in this file carries the point on the stone.**
 5. **EVERY DOWNWARD DRIVE DRAWS THE BUTT BACK FIRST, BY ARITHMETIC.** His fist stands 486px above the
    stone and the lance is 581px, so the point can only reach the floor **318px forward of wherever the fist
    is**. With the hand at rest that lands at **x1018 — 99px past his own leading toe-cap**, outside his own
    footprint and outside the debris span. Draw the fist back about a hundred pixels toward screen-left
    first and the point lands **ON his leading toe-cap**. That is why every stab here cocks back before it
    drops, and it is a large visible weight transfer rather than an arm move. **AND THAT IS WHY THE POINT'S
    LEFT BOUND IS NOT "never past where it sits in the reference image".** A hand drawn 150px toward
    screen-left carries the point 150px left with it in any frame where the roll has not yet caught up, so
    the strict form is a bound the acting line breaks on its own first beat — caught by reading the
    assembled `attack_strike` and `special_2` end to end, never by a gate. The bound is **one BOOT-LENGTH
    past the reference point = x384, which still leaves 384px of left margin**, and the draw-back is written
    as happening WITH the forward roll so the point is falling and travelling right from the first frame.
 6. **THE SHIELD IS A SEPARATE PROP AND IT MAY GO UP — THE ASYMMETRY IS THE KIT.** Measured x865..x1001
    (137px wide as projected) by y843..y1157 (315px tall), gripped on a black articulated STEEL BRACKET
    with a horizontal bar in his FAR gauntlet at **(905, 1022)** — the same hip height as his lance fist.
    It is bolted to nothing on his body: it can be turned, raised, driven and planted. Its top petal sits
    **267px BELOW his own crown**, so lifting it until that petal is level with his own crest costs 267px
    and still leaves 576px of ceiling. **The lance may never rise and the shield may — so every guard, every
    cover and every raise in this file is the SHIELD's job, and every lance beat is level, downward or a
    ground drive.** Turned face-on to screen-right the shield presents its EDGE to camera and gets NARROWER,
    so a shield-forward guard costs no width at all. Its right bound is **one and a half BOOT-LENGTHS past
    the reference rim = x1226, 310px of margin** — the same unit as the lance point and the debris span, so
    weapon, guard and effect can never disagree about how far screen-right is far enough.
 7. **DEBRIS SPAN: HIS FOOTPRINT PLUS ONE AND A HALF BOOT-LENGTHS AHEAD OF IT = x654..x1140.** 262px of
    footprint is too tight for a beat whose point ploughs forward, so the span landmark is stated once,
    consistently, in the add-on and in every acting line: never past his REAR HEEL toward screen-left, never
    further toward screen-right than one and a half of his own BOOT-LENGTHS past his LEADING BOOT'S TOE-CAP.
    That leaves 396px of right margin and is the SAME line the lance point is bound to, so effect and weapon
    can never disagree. Every effect carries three legs: an exact **COUNT**, a **SIZE** tied to one of his
    own parts (one of his own armoured KNUCKLES, his own closed GAUNTLETED FIST, or the pink HEEL-BLOCK of
    his own boot), and that **SPAN** — plus a height bound and the crumble-in-mid-air-as-it-falls tail.
 8. **THE EMISSIVE IS SPECULAR ON POLISHED GOLD AND IT IS TINY.** Located and clustered: **122 separate
    blobs**, total 360 pixels, the largest a single **8x6px** hit, mean channel values around 229/200/155
    (warm gold, hue entirely in the 0-60 band), and **NINE pure-white pixels in the entire subject**. The
    top blobs sit on the GOLD SCROLLWORK of his hip tassets (x804..811 y925..930), his thigh plates
    (x706..727 y1190..1207) and his chest (x719..729 y798..807). It reads emissive because polished gold
    stays SATURATED as it brightens — the same case as hydra's bronze, not the kitsune-blocker class. So the
    suffix pins the highlights by **SIZE and SHAPE**, and separately bans by name the two things a
    gem-and-visor knight invites: **lit gems** and **anything at all lighting up**.
 9. **HE IS SLIM AND THE FRAME IS EMPTY, SO A STILL CLIP IS DEATH HERE.** Every defect gate rewards a
    motionless frame and he is the easiest character in the roster to contain by doing nothing. His body
    mass is under 290px in a 1536 frame; the only thing that makes him read is WEIGHT — deep sinks, hips
    dropping, both boots sliding flat along the stone, the whole armoured mass going somewhere. Write travel
    and a real change of stance into every line, and never pay for a containment problem by deleting motion.
10. **HE CARRIES NO GUN, NO THRUSTER, NO BEAM AND NO PROJECTILE — HIS ART SHOWS TWO THINGS.** One rose
    lance, one rose shield, plus his own shoulder, knee and boots. He fires nothing, throws nothing and
    launches nothing, ever, and he never drops or swaps the lance in any state including the ko.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

Shared prefix:
> The EXACT SAME slender ROSE-KNIGHT from the reference image (identical tall slim humanoid figure in
> pearl-WHITE and dusty ROSE-PINK plate armour edged and scrolled all over in polished GOLD filigree and set
> with raised PINK CHERRY-BLOSSOM flowers - a closed white HELM with a swept crest of THREE white-and-gold
> horn-fins raked up and back, rose-pink temple and cheek insets, a round violet gem in a gold bezel at the
> temple, a small pink-red gem at the brow and a dark BLACK HONEYCOMB-MESH visor panel running down to a
> pointed chin, his head turned toward screen-right; a layered ROSE-PETAL PAULDRON of five pale rose-pink
> pointed petal plates with gold-lipped edges over his near shoulder; a white gorget and breastplate carrying
> gold scrollwork and pink blossom reliefs; long white VAMBRACES with running gold scroll and one pink
> blossom on each; a rose-pink belt and TWO broad white hip TASSETS bordered in gold, each carrying a large
> pink cherry-blossom in relief; rose-pink knee plates each set with a small gold curl emblem; white greaves
> with running gold scroll; white ankle-cuffed SABATONS with deep rose heel blocks and soles; and one small
> VIOLET SASH TAIL hanging behind his far leg - and he carries TWO things and only two: gripped low at his
> near hip in his own white gauntleted FIST a ROSE LANCE, a slim polearm whose long tapering WHITE-STEEL
> spear point rides up and back over his near shoulder above his own head, with a carved deep-crimson ROSE
> BUD and two collars of small dark thorn-leaves just below the point, a gold band beneath them and a
> thorned dark crimson-brown HAFT running down through his fist; and carried at his far hip in his own dark
> gauntleted far FIST a ROSE SHIELD, SIX overlapping deep dusty-rose PETAL PLATES layered into one rose
> bloom - two long pointed petals above, two broad rounded petals across the middle and one long pointed
> petal below - all mounted on a black articulated steel BRACKET with a horizontal grip bar across its
> back), standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing pink or magenta
> anywhere; his own armour keeps its own pearl white, dusty rose and gold and never takes on the flat bright
> green of the screen behind him).

Shared suffix (carries the prompt laws — every state inherits these):
> His white helm and its three crest fins, his visor mesh, his temple and brow gems, his rose-petal
> pauldron, his white and rose plate armour, all of its gold filigree and every pink cherry-blossom on it,
> his two hip tassets, his knee plates, his greaves, his white sabatons and his violet sash tail all stay
> EXACTLY the same the entire clip. The rose lance stays gripped in his own white gauntleted FIST the entire
> clip - it is never released, never let go, never thrown, never exchanged and never replaced by anything
> else - and its white spear point, its crimson rose bud, its thorn-leaf collars, its gold band and its
> thorned haft stay ONE single unbroken piece in every single frame. The rose shield stays gripped on its
> black bracket in his own far gauntlet the entire clip - it is never released, never let go, never thrown
> and never exchanged - and all SIX of its petal plates stay bolted together into one solid bloom in every
> single frame: no petal ever comes loose, breaks off, falls, opens, unfolds, spreads or multiplies. He has
> EXACTLY ONE lance and EXACTLY ONE shield for the whole clip and no second lance, no second shield and no
> extra petal ever appears anywhere in the shot. His gold filigree is POLISHED METAL that only CATCHES
> light: the small hot highlights already sitting on the gold scrollwork of his hip tassets, his thigh plates
> and his chest stay exactly the same SIZE, the same SHAPE and exactly as bright as they are in the
> reference image - they never spread, never travel, never brighten, never flare and never throw light onto
> anything. NOTHING anywhere on him or on either of his two props ever lights up: the violet gem at his
> temple and the pink gem at his brow stay exactly as they are in the reference image, the black mesh of his
> visor stays dark in every frame, and no glow, aura, flame, spark, beam, halo, ring of light, wisp, mist,
> smoke, blossom-light or energy of any kind ever appears anywhere in the shot. The whole ROSE LANCE stays
> FULLY INSIDE the frame at ALL times and NEVER extends past any edge of the frame. Its POINT is NEVER
> raised above the height it has in the reference image: it is never lifted, never carried overhead, never
> stood upright, never swung back over his own helm and never passed behind his own back or shoulders, and
> the lance is never spun, never whirled and never twirled. From the first frame the point only ever travels
> DOWNWARD, or forward toward screen-right and downward at the same time, or straight back to exactly the
> angle and height it has in the reference image; whenever it rolls forward his gripping FIST sinks with it,
> so the point never gains height at any moment. His gripping FIST never rises above the height it has in
> the reference image. The point never travels further toward screen-LEFT than one of his own BOOT-LENGTHS
> past where it sits in the reference image, and never further toward screen-RIGHT than one and a half of
> his own BOOT-LENGTHS past his own LEADING BOOT'S TOE-CAP as it stands in the reference image. The ROSE
> SHIELD also stays FULLY INSIDE the frame at all times: its top petal never rises above the top of his own
> HELMET CREST as it sits in the reference image, its outer rim never travels further toward screen-right
> than one and a half of his own BOOT-LENGTHS past where that rim sits there, and it never passes behind his
> own back. HIS FEET STAY FLAT ON THE GROUND
> FOR THE ENTIRE CLIP - he never jumps, never leaps and never hops, and neither white boot ever leaves the
> stone; when he drives forward his boots SLIDE flat along the stone and neither one travels further toward
> screen-right than one of his own boot-lengths, and he keeps his stance narrow and never spreads wider than
> about one and a half times his standing width. He stays FACING SCREEN-RIGHT the entire clip and NEVER
> rotates or turns to face the camera, and his body holds the SAME angle to camera it has in the reference
> image - it never opens further toward the viewer and never turns away. His helm stays closed and his visor
> never opens: he never talks, never shouts, never screams and never laughs. The camera is absolutely
> locked, no zoom, no pan, his full body always fully in frame, he is the ONLY figure in frame at all times,
> nothing else added. He begins and ends on the EXACT same reference stance. 24fps. Anything that sheds,
> tears loose, breaks off or is kicked up during the clip has COMPLETELY VANISHED before the final frame -
> it burns away, crumbles to nothing or falls out of sight, and NONE of it is left lying on the ground or
> visible anywhere in the frame at the end; the last frame shows ONLY the fighter and what the fighter holds, exactly as the
> first frame does.

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into the
fired prompt, so an operator note written inside the blockquote is sent to the model as an instruction. FIVE
literals above are load-bearing and must not be re-worded.

(a) THE TWO PROP LOCKS ARE WRITTEN TO **SURVIVE** THE ko, following jin, lich and hydra and not raiju. The
KO-SUFFIX RULE strips any sentence matching `keeps the ... never drops or swaps`, because most of the roster
DROPS its weapon on the way down. **This one must not** — he never lets go of the lance or the shield in any
state — so both locks are phrased "stays gripped ... never released, never let go, never thrown, never
exchanged", which (i) matches neither the trailing-clause strip nor the whole-sentence strip, (ii) stays TRUE
through a prone collapse, and (iii) sits in its own separate sentence so no strip can take the identity lock
with it as collateral. Verified: his built `ko` still carries all three sentences.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not BOOTS and not SABATONS.
The ko rewrite matches that exact literal; spell it any other way and the rewrite silently misses and a prone
collapse ships with its feet locked flat. Same reason `he keeps his stance narrow and never spreads wider
than` is the canonical wording — verified: his ko builds it once, rescoped, not twice.

(c) THE FEET LAW EXPLICITLY LICENSES A **SLIDE** AND FORBIDS A **STEP**, AND THAT IS DELIBERATE. He is a
charge archetype with 534px of lateral margin and the roster's usual "never lunges" phrasing would delete the
one thing the plate can afford. "Neither boot ever leaves the stone" + "boots SLIDE flat" + "no further than
one of his own boot-lengths" is true standing AND prone, keeps the anti-jump meaning, and gives every drive
in the file a measured travel allowance instead of an argument.

(d) THE HEIGHT BOUNDS ARE ALL REFERENCE-ANCHORED (`as it stands in the reference image`, `as it sits in the
reference image`), never bare. The bare form would read against his CURRENT posture and would forbid the
lance lying beside his fallen body on the ko; the reference-anchored form is vacuously true once he is prone.

(e) NO STATE IN THIS KIT RAISES THE LANCE, AND THAT IS RULE 2 OF THE BUDGET, NOT A STYLE CHOICE. Every beat
is level, downward, or a drive that travels laterally on the stone. The guards, the covers and the one raise
in the whole file are the SHIELD's, which has 267px of clearance under his own crest and 576px of ceiling
above it.

FACING, judgement call: **PARTLY OPEN, opened TOWARD the camera.** Read at FULL SIZE on six separate crops
taken from the plate at native resolution, never off a contact sheet. Verdict and the evidence that decided
it:
  · **HEAD — near-PROFILE facing screen-right.** The black honeycomb visor panel and the pointed chin present
    toward screen-right, the three crest fins rake back toward screen-left, and the temple gem sits on the
    near cheek. Slightly open — the visor's oval face is visible rather than edge-on — but this is the
    cleanest-profile part of him.
  · **TORSO — partly open.** The breastplate presents its FACE: the diagonal white band across his upper
    chest shows a full undistorted pink cherry-blossom in relief, and the far shoulder's pauldron reads as a
    separate armoured volume clear of the near one.
  · **HIPS — decisively open, and this crop alone settles it.** BOTH hip tassets present their full faces
    with BOTH large pink cherry-blossoms complete and laterally separated across the hips. In true profile
    one tasset sits edge-on behind the other and only one blossom can be seen.
  · **FEET — the decisive crop, exactly as it was on pale-choir, jin, lich and hydra. BOTH sabatons show
    their full TOPS** — the rear boot (x654..x769, sole on the floor line at y1511) presents its whole
    instep, ankle cuff and toe-cap, and the leading boot (x767..x915, sole at y1446, further away in depth)
    presents its whole instep, ankle cuff and toe-cap too. In true profile one foot would sit edge-on behind
    the other.
  · **WHICH WAY HE IS OPEN, GEOMETRICALLY.** His FAR arm and its shield project to screen-RIGHT of his torso
    (shield x865..x1001 against a body that ends at x883). A figure facing screen-right can only throw its
    far arm to the right of its own torso if its forward vector has a component TOWARD the camera. So he is
    turned slightly toward the viewer, not away: **we see his front three-quarter.** That is what makes
    "his chest and faceplate lead the recoil, his back is never shown" a defensible line in `hit`.
So no line in this file orders "strict side profile", which would order the model to re-pose him toward pure
profile mid-clip and fight his own anchor; every line says "angled to camera exactly as in the reference
image and facing screen-right", and the suffix bans the turn in BOTH directions. **It is NOT the frontal-plate
blocker (IR-41 class):** his helm is turned to screen-right, his lance point rides back over his near
shoulder, his shield is carried out on the leading side, his leading boot points that way, and every line of
attack in the kit is committed to screen-right or straight down. This is the same verdict as minotaur-axe,
skullrend-orcus, pale-choir, jin-goldenhand, raiju-naginata, lich-scythe and hydra-flail — now eight of nine
plates screened.

THE SHIELD IS A PROP, NOT ARMOUR, AND THAT ANSWER CHANGES WHAT A BLOCK CAN DO. The plate shows a black
articulated STEEL BRACKET bolted through the back of the bloom carrying a horizontal grip BAR, and his dark
gauntleted far fist closed around that bar. It is not a pauldron, not a backplate and not fixed to him
anywhere: it can be turned face-on, hauled across his chest, raised to his own crest, driven forward and
planted rim-first in the stone, and all four of those are used. The layered rose-petal PAULDRON on his near
shoulder is the piece that IS armour — same petal material, fixed to his body, and it is what `attack_block_b`
puts into the pressure precisely because it cannot move.

HIS FAR HAND IS NOT FREE. It is closed on the shield's grip bar in every frame, so no state in this kit asks
that hand to grab, hook or hold anything else. Where a grip is needed the beat uses the lance's THORNED HAFT,
the FACE of the shield against his own near forearm, or his own shoulder — all three plainly visible in the
reference image.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN BROKEN FLOOR-STONE AND GREY GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his rose lance, his rose shield and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real chunks, slabs, chips and grains of broken GREY floor-stone and hard grey grit, opaque, sharp-edged, matte and lit like rock, and never white, never pink, never gold, never a blossom and never a petal - never a glow, never a flame, never a spark of light, never a wisp, never an aura, never mist or smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles, and no second lance, no second shield and no extra petal ever appears. All of it is pushed UPWARD and stays low and close to him, rising no higher than his own KNEE and spreading no wider than HIS OWN STANDING FOOTPRINT AND ONE AND A HALF OF HIS OWN BOOT-LENGTHS AHEAD OF IT - never past his own REAR HEEL toward screen-left, and never further toward screen-right than one and a half of his own boot-lengths past his LEADING BOOT'S TOE-CAP - and every piece cracks apart and crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT, ITS EXACT SIZE AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## idle
IDLE COMBAT-READY LOOP: a tall rooted lancer's guard, his weight sunk and even over both planted white
sabatons, the rose lance held in his near fist at exactly the angle it has in the reference image with its
point riding up and back over his near shoulder, and the rose shield hanging steady on its bracket at his far
hip. ONE full slow breath fills the first half of the clip and a second fills the second half: on each one
his breastplate lifts and settles inside the gorget, his near shoulder rolls up under the layered rose-petal
pauldron and drops back down, and his weight rolls slowly from his rear boot onto his leading boot and back.
His TWO props do not move together - on the first breath the lance rides DOWN a finger's width with his fist
and the thorned haft turns a few degrees in his grip while the shield hangs dead and still; on the second the
shield sways a hair on its black bracket and comes back to rest while the lance holds absolutely still. His
helm shifts no more than a hair and stays turned toward screen-right the whole time, and the black mesh of
his visor stays dark. The violet sash tail behind his far leg sways once and stills, and the gold scrollwork
on his tassets carries the same small highlights it already has. Boots planted, silent, patient. Returns to
the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## attack_strike A  (the point drop, the butt cocked back before it falls)
STRIKE A (the point drop): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER OF THE CLIP he loads his weight back over his
rear boot, his knees folding and his near shoulder rolling up under the rose-petal pauldron, and DRAWS the
lance's butt back toward screen-LEFT until his gripping fist stands over his own rear heel - the point
rolling forward and DOWN as it comes and his fist SINKING with it the whole way, so the point is falling
from the first frame and never once lifts. Then he drops his entire mass straight DOWN over both planted boots in one committed
sink, his hips folding deep, his breastplate coming down over his leading knee and his helm dropping with it,
and drives the white spear point into the flagstone just inside his own leading boot's toe-cap. The lance
cannot reach the stone unless HE goes down with it, so the sink IS the strike. EXACTLY THREE chips of split
grey floor-stone are knocked UPWARD where the point bites, each chip no bigger than one of his own armoured
KNUCKLES, rising no higher than his own ankle and spreading no wider than his own standing footprint - never
past his leading boot's toe-cap toward screen-right and never past his rear heel toward screen-left - every
chip crumbling away to nothing in mid-air as it falls; nothing else sheds and nothing else breaks. The rose
shield takes no part: it hangs low and dead on its bracket at his far hip the whole way. THE POINT HAS LANDED
BY THE HALFWAY POINT OF THE CLIP; he HOLDS the sunk stance through the third quarter with the point resting
where it struck and his shoulders heaving while the last chips crumble away, and only in the final second
does he rise slowly and let the lance ride back to exactly the angle and height it has in the reference
image, into the EXACT same reference stance, so that he is already standing completely still in the reference
pose well before the clip ends. Heavy, falling, exact.

## attack_strike B  (the rim cut, the shield's outer edge driven flat across)
STRIKE B (the rim cut): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST QUARTER he sinks his whole weight back and DOWN over his rear
boot, his knees folding deep and his back curling, and hauls the rose shield IN across the front of his own
hips toward screen-LEFT until its outer rim is in beside his own near thigh and its face is turned to
screen-right, edge-on to the camera. Then he DRIVES: he uncoils up and forward off that rear leg, his whole
armoured mass transferring onto his leading boot with both boots sliding flat along the stone and neither one
travelling further than one of his own boot-lengths, and the shield's outer rim swings back OUT toward
screen-RIGHT in one flat hard backhand cut at his own hip height and stops dead - a clean strike through
EMPTY AIR that touches nothing, with no opponent, no second figure and nothing else in the frame at any time.
The lance takes NO part in this beat: his gripping fist stays exactly where it stands in the reference image
and the lance holds its angle without moving. His rear boot screws down into the stone as he commits and rips
EXACTLY THREE grains of hard grey grit UP off the floor beside that boot, each grain no bigger than one of
his own armoured KNUCKLES, rising no higher than his own ankle and spreading no wider than his own standing
footprint - never past his leading boot's toe-cap toward screen-right and never past his rear heel toward
screen-left - every grain crumbling away to nothing in mid-air as it falls. THE CUT IS COMPLETE BY THE
HALFWAY POINT; he HOLDS the extended low finish through the third quarter with the rim out and still while
the last grains crumble away, and only in the final second does he draw the shield back to exactly where it
hangs in the reference image and settle into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Fast, flat, brutal.

## attack_throw A  (the haft hook and drive-down, solo-safe)
THROW A (the haft hook): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he rolls the lance forward and all the way DOWN
in his own near hand, his gripping fist sinking with it so the point is falling the whole way and never once
lifts, until the white spear point rests on the flagstone just outside his own leading boot and the thorned HAFT lies
across the front of his own thighs at a shallow angle - and he HOOKS that haft, the stretch of it between his
own fist and its gold band, under an unseen weight at his own hip height in EMPTY AIR. There is NO opponent
and no second figure, and nothing else is in the frame at any time. THE HOOK IS SET BY THE END OF THE FIRST
THIRD; then he folds his whole mass straight DOWN behind it, his knees collapsing into a deep crouch, his
hips dropping and his helm coming down over the haft, and hauls the hooked weight down and IN across the
front of his own thighs toward screen-LEFT - staying in front of his own body the whole way, never swinging
behind him - and drives it into the stone just inside his own REAR boot, so THE THROW HAS LANDED BY THE
HALFWAY POINT. The rose shield rides IN toward his own body with the haul and takes no part. EXACTLY FIVE
chips of split grey floor-stone are knocked UPWARD where the weight comes down, each chip no bigger than his
own closed GAUNTLETED FIST, rising no higher than his own knee and spreading no wider than his own standing
footprint - never past his leading boot's toe-cap toward screen-right and never past his rear heel toward
screen-left - every chip cracking apart and crumbling away to nothing in mid-air as it falls. He HOLDS the
low crouched finish through the third quarter while the last chips crumble away, and only in the final second
does he rise and let the lance ride back to exactly the angle and height it has in the reference image, into
the EXACT same reference stance, so that he is already standing completely still in the reference pose well
before the clip ends. Grounded, crushing, final.

## attack_throw B  (the petal clamp, the shield's face and his own forearm, solo-safe)
THROW B (the petal clamp): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he brings the rose shield IN and UP across the
front of his own chest toward screen-LEFT and rolls his own near forearm out to meet it, and TRAPS an unseen
weight between the face of the bloom and that forearm at his own chest height in EMPTY AIR, the shield's top
petal rising no higher than the top of his own helmet crest - with NO opponent, no second figure and nothing
else in the frame at any time. THE CLAMP IS SHUT BY THE END OF THE FIRST THIRD; then he wrenches his
shoulders, spine and hips straight DOWN in one committed drive, his knees folding deep and his whole mass
going down behind the clamp, and the trapped weight is driven into the flagstone just inside his own leading
boot, so THE SLAM HAS LANDED BY THE HALFWAY POINT. The lance travels DOWN with his own arm as one piece and
its point stays low the entire drive. EXACTLY FIVE chips of split grey floor-stone and hard grit are knocked
UPWARD where the weight comes down, each chip no bigger than his own closed GAUNTLETED FIST, rising no higher
than his own knee and spreading no wider than his own standing footprint - never past his leading boot's
toe-cap toward screen-right and never past his rear heel toward screen-left - every piece cracking apart and
crumbling away to nothing in mid-air as it falls. He HOLDS the deep low finish through the third quarter
while the last chips crumble away, and only in the final second does he rise, let the shield settle back to
exactly where it hangs in the reference image and let the lance ride back to exactly the angle it has there,
into the EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Rooted, compressing, savage.

## attack_block A  (the petal guard, the whole bloom turned into the pressure)
BLOCK-COUNTER A (the petal guard): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the rose shield UP and ACROSS in
front of his own chest and turns it on its bracket until its face is square to screen-right and its rim is
edge-on to the camera, its top petal rising no higher than the top of his own helmet crest - and SINKS his
whole weight straight DOWN behind it into a deep braced crouch, his far elbow clamped hard to his side, his
knees taking the load, his helm tucked in behind the top petal and his near shoulder rolled in behind the
rim. The lance is hauled DOWN and IN against his own near thigh where it hangs dead and takes no part. HE
HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he absorbs the pressure - both boots grind a
fraction on the stone without either one leaving the spot it stands on, his far forearm shakes under the
load, his shoulders roll and reset, his breastplate judders and the violet sash tail shivers - but the shield
itself does not move and nothing else in his body travels. IN THE FINAL QUARTER he drives one short hard
shove straight forward toward screen-RIGHT out of his knees behind the bloom, rising only back to his own
standing height and no further and driving the rim no further out than one of his own boot-lengths past where
it sits in the reference image, then lets the shield fall back to exactly where it hangs there and the lance
ride back to exactly the angle it has there, flowing in one eased motion into the EXACT same reference
stance, so that he is already standing completely still in the reference pose well before the clip ends.
Nothing sheds and nothing breaks. Braced, compact, immovable.

## attack_block B  (the pauldron set, both props dead and his own armour taking it)
BLOCK-COUNTER B (the pauldron set): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he rolls his near shoulder up and forward
and hunches his whole back over it so the layered ROSE-PETAL PAULDRON is what meets the pressure, his helm
tucking down and in behind its top petal, his spine curling and his weight settling back over his rear boot
with both knees folding - and BOTH props are hauled down and still at his sides and take no part: the lance
hangs at exactly the angle it has in the reference image and does not move a frame, and the rose shield hangs
low and dead on its bracket at his far hip. HE HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE
CLIP - both boots grind a fraction on the stone without leaving the spot they stand on, his neck, back and
shoulders shudder under the load, his breastplate judders, the violet sash tail shivers, and neither prop
rises and neither swings for one frame of it. IN THE FINAL QUARTER he drives up out of his knees and shrugs
one short heavy shoulder-and-pauldron shove forward toward screen-RIGHT, the top of that pauldron rising no
higher than it sits in the reference image, then settles his shoulder back down and flows in one eased motion
into the EXACT same reference stance, so that he is already standing completely still in the reference pose
well before the clip ends. Nothing sheds and nothing breaks. Braced, low, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference image
and facing screen-right; his helm and both shoulders snap back and to screen-LEFT, his spine folding and his
knees buckling under his own weight - but BOTH BOOTS STAY EXACTLY WHERE THEY STAND, he does not step back and
he does not skid, and every bit of the recoil is absorbed in his knees, hips and trunk instead. His gripping
fist clamps harder on the thorned haft and the whole lance is jolted straight DOWN with his body, its point
riding down and never rising, while the rose shield swings a short way IN toward his own body on its bracket,
shudders and settles again. THE RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance
through the middle of the clip - his weight rolling back over his rear boot toward screen-left, the violet
sash tail whipping, his shoulders juddering and his breastplate heaving inside the gorget. IN THE LAST THIRD
he catches his balance, straightens up out of his knees and flows in one eased recovery back into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well before the
clip ends. His chest and his faceplate lead the recoil; his back is never shown. Nothing sheds and nothing
breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the frame at any
time, and there is no light, no flare, no wisp and no streak anywhere in the shot. Only his own body and his
own two props move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference image
and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, his helm drops, his
shoulders slump and he goes STRAIGHT DOWN onto both knees on the spot he stands on without travelling
forward, his legs folding and staying tucked beneath him. Then he pitches forward and down over his own
thighs and FOLDS, his gripping arm folding down beneath him with his white gauntleted fist still closed on
the thorned haft, and BY THE HALFWAY POINT he has come to rest fully prone and motionless, folded heavily
over his own knees with his helm lying on the stone still turned toward screen-right. His fist never opens:
the rose lance comes down WITH him and finishes lying flat along the stone alongside his own fallen body, its
white point resting on the stone close beside his own helm and no part of the lance anywhere near an edge of
the frame; and the rose shield comes down with his far arm and finishes lying flat on the stone beside his own
fallen far shoulder, still gripped on its black bracket, nearer his own fallen body than it sits in the
reference image. ONE thin scuff of hard grey grit is knocked UPWARD off the floor where he comes down, the grains no
bigger than one of his own armoured KNUCKLES, rising no higher than his own fallen shoulder and staying
within one body-width of where he lands, every grain crumbling away to nothing in mid-air as it falls. FOR
THE WHOLE SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he does not stir, does not lift his helm, does
not push up on an arm and he does NOT get back up - and both fallen props lie exactly where they came to rest
and do not move again. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the
frame at any time. Only his own body and his own two props move.

## victory  (the settled carry, no raise and no turn to camera)
VICTORY (the settled carry): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he lets his gripping arm settle a
short way DOWN and IN toward his own hip so the lance rides down as one piece and its point sinks nearer his
own shoulder than it sits in the reference image, and at the same moment he sinks his weight DOWN and even
over both planted boots, his shoulders dropping and his breastplate settling. FOR THE WHOLE MIDDLE HALF OF
THE CLIP HE HOLDS THAT LOW SETTLED CARRY and only his helm, his shoulders and his chest move - his
breastplate lifts and sinks twice in two slow deep breaths, his near shoulder rolls once under the petal
pauldron and settles, the rose shield swings to a complete stop on its bracket, and his helm dips ONCE in a
short controlled bow toward screen-right and lifts again no higher than it sits in the reference image. His
boots, hips and shoulders stay exactly where they are: he does not step, does not pivot, does not straighten
up onto his toes, does not lift the lance, does not raise it overhead, does not raise the shield, does not
swing either prop and does not turn his helm or his body toward the camera at any point. His visor stays
closed and he makes no sound. IN THE FINAL QUARTER he drives his arm back out so the lance rides back to
exactly the angle and height it has in the reference image and the shield settles back to exactly where it
hangs there, into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Composed, patient, spent.

## special_1  (THE BLOOM WALL) — the shield turned square, driven forward and down, its rim ploughing the stone
SPECIAL FINISHER (the bloom wall): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he turns the rose shield on its black
bracket until its face is square to screen-RIGHT and its rim is edge-on to the camera, sets his own near
shoulder in behind it, and coils his whole armoured mass back and DOWN over his rear boot - knees folding
deep, spine curling, helm tucking in behind the top petal, his silhouette pulling in and NARROWING as the
bloom turns edge-on. The lance is hauled down and back against his own near thigh and takes no part, its
point held low and dead the entire beat. THEN AT THE FORTY PER CENT MARK he releases it: his hips, shoulders
and whole mass drive forward toward screen-RIGHT and DOWN behind the shield in one committed sink, both boots
sliding flat along the stone without either one leaving it and travelling no more than one of his own
boot-lengths in all, and the bloom's bottom petal RIM bites the flagstone just outside his leading boot and
ploughs. The stone gives way under it: EXACTLY FIVE chunks of solid broken grey floor-stone are shouldered
UPWARD along the bite, each chunk no bigger than his own closed GAUNTLETED FIST, rising no higher than his
own knee and spreading no wider than his own standing footprint and one and a half of his own boot-lengths
ahead of it - never past his rear heel toward screen-left and never further toward screen-right than that -
every chunk cracking apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN
ROCK: opaque, chunky, sharp-edged, matte, grey and lit like stone - never white, never pink, never gold,
never a petal, never a glow, never a flame, never a spark of light, never a wisp. HE HOLDS THAT DEEP SUNK
BRACE THROUGH THE WHOLE THIRD QUARTER with the rim still buried in the broken stone and his whole weight
leaning down onto that far arm, his shoulders heaving and his breastplate shuddering, while the last chunks
crumble away. Only in the final second does he lift the rim off the stone, rise, turn the bloom back and let
the shield settle to exactly where it hangs in the reference image and the lance ride back to exactly the
angle it has there, into the EXACT same reference stance, so that he is already standing completely still in
the reference pose well before the clip ends. He does this ONCE and does not repeat it. Driving, grinding,
immovable.

## special_2  (THE GROUND COUCH) — the point laid on the flagstone and the whole mass driven along it
SPECIAL FINISHER (the ground couch): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he DRAWS the lance's butt back toward
screen-LEFT until his gripping fist stands behind his own rear heel and at the same time rolls the point
forward and ALL THE WAY DOWN, his fist sinking with it the whole way so the point is falling from the first
frame and never once lifts, until the white spear point lies flat ON the flagstone a hand's width outside his own leading boot
and the whole thorned haft runs down at a shallow angle across the front of his own legs. His knees fold
deep, his hips drop, his helm comes down over the haft and the rose shield swings IN and forward to hang in
front of his own leading knee. THEN AT THE FORTY PER CENT MARK HE DRIVES: his hips, his shoulders and his
whole armoured mass go forward toward screen-RIGHT in one long committed push behind the shield, both boots
sliding flat along the stone without either one leaving it and travelling no more than one of his own
boot-lengths in all, and the grounded point ploughs forward through the flagstone ahead of his leading boot
with the stone splitting open along its line. EXACTLY FOUR slabs of solid broken grey floor-stone are
shouldered UPWARD out of that split, each slab no bigger than the pink HEEL-BLOCK of his own boot, rising no
higher than his own ankle and spreading no wider than his own standing footprint and one and a half of his
own boot-lengths ahead of it - never past his rear heel toward screen-left and never further toward
screen-right than that - every slab cracking apart and crumbling away to nothing in mid-air as it falls. The
debris is SOLID BROKEN ROCK: opaque, flat, sharp-edged, matte, grey and lit like stone - never white, never
pink, never gold, never a petal, never a glow, never a flame, never a spark of light, never a wisp. HE HOLDS
THAT LOW DRIVEN FINISH THROUGH THE WHOLE THIRD QUARTER with the point still in the broken stone and his whole
weight stacked forward over his leading knee, his shoulders heaving, while the last slabs crumble away. Only
in the final second does he draw the point back up off the stone, rise, and let the lance ride back to
exactly the angle and height it has in the reference image and the shield settle back to exactly where it
hangs there, into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. He drives ONCE and does not repeat it. Low, driving, relentless.

## special_3  (THE CLOSED BLOOM) — the rose shuts over him, holds under load until the stone gives, then opens
SPECIAL FINISHER (the closed bloom): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST FIFTH the bloom SHUTS: he sweeps the rose shield UP
and ACROSS on its bracket until it covers him from the top of his own helmet crest down to his own leading
knee, its face square to screen-RIGHT and its top petal rising no higher than the top of that crest, and at
the same moment he hauls the lance IN hard against his own ribs with his elbow clamped to his side so it
rides in toward his own body without its point ever rising. Then he FOLDS his whole body in behind the bloom
- helm tucked, near shoulder and its petal pauldron rolled in behind the rim, spine curled over, hips
dropping into the deepest crouch he goes into anywhere in this kit, both boots screwing down into the stone
on the spot they stand on. HE HOLDS THAT CLOSED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP under
mounting load: his far forearm shakes, his shoulders judder, his breastplate heaves inside the gorget, the
violet sash tail shivers, and his two boots grind down harder and harder without either one leaving the spot
it stands on - and under that grinding pressure the flagstone gives way beneath them. EXACTLY SIX chips of
solid broken grey floor-stone are pushed UPWARD out of the stone around his two boots, each chip no bigger
than one of his own armoured KNUCKLES, rising no higher than his own knee and spreading no wider than his own
standing footprint - never past his leading boot's toe-cap toward screen-right and never past his rear heel
toward screen-left - every chip cracking apart and crumbling away to nothing in mid-air as it falls. The
debris is SOLID BROKEN ROCK: opaque, chunky, sharp-edged, matte, grey and lit like stone - never white, never
pink, never gold, never a petal, never a glow, never a flame, never a spark of light, never a wisp. AT THE
SEVENTY-FIVE PER CENT MARK THE BLOOM OPENS: he drives up out of his knees and throws ONE short hard shove of
the whole shield straight forward toward screen-RIGHT, its outer rim travelling no further than one of his
own boot-lengths past where it sits in the reference image and rising no higher, and he does not throw a
second. Then he lets the shield fall back to exactly where it hangs in the reference image and the lance ride
back to exactly the angle it has there, settling into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Closed, loaded, final.
