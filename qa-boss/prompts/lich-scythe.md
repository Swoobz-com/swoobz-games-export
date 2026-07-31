# LICH SCYTHE — MK FINAL playable #6. Full 13-clip kit. Phase 107.

Generated OFF THE PADDED PLATE `qa-boss/anchors/mk/lich-scythe-anchor-green.png`. The plate was padded
today and pre-screened before this kit was written: `node qa-boss/check-plate-key.mjs` returns opaque
**11.96%**, p99 backdrop distance **5.1**, max 70 against the keyer's `TIGHT=45 / LOOSE=70`, and the
rendered alpha at `qa-boss/frames/platekey/lich-scythe-anchor-green-alpha.png` is a clean silhouette —
no rectangle, no interior holes. **No re-plate, no re-pad.** He faces SCREEN-RIGHT natively; no hflip
anywhere in this kit. Two things the pre-screen did NOT catch are in rules 9 and 10 below and they are
the two things to read before firing anything.

## ★ LICH FRAME BUDGET — measured, applies to EVERY clip of his

Plate 1536x1536. Full subject **910w x 1044h** (fills 68.0% of frame height), bbox x312..x1221,
y468..y1511.
  LEFT **312px** · RIGHT **314px** · HEADROOM **468px** · bottom **24px**, free (taloned feet on the
  floor line — `check-containment.mjs` treats feet-on-floor as expected and never counts it).

**These are the ROOMIEST lateral margins in the MK set — 110px more per side than raiju — and that is
exactly why he must be written PROP-TUCKED rather than prop-extended. A roomy plate forgives a reach
that `check-anchor-lock` and the span cap will not.**

**WHO OWNS EACH EDGE:**
  · **LEFT x312**, rows y1232..y1253 (22px) — the curved **BONE CHARM** hanging on the short chain off
    the haft butt, down at his own knee height.
  · **RIGHT x1221**, rows y884..y947 (64px) — the outer belly of the crescent **BLADE**.
  · **TOP y468**, cols x670..x683 (14px) — the topmost lick of the **VIOLET CROWN-FLAME**. The tallest
    metal crown spike sits 6px BELOW it, at y474.
  · **BOTTOM y1511**, cols x538..x612 — his rear foot's talons on the floor line.
  · His own **STANDING FOOTPRINT is x436..x845 = 410px** (rear heel to leading toe-claws), leaving
    124px of clear plate on his left and 690px on his right. **He is not the containment risk. The
    895px-wide scythe assembly and the flame are.**

  1. **THE SCYTHE SPANS x326..x1221 — 895px OF A 910px SUBJECT. BOTH LATERAL EDGES BELONG TO THE
     WEAPON, NEITHER TO HIS BODY.** He grips it in BOTH skeletal hands: the **LOWER hand at about
     (580, 970)**, down at his own waist, and the **LEADING hand at about (895, 835)**, out in front of
     his ribcage — 350px apart along the haft. Measured from the LOWER hand, the levers are: **blade
     POINT 586px · blade outer BELLY 647px · hooked bone BACK-SPUR 598px · HAFT-BUTT BONE 290px.**
  2. **THE LOWER HAND IS THE FULCRUM, THE LEADING HAND IS THE DRIVER — AND THAT 2:1 LEVER RATIO IS THE
     WHOLE KIT.** Because the blade levers are more than twice the butt lever, a rotation that carries
     the blade a very long way carries the butt-bone barely anywhere. So every beat in this file states
     that **his LOWER bone hand stays locked on the haft, held in close at his own waist, and never
     travels out away from his own body** — and that it is the LEADING hand that travels. That single
     instruction is what makes every bound below TRUE: it narrows the ACTION instead of restating the
     bound, which is the only fix that has ever worked. **It is deliberately phrased about the hand's
     position ON HIM and not about a fixed point in the air**, because most of these beats also SINK his
     whole body, and a hand pinned in world space would contradict its own clip.
  3. **THE DEEP REAP IS GEOMETRICALLY SAFER THAN THE ANCHOR POSE ITSELF.** Rotating the weapon
     blade-DOWN about the lower hand: at **60 degrees** the blade POINT reaches the stone at **x789 —
     INSIDE his own standing footprint** — while the butt-bone sits at **x332, 6px INSIDE its reference
     position**; at **70 degrees** the point drags back to **x691** and the butt is at **x362**, 36px
     inside. The worst leftward excursion anywhere in that whole arc is **x290**, reached only at the
     29-degree mark as the butt-bone passes level with the lower hand — 36px past its reference and
     still **290px clear of the frame edge**. And the reap NARROWS him: at the 45-degree mark the whole
     subject spans x290..x1094 = **804px against the anchor's 910px**. **The deeper he reaps, the safer
     it gets. That is his signature move and it is privileged.**
     **KNOWN AND ACCEPTED, so nobody re-derives it later:** the suffix bounds the bone butt at its
     ANCHOR position, and this arc grazes that bound by **36px mid-swing before returning inside it**.
     That is 12% of a 312px margin on a soft dangling element, and the bound's real job is to stop a
     TRANSLATION of the whole weapon toward screen-left, which is a several-hundred-pixel move. So the
     acting lines describe the butt's actual path (up, round, finishing nearer him) and do NOT restate
     the lateral bound — the suffix carries it once, which is where it belongs.
  4. **NEITHER END EVER RISES — AND THE ARITHMETIC IS WHY THAT IS THE SAME LAW AS THE LATERAL BOUND.**
     From the leading hand the butt sits on a 634px lever at 26.2 degrees below horizontal, so
     x = 895 − 634·cos(angle below horizontal): the butt only travels toward screen-LEFT when it RISES
     (flat level with the ground it reaches x261). The blade is the mirror image — it only travels
     toward screen-RIGHT when it RISES. So **"neither end rises" and "neither end crosses its lateral
     bound" are ONE law**, and **DOWN is the only direction free for both ends at once** — which means
     a body SINK, with the weapon riding down at its own angle. The bottom edge is free, so downward
     costs nothing.
  5. **THE CEILING BELONGS TO THE FLAME, AND THE SCYTHE PHYSICALLY CANNOT REACH IT WHILE HIS HAND STAYS
     PUT.** From the lower hand at y970 the bone BACK-SPUR sits on a 598px lever 34.9 degrees above
     horizontal; it reaches the crown's own height (y474) after a **21-degree** blade-up rotation, and
     its highest attainable point of all — y372, above the frame's subject top — needs 55 degrees. So
     the ceiling law is written twice over and both halves are cheap: **NO PART of the scythe is ever
     raised above the height his own CROWN SPIKES have in the reference image**, and **his LEADING bone
     hand never rises above the height it has in the reference image.** With the hand pinned, all 895px
     of weapon stays out of the 468px of headroom entirely.
  6. **THE ROLL IS FREE.** Turning the scythe about its own long SHAFT AXIS changes which face of the
     crescent points where and moves NEITHER end — no lateral cost, no vertical cost, and it is the one
     rotation with none. `special_2` opens on it.
  7. **THE CHAIN IS THE ONE PART THAT IS NOT RIGID.** A short steel chain with a curved bone charm
     hangs free off the butt-bone and owns the left edge. It always hangs DOWN, so it follows the
     butt-bone but LAGS it, and it swings. It is bounded together with the butt-bone in every clause,
     never separately.
  8. **SPAN: 1.60x.** `measure-anchor-budget.mjs` computes max spanPeak 1.69x for this plate; the hard
     roster rule caps at 1.60x and the SMALLER wins. 910 x 1.60 = 1456px of a 1536 frame. Nothing in
     this kit steps, lunges, thrusts or reaches, so nothing approaches it — and his signature beat
     shrinks him.
  9. **HE CARRIES A BAKED EMISSIVE FEATURE AND THE STANDARD TEST CANNOT SEE IT.** Over all 285,313
     subject pixels there are **ZERO** with all three channels at 250 or above, and the warm/emissive
     screen reads 0.01% — which is why he was handed over as "no baked glow". But he has a **VIOLET
     FLAME** burning up out of his crown and a second smaller one in his near eye socket: **3007 subject
     pixels, 1.05%**, in a plume at x648..x725 / y474..y551 plus the socket lick at x684..x699 /
     y714..y735, the brightest 194/111/255 at x674,y503. **The flame is COOL, and a white/warm test is
     blind to cool emission.** It does NOT bloom onto the plate: probing the chroma straight up off the
     flame tip reads 13/207/15 at 1px, 11/209/11 at 4px and flat plate 1/216/0 by 8px — a 21-unit
     anti-aliased contact edge, not spill. **The kitsune-blocker class does NOT apply.** The real risk
     is the opposite one: **the flame IS the topmost 6 rows of the subject, and a fire told to burn will
     billow.** A doubled plume goes straight off the top edge. So the suffix pins the flame's **SIZE and
     SHAPE**, not merely its brightness, and bans a SECOND flame BY NAME while leaving the one he has.
 10. **PLATE — CLEAN, WITH ONE STANDING WATCH ITEM.** Nothing anywhere on him is green — his palette is
     dusty purple, ivory bone, antique gold, tarnished iron and violet — so unlike pale choir there is
     no `isGreen` hole risk in putting him on a green screen, and the rendered alpha confirms it.
     **WATCH, and it is a FIRST-CLIP check, not a blocker on writing:** two elements are marginal on the
     still. The **CHAIN** resolves in the alpha as a beaded, almost-broken strand because every link
     keys separately; and the **flame's top 6 rows** sit only about 52 from the plate colour against
     `TIGHT=45`. A generated clip adds compression and motion blur to both. **Inspect the FIRST keyed
     clip for a dropped or speckled chain and a flickering flame tip before the other twelve are fired.**
 11. **EFFECTS ARE SOLID GRAVE-MATTER, NEVER SOUL-FIRE — THIS IS THE ONE THAT BITES ON A LICH.** Told to
     show an undead king's power, the model reaches for wisps, spectral light, soul-flame and ghost-glow
     unprompted, and every one of those keys out to nothing AND reads as the banned energy class. So
     every effect in this kit is **opaque broken grey floor-stone and hard grey grave-stone grit, matte,
     sharp-edged and lit like rock**, and each one carries all THREE legs: an exact **COUNT**, a
     per-object **SIZE** tied to one of his own parts (his own skeletal hand, one of his own foot-talons)
     and a **SPAN** tied to his **410px STANDING FOOTPRINT** — never past his leading foot toward
     screen-right, never past his rear heel toward screen-left. Never "the gap between his feet", which
     a crouch widens.

## ☰ SHARED BLOCKS — prepended/appended to every state; this is NOT a state and is never built

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

NB, deliberately OUTSIDE the blockquote: `quoted()` in build-prompt.mjs concatenates EVERY `>` line into
the fired prompt, so an operator note written inside the blockquote is sent to the model as an
instruction. FIVE literals above are load-bearing and must not be re-worded.

(a) THE WEAPON LOCK IS WRITTEN TO **SURVIVE** THE ko, FOLLOWING JIN AND NOT RAIJU. The KO-SUFFIX RULE
strips any sentence matching `keeps the ... never drops or swaps`, because most of the roster DROPS the
weapon on the way down. **This character must not** — he never drops or swaps the scythe in any state,
so the lock is phrased "stays gripped in his own skeletal hands ... never released, never let go, never
exchanged", which (i) does not match the strip, (ii) stays TRUE through a prone collapse because a
skeleton's grip does not relax, and (iii) sits in its own separate sentence so no strip can take the
identity lock with it as collateral. Verified: his built `ko` still carries both sentences.

(b) `HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP` is spelled with FEET, not TALONS and not
CLAWED FEET. The ko rewrite matches that exact literal; spell it any other way and the rewrite silently
misses and a prone collapse ships with its feet locked flat.

(c) THE STANCE CLAUSE USES THE CANONICAL `he keeps his stance narrow and never spreads wider than`, so
the ko rewrite rescopes it to WHILE HE IS ON HIS FEET. Verified: his ko builds it once, not twice.

(d) THE WEAPON-MOTION SENTENCE IS SCOPED `While it is in his grip` and carries NO "never flattens level
with the ground" clause. Raiju needs that clause because his anchor sits exactly on both lateral bounds
at once; this weapon does not — rule 3 above shows a deep blade-down rotation moving BOTH ends inward —
and on the `ko` the scythe comes to rest lying across the stone beside him, which such a clause would
forbid. The swing-round is banned as `so that its BLADE passes behind him` and NOT as the shorter
"never swung round behind him": his bone butt and its chain are ALREADY behind him in the anchor, and
three acting lines correctly swing that far end DOWN and back, which the short wording would have read
as a ban on exactly the thing they do.

(e) THE DEBRIS TAIL FOLLOWS SKULLREND / PALE-CHOIR / JIN / RAIJU, not minotaur: it ends "at the end
there is no shed, torn, broken or kicked-up material anywhere in the shot" rather than "the last frame
shows ONLY the fighter and what the fighter holds". Law 7 (first == last) is carried per-state instead:
every non-`ko` action line ends "back into the EXACT same reference stance".

FACING, judgement call: **PARTLY OPEN — and he is the MOST open plate of the MK set. Read at FULL SIZE
on four separate crops, not off a contact sheet.** Verdict and the evidence that decided it:
  · **HEAD — 3/4 turned toward screen-right, NOT strict profile.** This is where he differs from raiju,
    pale choir and jin, all of whom had strict-profile heads. His dental arch CURVES across the front of
    the skull with the squared front teeth presented face-on and the rows receding on both sides; his
    nasal aperture reads as a full open cavity rather than the edge-on notch a true profile gives; and
    the near eye socket sits as a complete round orbit with the flame standing straight up out of it.
  · **TORSO — decisively OPEN.** His exposed RIBCAGE presents both rib arrays flanking a central
    sternum, with the sternum running down the CENTRE of the visible mass rather than along a silhouette
    edge. Both shoulders read as separate armoured volumes — a layered pauldron on one, a spiked
    gem-set bone guard on the other — and the robe opens in a symmetric V down his front centre.
  · **HIPS — open.** The sash and its buckle plate present their faces to camera and the long gold-edged
    tabard panel hangs down the MIDDLE of the visible thigh mass, showing its full face.
  · **FEET — the decisive crop, exactly as it was on pale choir and jin. BOTH taloned feet show their
    full TOPS with all four claws splayed and visible** — the rear foot turned out toward the viewer,
    the leading foot presenting its whole instep. That is impossible in true profile, where one foot
    would sit edge-on behind the other.
So no line in this file orders "strict side profile", which would order the model to re-pose him toward
pure profile mid-clip and fight his own anchor; every line says "angled to camera exactly as in the
reference image and facing screen-right", and the suffix bans the turn in BOTH directions. **It is NOT
the frontal-plate blocker (IR-41 class):** his skull is turned to screen-right, his whole weapon is
carried out to screen-right, both arms drive that way, his leading foot points that way, and every line
of attack in the kit is committed to screen-right. This is the same verdict as minotaur-axe,
skullrend-orcus, pale-choir, jin-goldenhand and raiju-naginata — now six of seven MK plates.

HE IS TWO-HANDED ON THE HAFT, and his LOWER hand may come off it for exactly one beat. The plate shows
both skeletal hands closed on the haft 350px apart. `attack_throw_b` opens the LOWER hand to seize with
bare finger bones and closes it back on the haft in the final second; the leading hand never leaves,
which is why the weapon lock is written on the LEADING hand specifically. Every other state keeps both
hands on the weapon.

NO SPEECH, NO SCREAM AND NO LAUGH ANYWHERE, on purpose: his jaw is a fixed lipless grin in the reference
and the suffix freezes it there, so a scream or a laugh would contradict a law he already carries.

SPECIAL add-on (the 3 specials only; Tim's contain-in-frame rule):
APART FROM HIS OWN SPLIT FLOOR-STONE AND GRAVE-STONE GRIT the green stays completely empty and unbroken; the ONLY things visible are HIS OWN body, his scythe and HIS OWN debris. Every piece of debris is SOLID MATERIAL - real slabs, chunks, chips and grains of broken grey floor-stone and hard grey grave-stone grit, opaque, sharp-edged, matte and lit like rock - never a glow, never a flame, never a spark of light, never a wisp, never a spirit, never an aura, never mist or smoke, and never a whole intact object. NOTHING anywhere in the shot ever lights up, flashes or crackles, and NO SECOND FLAME ever appears - the only fire in the shot is the violet flame already burning in his crown and eye socket in the reference image, and it never grows and never spreads. All of it is knocked UPWARD and stays low and close to him, rising no higher than his own ribcage and spreading no wider than HIS OWN STANDING FOOTPRINT - never past his leading foot toward screen-right, never past his rear heel toward screen-left - and every piece crumbles away to nothing in mid-air as it falls, so none of it ever reaches the floor and none of it ever comes near the left, right or top edge of the frame. EACH FINISHER'S OWN ACTING LINE STATES ITS EXACT COUNT AND HOW HIGH ITS DEBRIS MAY GO, and that per-beat bound is the one to obey.

## ★ IDLE v2 — ACCEPTED (fired 2026-07-31, job 7f3a626e). THIS IS HIS KIT ANCHOR.

|                          | v1 (rejected)        | v2 (ACCEPTED)        |
|--------------------------|----------------------|----------------------|
| check-frontturn          | sym 0.075->**0.239**, run **11/97** @f45 | sym 0.071->**0.105**, run **0/97** |
| containment              | CLEAN                | CLEAN                |
| check-extra-objects      | 2 blobs @f64         | **1 blob**           |
| raw-anchor f0   ALL/BODY | 0.905 / 0.860        | 0.902 / 0.776        |
| raw-anchor fLast ALL/BODY| 0.902 / 0.862        | **0.933 / 0.899**    |
| loop seam f0-vs-fLast IoU| 0.9892               | **0.9758**           |
| head-top travel          | 10px                 | 10px                 |
| mean changed px/frame    | 3729                 | 1408                 |

The front-turn is GONE (peak sym 0.105 against a 0.191 threshold) and fLast 0.933 now exceeds
both accepted peers on this scale (eclipse strike_a 0.924, ir37 strike_b 0.930). Keys with margin
on f0/f44/f96 (opaque 12.00-12.05%, emis 0.58-0.78%, white 0.00%); mask inspected — solid
silhouette, NO rectangular alpha edge, the violet crown flame survives as solid alpha, the
inter-leg negative space is preserved and there are no body holes.

**DO NOT read the f0 BODY drop (0.860 -> 0.776) as a pose regression.** v1 f000 and v2 f000 are
IoU **0.9898** — the same start pose. BODY re-crops to the body bbox, and this character's charm
detaches or connects depending on the frame, which moves that bbox and swings the number hard.
The ALL figures (0.905 vs 0.902) correctly report the two frames as near-identical. On this
character, judge f0 on ALL; BODY is unstable by construction.

The motion drop (3729 -> 1408 mean changed px) is the DEFECT leaving, not the beat weakening:
head-top travel is 10px in BOTH versions, so the intended vertical settle is preserved at
identical amplitude and what left the budget is the rotation.

## ★ IDLE v1 — REJECTED, front-turn (fired 2026-07-31, job aa5212eb)

Measured: containment CLEAN · extra-objects 1 body blob (see chain caveat below) · raw-anchor vs plate
f0 0.905 / fLast 0.902 ALL, 0.860 / 0.862 BODY — no drift, f0 and fLast agree · **check-frontturn
FLAGGED: sym 0.075 -> 0.239, aspect 0.88 -> 0.99, an 11-frame run from f45.**

Confirmed by eye, not just by the number: at f0 the ribcage reads at a clear 3/4 angle with the
sternum diagonal and the screen-left shoulder set back; by f50 the ribs are near-symmetric, the
sternum is centred, both shoulders sit equally forward, and the skull's teeth spread from a side row
to a frontal spread. The torso AND the skull open toward camera. Not a bbox artifact of the detached
charm either — during f45-f56 the charm reads CONNECTED, so that bbox is body-only.

DIAGNOSIS: the BEAT licensed the rotation; the bound was already stated twice and was ignored, which
is the standing rule (restating a bound never works). Three rotational licences in the v1 acting line:
(a) "his shoulders ROLL up under the pauldron", (b) "his weight ROLLS slowly from his rear foot onto
his leading foot" — a foot-to-foot transfer squares the hips in a 3/4 stance, and (c) "the way a
headsman MEASURES THE GROUND IN FRONT OF HIM", which invites a look. The flag begins at f45, exactly
where settling #2 starts, which is what accumulated rotation across two cycles looks like.
v2 changes the BEAT to purely vertical motion and narrows the OBJECT (the shoulder line, the hip line)
instead of adding a third facing sentence.

NOT defects, both checked and cleared:
- **The crown flame is FINE.** It looked like it was billowing; measured against the plate its peak
  violet area is 1.09x and its peak height 0.99x, and its top row never rises above the plate's
  (plate top y296, clip highest y296). The plate's flame is in fact the TALLER one — 272px vs f000's
  153px — so what reads as growth is flicker inside the reference envelope. Do not "fix" this.
- **The beaded chain is INHERENT, not a generation defect.** The clip's chain keys as a broken strand
  with the bone charm floating — but so does the PLATE's. An open-link chain has holes, the holes are
  full of green, and the keyer takes them; only the link metal survives, as beads. The clip is
  marginally worse because its chain also picked up green spill (it renders green-tinted). No prompt
  wording can fix this. It is a character-level caveat and a candidate for Tim's re-plate list (a
  magenta plate would not spill green onto dark metal) — do NOT burn re-rolls on it.

## idle
IDLE COMBAT-READY LOOP: a tall dead-still guard, his weight sunk and even over both planted taloned
feet, the scythe held steady across his body on the low diagonal it has in the reference and both bone
hands closed on the haft. He does not breathe - instead ONE full slow SETTLING of his whole dead frame
fills the first half of the clip and a second fills the second half, and EVERY PART of that settling is
STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: on each one his bare ribcage lifts and sinks a fraction
as though remembering a breath it no longer takes, his shoulders lift a fraction under the pauldron and
settle STRAIGHT back down with neither one coming forward and neither one going back, his crowned skull
lowers a fraction STRAIGHT DOWN on his neck and rises again without ever turning left or right, the
finger bones of his lower hand flex once on the haft and re-close, and his whole weight sinks a fraction
STRAIGHT DOWN through BOTH planted feet at once and rises again - his weight NEVER transfers from one
foot to the other and neither foot ever carries more of it than the other. THE LINE OF HIS TWO SHOULDERS
AND THE LINE OF HIS TWO HIPS STAY EXACTLY AS THEY ARE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - his
near shoulder never comes forward, his far shoulder never swings round, and his chest and his bare
ribcage never square up toward the camera. The whole scythe rides DOWN with him a finger's width and back
up on every settling, holding the same angle throughout, and the hanging chain and its bone charm swing
faintly at the low end while the torn hems of his robe and the long tabard panel sway with him. His jaws
stay fixed in the same lipless grin and do not move at all. Feet planted, silent and patient. Returns to
the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

## ★ attack_strike v3 — ACCEPTED (fired 2026-07-31, job c5772ae3)

                        v1              v2              v3 (ACCEPTED)
  aspect                1.40            1.50            **1.14**   (baseline 0.89)
  extra-objects         2 blobs         1 blob          1 blob
  containment           CLEAN           CLEAN           CLEAN
  raw-anchor f0/fLast   .904/.905       .900/.902       **.902/.905** ALL
  anchor return IoU     -               -               **0.9913**
  check-frontturn sym   0.436           0.373           0.496 (CONFOUNDED, drop 19%)

DIRECTING THE ROTATION IS WHAT FIXED IT. v2 forbade rotation and demanded the blade reach knee
height — impossible together, so the model rotated the scythe HORIZONTAL and reached it OUT
(aspect 1.50). v3 tells it which way to rotate, using rule 3 of his own budget: lower hand locked
as fulcrum, leading hand driving, weapon rotating BLADE-DOWN AND INWARD. Aspect fell to 1.14 and
frame f040 shows exactly the intended beat — blade down, point near the stone, pulled in tight
against his body. The deep reap NARROWS him, as rule 3 predicted.

It also returns to the anchor better than his accepted idle does: **IoU 0.9913 vs 0.9758.**

WHY THE sym 0.496 IS NOT A DEFECT, settled by discrimination rather than assertion. The new
dropPct label flags this clip CONFOUNDED (19% height drop), so the number cannot adjudicate. I
cropped the torso and compared f040 against lich idle v1 f050 — the one front-turn on this
character that was CONFIRMED by eye. They are different pose classes:
  idle v1 f050 (real turn)  ribs SYMMETRIC, sternum CENTRED, jaw spreading FRONTALLY
  strike v3 f040            skull still in clean PROFILE (one jaw line, side-on socket),
                            ribcage ANGLED, body FOLDED forward over the leading knee
A fold reads as a compact symmetric blob to a mirror-IoU metric; pulling the weapon IN makes it
more compact still, which is why sym ROSE while aspect FELL. That combination — sym up, aspect
down — is the signature of the fix working, not of a turn.

FEET: planted. The bottom subject row never rises above f0's (941 vs 943 — noise). A first pass
of mine mislabelled an 18px spread as "feet leave the floor"; it is DOWNWARD, the blade tip
descending past the foot line at f030. A lifted heel moves that row UP, not down.

Watch on the next lich clip: at f030 the blade point reaches ~16px below the foot line, i.e.
marginally through the floor plane. Containment does not count the bottom edge so it costs
nothing, but "the blade never touches the ground" is in the acting line and is very slightly
overstepped.

## ★ attack_strike v2 — REJECTED, but the wind-up fix WORKED (fired 2026-07-31, job 069c7e51)

                        v1                          v2
  check-frontturn       sym 0.436 · aspect 1.40 · 69/97   sym 0.373 · aspect 1.50 · 66/97
  extra-objects         2 blobs @f36                      **1 blob — CLEAN**
  containment           CLEAN                             CLEAN
  raw-anchor f0/fLast   0.904 / 0.905 ALL                 0.900 / 0.902 ALL

TWO OF THE THREE v1 FIXES LANDED, and the frames prove it:
  · **NO OVERHEAD RAISE.** v1's f020 had the scythe fully above his crown with both arms
    extended. v2 never lifts it at all. Removing the wind-up and the named start height worked.
  · **NO DUST CLOUD.** Renaming the debris to solid floor-STONE chips cleared extra-objects to
    a single blob.

WHY THE GATE NUMBER BARELY MOVED — AND WHY IT IS CONFOUNDED HERE. `check-frontturn` derives
selfSym and aspect from the BBOX. This beat is a DEEP FORWARD FOLD ("hips folding deep, ribcage
coming down over his leading knee"), and a folded body reads as a compact, more symmetric blob,
which raises selfSym on its own. The horizontal scythe then pushes aspect to 1.50. **The metric
cannot tell a FOLD from a TURN, so it cannot adjudicate this clip.** Do not read 0.373 as a
measured front-turn; read it as "not measurable by this tool on a crouch beat". Same family as
the recorded lesson that minIoU bbox-NORMALISES and therefore cannot see a sink.

THE DEFECT THAT IS UNAMBIGUOUS, AND IT WAS A CONTRADICTION I WROTE. v2 said:

> hauls the whole scythe DOWN with him **at the exact angle it holds in the reference** … so the
> edge shears downward … **to below his own knee** … The weapon **does not rotate**

Those fight. Rule 3 of his own FRAME BUDGET computes it: getting the blade down to the stone
needs a **~60-degree rotation** about the lower hand. A pure sink cannot lower the blade to knee
height — only a rotation can. Told to do both, the model rotated the scythe to HORIZONTAL and
reached it OUT toward screen-right, which also breaks "NEVER thrust or reached out ahead of him"
and is what put aspect at 1.50.

v3 stops forbidding the rotation and instead DIRECTS it, using his kit's own geometry: the LOWER
hand locks at his waist as the fulcrum, the LEADING hand drives, and the weapon rotates
BLADE-DOWN AND INWARD so the point finishes beside his own leading foot inside his standing
footprint — which rule 3 proves NARROWS him (subject 804px vs the anchor's 910px). Beat and
bound now point the same way, and "never carried level, never carried horizontal" is stated
because horizontal is the failure mode actually observed.

## ★ attack_strike v1 — REJECTED, FIVE defects, all from the WIND-UP (fired 2026-07-31, job fadf6b83)

  check-frontturn   sym 0.068 -> **0.436**, aspect 0.88 -> **1.40**, run **69/97** @f12
  containment       CLEAN
  extra-objects     2 blobs @f36 (592px)
  raw-anchor        f0 0.904 / fLast 0.905 ALL — starts and ends correctly on the anchor

The anchor numbers are fine and the failure is entirely in the middle. Frame f020 shows all of
it at once: the scythe **FULLY OVERHEAD** with both arms extended and the blade well above his
crown, his body **SQUARE TO CAMERA**, and his near **HEEL OFF THE GROUND**. Five bounds broken:
the crown-spike ceiling, never-vertical/never-overhead, the leading-hand height, the facing lock,
and feet-flat. At f036 a translucent **DUST CLOUD** — a banned effect class.

ROOT CAUSE: THE WIND-UP, exactly as oni taught it. Two licences did the damage.

1. **The line named a START HEIGHT above the reference.** "shears down through the air FROM HIS
   OWN SHOULDER HEIGHT to below his own knee" — the scythe sits on a LOW DIAGONAL in the
   reference, so to shear from shoulder height the model must first RAISE it there, and it
   overshot into a full overhead raise that took the facing and the feet with it. **Never name a
   starting height for a downward beat other than "where it already is".**
2. **My own phase-137 de-rotation fix was incomplete.** I replaced "shoulders ROLLING up" with
   "shoulders LIFTING STRAIGHT up" — which removes the rotation but LEAVES AN UPWARD LIFT in the
   wind-up. De-rotating is not the same as de-raising. For a downward beat, the wind-up must be
   removed, not merely straightened.
3. **The acting line's own noun licensed the banned effect.** "three grains of hard grey
   GRAVE-DUST grit" — the suffix bans mist and smoke, but the beat said DUST, and dust is what it
   got. A negative in the suffix does not survive a positive noun in the beat.

Compare his idle, which passed: it has NO wind-up at all, and every motion is a sink.

## attack_strike A  (falling reap, a clean cut through air) — v2
STRIKE A (falling reap): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right, the scythe held across his body on the low diagonal it has in
the reference with its blade already high toward screen-right. THERE IS NO WIND-UP OF ANY KIND: he does
NOT raise the scythe, does NOT draw it back, does NOT lift it even slightly, his shoulders do NOT rise,
and NO PART of the weapon travels UPWARD at ANY moment in the clip. The cut starts from exactly where
the blade ALREADY SITS in the reference image and only ever goes DOWN. IN THE FIRST QUARTER OF THE CLIP
his knees simply fold and he DROPS his
entire mass straight DOWN over both planted feet in one committed sink, his hips folding deep and his
ribcage coming down over his leading knee. His LOWER bone hand stays LOCKED on the haft and held in
close at his own waist, never travelling out away from his own body, and it is his LEADING bone hand
that drives: it hauls the haft DOWN and BACK IN toward his own body so that the whole scythe ROTATES
BLADE-DOWN AND INWARD about that locked lower hand, and the honed inner edge of the crescent shears
downward through empty air until the blade POINT is down beside his own leading foot and INSIDE his own
standing footprint. THE BLADE TRAVELS DOWN AND IN, NEVER OUT: it is NEVER carried level, NEVER carried
horizontal, is NEVER thrust or reached out ahead of him toward screen-right, and its point NEVER travels
further toward screen-right than it does in the reference image - the deeper it drops the CLOSER to his
own body it comes. NO PART of the weapon ever RISES. BOTH OF HIS FEET STAY FLAT ON THE STONE THROUGHOUT - neither heel ever lifts, he never comes up
onto his toes, and he never rises out of the sink until the recovery. THE LINE OF HIS
TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE
IMAGE IN EVERY SINGLE FRAME - his near shoulder never comes forward, his far shoulder never swings
round, and his chest and his bare ribcage never square up toward the camera; he may FOLD and SINK, but
he never TURNS. As his weight
lands, his rear foot's talons grind hard DOWN into the stone on his screen-LEFT side and break EXACTLY
THREE small chips of hard grey floor-STONE up off the flagstones, each chip no bigger than one of his
own foot-talons and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his own ankle and spreading no wider than his own standing footprint
- never past his leading foot toward screen-right and never past his rear heel toward screen-left -
every chip crumbling away to nothing in mid-air as it falls; nothing else sheds and nothing else
breaks, this is a clean edge and the blade never touches the ground. THE CUT HAS LANDED BY THE HALFWAY
POINT OF THE CLIP; he HOLDS the sunk stance through the third quarter, his ribcage heaving over the
locked haft while the last chips crumble away, and only in the final second does he rise slowly and
settle back into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Fast for his size, heavy, silent.

## attack_strike_b  (rising hook, the bone spur pulled back)
STRIKE B (rising hook): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he sinks his hips into a low braced crouch
over both planted feet and draws his shoulders straight BACK toward screen-LEFT with neither one coming
forward and neither one swinging round, gathering the haft in tight. THE LINE OF HIS TWO SHOULDERS AND
THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE
FRAME - he may SINK, DRAW BACK and RISE, but he never TURNS. Then
he drives up out of his knees and SNAPS the whole scythe head a short way UP and IN toward his own leading
shoulder in one savage hooking pull, the head staying out in front of him toward screen-right the whole
way, the hooked bone BACK-SPUR leading and the weapon turning about his own LOWER bone hand, which stays
locked on the haft close in at his own waist and never travels out away from his own body, while the
LEADING hand hauls DOWN toward his own hip. No part of the head rises above the height his own crown spikes have in the
reference image, and at the far end the knobbed BONE BUTT swings DOWN and IN toward his own rear foot
with the chain and its bone charm whipping down after it, never further toward screen-left than they
hang in the reference image. His hips and shoulders drive the pull and his whole trunk rises out of the
crouch behind it. His rear foot's talons screw down as he drives and knock EXACTLY THREE chips of split
grey floor-stone UPWARD beside that foot, each chip no bigger than one of his own foot-talons and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no
higher than his own knee and spreading no wider than his own standing footprint - never past his leading
foot toward screen-right and never past his rear heel toward screen-left - every chip crumbling away to
nothing in mid-air as it falls. THE HOOK IS COMPLETE BY THE HALFWAY POINT; he HOLDS the finish through
the third quarter while the last chips crumble away, and only in the final second does he let the whole
weapon settle back to the EXACT angle and height it has in the reference image and flow into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. Fast, rising, vicious.

## attack_throw A  (haft clamp and drive-down, solo-safe)
THROW A (haft clamp): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he draws both bone hands IN along the haft
so the bone shaft is held hard across the front of his own ribcage, and CLAMPS an unseen weight between
that shaft and his own ribs at his own chest height in EMPTY AIR - there is NO opponent and no second
figure, and nothing else is in the frame at any time. THE CLAMP IS SET BY THE END OF THE FIRST THIRD;
then he wrenches his shoulders, spine and hips straight DOWN in one committed drive, his knees folding
deep and his whole dead mass going down behind it, and the clamped weight is driven into the stone just
inside his own leading foot, so THE SLAM HAS LANDED BY THE HALFWAY POINT. The scythe rides straight DOWN
with his body at the exact angle it holds in the reference and does not rotate. EXACTLY FIVE chips of
split grey floor-stone and hard grit are knocked UPWARD where the weight comes down, each chip no bigger
than one of his own skeletal hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his own knee and spreading no wider than his
own standing footprint - never past his leading foot toward screen-right and never past his rear heel
toward screen-left - every piece crumbling away to nothing in mid-air as it falls. He HOLDS the low
finish through the third quarter while the last chips crumble away, and only in the final second does he
rise, letting both hands slide back out along the haft and the scythe ride back to the EXACT angle and
height it has in the reference image, into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Grounded, crushing, final.

## attack_throw_b  (bone-hand seize and haul-down, solo-safe)
THROW B (bone-hand seize): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST THIRD he opens his LOWER bone hand off the haft -
his LEADING hand keeping the whole scythe locked at the exact angle it holds in the reference, where it
hangs still and takes no part in this beat - and CLOSES those bare finger bones on an unseen weight at
his own hip height in EMPTY AIR, never reaching further toward screen-right than that lower hand sits in
the reference image, with NO opponent, no second figure and nothing else in the frame at any time. Then
he drops his hips under it and folds his whole mass straight DOWN, hauling that closed bone hand down and
IN across the front of his own thighs toward his own rear hip, travelling toward screen-LEFT and staying
in front of his own body the whole way, never swinging behind him and stopping well short of that rear
hip - his knees collapsing into a deep crouch and his shoulders driving down behind the pull - so THE
THROW HAS LANDED BY THE HALFWAY POINT. EXACTLY FIVE chips of split grey floor-stone are knocked UPWARD
where the weight comes down, each chip no bigger than one of his own skeletal hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher
than his own knee and spreading no wider than his own standing footprint - never past his leading foot
toward screen-right and never past his rear heel toward screen-left - every piece crumbling away to
nothing in mid-air as it falls. He HOLDS the low finish through the third quarter while the last chips
crumble away, and only in the final second does he close that bone hand back onto the haft where it
grips in the reference image and rise into the EXACT same reference stance, so that he is already
standing completely still in the reference pose well before the clip ends. Fast, rooted, savage.

## attack_block A  (haft brace)
BLOCK-COUNTER A (haft brace): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he draws both bone hands IN along the haft
and SINKS his whole weight straight DOWN behind it into a deep braced crouch, both elbows tight against
his own ribs, his crowned skull tucked down and his knees taking the load - so the leather-bound bone
haft stands braced across the front of his own ribcage at the same angle it holds in the reference, a
solid bar between him and the pressure. The weapon does not rotate and does not travel sideways; it drops
with his body and nothing else. HE HOLDS THAT BRACE THROUGH THE WHOLE MIDDLE HALF OF THE CLIP as he
absorbs the pressure - both taloned feet grind a fraction on the stone without either one leaving the
spot it stands on, his forearms shake under the load, his shoulders roll and reset, his bare ribcage
judders and the torn hems of his robe shiver - but the braced haft itself does not move and nothing else
in his body travels. IN THE FINAL QUARTER he drives one short hard shove straight UP out of his knees
behind the braced haft, rising only back to his own standing height and no further, then lets both hands
slide back out to where they grip in the reference image and flows in one eased motion back into the
EXACT same reference stance. Nothing sheds and nothing breaks. Braced, immovable, silent.

## attack_block_b  (crown guard)
BLOCK-COUNTER B (crown guard): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he drops his skull hard toward his own
ribcage, rolls his leading shoulder up and forward and hunches his whole back over it so the spiked iron
CROWN and the bone shoulder-guard beneath it are what meet the pressure, his weight settling back over
his rear foot - and he hauls the whole scythe DOWN and still at his own side, where it hangs low, dead
and taking no part, the chain and its bone charm swinging in against his own leg and hanging still. HE
HOLDS THAT HUNCHED GUARD THROUGH THE WHOLE MIDDLE HALF OF THE CLIP - both taloned feet grind a fraction
on the stone without leaving the spot they stand on, his neck, back and shoulders shudder under the load,
his bare ribcage judders, and the scythe stays low and dead-still and never rises and never swings for
one frame of it. IN THE FINAL QUARTER he drives up out of his knees and shrugs one short heavy
shoulder-and-crown shove, the top of his own crown rising no higher than it sits in the reference image,
then lets the weapon ride back to the EXACT angle and height it has in the reference image and flows in
one eased motion back into the EXACT same reference stance. Nothing sheds and nothing breaks. Braced,
compact, immovable.

## hit  (heavy stagger, quick recover)
HIT (stagger): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; his crowned skull and both shoulders snap back and to screen-LEFT, his jaw
flying up, his spine folding and his knees buckling under his own weight - but BOTH FEET STAY EXACTLY
WHERE THEY STAND, he does not step back and he does not skid, and every bit of the recoil is absorbed in
his knees, hips and trunk instead. Both bone hands clamp harder on the haft and the whole scythe is
jolted straight DOWN with his body, holding the angle it has in the reference the whole way - it never
rotates, never swings and never rises - while the hanging chain and its bone charm snap out and swing
back in toward his own leg, never further toward screen-left than they hang in the reference image. THE
RECOIL PEAKS BY THE END OF THE FIRST QUARTER and he rides it off balance through the middle of the clip -
his weight rolling back over his rear foot toward screen-left, the torn hems of his robe and the long
tabard panel whipping, his shoulders juddering and his bare ribcage shuddering. IN THE LAST THIRD he
catches his balance, straightens up out of his knees and flows in one eased recovery back into the EXACT
same reference stance, so that he is already standing completely still in the reference pose well before
the clip ends. His ribcage and his face lead the recoil; his back is never shown. Nothing sheds and
nothing breaks. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in the
frame at any time, and there is no light, no flare, no wisp and no streak anywhere in the shot. Only his
own body and his own weapon move.

## ko  (cause-free collapse, ends on ground)
KO (collapse): he begins in the EXACT reference stance, angled to camera exactly as in the reference
image and facing screen-right; IN THE FIRST THIRD OF THE CLIP his knees give way beneath him, his crowned
skull drops and his shoulders slump, and he goes STRAIGHT DOWN onto both knees on the spot he stands on
without travelling forward, his legs folding and staying tucked beneath him. Then he pitches forward and
down over his own thighs and FOLDS, his arms folding down beneath him with both bone hands still closed on
the haft, and BY THE HALFWAY POINT he has come to rest fully prone and motionless, folded heavily down
over his own knees with his skull lying beside his leading foot, still turned toward screen-right. His
skeletal fingers never open: the scythe comes down WITH him and comes to rest lying at a STEEP SLANT
across his own fallen body, its knobbed bone butt and its chain down on the stone toward screen-left and
its blade end tipped up over his own back toward screen-right, so that BOTH ends finish NEARER his own
fallen body than they sit in the reference image and neither of them is anywhere near an edge of the
frame. ONE thin scuff
of hard grey grave-stone grit is knocked UPWARD off the floor where he comes down, the grains no bigger
than one of his own foot-talons, rising no higher than his own fallen shoulder and staying within one
body-width of where he lands, every chip crumbling away to nothing in mid-air as it falls. FOR THE WHOLE
SECOND HALF OF THE CLIP HE LIES COMPLETELY STILL - he does not stir, does not lift his skull, does not
push up on an arm and he does NOT get back up - and the fallen scythe lies exactly where it came to rest
and does not move again. He is ALONE in an empty frame - nothing whatsoever enters, crosses or appears in
the frame at any time. Only his own body and his own weapon move.

## victory  (the reaper's stillness, no turn to camera)
VICTORY (reaper's stillness): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right. IN THE FIRST QUARTER OF THE CLIP he lets the whole scythe settle
a short way DOWN about his own LOWER bone hand, which stays locked on the haft close in at his own waist
and never travels out away from his own body, the blade dropping a hand's width and coming to rest closer
to his own body than it sits in the reference image - and at the same moment he sinks his weight DOWN and
even over both planted feet, his
shoulders dropping and his bare ribcage settling. FOR THE WHOLE MIDDLE HALF OF THE CLIP HE HOLDS THAT LOW
SETTLED CARRY and only his skull, his shoulders and his ribcage move - his ribs lift and sink twice in
two slow dead settlings, his shoulders roll once and settle, the hanging chain and its bone charm swing
to a complete stop against his own leg, and his crowned skull dips once in a short controlled bow and
lifts again no higher than it sits in the reference image. His feet, hips and shoulders stay exactly
where they are: he does not step, does not pivot, does not straighten up onto his toes, does not lift the
weapon and does not turn his skull or his body toward the camera at any point. His jaws stay fixed in the
same lipless grin and he makes no sound. IN THE FINAL QUARTER he lets the scythe ride back up to the
EXACT angle and height it has in the reference image and settles into the EXACT same reference stance, so
that he is already standing completely still in the reference pose well before the clip ends. Nothing
sheds and nothing breaks. Composed, patient, spent.

## special_1  (GRAVE FURROW) — the blade's point bitten into the flagstone and reaped back toward his rear heel
SPECIAL FINISHER (grave furrow): he begins in the EXACT reference stance, angled to camera exactly as in
the reference image and facing screen-right; IN THE FIRST QUARTER he coils his whole body back and DOWN
over his rear foot, his knees folding, his shoulders drawing IN and DOWN with neither one coming forward
and neither one going back, and his crowned skull dropping between them. THE LINE OF HIS TWO SHOULDERS
AND THE LINE OF HIS TWO HIPS HOLD THE SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY
SINGLE FRAME - he may COIL, FOLD and SINK, but he never TURNS. Then he releases all of it at once: he drives his entire dead mass straight DOWN into a deep sunk
stance and at the same moment hauls the LEADING bone hand DOWN past his own hip, turning the whole scythe
blade-first toward the floor about his own LOWER bone hand, which stays locked on the haft close in at his
own waist and never travels out away from his own body. The far end travels the other way - the knobbed
BONE BUTT and its hanging chain swing UP and round toward his own body, finishing higher and nearer him
than they hang in the reference image and never rising above the height his own crown spikes have there -
while the POINT of the crescent drives DOWN and bites into the flagstone right beside his own leading
foot. AT THE FORTY PERCENT
MARK it is in the stone, and he REAPS it back and IN across the floor toward his own rear heel, travelling
toward screen-LEFT in one short savage drag, the hook staying inside his own standing footprint the whole
way and stopping well short of that rear heel. EXACTLY SIX slabs of solid broken grey floor-stone are torn
UPWARD out of the furrow behind the point as it comes, each slab no bigger than one of his own skeletal
hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising no higher than his own knee and spreading no wider than his own standing footprint - never
past his leading foot toward screen-right and never past his rear heel toward screen-left - every slab
cracking apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK:
opaque, flat, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light,
never a wisp. HE HOLDS THE DEEP SUNK STANCE THROUGH THE WHOLE THIRD QUARTER with the point still resting
in the stone where the drag ended and his whole weight leaning down onto the planted haft, his shoulders
heaving and his bare ribcage shuddering, while the last slabs crumble away. Only in the final second does
he draw the point back up out of the furrow, let the scythe ride back to the EXACT angle and height it has
in the reference image and rise into the EXACT same reference stance, so that he is already standing
completely still in the reference pose well before the clip ends. Low, dragging, final.

## special_2  (THE TITHE) — the weapon rolled edge-down, then the bone butt and the lower haft slammed onto the stone as one bar
SPECIAL FINISHER (the tithe): he begins in the EXACT reference stance, angled to camera exactly as in the
reference image and facing screen-right; IN THE FIRST QUARTER he ROLLS the entire scythe a quarter-turn
about its own long shaft, both bone hands turning together on the haft so the honed inner edge of the
crescent comes round and faces DOWN toward the stone - the weapon turns in place and NEITHER end travels,
neither rises, and it holds the exact angle it has in the reference image throughout the roll - while he
gathers his weight back over his rear foot and his shoulders draw IN and DOWN with neither one coming
forward and neither one going back. THE LINE OF HIS TWO SHOULDERS AND THE LINE OF HIS TWO HIPS HOLD THE
SAME ANGLE TO CAMERA THEY HAVE IN THE REFERENCE IMAGE IN EVERY SINGLE FRAME - he may COIL, FOLD and
SINK, but he never TURNS. THEN AT THE THIRTY PERCENT MARK he
drives his entire dead mass straight DOWN in one committed sink, hips folding deep, ribcage coming down
over his knees and both arms driving the haft down with him, and the knobbed BONE BUTT strikes the
flagstone beside his own rear foot with the lower length of the bone haft slamming down across the stone
after it as one bar, the chain whipping down and the bone charm cracking against the flagstone beside the
butt. AT THE HALFWAY POINT the floor gives way under that bar: EXACTLY SEVEN chips of solid broken grey
floor-stone burst UPWARD from under the length of haft that lies between his own two feet, each chip no
bigger than one of his own skeletal hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - rising
no higher than his own knee and spreading no wider than his own standing footprint - never past his
leading foot toward screen-right and never past his rear heel toward screen-left - every chip cracking
apart and crumbling away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque,
chipped, sharp-edged, matte and lit like stone - never a glow, never a flame, never a spark of light,
never a wisp. HE HOLDS THE LANDED BAR AND THE SUNK STANCE THROUGH THE WHOLE THIRD QUARTER, his whole
weight bearing down through both straight arms onto the haft, his shoulders heaving and his bare ribcage
shuddering, while the last chips crumble away. Only in the final second does he lift the haft back off the
stone, roll the weapon back the same quarter-turn to exactly the face it shows in the reference image and
rise into the EXACT same reference stance, so that he is already standing completely still in the
reference pose well before the clip ends. Flat, crushing, final.

## special_3  (THE HOLLOW CROWN) — a long coiled hold in which his own talons screw down and the floor gives way under him
SPECIAL FINISHER (the hollow crown): he begins in the EXACT reference stance, angled to camera exactly as
in the reference image and facing screen-right; IN THE FIRST QUARTER he hauls the whole scythe IN tight
across his own bare ribcage, both bone hands drawn together on the haft, and coils his entire dead frame
into a deep sunk crouch over both planted feet - his knees folding hard beneath him, his back arching, his
crowned skull dropping between his shoulders. HE HOLDS THAT COILED CROUCH FROM THE END OF THE FIRST
QUARTER UNTIL THE SIXTY-FIVE PERCENT MARK, loading harder the whole time and never striking at all: his
thighs, back and shoulders shudder under the load, his bare ribcage judders, his forearms shake against
the haft, the hanging chain and its bone charm hang dead-still against his own leg, and the violet flame
in his crown and in his eye socket stays exactly the size and shape it has in the reference image
throughout. THE DAMAGE COMES FROM HIS OWN FEET, NOT FROM THE WEAPON: through that whole hold his four
long ivory TALONS on each foot SCREW DOWN into the flagstone without either foot leaving the spot it
stands on, and the floor crazes and gives way under them in stages - EXACTLY SIX chunks of solid broken
grey floor-stone break loose in ones and twos, spread out across the length of the hold rather than in one
burst, each chunk no bigger than one of his own skeletal hands and each one SOLID, OPAQUE and sharp-edged - never a puff, never a cloud, never dust,
never smoke and never haze - knocked UPWARD to no higher than his own
knee and spreading no wider than his own standing footprint - never past his leading foot toward
screen-right and never past his rear heel toward screen-left - every chunk cracking apart and crumbling
away to nothing in mid-air as it falls. The debris is SOLID BROKEN ROCK: opaque, chunky, sharp-edged,
matte and lit like stone - never a glow, never a flame, never a spark of light, never a wisp. AT THE
SIXTY-FIVE PERCENT MARK he drives one short heavy press of the whole weapon straight DOWN and the crouch
bottoms out, the scythe riding down with him at the exact angle it holds in the reference and taking no
other part - it does not rotate, does not swing and does not rise. THE WHOLE FINAL QUARTER is his slow
controlled rise back up out of the crouch, his weight easing up off his talons where they stand without
either foot ever lifting off the stone, and the scythe riding back up with him to the EXACT angle and
height it has in the reference image, into the EXACT same
reference stance, so that he is already standing completely still in the reference pose well before the
clip ends. Coiled, immense, final.
