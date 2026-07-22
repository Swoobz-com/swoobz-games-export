// FRESH, independent re-verification probe for HIGH #7 + HIGH #8 on THE ASSAY LINE.
// Written by swoobz-casino-fairness-qa, 2026-07-04. Does NOT reuse or trust any
// pre-existing probe script in this directory (e.g. tier-mismatch-check-0704.mjs) —
// written from scratch against the live DOM contract read directly out of
// AssayExperience.tsx / assayProvider.ts / assayMath.ts source.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/qa-fairness-reverify-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const results = { probe7: {}, probe8: {}, sanity: {} }

const clickButtonWithText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.trim().includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

// NOTE: querySelectorAll('div') in document order returns ANCESTORS before
// descendants, and textContent aggregates ALL descendant text — so naively
// picking the first div whose textContent "includes" the target string
// grabs the outermost app-root div (whole-page text, including inline
// <style> blocks), not the actual certificate line. Walk to the DEEPEST
// element that still contains the string (no child also contains it).
const readCertificate = (page) =>
  page.evaluate(() => {
    const all = [...document.querySelectorAll('div,span')]
    const matches = all.filter((el) => el.textContent && el.textContent.includes('GLASS BOX CERTIFICATE'))
    if (!matches.length) return null
    // Deepest/smallest-textContent match = the actual leaf line, not a wrapper.
    matches.sort((a, b) => a.textContent.length - b.textContent.length)
    return matches[0].textContent.trim()
  })

// Belt-and-suspenders: also pull the certificate line straight out of
// document.body.innerText via regex, completely independent of DOM element
// boundaries (immune to the div-nesting gotcha above).
const readCertificateFromBodyText = (page) =>
  page.evaluate(() => {
    const txt = document.body.innerText
    const m = txt.match(/◆ GLASS BOX CERTIFICATE[^\n]*/)
    return m ? m[0] : null
  })

const readActiveTierLabel = (page) =>
  page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[aria-current="true"]')]
    return btns.map((b) => b.textContent.trim())
  })

const bodyText = (page) => page.evaluate(() => document.body.innerText)

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
  const consoleErrors = []
  page.on('pageerror', (e) => consoleErrors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(600)

  // ── Enter the game ──────────────────────────────────────────────────────
  const enteredOk = await clickButtonWithText(page, 'ENTER THE ASSAY LINE')
  if (!enteredOk) throw new Error('Could not find/click ENTER THE ASSAY LINE button')
  await wait(400)

  // ── Select Heavy Floor (flooded tier, TIER_DISPLAY_LABEL.flooded) ───────
  const selectedHeavy = await clickButtonWithText(page, 'Heavy Floor')
  if (!selectedHeavy) throw new Error('Could not find/click "Heavy Floor" tier row')
  await wait(300)
  await page.screenshot({ path: `${OUT}/01-planning-heavy-selected.png` })

  // ── Paint an 8-tile trail (MIN_TRAIL=8) via the keyboard-accessible board ──
  const canvasHandle = await page.$('canvas[role="application"]')
  if (!canvasHandle) throw new Error('Could not find the board canvas (role=application)')
  await canvasHandle.focus()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Space')
    await wait(40)
    if (i < 7) {
      await page.keyboard.press('ArrowRight')
      await wait(40)
    }
  }
  await wait(200)
  await page.screenshot({ path: `${OUT}/02-planning-trail-painted.png` })

  const trailLenText = await bodyText(page)
  console.log('--- body text after painting trail (trimmed) ---')
  console.log(trailLenText.split('\n').filter((l) => /\/\s*\d+|LINE|BOX/i.test(l)).slice(0, 10).join(' | '))

  // ── Plunge (BreakerLever aria-label) ────────────────────────────────────
  const breaker = await page.$('button[aria-label*="Run the line"]')
  if (!breaker) throw new Error('Could not find the BREAKER lever button')
  await breaker.click()

  // ── Wait for settle ──────────────────────────────────────────────────────
  let settled = false
  for (let i = 0; i < 150; i++) {
    await wait(200)
    const txt = await bodyText(page)
    if (txt.includes('GLASS BOX CERTIFICATE')) { settled = true; break }
  }
  if (!settled) throw new Error('Round did not settle within timeout')
  await wait(300)

  const certAtSettle = await readCertificate(page)
  const certAtSettleFromBody = await readCertificateFromBodyText(page)
  const activeTierAtSettle = await readActiveTierLabel(page)
  await page.screenshot({ path: `${OUT}/03-settled-heavy.png`, fullPage: true })

  console.log('=== MOMENT 1: settled screen, cert right after Heavy-floor round ===')
  console.log('Certificate text (leaf-element method):', certAtSettle)
  console.log('Certificate text (body-innerText regex method):', certAtSettleFromBody)
  console.log('Active tier row(s) at settle:', activeTierAtSettle)

  results.probe7.certificateText = certAtSettleFromBody
  results.probe8.certAtSettle = certAtSettleFromBody
  results.probe8.activeTierAtSettle = activeTierAtSettle

  // ── HIGH #7 checks: does the cert literally name a floor? ───────────────
  const namedFloorRegex = /GLASS BOX CERTIFICATE\s*·\s*(Lean Floor|Standard Floor|Heavy Floor)\s*·\s*(\d+)\s*cracked boxes in\s*(\d+)×(\d+)/
  const m7 = certAtSettleFromBody ? certAtSettleFromBody.match(namedFloorRegex) : null
  results.probe7.regexMatch = m7 ? { tierLabel: m7[1], bombCount: Number(m7[2]), gridA: Number(m7[3]), gridB: Number(m7[4]) } : null
  results.probe7.verdict = m7 ? 'CLOSED' : 'OPEN'

  // Sanity cross-check against assayMath TIERS (flooded/Heavy = bombCount 8, 10x10 grid)
  if (m7) {
    results.sanity.expectedHeavyBombCount = 8
    results.sanity.actualBombCount = m7[2] ? Number(m7[2]) : null
    results.sanity.bombCountMatches = Number(m7[2]) === 8
    results.sanity.gridMatches = Number(m7[3]) === 10 && Number(m7[4]) === 10
  }

  // ── HIGH #8 repro: tap a DIFFERENT tier on the rail WHILE still settled ──
  const switchedOk = await clickButtonWithText(page, 'Lean Floor')
  results.probe8.switchClickReturnedTrue = switchedOk
  await wait(400)

  const certAfterSwitch = await readCertificate(page)
  const certAfterSwitchFromBody = await readCertificateFromBodyText(page)
  const activeTierAfterSwitch = await readActiveTierLabel(page)
  await page.screenshot({ path: `${OUT}/04-settled-after-lean-tap.png`, fullPage: true })

  console.log('=== MOMENT 2: same settled screen, AFTER tapping Lean Floor on the rail ===')
  console.log('Certificate text (leaf-element method):', certAfterSwitch)
  console.log('Certificate text (body-innerText regex method):', certAfterSwitchFromBody)
  console.log('Active tier row(s) after tap:', activeTierAfterSwitch)

  results.probe8.certAfterSwitch = certAfterSwitchFromBody
  results.probe8.activeTierAfterSwitch = activeTierAfterSwitch
  results.probe8.certificateUnchanged = certAtSettleFromBody === certAfterSwitchFromBody
  results.probe8.railVisiblyDidChange = JSON.stringify(activeTierAtSettle) !== JSON.stringify(activeTierAfterSwitch)
  results.probe8.verdict = (results.probe8.certificateUnchanged && switchedOk && results.probe8.railVisiblyDidChange) ? 'CLOSED' : 'OPEN'

  // Bonus: also confirm the still-settled body text does NOT now say "Lean Floor"
  // anywhere in the certificate line specifically (belt-and-suspenders check —
  // catches a bug where a DIFFERENT div elsewhere on the settled page also says
  // "Lean Floor" and could produce a false 'unchanged' if our selector grabbed
  // the wrong node).
  const certMentionsLeanAfterSwitch = certAfterSwitchFromBody ? certAfterSwitchFromBody.includes('· Lean Floor ·') : null
  results.probe8.certMentionsLeanAfterSwitch = certMentionsLeanAfterSwitch

  console.log('\n=== console/page errors captured during run ===')
  console.log(consoleErrors.length ? consoleErrors : '(none)')
  results.consoleErrors = consoleErrors

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log('\n=== FULL RESULTS ===')
  console.log(JSON.stringify(results, null, 2))

  await browser.close()
}

main().catch((e) => {
  console.error('PROBE FAILED:', e)
  process.exit(1)
})
