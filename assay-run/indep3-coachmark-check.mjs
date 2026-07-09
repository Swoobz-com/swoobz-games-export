// PASS-3 — verify the IntroCoachmark `pointerEvents:'none'` wrapper fix
// doesn't itself break anything: (1) a real coordinate tap through the
// banner's footprint reaches the board underneath (pass-through confirmed);
// (2) the dismiss "x" button, which explicitly restores pointerEvents:'auto'
// on itself, is independently reachable via a real coordinate click AND via
// Tab, and clicking it actually dismisses the banner (not just visually
// inert); (3) no focus trap -- Tab can move past/around the coachmark freely.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify3-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

// IMPORTANT (found live during this pass): `IntroCoachmark` persists "seen"
// to localStorage the moment it MOUNTS (by design, see AssayExperience.tsx
// ~L3115), so a plain `page.goto()` reload within the SAME browser context
// will NOT show it a second time -- localStorage survives navigation. Each
// sub-test below therefore gets its OWN fresh incognito browser context (via
// `browser.createBrowserContext()`) so the coachmark genuinely mounts fresh
// every time, rather than silently testing against an already-dismissed
// coachmark on the 2nd/3rd `page.goto()` (which is what the first version of
// this script accidentally did -- "dismiss button rect/point: null" was a
// false OPEN signal from test methodology, not a real product bug).
for (const viewport of [
  { width: 1440, height: 900, deviceScaleFactor: 1, label: 'desktop' },
  { width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true, label: 'iphone14pro' },
]) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const freshPage = async () => {
    const ctx = await browser.createBrowserContext()
    const p = await ctx.newPage()
    await p.setViewport(viewport)
    await p.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
    return p
  }
  const page = await freshPage()
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  const noteExists = await page.evaluate(() => !!document.querySelector('[role="note"][aria-label="How to play"]'))
  console.log(`[${viewport.label}] coachmark present:`, noteExists)

  // 1) Real coordinate click/tap through the banner's body text (NOT the
  // dismiss button) should pass through to whatever's underneath.
  const bannerBodyPoint = await page.evaluate(() => {
    const note = document.querySelector('[role="note"][aria-label="How to play"]')
    if (!note) return null
    const bodyDiv = note.querySelector('div')
    const r = bodyDiv.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })
  if (bannerBodyPoint) {
    const hitBefore = await page.evaluate((p) => {
      const el = document.elementFromPoint(p.x, p.y)
      return { tag: el.tagName, insideNote: !!el.closest('[role="note"][aria-label="How to play"]') }
    }, bannerBodyPoint)
    console.log(`[${viewport.label}] elementFromPoint at banner BODY text:`, JSON.stringify(hitBefore))
    if (viewport.hasTouch) {
      await page.touchscreen.tap(bannerBodyPoint.x, bannerBodyPoint.y)
    } else {
      await page.mouse.click(bannerBodyPoint.x, bannerBodyPoint.y)
    }
    await wait(150)
    const stillPresentAfterBodyTap = await page.evaluate(() => !!document.querySelector('[role="note"][aria-label="How to play"]'))
    console.log(`[${viewport.label}] coachmark still present after tapping its OWN body text (expected: true, since a body tap should pass through, not dismiss):`, stillPresentAfterBodyTap)
  } else {
    console.log(`[${viewport.label}] no coachmark to test (already dismissed / not first-run)`)
  }

  // Fresh incognito context to test dismiss button in isolation.
  const page2 = await freshPage()
  await wait(400)
  await tapText(page2, 'ENTER')
  await wait(500)

  const dismissPoint = await page2.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
    if (!btn) return null
    const r = btn.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
  })
  console.log(`[${viewport.label}] dismiss button rect/point:`, JSON.stringify(dismissPoint))
  if (dismissPoint) {
    const hitAtDismiss = await page2.evaluate((p) => {
      const el = document.elementFromPoint(p.x, p.y)
      return { tag: el.tagName, ariaLabel: el.getAttribute('aria-label') }
    }, dismissPoint)
    console.log(`[${viewport.label}] elementFromPoint at dismiss button center:`, JSON.stringify(hitAtDismiss))

    await page2.screenshot({ path: `${OUT}/coachmark-${viewport.label}-before-dismiss.png` })
    if (viewport.hasTouch) {
      await page2.touchscreen.tap(dismissPoint.x, dismissPoint.y)
    } else {
      await page2.mouse.click(dismissPoint.x, dismissPoint.y)
    }
    await wait(200)
    const presentAfterRealDismissTap = await page2.evaluate(() => !!document.querySelector('[role="note"][aria-label="How to play"]'))
    console.log(`[${viewport.label}] coachmark present after REAL coordinate tap on dismiss (expected: false):`, presentAfterRealDismissTap)
    await page2.screenshot({ path: `${OUT}/coachmark-${viewport.label}-after-dismiss.png` })
  }

  // Focus-trap check: fresh context again (so the coachmark mounts fresh),
  // Tab through from top of document N times, confirm the dismiss button
  // appears exactly once (reachable) and Tab continues on to the rest of the
  // UI afterward without getting stuck repeating the note.
  const page3 = await freshPage()
  await wait(400)
  await tapText(page3, 'ENTER')
  await wait(500)
  await page3.evaluate(() => document.activeElement && document.activeElement.blur())
  const tabSequence = []
  for (let i = 0; i < 16; i++) {
    await page3.keyboard.press('Tab')
    const info = await page3.evaluate(() => {
      const el = document.activeElement
      return { tag: el.tagName, aria: el.getAttribute('aria-label'), text: (el.textContent || '').slice(0, 30) }
    })
    tabSequence.push(info)
  }
  const dismissHits = tabSequence.filter((s) => s.aria === 'Dismiss how-to-play tip').length
  console.log(`[${viewport.label}] Tab sequence (first 16 stops):`, JSON.stringify(tabSequence))
  console.log(`[${viewport.label}] dismiss button reached exactly once in first 16 tabs (no trap/dup):`, dismissHits === 1, 'count=', dismissHits)

  await browser.close()
}
