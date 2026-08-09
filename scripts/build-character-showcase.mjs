// BUILD THE CHARACTER SHOWCASE — a standalone, double-clickable page of every fighter in STANDOFF.
//
// WHY IT IS GENERATED AND NOT HAND-WRITTEN. The roster, the clip lists and the unlock gating are all
// DERIVED from the real modules (src/characters/index.ts, rosterGating.ts, fightCampaign.ts), so the
// page cannot drift from the game: add a fighter or move a campaign node and re-running this is the
// whole update. A hand-maintained gallery would be wrong within a week — this repo has the scars.
//
// Usage:  node scripts/build-character-showcase.mjs [--out characters] [--full]
//   --out   destination folder (default ./characters, gitignored)
//   --full  copy EVERY clip state (~162MB). Default copies the showcase states only (~45MB), which
//           is what makes the page usable on a phone over mobile data.
//
// The output folder is self-contained: open characters/index.html directly, no server needed.
import { mkdirSync, copyFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIGHTERS } from '../src/characters/index.ts';
import { bossNodeId, ALWAYS_AVAILABLE_FIGHTER_IDS } from '../src/characters/rosterGating.ts';
import { CAMPAIGN_NODES, defenseAmount, formatMult, formatWinChance } from '../src/engine/fightCampaign.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const PUBLIC = join(REPO, 'public');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i === -1 ? d : argv[i + 1]; };
const FULL = argv.includes('--full');
const OUT = resolve(REPO, opt('out', 'characters'));

// The states the page actually shows. Ordered as a fight reads: stance, the three attacks, taking a
// hit, going down, winning. `idle` is first because it is the only fallback in the game's own ladder.
const SHOWCASE_STATES = ['idle', 'attack_strike', 'attack_throw', 'attack_block', 'hit', 'ko', 'victory'];
const STATE_LABEL = {
  idle: 'IDLE', attack_strike: 'STRIKE', attack_throw: 'THROW', attack_block: 'BLOCK',
  hit: 'HIT', ko: 'K.O.', victory: 'VICTORY',
};

let copied = 0;
let bytes = 0;
let missing = [];
function take(relUrl) {
  // relUrl is exactly what the manifest stores, e.g. "assets/characters/<id>/idle.webm".
  const src = join(PUBLIC, relUrl);
  if (!existsSync(src)) { missing.push(relUrl); return null; }
  const dst = join(OUT, relUrl);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied += 1;
  bytes += statSync(src).size;
  return relUrl.split('\\').join('/');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const roster = Object.values(FIGHTERS).map((def) => {
  const nodeId = bossNodeId(def.id);
  const node = nodeId == null ? null : CAMPAIGN_NODES.find((n) => n.id === nodeId);
  const still = take(def.still);
  const pfp = take(`assets/enemies/${def.id}-pfp.webp`);
  const clips = [];
  for (const state of SHOWCASE_STATES) {
    const entry = def.clips?.[state];
    if (!entry) continue;
    const list = Array.isArray(entry) ? entry : [entry];
    // One take per state by default — variants exist so the GAME can avoid repetition, which a
    // showcase does not need and a phone should not download.
    for (const c of (FULL ? list : list.slice(0, 1))) {
      const url = c?.url ? take(c.url) : null;
      if (url) clips.push({ state, label: STATE_LABEL[state] ?? state.toUpperCase(), url });
    }
  }
  return {
    id: def.id,
    name: def.name,
    faces: def.faces,
    still,
    pfp,
    free: ALWAYS_AVAILABLE_FIGHTER_IDS.includes(def.id),
    nodeId,
    nodeName: node?.name ?? null,
    nodeTitle: node?.title ?? null,
    winChance: node ? formatWinChance(defenseAmount(node), node.roundsToWin) : null,
    pays: node ? formatMult(node.multBps) : null,
    clips,
  };
});

// Free fighters first, then the earnable ones in the order the campaign hands them out — the same
// order a player actually meets them.
roster.sort((a, b) => (a.free === b.free ? (a.nodeId ?? 0) - (b.nodeId ?? 0) : (a.free ? -1 : 1)));

const card = (f) => `
      <article class="card" id="${esc(f.id)}">
        <div class="art">
          ${f.still ? `<img class="still" src="${esc(f.still)}" alt="${esc(f.name)}" loading="lazy" decoding="async">` : '<div class="still missing">no still</div>'}
          <video class="clip" muted playsinline loop preload="none" aria-hidden="true"></video>
        </div>
        <div class="meta">
          <div class="head">
            ${f.pfp ? `<img class="pfp" src="${esc(f.pfp)}" alt="" loading="lazy" decoding="async">` : ''}
            <div class="names">
              <h2>${esc(f.name)}</h2>
              <p class="gate ${f.free ? 'free' : 'locked'}">${
                f.free
                  ? 'FREE FROM THE START'
                  : `UNLOCKED BY WINNING &middot; ${esc(f.nodeName)}`
              }</p>
            </div>
          </div>
          ${f.free
            ? `<p class="freenote">No unlock needed &mdash; pick them from a fresh profile.</p>`
            : `<dl class="stats">
            <div><dt>THE FIGHT</dt><dd>${esc(f.nodeTitle ?? '')}</dd></div>
            <div><dt>WIN CHANCE</dt><dd>${esc(f.winChance)}%</dd></div>
            <div><dt>PAYS</dt><dd>x${esc(f.pays)}</dd></div>
          </dl>`}
          <div class="clips" role="group" aria-label="${esc(f.name)} animations">
            ${f.clips.map((c, i) => `<button type="button" data-src="${esc(c.url)}"${i === 0 ? ' data-auto="1"' : ''}>${esc(c.label)}</button>`).join('\n            ')}
          </div>
          <p class="ids"><code>${esc(f.id)}</code> &middot; ${f.clips.length} clip${f.clips.length === 1 ? '' : 's'} shown &middot; faces ${esc(f.faces)}</p>
        </div>
      </article>`;

const freeCount = roster.filter((f) => f.free).length;
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>STANDOFF — the roster</title>
<style>
  :root{
    --ink:#07080c; --coal:#0d0f15; --bone:#f2f3ef; --fog:#98a1b3; --steel:#4a5261;
    --gold:#ffc83d; --gold-deep:#b8860b; --ice:#00d0de; --line:rgba(255,255,255,.10);
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    background:var(--ink); color:var(--bone);
    font-family:'Space Grotesk',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    -webkit-font-smoothing:antialiased; line-height:1.45;
  }
  header{padding:clamp(22px,5vw,54px) clamp(16px,4vw,40px) 0;max-width:1400px;margin:0 auto}
  h1{
    font-size:clamp(26px,6vw,50px); letter-spacing:.14em; margin:0 0 .25em;
    text-transform:uppercase; font-weight:900;
    background:linear-gradient(180deg,#ffe08a 0%,var(--gold) 45%,var(--gold-deep) 100%);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  header p{margin:0;color:var(--fog);font-size:clamp(12px,2.6vw,15px);letter-spacing:.04em;max-width:62ch}
  header .counts{margin-top:14px;color:var(--steel);font-size:clamp(11px,2.4vw,13px);letter-spacing:.1em;text-transform:uppercase}
  main{
    max-width:1400px;margin:0 auto;
    padding:clamp(18px,4vw,34px) clamp(16px,4vw,40px) clamp(40px,8vw,80px);
    display:grid; gap:clamp(14px,2.4vw,22px);
    /* auto-fit is what makes this the mobile version too: one column on a phone, up to four wide. */
    grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));
  }
  .card{
    background:linear-gradient(180deg,rgba(13,15,21,.96),rgba(7,8,12,.98));
    border:1px solid var(--line); border-radius:10px; overflow:hidden;
    display:flex; flex-direction:column;
  }
  .art{
    position:relative; aspect-ratio:3/4; background:
      radial-gradient(120% 90% at 50% 12%, rgba(255,200,61,.10), transparent 60%), #05060a;
    display:grid; place-items:center; overflow:hidden;
  }
  .art .still,.art .clip{
    position:absolute; inset:0; width:100%; height:100%;
    object-fit:contain; object-position:center bottom; padding:8% 6% 0;
  }
  .art .clip{opacity:0;transition:opacity .18s ease}
  .art.playing .clip{opacity:1}
  .art.playing .still{opacity:0}
  .still{transition:opacity .18s ease}
  .missing{display:grid;place-items:center;color:var(--steel);font-size:12px;letter-spacing:.1em}
  .meta{padding:14px 15px 15px;display:flex;flex-direction:column;gap:11px;flex:1}
  .head{display:flex;gap:11px;align-items:center}
  .pfp{width:46px;height:46px;border-radius:8px;object-fit:cover;border:1px solid var(--gold-deep);flex:none}
  .names{min-width:0}
  h2{font-size:clamp(15px,3.4vw,19px);margin:0;letter-spacing:.04em;font-weight:900;text-transform:uppercase}
  .gate{margin:2px 0 0;font-size:11px;letter-spacing:.11em;font-weight:700;text-transform:uppercase}
  .gate.free{color:var(--ice)}
  .gate.locked{color:var(--gold)}
  .stats{display:flex;gap:16px;margin:0;flex-wrap:wrap}
  .stats div{min-width:0}
  dt{font-size:9.5px;letter-spacing:.15em;color:var(--fog);margin:0}
  dd{margin:1px 0 0;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
  .clips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}
  .clips button{
    font:inherit;font-size:10.5px;font-weight:700;letter-spacing:.1em;
    padding:7px 10px;min-height:34px;border-radius:5px;cursor:pointer;
    background:rgba(255,255,255,.045);color:var(--bone);
    border:1px solid var(--line);transition:border-color .15s,background .15s,color .15s;
  }
  .clips button:hover,.clips button:focus-visible{border-color:var(--gold);color:var(--gold)}
  .clips button[aria-pressed="true"]{background:rgba(255,200,61,.14);border-color:var(--gold);color:var(--gold)}
  .freenote{margin:0;font-size:11.5px;color:var(--fog);letter-spacing:.02em}
  .ids{margin:0;font-size:10px;color:var(--steel);letter-spacing:.06em}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}

  /* PHONES: two columns, not one. A 3/4 art box at 393px wide makes each card taller than the
     viewport, so a 12-fighter roster became twelve screens of scrolling — the opposite of an
     overview. Two columns halve that and still show the figure clearly. */
  @media (max-width:560px){
    main{grid-template-columns:repeat(2,1fr);gap:10px}
    .art{aspect-ratio:4/5}
    .meta{padding:10px 10px 11px;gap:8px}
    .pfp{width:34px;height:34px}
    .head{gap:8px}
    h2{font-size:13px}
    .gate{font-size:9.5px;letter-spacing:.08em}
    .stats{gap:10px}
    .freenote{font-size:10.5px}
    .ids{font-size:9px}
  }
  /* TOUCH: the repo's 44px minimum target. The desktop buttons are 34px, which is fine for a mouse
     and too small for a thumb — measured at 34px on a 393px phone before this rule. */
  @media (pointer:coarse){
    /* 44px is a MINIMUM HEIGHT, not a minimum footprint: keeping the horizontal padding tight is
       what stops seven states wrapping to four rows and making the card taller than the art. */
    .clips button{min-height:44px;padding:8px 7px;font-size:10px;letter-spacing:.06em;flex:1 0 auto}
  }
  footer{
    max-width:1400px;margin:0 auto;padding:0 clamp(16px,4vw,40px) 50px;
    color:var(--steel);font-size:11.5px;letter-spacing:.05em;border-top:1px solid var(--line);
    padding-top:20px;
  }
  @media (prefers-reduced-motion:reduce){ .art .clip,.still{transition:none} }
</style>
</head>
<body>
<header>
  <h1>STANDOFF &middot; the roster</h1>
  <p>Every fighter in the game. ${freeCount} are playable from a fresh profile; the other ${roster.length - freeCount}
     are earned by beating them in CONQUEST &mdash; that is the game's whole progression loop.
     Tap a state to play that animation.</p>
  <div class="counts">${roster.length} fighters &middot; generated from the shipped manifests</div>
</header>
<main>${roster.map(card).join('\n')}</main>
<footer>
  Generated by <code>scripts/build-character-showcase.mjs</code> from
  <code>src/characters/index.ts</code>, <code>rosterGating.ts</code> and <code>fightCampaign.ts</code>.
  Re-run it after any roster or campaign change rather than editing this file.
</footer>
<script>
  // One clip plays at a time, per card. Clips are preload="none" and only get a src on demand, so
  // opening this on a phone downloads nothing until something is tapped.
  document.querySelectorAll('.card').forEach((card) => {
    const art = card.querySelector('.art');
    const video = card.querySelector('.clip');
    const buttons = [...card.querySelectorAll('.clips button')];
    if (!video || !buttons.length) return;
    let current = null;
    const play = (btn) => {
      const src = btn.dataset.src;
      if (current === btn) { // second tap stops and returns to the still
        video.pause(); art.classList.remove('playing');
        btn.setAttribute('aria-pressed', 'false'); current = null; return;
      }
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      if (video.getAttribute('src') !== src) video.setAttribute('src', src);
      video.currentTime = 0;
      const p = video.play();
      if (p && p.catch) p.catch(() => { /* autoplay refused — the still stays, which is fine */ });
      art.classList.add('playing');
      current = btn;
    };
    buttons.forEach((b) => {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => play(b));
    });
    // Desktop nicety only: hovering the art previews the first state. Never on touch, where hover
    // is emulated and would fire a download on an accidental brush.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const first = buttons.find((b) => b.dataset.auto) || buttons[0];
      art.addEventListener('mouseenter', () => { if (!current) play(first); });
      art.addEventListener('mouseleave', () => { if (current) play(current); });
    }
  });
</script>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'index.html'), html);

const mb = (bytes / 1024 / 1024).toFixed(1);
console.log(`\nSTANDOFF character showcase -> ${OUT}`);
console.log(`  ${roster.length} fighters (${freeCount} free, ${roster.length - freeCount} earned in CONQUEST)`);
console.log(`  ${copied} asset files copied, ${mb} MB${FULL ? ' (--full: every take)' : ' (one take per state; --full for all)'}`);
if (missing.length) {
  console.log(`  ⚠ ${missing.length} referenced asset(s) NOT on disk — the page renders without them:`);
  for (const m of missing.slice(0, 12)) console.log(`      ${m}`);
  if (missing.length > 12) console.log(`      ... and ${missing.length - 12} more`);
}
console.log(`  open: ${join(OUT, 'index.html')}\n`);
