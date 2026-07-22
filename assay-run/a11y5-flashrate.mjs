import { launch, wait, reachPlanning, selectTier, paintTilesMouse, paintTilesMobile, commit, clickText, pollForPhaseText } from './_a11yHelpers.mjs'
import { avgColorOfPng } from './_a11yContrastCore.mjs'
import fs from 'node:fs'

const IS_MOBILE = process.argv[2] === 'mobile'
const VIEWPORT = IS_MOBILE ? { width: 412, height: 915 } : { width: 1440, height: 900 }
const VP_NAME = IS_MOBILE ? 'pixel7-412x915' : 'desktop-1440x900'
const OUT = `shots-a11y-final-0707/flashrate-${VP_NAME}`
fs.mkdirSync(OUT, { recursive: true })
const paint = IS_MOBILE ? paintTilesMobile : paintTilesMouse

function brightness(rgb) {
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
}

async function burstCapture(page, canvasBoxFn, prefix, n, intervalMs) {
  const frames = []
  for (let i = 0; i < n; i++) {
    const box = await canvasBoxFn()
    const p = `${OUT}/${prefix}-${String(i).padStart(3, '0')}.png`
    await page.screenshot({ path: p, clip: box })
    frames.push({ t: i * intervalMs, path: p })
    await wait(intervalMs)
  }
  return frames
}

async function analyzeFrames(frames) {
  const series = frames.map((f) => ({ t: f.t, b: brightness(avgColorOfPng(f.path)) }))
  // Count SIGNED transitions of the brightness derivative crossing a
  // threshold (a real up-then-down or down-then-up swing = one "flash"),
  // per WCAG 2.3.1's "flash" definition (a pair of opposing changes).
  const threshold = 0.02 // normalized luminance delta floor to count as real motion, not sensor/encode noise
  let transitions = 0
  let lastSign = 0
  for (let i = 1; i < series.length; i++) {
    const delta = series[i].b - series[i - 1].b
    if (Math.abs(delta) < threshold) continue
    const sign = delta > 0 ? 1 : -1
    if (lastSign !== 0 && sign !== lastSign) transitions++
    lastSign = sign
  }
  const totalSeconds = (series[series.length - 1].t - series[0].t) / 1000
  const flashesPerSecond = totalSeconds > 0 ? transitions / totalSeconds : 0
  return { series, transitions, totalSeconds, flashesPerSecond }
}

async function canvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  })
}

async function main() {
  const { browser, page } = await launch(VIEWPORT)
  const results = {}

  // ── BUST transition: blood flash + bloom ring + shard scatter + shake ──
  await reachPlanning(page)
  await selectTier(page, 'HADAL TRENCH')
  await paint(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(120)
  await commit(page)
  // Poll tightly for the exact moment bad-vein starts, then burst-capture.
  let started = false
  for (let i = 0; i < 300; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('Dive busted.')) { started = true; break }
    await wait(8)
  }
  results.bustTransitionReached = started
  if (started) {
    const frames = await burstCapture(page, () => canvasBox(page), 'bust', 24, 25) // 24 frames @25ms = 600ms window
    results.bust = await analyzeFrames(frames)
  }
  await page.screenshot({ path: `${OUT}/bust-final.png` })

  // ── WIN transition: hero-pop celebration (settle cartouche fade/pop-in) ──
  await clickText(page, 'DIVE AGAIN')
  await wait(300)
  let settledWin = null
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
  if (results.reachedWin) {
    // Capture the FULL page region covering the hero-pop cartouche (a fixed
    // board-relative overlay) rather than just the canvas — burst right after
    // settle detection to catch the pop-in + ring animation window.
    const heroBox = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      const r = c.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: Math.round(r.height * 0.6) }
    })
    const frames = await burstCapture(page, async () => heroBox, 'win-hero', 30, 30) // 30 frames @30ms = 900ms
    results.winHero = await analyzeFrames(frames)
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('BUST:', results.bust ? { transitions: results.bust.transitions, seconds: results.bust.totalSeconds, hz: results.bust.flashesPerSecond } : 'not reached')
  console.log('WIN-HERO:', results.winHero ? { transitions: results.winHero.transitions, seconds: results.winHero.totalSeconds, hz: results.winHero.flashesPerSecond } : 'not reached')
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
