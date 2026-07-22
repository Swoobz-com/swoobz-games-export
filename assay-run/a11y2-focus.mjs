import { launch, wait, reachPlanning } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const IS_MOBILE = process.argv[2] === 'mobile'
const VIEWPORT = IS_MOBILE ? { width: 412, height: 915 } : { width: 1440, height: 900 }
const VP_NAME = IS_MOBILE ? 'pixel7-412x915' : 'desktop-1440x900'
const OUT = `shots-a11y-final-0707/focus-${VP_NAME}`
fs.mkdirSync(OUT, { recursive: true })

async function inspectFocused(page) {
  return page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    const outlineWidth = parseFloat(cs.outlineWidth) || 0
    const outlineOffset = parseFloat(cs.outlineOffset) || 0
    const hasOutline = cs.outlineStyle !== 'none' && outlineWidth > 0
    const expanded = {
      left: rect.left - outlineWidth - outlineOffset,
      top: rect.top - outlineWidth - outlineOffset,
      right: rect.right + outlineWidth + outlineOffset,
      bottom: rect.bottom + outlineWidth + outlineOffset,
    }
    let anc = el.parentElement
    let clippedBy = null
    while (anc && anc !== document.documentElement) {
      const acs = getComputedStyle(anc)
      if (acs.overflow === 'hidden' || acs.overflowX === 'hidden' || acs.overflowY === 'hidden') {
        const ar = anc.getBoundingClientRect()
        const clips = expanded.left < ar.left - 0.5 || expanded.top < ar.top - 0.5 || expanded.right > ar.right + 0.5 || expanded.bottom > ar.bottom + 0.5
        if (clips) { clippedBy = { tag: anc.tagName, cls: anc.className?.toString().slice(0, 50) }; break }
      }
      anc = anc.parentElement
    }
    let siblingRingCandidate = false
    if (el.parentElement) {
      for (const sib of el.parentElement.children) {
        if (sib !== el && sib.getAttribute && sib.getAttribute('aria-hidden') !== null) {
          const scs = getComputedStyle(sib)
          if (scs.borderStyle !== 'none' && parseFloat(scs.borderWidth) > 0) siblingRingCandidate = true
        }
      }
    }
    const already = el.hasAttribute('data-a11y-visited')
    el.setAttribute('data-a11y-visited', '1')
    return {
      already,
      tag: el.tagName, role: el.getAttribute('role'), ariaLabel: el.getAttribute('aria-label'),
      text: (el.textContent || '').trim().slice(0, 40),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor, outlineWidth: cs.outlineWidth, outlineOffset: cs.outlineOffset,
      hasOutline, clippedBy, siblingRingCandidate, matchesFocusVisible: el.matches(':focus-visible'),
    }
  })
}

async function sweepPhase(page, phaseName, report, maxTabs = 60) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-a11y-visited]').forEach((e) => e.removeAttribute('data-a11y-visited'))
  })
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab')
    const info = await inspectFocused(page)
    if (!info) continue
    if (info.already) break // wrapped around to an already-seen element
    const idx = report.length
    const pad = 6
    const clip = {
      x: Math.max(0, Math.floor(info.rect.x - pad)),
      y: Math.max(0, Math.floor(info.rect.y - pad)),
      width: Math.ceil(info.rect.w + pad * 2),
      height: Math.ceil(info.rect.h + pad * 2),
    }
    const focusedPath = `${OUT}/${phaseName}-${idx}-focused.png`
    await page.screenshot({ path: focusedPath, clip })
    report.push({ phase: phaseName, ...info, clip, focusedShot: focusedPath })
  }
}

async function main() {
  const { browser, page } = await launch(VIEWPORT)
  const report = []

  await sweepPhase(page, 'lobby', report)
  // Blurred baseline for lobby MUST be captured while still in the lobby
  // phase (a prior version of this script advanced to 'planning' first,
  // silently comparing two different app phases and producing a bogus
  // near-100%-pixel-diff "ring" that was actually just different screen
  // content — caught by eyeballing the actual blurred crop, not the diff
  // number alone).
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  const lobbyReport = report.filter((r) => r.phase === 'lobby')
  for (const r of lobbyReport) {
    const p = r.focusedShot.replace('-focused.png', '-blurred.png')
    await page.screenshot({ path: p, clip: r.clip })
    r.blurredShot = p
  }

  await reachPlanning(page)
  await wait(300)
  await sweepPhase(page, 'planning', report)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  const planningReport = report.filter((r) => r.phase === 'planning')
  for (const r of planningReport) {
    const p = r.focusedShot.replace('-focused.png', '-blurred.png')
    await page.screenshot({ path: p, clip: r.clip })
    r.blurredShot = p
  }

  fs.writeFileSync(`${OUT}/focus-report.json`, JSON.stringify(report, null, 2))
  console.log(`Focusables: lobby=${lobbyReport.length} planning=${planningReport.length}`)
  console.table(report.map((r) => ({ phase: r.phase, tag: r.tag, text: r.text, outlineStyle: r.outlineStyle, hasOutline: r.hasOutline, clipped: !!r.clippedBy, siblingRing: r.siblingRingCandidate, focusVisible: r.matchesFocusVisible })))
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
