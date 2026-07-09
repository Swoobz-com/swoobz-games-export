import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, selectTier, paintTilesMouse, paintTilesMobile, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const IS_MOBILE = process.argv[2] === 'mobile'
const VIEWPORT = IS_MOBILE ? { width: 412, height: 915 } : { width: 1440, height: 900 }
const VP_NAME = IS_MOBILE ? 'pixel7-412x915' : 'desktop-1440x900'
const OUT = `shots-a11y-final-0707/reducedmotion-${VP_NAME}`
fs.mkdirSync(OUT, { recursive: true })

const ANIMATED_CLASSES = null // not used; classes are applied inline via style, not className, for most — see below.

/** Synthetic-throwaway-DOM-node technique (established prior technique, avoids
 *  racing a live one-shot animation that may already be unmounted by the time
 *  we check): create a bare node, apply the EXACT inline `animation` string
 *  used by the real component, append to body, read back the animation
 *  longhand, remove. Confirms whether `prefers-reduced-motion:reduce` collapses
 *  it at the CSS-cascade level (only works for rules with a real stylesheet
 *  media-query gate — a bare inline `style.animation` string is NEVER
 *  overridden by a `@media` rule targeting a class, since inline style always
 *  wins the cascade; this is itself the diagnostic). */
async function checkInlineAnimation(page, animationValue) {
  return page.evaluate((animationValue) => {
    const el = document.createElement('div')
    el.style.animation = animationValue
    document.body.appendChild(el)
    const cs = getComputedStyle(el)
    const result = { animationName: cs.animationName, animationDuration: cs.animationDuration, animationPlayState: cs.animationPlayState }
    document.body.removeChild(el)
    return result
  }, animationValue)
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: VIEWPORT })
  const page = (await browser.pages())[0]
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(600)

  const results = { viewport: VP_NAME, mode: 'prefers-reduced-motion:reduce' }

  // ── 1) Ambient CSS animations (.assayAmbient-scoped) — SHOULD collapse ──
  results.ambientClassRule = await page.evaluate(() => {
    // Find the actual injected stylesheet rule text for `.assayAmbient *`.
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.media && [...rule.media].some((m) => m.includes('prefers-reduced-motion'))) {
            return rule.cssText.slice(0, 200)
          }
        }
      } catch (e) { /* cross-origin sheet, skip */ }
    }
    return null
  })
  // Live element check: find an actual ambient bubble/plankton/kelp node and
  // read its REAL computed animationName under the active reduce emulation.
  results.ambientLiveElements = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const hits = []
    for (const el of all) {
      const cs = getComputedStyle(el)
      if (cs.animationName && cs.animationName !== 'none' && /assayBubble|assayPlankton|assayCaustic|assayKelp/.test(cs.animationName)) {
        hits.push({ tag: el.tagName, animationName: cs.animationName })
      }
    }
    return hits
  })

  // ── 2) Named module-const CSS keyframes used by coin-fly / hero-pop / board
  // effects — check if ANY of these are gated (expect: NOT gated, since they
  // are set via inline `style={{animation: ...}}`, not a class, and no
  // `@media` rule anywhere targets them by class). ──
  const inlineAnimNames = [
    'assayCoinFly', 'assayHeroPop', 'assayHeroRing', 'assayBoardSweep',
    'assayBoardBloomRadial', 'assayCartoucheShine', 'assayTallyPulse',
    'assayTallySpark', 'assayLampBreathe', 'assayTallyShine', 'assayNeedlePulse',
  ]
  results.inlineAnimationChecks = {}
  for (const name of inlineAnimNames) {
    results.inlineAnimationChecks[name] = await checkInlineAnimation(page, `${name} 500ms ease-out forwards`)
  }

  // ── 3) LIVE reproduction: drive a real win + a real bust under the active
  // reduce emulation and frame-diff the canvas + DOM for the coin-fly, hero
  // pop, and canvas-drawn bloom-ring/scatter/blood-flash effects. ──
  await reachPlanning(page)
  let settledWin = null
  const paint = IS_MOBILE ? paintTilesMobile : paintTilesMouse
  for (let a = 0; a < 6; a++) {
    await selectTier(page, 'REEF SHELF')
    await paint(page, Array.from({ length: 8 }, (_, i) => a * 9 + i))
    await wait(120)
    await commit(page)
    settledWin = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 8000)
    if (settledWin && /SECURED THE HAUL/i.test(settledWin)) break
    await clickText(page, 'DIVE AGAIN')
    await wait(250)
  }
  results.reachedWin = !!(settledWin && /SECURED THE HAUL/i.test(settledWin))

  // Frame-diff the board canvas at t=0/80/160/320/640ms is not meaningful
  // post-hoc (round already settled) — instead, mechanically count DOM-level
  // coin-fly <img> insertions during this run to check if the fly animation
  // still LAUNCHES under reduce (it does launch — the question this pass
  // answers is whether its CSS duration/name collapses to none, per (2) above,
  // and whether the hero-pop's own inline animation is still playing).
  const heroAnimState = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    for (const el of all) {
      const cs = getComputedStyle(el)
      if (cs.animationName === 'assayHeroPop') return { found: true, animationName: cs.animationName, animationDuration: cs.animationDuration, animationPlayState: cs.animationPlayState }
    }
    return { found: false }
  })
  results.liveHeroPopAnimationUnderReduce = heroAnimState
  await page.screenshot({ path: `${OUT}/win-under-reduce.png` })

  // ── 4) Canvas-drawn (non-CSS) juice effects — bloom ring / bust shard
  // scatter / full-canvas blood flash / travelling spark: these are painted
  // every rAF frame by AssayGridCanvas's `draw()` based on `performance.now()`
  // deltas, with NO reducedMotion prop/param anywhere in that file (grep-
  // confirmed 0 hits for reducedMotion/matchMedia in AssayGridCanvas.tsx) —
  // structurally IMPOSSIBLE for a `@media (prefers-reduced-motion)` CSS rule
  // to affect them (they are canvas pixels, not DOM/CSS at all). Verify LIVE:
  // force a bust under the SAME active reduce emulation and frame-sample the
  // canvas immediately after the bad-vein transition for the shard-scatter
  // frames actually painting (motion clearly present = proof reduce does
  // nothing here).
  await clickText(page, 'DIVE AGAIN')
  await wait(300)
  await selectTier(page, 'HADAL TRENCH')
  await paint(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(120)
  await commit(page)
  let badVeinAt = null
  for (let i = 0; i < 300; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('Dive busted.')) { badVeinAt = Date.now(); break }
    await wait(10)
  }
  results.badVeinReachedUnderReduce = !!badVeinAt
  if (badVeinAt) {
    const shots = []
    for (const dt of [0, 80, 160, 320]) {
      await wait(dt === 0 ? 0 : 80)
      const p = `${OUT}/bust-canvas-t${dt}.png`
      const canvasBox = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
      await page.screenshot({ path: p, clip: canvasBox })
      shots.push(p)
    }
    results.bustCanvasFrames = shots
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
