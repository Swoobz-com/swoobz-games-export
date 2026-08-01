# hector-warhammer SHORT — the length A/B arm. NOT a kit. Phase 176.

This is the SHORT arm of the prompt-length experiment defined in `qa-boss/FIRE-PLAN.md` (phase 175).
It is deliberately OUTSIDE `qa-boss/prompts/` so no gate, sweep or fire-queue treats it as a kit.

**The hypothesis under test:** no clip has ever been accepted and wired from a prompt over ~2500
characters, yet all 256 queued states are 3453–8892. Either length is irrelevant (and the queue is
fine), or verbosity dilutes bound adherence (and 256 states need trimming before they are fired).

**The experiment:** same character, same plate, same media_id, same state, same settings, fired
back to back. The ONLY thing that varies is prompt verbosity.

| arm | file | assembled `idle` |
|---|---|---|
| LONG | `qa-boss/prompts/hector-warhammer.md` | 6990 |
| SHORT | this file | see below |

**Every distinct instruction in the long arm is preserved here.** What is removed is synonym
stacking ("never released, never let go, never exchanged and never replaced" → "never released,
exchanged or replaced"), and the facing/rotation locks that the long arm states TWICE — once in the
acting body and again in the suffix. Nothing that is only said once has been dropped. If the short
arm scores WORSE on adherence, verbosity is load-bearing and the queue is fine as written.

**Judge on bound ADHERENCE, not on whether the acting looks nice** — dilution shows up as bounds
being ignored (facing, containment, debris count, new objects), not as bad art. Run the same gates
on both arms: check-anchor-lock, check-turn, check-containment, check-frontturn, check-extra-objects.

Shared prefix:
> The EXACT SAME human knight from the reference image (a broad, powerfully built man in full plate armour of matte WHITE-enamelled steel with polished silver trim - bare-headed, with short cropped black hair and a stern clean-shaven scarred face set in a fixed frown; big layered white PAULDRONS on BOTH shoulders with his upper arms bare below them, white steel vambraces strapped in brown leather, and brown leather GLOVES; a white steel CUIRASS bearing a small silver-and-blue heraldic INSIGNIA, a broad brown waist-belt with a round silver BUCKLE-DISC, layered white tassets and a short white armoured skirt over dark breeches, white knee and shin plates, and brown leather BOOTS; and gripped in BOTH gloved hands a massive two-handed WARHAMMER carried across his body on a shallow diagonal - its heavy squared STEEL HEAD and short pointed SPIKE toward screen-RIGHT at his own chest height, a long dark leather-wrapped HAFT running down across his waist, and a pointed steel BUTT-SPIKE low toward screen-LEFT beside his rear thigh), standing on a solid saturated GREEN chroma screen (bright green #00b140, nothing pink or magenta anywhere).

## idle

IDLE COMBAT-READY LOOP: a veteran knight's dead-steady guard, his weight sunk and even over both planted feet, the warhammer held steady across his body on the shallow diagonal it has in the reference image with both gloved hands closed at their stations. ONE slow full SETTLING of his whole armoured mass fills the first half of the clip and a second fills the second half, and EVERY PART of that settling is STRAIGHT UP AND DOWN IN THE VERTICAL PLANE ONLY: his whole weight sinks a fraction STRAIGHT DOWN through BOTH planted feet at once and rises again, never transferring from one foot to the other; his shoulders sink a fraction straight down and lift again with neither one coming forward and neither going back; his bare head lowers a fraction and rises again without ever turning left or right; and the whole warhammer rides DOWN with him a finger's width and back up, holding its exact reference angle throughout, neither end ever swinging toward either side edge. The prop beat inside each settling: the gloved fingers of his REAR hand flex open a crack and re-close on the leather wrap one knuckle at a time WITHOUT the hand ever leaving its station on the haft, then the gloved fingers of his LEADING hand do the same - the haft never leaves either closed palm and neither grip ever slides along it. He breathes slow and even, the rise of his chest barely lifting the cuirass. He may SINK, but he never TURNS. Feet planted, silent, patient as a standing guard. Returns to the exact start pose so it loops seamlessly. Slow, controlled, subtle motion.

Shared suffix (locks, every prompt):
> Every detail of him - his bare scarred head, black hair, stern face, both pauldrons, the breastplate insignia, his belt disc, every white plate, brown strap, glove and boot, and the whole two-handed warhammer - stays EXACTLY the same the entire clip; nothing is added, lost, re-coloured or re-shaped, NO helmet, cloak, cape, shield or plume ever appears, his armour is rigid steel that never bends or flutters, and the short armoured skirt rides with his hips and never billows or swings wide. BOTH gloved hands stay closed on the haft in every single frame - the warhammer is never released, exchanged or replaced, neither hand ever slides or re-seats on the haft, and no second weapon or new object ever appears. Every surface of him stays EXACTLY as bright as it is in the reference image: nothing glows, flares or blooms, and no glow, aura, beam, halo, orb, fireball, projectile, wisp, mist, smoke, fog, fire or energy of any kind ever appears. The warhammer stays FULLY INSIDE the frame at ALL times: its squared head and spike never travel further toward screen-right, and its butt-spike never further toward screen-left, than they do in the reference image, and NO PART of it is ever raised above his own shoulders, swung vertical, lifted overhead, thrust out ahead of him or swung round behind him. HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP - he never jumps, leaps, hops, steps or lunges, and his stance never spreads wider than about one and a quarter times his standing width. He stays planted on the same spot at the same distance from the camera with zero net drift. He stays FACING SCREEN-RIGHT the entire clip and holds the SAME angle to camera he has in the reference image - he never rotates toward the viewer and never turns away. His stern expression never changes and he never talks, shouts or cries out. The camera is absolutely locked, no zoom, no pan, his full body always fully in frame, and he is the ONLY figure in frame at all times. He begins and ends on the EXACT same reference stance. 24fps.
