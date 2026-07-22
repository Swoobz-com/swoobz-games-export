// ABYSS LINE — targeted 3-blocker holdgate verification (harness-only, NO source
// edits). Drives the LIVE app at localhost:5182 with real Chrome (puppeteer-core),
// desktop 1440x900. Proves:
//   B1  no WIN hero ever paints over a real BUST; a legit win hero still shows.
//   B2  prefers-reduced-motion collapses the celebration + canvas bust FX to
//       their end-state while STILL communicating win/loss; full juice with reduce off.
//   B3  pre-commit "TO WIN" == the paid full-claim multiplier per tier
//       (Reef 1.24x / Midnight 1.35x / Hadal 1.93x @ 8 tiles).
// Plus round-2 regression: bust 0-coin/HAUL 0, win hero shows $amount + multiplier.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'shots-codotty-3blockers-0707'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}
const bodyText = (page) => page.evaluate(() => document.body.innerText)
const getCanvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
})
async function paintTiles(page, n) {
  const box = await getCanvasBox(page); const dim = 14; const tile = box.w / dim
  let count = 0; const coords = []
  for (let row = 0; row < dim && count < n; row++) for (let col = 0; col < dim && count < n; col++) { coords.push([row, col]); count++ }
  for (const [row, col] of coords) { await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2); await wait(5) }
  return count
}
async function setPace(page, target) {
  for (let i = 0; i < 3; i++) {
    const txt = await bodyText(page)
    const isI = txt.includes('PACE: INSTANT'); const isS = txt.includes('PACE: DUCAT-BY-DUCAT')
    if (target === 'instant' && isI) return true
    if (target === 'staggered' && isS) return true
    if (!isI && !isS) return false
    await clickText(page, 'PACE:'); await wait(60)
  }
  return false
}
async function setTier(page, label) { await clickText(page, label); await wait(60); return (await bodyText(page)).includes(label) }
async function goToPlanning(page) { if ((await bodyText(page)).includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(150) } }
async function clearTrail(page) { await clickText(page, 'CLEAR'); await wait(40) }
async function waitForSettled(page, maxMs) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const txt = await bodyText(page)
    if ((txt.includes('RUGGED BY THE DEEP') || txt.includes('SECURED THE HAUL')) && txt.includes('WRECK RECKONING')) return true
    await wait(30)
  }
  return false
}
// The pre-commit "TO WIN" multiplier (armed planning hero on the right).
async function readToWin(page) {
  return page.evaluate(() => {
    const label = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'TO WIN')
    if (!label) return null
    const row = label.nextElementSibling
    if (!row) return { mult: null, amount: null }
    return { amount: row.children[0]?.textContent ?? null, mult: row.children[1]?.textContent ?? null }
  })
}
// The settled in-canvas hero plaque (LINE CLAIMED / LINE BROKE + amount + mult).
async function readHeroPlaque(page) {
  return page.evaluate(() => {
    const l = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent === 'LINE BROKE' || d.textContent === 'LINE CLAIMED'))
    if (!l) return null
    const row = l.parentElement ? l.parentElement.children[1] : null
    return { label: l.textContent, amount: row?.children[0]?.textContent ?? null, mult: row?.children[1]?.textContent ?? null }
  })
}
async function readSettledCert(page) {
  return page.evaluate(() => {
    const h = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && (d.textContent === 'RUGGED BY THE DEEP' || d.textContent === 'SECURED THE HAUL'))
    if (!h) return null
    const pl = [...document.querySelectorAll('div')].find((d) => d.textContent === 'PAYOUT')
    return { heading: h.textContent, payout: pl?.parentElement?.children[1]?.textContent ?? null }
  })
}
// The WIN-hero CARTOUCHE (aria-hidden pop). Reports presence + its computed
// animationName + how many concussion-ring <span>s it carries.
async function readHeroCartouche(page) {
  return page.evaluate(() => {
    // Only the OUTER HeroPopCallout wrapper carries aria-hidden; the animated
    // cartouche div is a DESCENDANT (styled overflow:hidden), so search within.
    const wrapper = [...document.querySelectorAll('div[aria-hidden="true"]')].find((d) => (d.textContent || '').includes('SECURED THE HAUL'))
    if (!wrapper) return { present: false }
    const cart = [...wrapper.querySelectorAll('div')].find((d) => getComputedStyle(d).overflow === 'hidden') || wrapper
    const cs = getComputedStyle(cart)
    const rings = [...wrapper.querySelectorAll('span')].filter((s) => getComputedStyle(s).borderRadius === '50%').length
    return { present: true, animationName: cs.animationName, transform: cs.transform, opacity: cs.opacity, rings }
  })
}
function installImgObserver(page) {
  return page.evaluate(() => {
    window.__flies = 0
    if (window.__mo) window.__mo.disconnect()
    const mo = new MutationObserver((muts) => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && n.tagName === 'IMG') window.__flies++ })
    mo.observe(document.body, { childList: true, subtree: true }); window.__mo = mo
  })
}
const readFlies = (page) => page.evaluate(() => window.__flies || 0)
// Full-canvas frame diff over ~140ms — fraction of bitmap pixels that changed.
async function canvasFrameDiff(page) {
  return page.evaluate(async () => {
    const c = document.querySelector('canvas'); if (!c) return null
    const ctx = c.getContext('2d'); const w = c.width, h = c.height
    const grab = () => ctx.getImageData(0, 0, w, h).data
    const a = grab(); await new Promise((r) => setTimeout(r, 140)); const b = grab()
    let changed = 0; const total = a.length / 4
    for (let i = 0; i < a.length; i += 4) {
      if (Math.abs(a[i] - b[i]) > 8 || Math.abs(a[i + 1] - b[i + 1]) > 8 || Math.abs(a[i + 2] - b[i + 2]) > 8) changed++
    }
    return { changedFrac: changed / total }
  })
}

const summary = { B1: {}, B2: {}, B3: {}, round2: {}, consoleErrors: [] }

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
page.on('console', (m) => { if (m.type() === 'error') summary.consoleErrors.push(m.text()) })
page.on('pageerror', (e) => summary.consoleErrors.push('PAGEERROR: ' + e.message))

async function reset() { await goToPlanning(page); const t = await bodyText(page); if (t.includes('DIVE AGAIN')) { await clickText(page, 'DIVE AGAIN'); await wait(150) } await clearTrail(page) }

// One full round; returns { won, plaque, cert, toWin }
async function playRound({ tier, pace, tiles, readToWinFirst = false }) {
  await reset(); await setTier(page, tier); await setPace(page, pace)
  await paintTiles(page, tiles); await wait(90)
  const toWin = readToWinFirst ? await readToWin(page) : null
  await installImgObserver(page)
  await clickText(page, 'RUN THE LINE')
  const settled = await waitForSettled(page, 8000); await wait(180)
  const cert = await readSettledCert(page); const plaque = await readHeroPlaque(page); const flies = await readFlies(page)
  return { settled, won: cert && cert.heading === 'SECURED THE HAUL', cert, plaque, toWin, flies }
}

// ─────────────────────────── B3 — tier-aware TO WIN ───────────────────────────
{
  await page.goto(URL, { waitUntil: 'networkidle0' }); await wait(200)
  const tiers = [['REEF SHELF', '1.24x'], ['MIDNIGHT ZONE', '1.35x'], ['HADAL TRENCH', '1.93x']]
  const rows = []
  for (const [label, expect] of tiers) {
    await reset(); await setTier(page, label); await setPace(page, 'instant')
    await paintTiles(page, 8); await wait(120)
    const tw = await readToWin(page)
    await page.screenshot({ path: `${OUT}/B3-${label.split(' ')[0]}-towin.png` })
    rows.push({ tier: label, toWinMult: tw?.mult ?? null, expect, ok: tw?.mult === expect })
  }
  // equals settled full-claim: loop each tier to a WIN and compare (Reef reliable;
  // others best-effort within attempts). At minimum Reef must match.
  const settledMatch = {}
  for (const [label, expect] of tiers) {
    let won = null; let attempts = 0
    const cap = label === 'REEF SHELF' ? 20 : 40
    while (attempts < cap && (!won || !won.won)) { won = await playRound({ tier: label, pace: 'instant', tiles: 8, readToWinFirst: true }); attempts++ }
    settledMatch[label] = won && won.won
      ? { toWin: won.toWin?.mult, settledMult: won.plaque?.mult, equal: won.toWin?.mult === won.plaque?.mult && won.plaque?.mult === expect, attempts }
      : { won: false, attempts, note: 'no win within attempts (probabilistic) — pre-commit value still proven above' }
    if (won && won.won) await page.screenshot({ path: `${OUT}/B3-${label.split(' ')[0]}-settled-win.png` })
  }
  summary.B3 = { preCommit: rows, settledMatch, pass: rows.every((r) => r.ok) && settledMatch['REEF SHELF'].equal === true }
}

// ─────────────────────────── B1 — no stale win hero over a bust ───────────────
{
  // (a) legit win still shows the hero cartouche.
  let win = null; let a = 0
  while (a < 25 && (!win || !win.won)) { win = await playRound({ tier: 'REEF SHELF', pace: 'instant', tiles: 8 }); a++ }
  const winHero = await readHeroCartouche(page)
  await page.screenshot({ path: `${OUT}/B1-legit-win-hero.png` })

  // (b) THE RACE: from a fresh win (hero-hold running), fire SAME LINE fast-replays
  // on instant pace until one busts INSIDE the hold; assert NO SECURED hero paints
  // over the RUGGED bust. Also drive a win->DIVE AGAIN->big-trail bust as a second
  // path (the exact timer-cancel root cause).
  let raceBust = null
  // path 1: SAME LINE rapid replays after the win we already have on screen
  for (let i = 0; i < 15 && !raceBust; i++) {
    await installImgObserver(page)
    const clicked = await clickText(page, 'SAME LINE'); await wait(60)
    if (!clicked) break
    await clickText(page, 'RUN THE LINE')
    const settled = await waitForSettled(page, 6000)
    if (!settled) break
    const cert = await readSettledCert(page)
    if (cert && cert.heading === 'RUGGED BY THE DEEP') {
      const bodyTxt = await bodyText(page)
      const heroCart = await readHeroCartouche(page)
      await page.screenshot({ path: `${OUT}/B1-race-sameline-bust.png` })
      raceBust = { path: 'same-line', staleSecuredText: bodyTxt.includes('SECURED THE HAUL'), heroCartouchePresent: heroCart.present, cert }
    }
  }
  // path 2: win -> DIVE AGAIN -> 40-tile Hadal bust (timer-cancel path), from a win
  await reset()
  let win2 = null; a = 0
  while (a < 25 && (!win2 || !win2.won)) { win2 = await playRound({ tier: 'REEF SHELF', pace: 'instant', tiles: 8 }); a++ }
  // now immediately dive-again into a near-certain bust WITHIN the 1700ms hold
  await clickText(page, 'DIVE AGAIN'); await wait(80)
  await setTier(page, 'HADAL TRENCH'); await setPace(page, 'instant')
  await paintTiles(page, 40); await wait(60)
  await clickText(page, 'RUN THE LINE')
  await waitForSettled(page, 6000); await wait(150)
  const cert2 = await readSettledCert(page)
  const bodyTxt2 = await bodyText(page)
  const heroCart2 = await readHeroCartouche(page)
  await page.screenshot({ path: `${OUT}/B1-race-diveagain-bust.png` })
  const path2 = { path: 'dive-again', bust: cert2?.heading === 'RUGGED BY THE DEEP', staleSecuredText: bodyTxt2.includes('SECURED THE HAUL'), heroCartouchePresent: heroCart2.present, cert: cert2 }

  summary.B1 = {
    legitWinHeroShows: winHero.present === true,
    legitWinHeroAmount: win?.plaque?.amount ?? null,
    raceSameLine: raceBust,
    raceDiveAgain: path2,
    pass:
      winHero.present === true &&
      (raceBust ? raceBust.staleSecuredText === false && raceBust.heroCartouchePresent === false : true) &&
      path2.bust === true && path2.staleSecuredText === false && path2.heroCartouchePresent === false,
  }
}

// ─────────────────────────── B2 — prefers-reduced-motion ──────────────────────
async function b2Probe(reduce) {
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
  await page.goto(URL, { waitUntil: 'networkidle0' }); await wait(250)
  // WIN
  let win = null; let a = 0
  while (a < 25 && (!win || !win.won)) { win = await playRound({ tier: 'REEF SHELF', pace: 'instant', tiles: 8 }); a++ }
  const heroCart = await readHeroCartouche(page)
  await page.screenshot({ path: `${OUT}/B2-${reduce ? 'reduce' : 'full'}-win.png` })
  // BUST — STAGGERED pace so the bad-vein phase HOLDS (cracked ducat shown, shake
  // running) as a clean window that isolates the vestibular shake/flash/scatter
  // from the one-time settled bomb-reveal re-bake (which at instant pace lands in
  // the diff window and falsely inflates the reduced-motion number). Sample the
  // full-canvas frame-diff DURING that bad-vein hold: full-motion shakes the whole
  // board (huge diff); reduced-motion is a static cracked-ducat board (~0).
  await reset(); await setTier(page, 'HADAL TRENCH'); await setPace(page, 'staggered')
  await paintTiles(page, 40); await wait(60)
  await installImgObserver(page)
  await clickText(page, 'RUN THE LINE')
  let seen = false
  for (let i = 0; i < 400 && !seen; i++) { const t = await bodyText(page); if (t.includes('Dive busted')) seen = true; else await wait(10) }
  // Sample two diffs across the bad-vein hold and take the MIN: the first window
  // still catches the one-time cracked-ducat/reveal content swap; the shake
  // (320ms)/scatter (520ms)/ring (420ms) keep the LATER window hot under full
  // motion, while reduced-motion is fully static once the one-time swap settles.
  // The min therefore reads the pure sustained-motion signal.
  let diff = null
  if (seen) {
    const d1 = await canvasFrameDiff(page)
    const d2 = await canvasFrameDiff(page)
    diff = d1 && d2 ? { changedFrac: Math.min(d1.changedFrac, d2.changedFrac) } : (d1 || d2)
  }
  await waitForSettled(page, 6000); await wait(120)
  const cert = await readSettledCert(page); const plaque = await readHeroPlaque(page)
  const bodyTxt = await bodyText(page)
  await page.screenshot({ path: `${OUT}/B2-${reduce ? 'reduce' : 'full'}-bust.png` })
  return {
    winHeroPresent: heroCart.present,
    winHeroAnimName: heroCart.animationName,
    winHeroAmount: win?.plaque?.amount ?? null,
    winCoinFlies: win?.flies ?? null,
    bustCanvasChangedFrac: diff ? +diff.changedFrac.toFixed(4) : null,
    bustCommunicates: (cert?.heading === 'RUGGED BY THE DEEP') && (plaque?.label === 'LINE BROKE') && bodyTxt.includes('RUGGED'),
    bustPayout: cert?.payout ?? null,
  }
}
{
  const reduceP = await b2Probe(true)
  const fullP = await b2Probe(false)
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
  summary.B2 = {
    reduce: reduceP,
    full: fullP,
    pass:
      reduceP.winHeroPresent === true && reduceP.winHeroAnimName === 'none' && reduceP.winCoinFlies === 0 && reduceP.bustCommunicates === true &&
      reduceP.bustCanvasChangedFrac !== null && reduceP.bustCanvasChangedFrac < 0.05 && fullP.bustCanvasChangedFrac / (reduceP.bustCanvasChangedFrac || 1e-6) > 5 &&
      fullP.winHeroPresent === true && fullP.winHeroAnimName === 'assayHeroPop' && fullP.winCoinFlies > 0 && fullP.bustCommunicates === true &&
      fullP.bustCanvasChangedFrac !== null && fullP.bustCanvasChangedFrac > 0.3,
  }
}

// ─────────────────────────── round-2 regression sanity ───────────────────────
{
  // instant bust: 0 coins + HAUL/payout 0
  let bust = null; let a = 0
  while (a < 20 && (!bust || bust.won)) { bust = await playRound({ tier: 'HADAL TRENCH', pace: 'instant', tiles: 40 }); a++ }
  // a win: hero shows $amount + multiplier
  let win = null; a = 0
  while (a < 25 && (!win || !win.won)) { win = await playRound({ tier: 'REEF SHELF', pace: 'instant', tiles: 8 }); a++ }
  summary.round2 = {
    bustPayoutZero: bust && !bust.won ? (bust.cert?.payout === '0.00') : null,
    bustPlaqueMult: bust?.plaque?.mult ?? null,
    winHeroAmount: win?.plaque?.amount ?? null,
    winHeroMult: win?.plaque?.mult ?? null,
    pass: !!(bust && !bust.won && bust.cert?.payout === '0.00' && win && win.won && win.plaque?.amount && win.plaque?.mult),
  }
}

summary.OVERALL_PASS = summary.B1.pass && summary.B2.pass && summary.B3.pass && summary.round2.pass && summary.consoleErrors.length === 0
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2))
console.log(JSON.stringify(summary, null, 2))
await browser.close()
