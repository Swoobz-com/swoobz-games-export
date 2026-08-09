// PHASE 294 VERIFICATION DRIVER — drives the REAL game and PIXEL-checks the six new surfaces.
// Modelled on scripts/drive-game.mjs. Exit 1 on any FAIL: a verification that cannot fail proves
// nothing.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = process.env.QA_PORT || '5342';
const OUT = process.env.QA_OUT || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export-swoobz-games-export-streetfighter/cb08ef98-4026-48bf-b316-8bfb9b1d58dd/scratchpad/shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '[ PASS ]' : '[ FAIL ]'} ${name} :: ${detail}`); };

// Click an element by its visible text (buttons/divs), returns whether it clicked.
async function clickText(page, text, sel = 'button, [role="button"], .fr-map-node, .fr-btn') {
  const done = await page.evaluate((t, s) => {
    const els = [...document.querySelectorAll(s)];
    const el = els.find((e) => (e.textContent || '').trim().toUpperCase().includes(t.toUpperCase()));
    if (!el) return false;
    el.click();
    return true;
  }, text, sel);
  if (done) await sleep(450);
  return done;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

// ============================================================================================
// PART A — DESKTOP LANDSCAPE (pointer: fine). The curtain must NEVER appear here.
// ============================================================================================
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(900);

  // ⚠ BUILD IDENTITY, FIRST, BEFORE ANY ASSERTION. Without this the whole suite can run against a
  // DIFFERENT application and report a plausible-looking score: a stale server on the same port (or
  // an ::1-vs-127.0.0.1 split, which defeats --strictPort because they are different address
  // families) produced a confident 13/30 against a pre-phase-294 build with no hint anything was
  // wrong. A gate that cannot tell which app it measured is not a gate.
  const identity = await page.evaluate(async () => {
    const src = await fetch('/src/ui/FightExperience.tsx').then((r) => (r.ok ? r.text() : '')).catch(() => '');
    return { hasRotate: src.includes('fr-rotate'), hasGate: src.includes('fr-select-gate'), len: src.length };
  });
  if (!identity.hasRotate || !identity.hasGate) {
    console.log(`[ ABORT ] the server on :${PORT} is NOT serving the phase-294 build ` +
      `(fr-rotate=${identity.hasRotate} fr-select-gate=${identity.hasGate}, ${identity.len} bytes). ` +
      `Refusing to report a score against the wrong application.`);
    await browser.close();
    process.exit(2);
  }
  rec('A0 the server under test IS the phase-294 build', true, `FightExperience.tsx ${identity.len} bytes, carries fr-rotate + fr-select-gate`);

  // LIVENESS. Every "the curtain must NOT appear" assertion below is also true of a blank page, so
  // each one carries an app-mounted term. Measured: 11 of 30 assertions passed against an empty
  // <body> before this was added — including all four controls that carry the media query's entire
  // correctness argument.
  const alive = () => page.evaluate(() => ({
    mounted: !!document.querySelector('.fr-viewport') && !!document.querySelector('.fr-stage'),
  }));

  // A1 — the rotate curtain is ABSENT on desktop landscape (and the app is actually up).
  let n = await page.evaluate(() => document.querySelectorAll('.fr-rotate').length);
  const a1Alive = await alive();
  rec('A1 desktop landscape: app mounted AND no rotate curtain', n === 0 && a1Alive.mounted, `.fr-rotate = ${n}, mounted = ${a1Alive.mounted}`);

  // Walk title -> mode -> QUICK DUEL -> charSelect to see the roster grid on a FRESH profile.
  await clickText(page, 'PRESS TO BEGIN');
  await sleep(800);
  // Any CPU personality plaque enters charSelect in quick-duel mode.
  await page.evaluate(() => { const b=[...document.querySelectorAll('.fr-plaque, .fr-cards button')][0]; if(b) b.click(); });
  await sleep(1000);

  // A2 — locked tiles: on a fresh profile 9 bosses are gated, so 9 tiles must carry a NODE label,
  //      the grid must still total 22, and no locked tile may leak a fighter NAME.
  const grid = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.fr-select-grid .fr-select-tile')];
    const gates = [...document.querySelectorAll('.fr-select-gate')].map((e) => e.textContent.trim());
    const lockedTexts = [...document.querySelectorAll('.fr-select-locked')].map((e) => e.textContent.trim());
    return { total: tiles.length, locked: document.querySelectorAll('.fr-select-locked').length, gates, lockedTexts };
  });
  rec('A2a grid still totals 22 tiles', grid.total === 22, `tiles = ${grid.total}, locked = ${grid.locked}`);
  // NINE labelled tiles = the nine bosses that are actually earnable. Node 2's body (oni-tetsubo) is
  // always-available, so beating it grants no new pick and it must NOT add a tenth plate. The label
  // itself is "CONQUEST", not a node number (Tim, 2026-08-09) — the count is what carries the meaning.
  rec('A2b exactly 9 locked tiles are marked earnable', grid.gates.length === 9, `gates = ${JSON.stringify(grid.gates)}`);
  const allSayConquest = grid.gates.every((g) => /CONQUEST/i.test(g));
  const noNodeNumbers = grid.gates.every((g) => !/NODE\s*\d/i.test(g));
  rec('A2c every earnable tile names the MODE, and none prints a node number', allSayConquest && noNodeNumbers,
    `distinct labels = ${JSON.stringify([...new Set(grid.gates)])}`);
  // ⚠ CASE-INSENSITIVE ON PURPOSE. The first version of this check was /[A-Z]{3,}/ over textContent,
  // and mutation testing defeated it in one move: a leak whose SOURCE string is lowercase but is
  // uppercased by CSS `text-transform` sailed through and the suite still reported 30/30, exit 0,
  // with every boss's name printed on screen. That shape is not hypothetical — .fr-nodecard-replay-note
  // ships exactly it. Compare against the real roster instead of guessing at letter case.
  const leaked = grid.lockedTexts.filter((t) => {
    // Allowed on a locked plate: the "?" glyph, the padlock, and the word CONQUEST. Anything else is
    // a leak. Strip the permitted tokens and require nothing to remain.
    const stripped = t.replace(/CONQUEST/gi, '').replace(/[?\s\u{1F512}]/gu, '');
    return stripped.length > 0;
  });
  rec('A2d no locked tile leaks ANY text beyond "?" and the CONQUEST marker', leaked.length === 0, `suspicious = ${JSON.stringify(leaked)}`);
  // And the direct form: no locked tile may contain any registered fighter's name, in any case.
  const nameLeak = await page.evaluate(() => {
    const texts = [...document.querySelectorAll('.fr-select-locked')].map((e) => (e.textContent || '').toUpperCase());
    // Names are read off the SELECTABLE tiles' aria-labels plus the known roster shape, so this does
    // not hardcode a roster that can drift.
    const known = ['SORA', 'YARI', 'THORN', 'WARDEN', 'HOLLOW', 'PALE', 'SATOSHI', 'ODACHI', 'ECLIPSE',
      'OFUDA', 'TESSEN', 'LION', 'SERPENT', 'KUROTACHI', 'HEX', 'PAPER', 'LORD', 'KITSUNE', 'TANTO',
      'GARGOYLE', 'LICH', 'SCYTHE', 'ONI', 'TETSUBO', 'DOCKS', 'TORII', 'BAMBOO', 'SNOWFANG',
      'KAWA', 'SHRINE', 'PAGODA', 'GORGE', 'CRIMSON', 'CITADEL'];
    return texts.filter((t) => known.some((k) => t.includes(k)));
  });
  rec('A2d2 no locked tile contains a fighter or node NAME (case-insensitive)', nameLeak.length === 0, `hits = ${JSON.stringify(nameLeak)}`);
  await page.screenshot({ path: `${OUT}/A-charselect-fresh.png` });

  // A3 — ARENA picker IS present in quick duel.
  const arenaQuick = await page.evaluate(() => ({
    section: document.querySelectorAll('.fr-arena-section').length,
    tiles: document.querySelectorAll('.fr-arena-row .fr-arena-tile, .fr-arena-row > *').length,
    fixed: document.querySelectorAll('.fr-arena-fixed').length,
  }));
  rec('A3 quick duel still shows the real ARENA picker', arenaQuick.section === 1 && arenaQuick.fixed === 0, JSON.stringify(arenaQuick));

  await page.close();
}

// ============================================================================================
// PART B — CAMPAIGN: conquest plate, node card cue, the detour arena readout, the unlock card.
// ============================================================================================
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(900);
  await clickText(page, 'PRESS TO BEGIN');
  await sleep(800);
  await clickText(page, 'CONQUEST MAP');
  await sleep(1000);

  // B1 — a FRESH map must NOT show the conquest plate.
  let plate = await page.evaluate(() => document.querySelectorAll('.fr-map-conquest').length);
  let title = await page.evaluate(() => (document.querySelector('.fr-map-title')?.textContent || '').trim());
  rec('B1a fresh map: no ISLAND CONQUERED plate', plate === 0, `.fr-map-conquest = ${plate}`);
  rec('B1b fresh map title has no CLEARED suffix', !/CLEARED/.test(title), `title = "${title}"`);
  await page.screenshot({ path: `${OUT}/B-map-fresh.png` });

  // B2 — CONQUER ALL -> the plate and the CLEARED title appear.
  await clickText(page, 'CONQUER ALL');
  await sleep(700);
  const done = await page.evaluate(() => ({
    plate: document.querySelectorAll('.fr-map-conquest').length,
    text: (document.querySelector('.fr-map-conquest')?.textContent || '').replace(/\s+/g, ' ').trim(),
    title: (document.querySelector('.fr-map-title')?.textContent || '').trim(),
    reset: document.querySelectorAll('.fr-map-reset').length,
    rtpVisible: !!document.querySelector('.fr-map-rtp'),
    rtpBox: (() => { const e = document.querySelector('.fr-map-rtp'); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), inView: r.bottom <= window.innerHeight + 1 }; })(),
    // ⚠ inView IS NOT ENOUGH, and this repo has the scar to prove it. The first version of this gate
    // asserted only "the RTP line is on screen" — it PASSED while the line was sitting under 44px of
    // dev buttons, because a fully-overlapped element is still perfectly in view. Every box on this
    // screen is now checked for real intersection against every other.
    overlaps: (() => {
      const sel = ['.fr-map-conquest', '.fr-map-rtp', '.fr-map-devbar', '.fr-map-reset', '.fr-map-title'];
      const boxes = sel.map((s) => ({ s, e: document.querySelector(s) })).filter((x) => x.e)
        .map((x) => ({ s: x.s, r: x.e.getBoundingClientRect() }));
      const hits = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r;
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox > 1 && oy > 1) hits.push(`${boxes[i].s} x ${boxes[j].s} = ${Math.round(ox)}x${Math.round(oy)}px`);
        }
      }
      return hits;
    })(),
  }));
  rec('B2a 10/10: ISLAND CONQUERED plate renders', done.plate === 1, `text = "${done.text.slice(0, 90)}"`);
  rec('B2b 10/10: title gains CLEARED', /CLEARED/.test(done.title), `title = "${done.title}"`);
  rec('B2c conquest plate and reset notice never co-render', done.reset === 0, `.fr-map-reset = ${done.reset}`);
  rec('B2d the RTP line is NOT pushed out of view by the new plate', done.rtpBox?.inView === true, JSON.stringify(done.rtpBox));
  rec('B2e NOTHING on the conquered map overlaps anything else', done.overlaps.length === 0, `intersections = ${JSON.stringify(done.overlaps)}`);
  await page.screenshot({ path: `${OUT}/B-map-conquered.png` });

  // B3 — open a CONQUERED node: the cue + honest replay note must render.
  const opened = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.fr-map-node, .fr-map-hit, [class*="fr-map"][role="button"]')];
    const el = nodes.find((e) => (e.getAttribute('aria-label') || '').toUpperCase().includes('KUROHAMA'));
    if (el) { el.click(); return 'aria'; }
    return 'none';
  });
  await sleep(900);
  const card = await page.evaluate(() => ({
    onCard: !!document.querySelector('.fr-nodecard'),
    cue: document.querySelectorAll('.fr-nodecard-conquered').length,
    cueText: (document.querySelector('.fr-nodecard-conquered')?.textContent || '').replace(/\s+/g, ' ').trim(),
    note: (document.querySelector('.fr-nodecard-replay-note')?.textContent || '').replace(/\s+/g, ' ').trim(),
    nodeLine: (document.querySelector('.fr-nodecard-node')?.textContent || '').replace(/\s+/g, ' ').trim(),
  }));
  rec('B3a conquered node card shows the CONQUERED cue', card.onCard && card.cue === 1, `opened via ${opened}; cue = "${card.cueText}"`);
  rec('B3b the replay note states the stake IS charged and pays the same', /same stake/i.test(card.note) && /unlocks nothing new/i.test(card.note), `note = "${card.note}"`);
  await page.screenshot({ path: `${OUT}/C-nodecard-conquered.png` });

  // B4 — the campaign charSelect DETOUR must show a READOUT, not a picker.
  const wentToSelect = await clickText(page, 'CHANGE');
  await sleep(900);
  const detour = await page.evaluate(() => ({
    onSelect: !!document.querySelector('.fr-select-grid'),
    pickerRows: document.querySelectorAll('.fr-arena-row').length,
    fixed: document.querySelectorAll('.fr-arena-fixed').length,
    fixedText: (document.querySelector('.fr-arena-fixed')?.textContent || '').replace(/\s+/g, ' ').trim(),
    storedArena: localStorage.getItem('frozen-requiem.arena.v1'),
  }));
  rec('B4a campaign detour: the arena PICKER is gone', detour.onSelect && detour.pickerRows === 0, `wentToSelect=${wentToSelect} rows = ${detour.pickerRows}`);
  rec('B4b campaign detour: a fixed arena READOUT, with no node number',
    detour.fixed === 1
      && /FIXED FOR THIS FIGHT/.test(detour.fixedText)
      && !/NODE\s*\d/i.test(detour.fixedText),
    `readout = "${detour.fixedText}"`);
  rec('B4c no arena tile exists to overwrite the quick-duel preference', detour.pickerRows === 0, `stored = ${detour.storedArena}`);
  await page.screenshot({ path: `${OUT}/D-detour-arena-readout.png` });
  await page.close();
}

// ============================================================================================
// PART C — MOBILE PORTRAIT vs LANDSCAPE (pointer: coarse via real touch emulation).
// ============================================================================================
for (const dev of [
  { key: 'iphone14pro', w: 393, h: 852, dsf: 3 },
  { key: 'pixel7', w: 412, h: 915, dsf: 2.625 },
]) {
  // PORTRAIT — curtain MUST be up.
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: dev.w, height: dev.h, deviceScaleFactor: dev.dsf, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const port = await page.evaluate(() => {
    const el = document.querySelector('.fr-rotate');
    if (!el) return { present: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Is the curtain actually OPAQUE and covering everything? Sample the centre pixel's stack.
    const mid = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
    return {
      present: true,
      covers: Math.round(r.width) >= window.innerWidth && Math.round(r.height) >= window.innerHeight,
      w: Math.round(r.width), h: Math.round(r.height), vw: window.innerWidth, vh: window.innerHeight,
      bg: cs.backgroundColor, z: cs.zIndex, display: cs.display,
      topEl: mid ? (mid.className || mid.tagName).toString() : 'none',
      pointerCoarse: window.matchMedia('(pointer: coarse)').matches,
      title: (document.querySelector('.fr-rotate-title')?.textContent || '').trim(),
    };
  });
  rec(`C-${dev.key} portrait: curtain present`, port.present === true, JSON.stringify(port).slice(0, 200));
  rec(`C-${dev.key} portrait: curtain covers the FULL viewport`, port.covers === true, `${port.w}x${port.h} vs ${port.vw}x${port.vh}`);
  rec(`C-${dev.key} portrait: curtain is OPAQUE (not a translucent scrim)`, /^rgb\(/.test(port.bg || ''), `background = ${port.bg}`);
  rec(`C-${dev.key} portrait: curtain is the topmost element at centre`, /fr-rotate/.test(port.topEl || ''), `elementFromPoint = ${port.topEl}`);
  await page.screenshot({ path: `${OUT}/E-${dev.key}-portrait.png` });
  await page.close();

  // LANDSCAPE, SAME DEVICE — curtain MUST be gone.
  const land = await browser.newPage();
  await land.emulate({
    viewport: { width: dev.h, height: dev.w, deviceScaleFactor: dev.dsf, isMobile: true, hasTouch: true, isLandscape: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await land.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const lr = await land.evaluate(() => ({
    curtains: document.querySelectorAll('.fr-rotate').length,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    portraitQ: window.matchMedia('(orientation: portrait)').matches,
    mounted: !!document.querySelector('.fr-viewport') && !!document.querySelector('.fr-stage'),
    stage: (() => { const e = document.querySelector('.fr-stage'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })(),
  }));
  // `mounted` + a real stage box are the liveness terms: without them a crashed app in mobile
  // landscape reports as "curtain correctly absent".
  rec(`C-${dev.key} LANDSCAPE: app mounted AND curtain absent`,
    lr.curtains === 0 && lr.mounted && (lr.stage?.w ?? 0) > 0 && lr.coarse === true, JSON.stringify(lr));
  await land.screenshot({ path: `${OUT}/E-${dev.key}-landscape.png` });
  await land.close();
}

// ============================================================================================
// PART D — the correctness question: a NARROW TALL DESKTOP window (pointer: fine) must NOT be
// mistaken for a phone. This is the single term the whole media query hinges on.
// ============================================================================================
{
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 950, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(900);
  const d = await page.evaluate(() => ({
    curtains: document.querySelectorAll('.fr-rotate').length,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    portraitQ: window.matchMedia('(orientation: portrait)').matches,
    mounted: !!document.querySelector('.fr-viewport') && !!document.querySelector('.fr-stage'),
  }));
  // The whole media query hinges on `pointer: coarse` excluding this case, so assert BOTH that the
  // curtain stayed away AND that the conditions which should have tempted it were actually present
  // (portrait-shaped, mouse) and the app was really running.
  rec('D desktop 500x950 (mouse, portrait-shaped): curtain must NOT fire',
    d.curtains === 0 && d.mounted && d.portraitQ === true && d.coarse === false, JSON.stringify(d));
  await page.screenshot({ path: `${OUT}/F-desktop-narrow-tall.png` });
  await page.close();
}

// ============================================================================================
// PART E — TABLET portrait (coarse pointer, 820px). Big enough to play: must NOT be curtained.
// ============================================================================================
{
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(900);
  const t = await page.evaluate(() => ({
    curtains: document.querySelectorAll('.fr-rotate').length,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    portraitQ: window.matchMedia('(orientation: portrait)').matches,
    mounted: !!document.querySelector('.fr-viewport') && !!document.querySelector('.fr-stage'),
  }));
  // Here the max-width term is the one doing the work: coarse AND portrait are both TRUE, so only
  // the 560px cut keeps the curtain away. Assert that, not merely the absence.
  rec('E iPad portrait 820x1180: curtain must NOT fire (tablet is playable)',
    t.curtains === 0 && t.mounted && t.portraitQ === true && t.coarse === true, JSON.stringify(t));
  await page.close();
}

// ============================================================================================
// PART F — THE SAFETY HALF OF THE PORTRAIT FEATURE, which had NO gate at all until mutation
// testing found that deleting the shot-clock freeze left this suite at 30/30 and exit 0.
// The curtain existing is the cosmetic half; the clock not spending your stake behind it is the
// half that matters. This enters a real campaign match on a phone and measures the actual timer.
// ============================================================================================
{
  const page = await browser.newPage();
  // Mobile flags must be set BEFORE navigation — changing isMobile later reloads the page.
  await page.emulate({
    viewport: { width: 852, height: 393, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  const tap = async (needle, wait = 900) => {
    const ok = await page.evaluate((nn) => {
      const el = [...document.querySelectorAll('button,[role=button],.fr-btn,.fr-map-node')]
        .filter((e) => e.offsetParent !== null)
        .find((e) => ((e.getAttribute('aria-label') || e.textContent || '')).toUpperCase().includes(nn.toUpperCase()));
      if (el) { el.click(); return true; }
      return false;
    }, needle);
    await sleep(wait);
    return ok;
  };
  await tap('PRESS TO BEGIN');
  await tap('CONQUEST MAP');
  await tap('KUROHAMA');
  await tap('STAKE', 3400);
  const clockOf = () => page.evaluate(() => (document.querySelector('.fr-timer-digit')?.textContent || '').trim());
  const inPicking = await page.evaluate(() => !!document.querySelector('.fr-timer-digit'));
  if (!inPicking) {
    rec('F0 reached a live picking phase on mobile', false, 'never reached picking — INCONCLUSIVE, not a pass');
  } else {
    rec('F0 reached a live picking phase on mobile', true, `clock = ${await clockOf()}`);
    // CONTROL: in landscape the clock must actually run. Without this, a frozen-everywhere bug
    // would read as a pass below.
    const l0 = await clockOf();
    await sleep(2600);
    const l1 = await clockOf();
    rec('F1 CONTROL landscape: the shot clock is running', l0 !== l1, `clock ${l0} -> ${l1} over 2.6s`);

    // Rotate to portrait. The curtain must come up AND the clock must stop moving.
    await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false });
    await sleep(700);
    const curtainUp = await page.evaluate(() => document.querySelectorAll('.fr-rotate').length === 1);
    const p0 = await clockOf();
    await sleep(6500); // longer than the whole 5s shot clock
    const p1 = await clockOf();
    rec('F2 portrait mid-match: the curtain is up', curtainUp, `curtain = ${curtainUp}`);
    rec('F3 portrait mid-match: the shot clock is FROZEN past its full 5s',
      p0 === p1 && p0 !== '' && p0 !== '0', `clock ${p0} -> ${p1} over 6.5s (must not move, must not reach 0)`);

    // THE INERT GUARD. Before it, one Tab landed on a covered STRIKE and activating it committed a
    // move against an already-committed stake, on a screen the player cannot see.
    // ⚠ PROBE WITH REAL KEYBOARD TABS, NOT element.focus()/.click(). A programmatic .click() still
    // dispatches on an inert element, so a .click()-based probe measures nothing about the guard and
    // — worse — it COMMITS A PICK, which silently advances the match under the rest of the test.
    // (That is exactly what an earlier version of this check did; the tell was the clock coming back
    // as a fresh 5 instead of resuming.) A real user only has the keyboard, and inert removes the
    // subtree from the tab order, so tabbing is both the honest attack and the honest measurement.
    const stageInert = await page.evaluate(() => {
      const s = document.querySelector('.fr-stage');
      return s ? s.hasAttribute('inert') : false;
    });
    rec('F4 the stage behind the curtain is INERT', stageInert === true, `stage[inert] = ${stageInert}`);

    const clockPreTab = await clockOf();
    const landed = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      landed.push(await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return 'BODY';
        const stage = document.querySelector('.fr-stage');
        return `${stage && stage.contains(a) ? 'INSIDE-STAGE:' : 'outside:'}${a.className || a.tagName}`;
      }));
    }
    const insideStage = landed.filter((x) => x.startsWith('INSIDE-STAGE'));
    rec('F5 12 real Tab presses never reach anything behind the curtain', insideStage.length === 0,
      `landed = ${JSON.stringify([...new Set(landed)])}`);
    // And the match must not have advanced as a side effect of any of that.
    const clockPostTab = await clockOf();
    rec('F5b tabbing behind the curtain committed no pick (clock unmoved)', clockPreTab === clockPostTab,
      `clock ${clockPreTab} -> ${clockPostTab}`);

    // Rotate back: the clock must resume from where it stopped, not reset and not jump.
    await page.setViewport({ width: 852, height: 393, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: true });
    await sleep(2600);
    const r1 = await clockOf();
    // It must RESUME (count DOWN from where it froze), not restart. A fresh 5 here means the match
    // advanced during the pause, which is the bug this whole part exists to catch.
    const resumedDownward = r1 !== '' && p1 !== '' && Number(r1) < Number(p1);
    rec('F6 rotating back RESUMES the clock downward, it does not restart', resumedDownward,
      `clock ${p1} -> ${r1} over 2.6s after rotating back (must count down from ${p1})`);
  }
  await page.close();
}

// ============================================================================================
// PART G — A STAKE CHANGE CANNOT DESTROY A RUN (Tim, 2026-08-09). This block used to assert the
// pre-commit WIPE WARNING; the wipe itself was removed, so it now asserts the opposite and stronger
// property: raise the stake as far as it goes on a fully-conquered run and every node survives.
// ============================================================================================
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?dev=1`, { waitUntil: 'networkidle2' });
  // Wait for the app to mount BEFORE seeding: the provider persists progress in a mount effect, so
  // a seed written into a booting page is overwritten by the app's own first write and the reload
  // then loads the app's state instead of the fixture. That produced a G block reporting "no
  // warning" against a build whose warning worked perfectly — a driver race reading as a regression.
  await page.waitForSelector('.fr-viewport', { timeout: 10000 });
  await sleep(700);
  // A LEGACY payload, still carrying the retired lockStake key at the LOWEST stake in the game.
  // Under the old rule this run was one click away from being destroyed; it must now be untouchable.
  await page.evaluate(() => {
    localStorage.setItem('frozen-requiem.campaign.v1', JSON.stringify({ v: 2, beaten: new Array(10).fill(true), lockStake: '1000000' }));
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(500);
  const seeded = await page.evaluate(() => {
    try { const c = JSON.parse(localStorage.getItem('frozen-requiem.campaign.v1') || 'null'); return c && c.beaten.every(Boolean); } catch { return false; }
  });
  rec('G0 a legacy $1-locked, fully-conquered save loads with its progress intact', seeded === true, `beaten all true = ${seeded}`);

  await clickText(page, 'PRESS TO BEGIN');
  await sleep(700);
  await clickText(page, 'CONQUEST MAP');
  await sleep(900);
  const onMap = await page.evaluate(() => ({
    conquest: document.querySelectorAll('.fr-map-conquest').length,
    resetPlate: document.querySelectorAll('.fr-map-reset').length,
    title: (document.querySelector('.fr-map-title') || {}).textContent || '',
  }));
  rec('G1 the legacy save still shows all ten conquered', onMap.conquest === 1 && /CLEARED/.test(onMap.title), JSON.stringify(onMap));
  rec('G2 the RUN RESTARTED plate no longer exists anywhere', onMap.resetPlate === 0, `.fr-map-reset = ${onMap.resetPlate}`);

  // Open a node and raise the stake to the MAXIMUM. Under the old lock this was the wipe.
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('.fr-map-node, [class*="fr-map"][role="button"]')]
      .find((e) => (e.getAttribute('aria-label') || '').toUpperCase().includes('KUROHAMA'));
    if (el) el.click();
  });
  await sleep(1000);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null).find((e) => (e.textContent || '').trim() === '$25');
    if (b) b.click();
  });
  await sleep(600);
  const armed = await page.evaluate(() => ({
    warn: document.querySelectorAll('.fr-stake-wipewarn').length,
    commit: ([...document.querySelectorAll('button')].find((e) => /STAKE \$|RESTART THE RUN/.test(e.textContent || '')) || {}).textContent || '',
    replayNote: document.querySelectorAll('.fr-nodecard-replay-note').length,
  }));
  rec('G3 no wipe warning appears at the maximum stake', armed.warn === 0, JSON.stringify(armed));
  rec('G4 the commit button still just says STAKE', /STAKE \$25/.test(armed.commit.replace(/\s+/g, ' ')), `button = "${armed.commit.trim()}"`);
  rec('G5 the honest replay note shows (nothing contradicts it now)', armed.replayNote === 1, `replay notes = ${armed.replayNote}`);

  // COMMIT at $25 over a $1 legacy lock — the exact action that used to destroy ten nodes.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null && !e.disabled)
      .find((e) => /STAKE \$|RESTART THE RUN/.test((e.textContent || '').trim()));
    if (b) b.click();
  });
  await sleep(3000);
  const after = await page.evaluate(() => {
    let c = null;
    try { c = JSON.parse(localStorage.getItem('frozen-requiem.campaign.v1') || 'null'); } catch { /* */ }
    return { beaten: c ? c.beaten.map((x) => (x ? 1 : 0)).join('') : null, hasLockKey: c ? Object.prototype.hasOwnProperty.call(c, 'lockStake') : null };
  });
  rec('G6 committing at the MAX stake over a $1 legacy lock destroys NOTHING', after.beaten === '1111111111',
    `beaten after commit = ${after.beaten} (must stay all 1s)`);
  rec('G7 and the retired lockStake key is no longer written back', after.hasLockKey === false, `lockStake present = ${after.hasLockKey}`);
  await page.screenshot({ path: `${OUT}/J-stake-free.png` });
  await page.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
if (failed.length) { console.log('FAILURES:'); failed.forEach((f) => console.log(' - ' + f.name + ' :: ' + f.detail)); process.exit(1); }
