// Fresh, independent re-verify script (rg-c5-qa, 2026-07-04) for THE ASSAY LINE.
// Deliberately NOT reusing any maker/prior-agent verify script as evidence.
//
// (1) CRIT #2 — RG-C8 PLAY SAFE reachability in every phase, INCLUDING mid-cascade
//     'assaying' on the Heavy Floor tier with a MAX_TRAIL(60)-length line.
// (2) RG-C5 no-regression — playClaim()/playBead()/playBadVein() call-site + module
//     const audit, cross-checked with a live Lean-tier vs Heavy-tier win trigger.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5175/'
const OUT = 'shots-rgc5-reverify-0704c'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const results = { critical: [], notes: [] }

async function clickByText(page, txt, { exact = false } = {}) {
  const handle = await page.evaluateHandle(
    (t, ex) => {
      const btns = [...document.querySelectorAll('button')]
      return (
        btns.find((b) => {
          const txtC = (b.textContent || '').trim()
          return ex ? txtC === t : txtC.includes(t)
        }) || null
      )
    },
    txt,
    exact,
  )
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function getPlaySafeRect(page) {
  return page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((x) => (x.textContent || '').trim() === 'PLAY SAFE')
    if (!b) return null
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      cx: r.x + r.width / 2,
      cy: r.y + r.height / 2,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      pointerEvents: cs.pointerEvents,
      position: cs.position,
      zIndex: cs.zIndex,
    }
  })
}

async function elementFromPointInfo(page, x, y) {
  return page.evaluate(
    (x, y) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return null
      const isPlaySafeBtn = (n) => n && n.tagName === 'BUTTON' && (n.textContent || '').trim() === 'PLAY SAFE'
      let cur = el
      let resolvesToPlaySafe = false
      for (let i = 0; i < 5 && cur; i++) {
        if (isPlaySafeBtn(cur)) {
          resolvesToPlaySafe = true
          break
        }
        cur = cur.parentElement
      }
      return {
        tag: el.tagName,
        cls: el.className && el.className.toString().slice(0, 80),
        text: (el.textContent || '').trim().slice(0, 40),
        resolvesToPlaySafe,
      }
    },
    x,
    y,
  )
}

async function statusText(page) {
  return page.evaluate(() => document.querySelector('[role="status"]')?.textContent ?? null)
}

async function isSafetyPanelOpen(page) {
  return page.evaluate(() => !!document.querySelector('[role="dialog"][aria-label="Play safe"]'))
}

async function paintTiles(page, canvasSelectorHint, count) {
  // Desktop pointerdown-per-tile toggles the tile immediately (see
  // AssayGridCanvas.tsx onPointerDownDesktop) -> a plain page.mouse.click at
  // each tile's center paints it, one indexed tile at a time, row-major.
  const canvasBox = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')]
    // The board canvas is the largest on-screen canvas during 'planning'.
    let best = null
    let bestArea = 0
    for (const c of canvases) {
      const r = c.getBoundingClientRect()
      const area = r.width * r.height
      if (area > bestArea) {
        bestArea = area
        best = { x: r.x, y: r.y, w: r.width, h: r.height }
      }
    }
    return best
  })
  if (!canvasBox) throw new Error('no board canvas found')
  const GRID_DIM = 10
  const tile = canvasBox.w / GRID_DIM
  let painted = 0
  for (let idx = 0; idx < count; idx++) {
    const row = Math.floor(idx / GRID_DIM)
    const col = idx % GRID_DIM
    const x = canvasBox.x + col * tile + tile / 2
    const y = canvasBox.y + row * tile + tile / 2
    await page.mouse.click(x, y)
    painted++
  }
  return painted
}

async function checkPlaySafeInPhase(page, label) {
  const rect = await getPlaySafeRect(page)
  if (!rect) {
    results.critical.push(`${label}: PLAY SAFE button not found in DOM at all`)
    return null
  }
  const viewport = page.viewport()
  const inViewport = rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= viewport.width && rect.y + rect.h <= viewport.height
  const visible = rect.display !== 'none' && rect.visibility !== 'hidden' && Number(rect.opacity) > 0
  const efp = await elementFromPointInfo(page, rect.cx, rect.cy)
  await page.screenshot({ path: `${OUT}/${label.replace(/[^a-z0-9]+/gi, '-')}.png` })
  const report = { label, rect, inViewport, visible, efp }
  console.log(JSON.stringify(report))
  if (!inViewport) results.critical.push(`${label}: PLAY SAFE rect outside viewport ${JSON.stringify(rect)}`)
  if (!visible) results.critical.push(`${label}: PLAY SAFE computed-style not visible ${JSON.stringify(rect)}`)
  if (!efp || !efp.resolvesToPlaySafe) results.critical.push(`${label}: elementFromPoint at PLAY SAFE center did NOT resolve to PLAY SAFE — got ${JSON.stringify(efp)}`)
  return report
}

async function realClickTest(page, label) {
  const rect = await getPlaySafeRect(page)
  if (!rect) {
    results.critical.push(`${label}: cannot real-click, rect missing`)
    return false
  }
  const before = await isSafetyPanelOpen(page)
  await page.mouse.click(rect.cx, rect.cy)
  await wait(120)
  const after = await isSafetyPanelOpen(page)
  console.log(`${label}: real coordinate click -> panel open before=${before} after=${after}`)
  if (!after) {
    results.critical.push(`${label}: real coordinate mouse.click() at PLAY SAFE center did NOT open the safety panel (before=${before} after=${after})`)
  } else {
    await page.screenshot({ path: `${OUT}/${label.replace(/[^a-z0-9]+/gi, '-')}-panel-open.png` })
    // close it again via the CLOSE button so the round can continue
    await clickByText(page, 'CLOSE')
    await wait(60)
  }
  return after
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)

  // Force the first-time IntroCoachmark to show during planning, so we test
  // the worst-case overlap scenario (both fixed-position overlays present).
  await page.evaluate(() => {
    try {
      localStorage.removeItem('assay_coachmark_seen_v1')
    } catch {}
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)

  // ── Phase 1: lobby ──────────────────────────────────────────────────────
  await checkPlaySafeInPhase(page, 'desktop-lobby')
  await realClickTest(page, 'desktop-lobby')

  // Enter planning
  const entered = await clickByText(page, 'ENTER THE ASSAY LINE')
  if (!entered) results.critical.push('Could not find ENTER THE ASSAY LINE CTA')
  await wait(300)

  // ── Phase 2: planning (coachmark should be up, first time) ─────────────
  const coachRect = await page.evaluate(() => {
    const n = document.querySelector('[aria-label="How to play"]')
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  console.log('coachmark rect (desktop):', JSON.stringify(coachRect))
  await checkPlaySafeInPhase(page, 'desktop-planning-with-coachmark')
  // overlap check
  {
    const ps = await getPlaySafeRect(page)
    if (ps && coachRect) {
      const overlapX = ps.x < coachRect.x + coachRect.w && ps.x + ps.w > coachRect.x
      const overlapY = ps.y < coachRect.y + coachRect.h && ps.y + ps.h > coachRect.y
      const overlaps = overlapX && overlapY
      console.log(`desktop PLAY SAFE vs IntroCoachmark bbox overlap: ${overlaps}`)
      if (overlaps) results.critical.push(`desktop: PLAY SAFE rect overlaps IntroCoachmark rect: PS=${JSON.stringify(ps)} CM=${JSON.stringify(coachRect)}`)
    }
  }
  await realClickTest(page, 'desktop-planning-with-coachmark')

  // Select Heavy Floor tier
  const tierClicked = await clickByText(page, 'Heavy Floor')
  if (!tierClicked) results.critical.push('Could not find/click Heavy Floor tier row')
  await wait(150)

  // Paint MAX_TRAIL (60) tiles
  const painted = await paintTiles(page, null, 60)
  console.log(`painted ${painted} tiles`)
  await wait(150)
  await page.screenshot({ path: `${OUT}/desktop-planning-painted60.png` })

  await checkPlaySafeInPhase(page, 'desktop-planning-painted-heavy60')

  // ── Phase 3: assaying (mid-cascade), retry rounds until we capture a
  //     genuine mid-cascade moment (revealedCount > 0 and phase still
  //     'assaying', ideally well past the first tile). ──────────────────
  let capturedMidCascade = false
  for (let attempt = 0; attempt < 6 && !capturedMidCascade; attempt++) {
    if (attempt > 0) {
      // Repaint: acknowledge/settle path or re-enter planning as needed.
      const st = await statusText(page)
      console.log(`retry ${attempt}, status before repaint: ${st}`)
      // If settled, click ASSAY AGAIN / back to planning.
      await clickByText(page, 'ASSAY AGAIN')
      await wait(200)
      const tc2 = await clickByText(page, 'Heavy Floor')
      await wait(100)
      await paintTiles(page, null, 60)
      await wait(150)
    }
    const plunged = await clickByText(page, 'RUN THE LINE')
    if (!plunged) {
      results.notes.push(`attempt ${attempt}: could not find RUN THE LINE button`)
      continue
    }
    // Poll aria-live status text for mid-cascade progress.
    let bestReport = null
    let bestCount = -1
    const deadline = Date.now() + 4000
    while (Date.now() < deadline) {
      const txt = await statusText(page)
      const m = txt && txt.match(/Line running\. (\d+) of (\d+) boxes cleared/)
      if (m) {
        const cleared = Number(m[1])
        const total = Number(m[2])
        if (cleared > bestCount) {
          bestCount = cleared
          if (cleared >= 1 && !bestReport) {
            // capture right now — genuinely mid-cascade — AND immediately do
            // the real coordinate click+panel-open test WHILE still in this
            // exact live 'assaying' moment (do not wait for more reveals;
            // the window between reveal ticks is only ~90ms).
            const rect = await checkPlaySafeInPhase(page, `desktop-ASSAYING-midcascade-attempt${attempt}-cleared${cleared}of${total}`)
            bestReport = rect
            const txtNow = await statusText(page)
            if (txtNow && txtNow.includes('Line running')) {
              await realClickTest(page, `desktop-ASSAYING-realclick-attempt${attempt}-cleared${cleared}of${total}`)
            } else {
              results.notes.push(`attempt ${attempt}: status flipped away from 'Line running' between the screenshot and the click sub-test (${txtNow}) — will retry for a cleaner window`)
            }
          }
        }
        if (cleared >= Math.min(15, Math.floor(total / 3))) break // good enough mid-point
      } else if (txt && txt.includes('Cracked box hit')) {
        break // busted — will retry
      } else if (txt && (txt.includes('Line secured') || txt.includes('Line busted'))) {
        break
      }
      await wait(20)
    }
    if (bestCount >= 1 && bestReport) {
      capturedMidCascade = true
      results.notes.push(`Captured mid-cascade at attempt ${attempt}, revealedCount=${bestCount}`)
    }
  }
  if (!capturedMidCascade) {
    results.critical.push('Could not capture a genuine mid-cascade (revealedCount>=1, phase=assaying) moment after 6 attempts — CRIT #2 NOT independently reproduced live for the assaying phase')
  }

  // Let any in-flight round finish, then handle settled phase.
  await wait(2500)
  let txtFinal = await statusText(page)
  console.log('status after wait:', txtFinal)

  // ── Phase 4: settled ─────────────────────────────────────────────────
  if (txtFinal && (txtFinal.includes('Line secured') || txtFinal.includes('Line busted'))) {
    await checkPlaySafeInPhase(page, 'desktop-settled')
    await realClickTest(page, 'desktop-settled')
  } else {
    results.notes.push(`Could not reach a settled state cleanly for the settled-phase PLAY SAFE check: ${txtFinal}`)
  }

  // ── Mobile viewport pass (iPhone 14 Pro, 393x852 — the width that
  //     previously showed a coachmark/CTA collision) ──────────────────────
  await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    try {
      localStorage.removeItem('assay_coachmark_seen_v1')
    } catch {}
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await wait(400)
  await checkPlaySafeInPhase(page, 'mobile393-lobby')
  await clickByText(page, 'ENTER THE ASSAY LINE')
  await wait(300)
  const mobileCoachRect = await page.evaluate(() => {
    const n = document.querySelector('[aria-label="How to play"]')
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  await checkPlaySafeInPhase(page, 'mobile393-planning-with-coachmark')
  {
    const ps = await getPlaySafeRect(page)
    if (ps && mobileCoachRect) {
      const overlapX = ps.x < mobileCoachRect.x + mobileCoachRect.w && ps.x + ps.w > mobileCoachRect.x
      const overlapY = ps.y < mobileCoachRect.y + mobileCoachRect.h && ps.y + ps.h > mobileCoachRect.y
      const overlaps = overlapX && overlapY
      console.log(`mobile393 PLAY SAFE vs IntroCoachmark bbox overlap: ${overlaps}`, JSON.stringify(ps), JSON.stringify(mobileCoachRect))
      if (overlaps) results.critical.push(`mobile393: PLAY SAFE rect overlaps IntroCoachmark rect: PS=${JSON.stringify(ps)} CM=${JSON.stringify(mobileCoachRect)}`)
    }
  }

  // ── RG-C5 live win-celebration comparison: Lean tier small win vs Heavy
  //     tier win. Confirms the HeroPopCallout badge + its CSS animation
  //     durations are identical regardless of tier/magnitude, live, not just
  //     from source reading. ─────────────────────────────────────────────
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)
  await clickByText(page, 'ENTER THE ASSAY LINE')
  await wait(200)

  async function attemptWinAndCapture(tierText, trailLen, label, maxAttempts) {
    for (let i = 0; i < maxAttempts; i++) {
      const tc = await clickByText(page, tierText)
      if (!tc) results.notes.push(`${label}: could not click tier '${tierText}'`)
      await wait(100)
      // ensure we're in planning with an empty trail (fresh round) — clear
      // any leftover painted tiles from a prior failed attempt first.
      await clickByText(page, 'CLEAR', { exact: true })
      await wait(80)
      const painted = await paintTiles(page, null, trailLen)
      await wait(100)
      const plunged = await clickByText(page, 'RUN THE LINE')
      if (!plunged) {
        results.notes.push(`${label} attempt ${i}: RUN THE LINE not clickable`)
        continue
      }
      // wait for settle
      const deadline = Date.now() + 8000
      let finalTxt = null
      while (Date.now() < deadline) {
        const t = await statusText(page)
        if (t && (t.includes('Line secured') || t.includes('Line busted'))) {
          finalTxt = t
          break
        }
        await wait(30)
      }
      if (finalTxt && finalTxt.includes('Line secured')) {
        await wait(80) // let hero-pop mount
        const heroInfo = await page.evaluate(() => {
          const nodes = [...document.querySelectorAll('*')]
          const badge = nodes.find((n) => (n.textContent || '').trim() === 'LINE SECURED' && n.tagName === 'SPAN')
          if (!badge) return null
          const pill = badge.closest('div')
          const cs = pill ? getComputedStyle(pill) : null
          const wrap = pill ? pill.parentElement : null
          const wrapRect = wrap ? wrap.getBoundingClientRect() : null
          return {
            found: true,
            pillAnimation: cs ? cs.animation : null,
            pillAnimationDuration: cs ? cs.animationDuration : null,
            wrapRect,
          }
        })
        await page.screenshot({ path: `${OUT}/${label}-win-heropop.png` })
        results.notes.push(`${label}: WIN captured attempt ${i}, heroInfo=${JSON.stringify(heroInfo)}`)
        // acknowledge and return
        await wait(1800) // let hero-pop finish its hold so next round starts clean
        await clickByText(page, 'ASSAY AGAIN')
        await wait(200)
        return heroInfo
      } else {
        results.notes.push(`${label} attempt ${i}: did not win (${finalTxt}), retrying`)
        await clickByText(page, 'ASSAY AGAIN')
        await wait(200)
      }
    }
    results.critical.push(`${label}: could not achieve a WIN outcome after ${maxAttempts} attempts to compare celebration`)
    return null
  }

  const leanHero = await attemptWinAndCapture('Lean Floor', 8, 'lean-tier', 6)
  const heavyHero = await attemptWinAndCapture('Heavy Floor', 8, 'heavy-tier', 10)
  results.notes.push(`lean vs heavy hero-pop identical CSS animation string: ${JSON.stringify(leanHero?.pillAnimation) === JSON.stringify(heavyHero?.pillAnimation)}`)
  console.log('leanHero', JSON.stringify(leanHero))
  console.log('heavyHero', JSON.stringify(heavyHero))

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('=== RESULTS ===')
  console.log(JSON.stringify(results, null, 2))

  await browser.close()
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
