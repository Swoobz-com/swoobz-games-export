// Independent re-verify of the claimed WCAG 2.2.2 (Check 7, prefers-reduced-motion)
// fix on ABYSS LINE, fresh driver (does not reuse the prior FAIL-run's
// a11y4-reducedmotion.mjs mechanically — same helpers module for navigation
// only, all assertions/metrics rewritten for this pass, plus a NEW
// quantitative canvas frame-diff percentage the prior run did not compute).
import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-c7-reverify-0707'
fs.mkdirSync(OUT, { recursive: true })
const VIEWPORT = { width: 1440, height: 900 }

async function getCanvasFrame(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(c.width)
    const h = Math.round(c.height)
    const data = ctx.getImageData(0, 0, w, h).data
    // Return as a compact array (base64 would be huge over the wire; instead
    // compute a lightweight hash+sample set client-side and return raw bytes
    // via a typed array transferred as a regular array is too slow for full
    // frames — downsample to a grid of NxN average-luminance cells instead,
    // which is exactly what a "frame diff percentage" needs.)
    const N = 64
    const cellW = w / N
    const cellH = h / N
    const cells = new Float64Array(N * N)
    for (let cy = 0; cy < N; cy++) {
      for (let cx = 0; cx < N; cx++) {
        const x0 = Math.floor(cx * cellW)
        const y0 = Math.floor(cy * cellH)
        const x1 = Math.min(w, Math.floor((cx + 1) * cellW))
        const y1 = Math.min(h, Math.floor((cy + 1) * cellH))
        let sum = 0
        let n = 0
        for (let y = y0; y < y1; y += 2) {
          for (let x = x0; x < x1; x += 2) {
            const i = (y * w + x) * 4
            const r = data[i], g = data[i + 1], b = data[i + 2]
            sum += 0.2126 * r + 0.7152 * g + 0.0722 * b
            n++
          }
        }
        cells[cy * N + cx] = n ? sum / n : 0
      }
    }
    return { w, h, N, cells: Array.from(cells) }
  })
}

function frameDiffPct(a, b, threshold = 4) {
  // fraction of downsampled cells whose avg luminance changed by > threshold
  let changed = 0
  for (let i = 0; i < a.cells.length; i++) {
    if (Math.abs(a.cells[i] - b.cells[i]) > threshold) changed++
  }
  return changed / a.cells.length
}

async function forceWinAndInspectHero(page, label) {
  const results = {}
  for (let a = 0; a < 8; a++) {
    await selectTier(page, 'REEF SHELF')
    await paintTilesMouse(page, Array.from({ length: 8 }, (_, i) => a * 9 + i))
    await wait(100)
    await commit(page)
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 7000)
    if (settled && /SECURED THE HAUL/i.test(settled)) break
    await clickText(page, 'DIVE AGAIN')
    await wait(250)
  }
  // Grab the hero DOM state immediately, mid-celebration hold window.
  const hero = await page.evaluate(() => {
    const all = [...document.querySelectorAll('*')]
    const named = ['assayHeroPop', 'assayHeroRing', 'assayCartoucheShine', 'assayBoardSweep']
    const found = {}
    for (const name of named) found[name] = false
    let heroText = null
    for (const el of all) {
      const cs = getComputedStyle(el)
      if (cs.animationName && named.includes(cs.animationName)) found[cs.animationName] = true
      if (el.textContent && el.textContent.includes('SECURED THE HAUL') && el.textContent.match(/\$[\d.]+/)) {
        if (!heroText || el.textContent.length < heroText.length) heroText = el.textContent
      }
    }
    return { animPresent: found, heroText }
  })
  results.hero = hero
  await page.screenshot({ path: `${OUT}/${label}-win-hero.png` })
  return results
}

async function forceBustAndMeasure(page, label) {
  const results = {}
  await clickText(page, 'DIVE AGAIN').catch(() => {})
  await wait(200)
  let reached = false
  for (let a = 0; a < 4; a++) {
    await selectTier(page, 'HADAL TRENCH')
    await paintTilesMouse(page, Array.from({ length: 40 }, (_, i) => i))
    await wait(100)
    await commit(page)
    let badVeinAt = null
    for (let i = 0; i < 400; i++) {
      const txt = await page.evaluate(() => document.body.innerText)
      if (txt.includes('Dive busted.')) { badVeinAt = true; break }
      await wait(10)
    }
    if (badVeinAt) { reached = true; break }
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 2000)
    if (settled) { await clickText(page, 'DIVE AGAIN'); await wait(200); continue }
  }
  results.reachedBust = reached
  if (!reached) return results

  // Confirm the outcome is still communicated. The "Dive busted." aria-live
  // marker fires immediately on the bad-vein transition; the persistent
  // settled-receipt panel ("RUGGED BY THE DEEP" / "LINE BROKE") mounts a beat
  // later once the settle-hold completes — wait for it explicitly (up to 4s)
  // rather than sampling body text immediately, or the receipt read is a false
  // negative purely from timing, not from a real missing-announcement bug.
  let outcomeText = await page.evaluate(() => document.body.innerText)
  for (let i = 0; i < 20 && !/RUGGED BY THE DEEP/.test(outcomeText); i++) {
    await wait(200)
    outcomeText = await page.evaluate(() => document.body.innerText)
  }
  results.rugCopyPresent = /RUGGED BY THE DEEP/.test(outcomeText) && /LINE BROKE/.test(outcomeText)
  results.crackedDucatAnnounced = /Cracked ducat hit\. Dive busted\./.test(outcomeText) || /CRACKED DUCAT/.test(outcomeText)

  // Frame-diff series RESTARTED from a fresh bust (receipt-wait above already
  // consumed the settle window) so the diff series below is measured from the
  // moment 'Dive busted.' fires through the full settle-hold, over a LONGER
  // window (up to ~1.6s) with finer early sampling, to distinguish "one extra
  // settle tick then flat" from genuine sustained per-frame motion.
  await clickText(page, 'DIVE AGAIN').catch(() => {})
  await wait(250)
  let reached2 = false
  for (let a = 0; a < 4; a++) {
    await selectTier(page, 'HADAL TRENCH')
    await paintTilesMouse(page, Array.from({ length: 40 }, (_, i) => i))
    await wait(100)
    await commit(page)
    let badVeinAt = null
    for (let i = 0; i < 400; i++) {
      const txt = await page.evaluate(() => document.body.innerText)
      if (txt.includes('Dive busted.')) { badVeinAt = true; break }
      await wait(10)
    }
    if (badVeinAt) { reached2 = true; break }
    const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 2000)
    if (settled) { await clickText(page, 'DIVE AGAIN'); await wait(200); continue }
  }
  results.reachedBust2ForFrameDiff = reached2
  const frames = []
  const stamps = [0, 40, 80, 120, 160, 220, 300, 400, 550, 750, 1000, 1300, 1600]
  let prevStamp = 0
  for (const dt of stamps) {
    if (dt > 0) await wait(dt - prevStamp)
    prevStamp = dt
    frames.push(await getCanvasFrame(page))
  }
  let maxDiff = 0
  const diffs = []
  for (let i = 1; i < frames.length; i++) {
    const d = frameDiffPct(frames[i - 1], frames[i])
    diffs.push({ atMs: stamps[i], diff: d })
    if (d > maxDiff) maxDiff = d
  }
  results.frameDiffs = diffs
  results.maxFrameDiff = maxDiff

  const canvasBox = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })
  await page.screenshot({ path: `${OUT}/${label}-bust-canvas.png`, clip: canvasBox })
  return results
}

async function runMode(reduce) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: VIEWPORT })
  const page = (await browser.pages())[0]
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(500)
  await reachPlanning(page)

  const label = reduce ? 'reduceON' : 'reduceOFF'
  const winRes = await forceWinAndInspectHero(page, label)
  const bustRes = await forceBustAndMeasure(page, label)
  await browser.close()
  return { reduce, win: winRes, bust: bustRes }
}

async function main() {
  const on = await runMode(true)
  const off = await runMode(false)
  const out = { on, off }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
