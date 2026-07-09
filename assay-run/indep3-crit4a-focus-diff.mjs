// PASS-3 independent re-verify — CRIT #4(a): TierRow / TierChip / RUN THE LINE
// (BreakerLever) real visible focus ring via focused-vs-blurred PIXEL DIFF,
// not getComputedStyle alone (this exact codebase has twice produced
// "computed style says outline:solid" while zero pixels actually changed).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import { PNG } from 'pngjs'

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

function diffPngs(bufA, bufB) {
  const a = PNG.sync.read(Buffer.from(bufA))
  const b = PNG.sync.read(Buffer.from(bufB))
  if (a.width !== b.width || a.height !== b.height) return { changed: -1, total: -1, note: 'size mismatch' }
  let changed = 0
  const total = a.width * a.height
  for (let i = 0; i < a.data.length; i += 4) {
    const dr = Math.abs(a.data[i] - b.data[i])
    const dg = Math.abs(a.data[i + 1] - b.data[i + 1])
    const db = Math.abs(a.data[i + 2] - b.data[i + 2])
    if (dr + dg + db > 12) changed++ // small per-channel tolerance for JPEG/AA noise
  }
  return { changed, total, pct: (changed / total) * 100 }
}

async function focusBlurDiff(page, label, findFn, outPrefix) {
  const found = await findFn(page)
  if (!found) {
    console.log(`[${label}] FAILED to focus target`)
    return null
  }
  const rect = await page.evaluate(() => {
    const el = document.activeElement
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height, tag: el.tagName, aria: el.getAttribute('aria-label'), text: el.textContent?.slice(0, 60) }
  })
  const margin = 12
  const clip = {
    x: Math.max(0, Math.round(rect.left - margin)),
    y: Math.max(0, Math.round(rect.top - margin)),
    width: Math.round(rect.width + margin * 2),
    height: Math.round(rect.height + margin * 2),
  }
  const focusedBuf = await page.screenshot({ clip })
  fs.writeFileSync(`${OUT}/${outPrefix}-FOCUSED.png`, focusedBuf)

  // Blur by focusing body via a real Tab-away is unreliable across elements;
  // use el.blur() directly (still a real DOM blur -> triggers onBlur handlers
  // -> hasFocus state flips for the canvas-overlay case; for CSS
  // :focus-visible buttons this is the standard way to leave focus).
  await page.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur() })
  await wait(150)
  const blurredBuf = await page.screenshot({ clip })
  fs.writeFileSync(`${OUT}/${outPrefix}-BLURRED.png`, blurredBuf)

  const diff = diffPngs(focusedBuf, blurredBuf)
  console.log(`[${label}] rect=${JSON.stringify(rect)} clip=${JSON.stringify(clip)} diff=${JSON.stringify(diff)}`)
  return { rect, clip, diff }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })

// ---- DESKTOP 1440x900 (TierRow + BreakerLever) ----
{
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  // Focus the first TierRow ("Lean Floor") via Tab from top of doc.
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => document.activeElement && document.activeElement.textContent)
    if (info && info.includes('Lean Floor')) break
  }
  await focusBlurDiff(page, 'DESKTOP TierRow (Lean Floor)', async () => true, 'desktop-tierrow-lean')

  // Mark 9 boxes via canvas keyboard so RUN THE LINE becomes armed+focusable, then Tab to it.
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
    if (tag === 'CANVAS') break
  }
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('ArrowRight')
    await wait(30)
    await page.keyboard.press('Space')
    await wait(60)
  }
  let reachedRun = false
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const aria = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))
    if (aria && aria.toLowerCase().includes('run the line')) { reachedRun = true; break }
  }
  console.log('DESKTOP reached RUN THE LINE:', reachedRun)
  await focusBlurDiff(page, 'DESKTOP RUN THE LINE (BreakerLever)', async () => true, 'desktop-runtheline')

  await page.close()
}

// ---- MOBILE 393x852 (iPhone 14 Pro) — TierChip + RUN THE LINE ----
{
  const page = await browser.newPage()
  await page.setViewport({ width: 393, height: 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER')
  await wait(500)

  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))
    if (info && info.includes('Lean')) break
  }
  await focusBlurDiff(page, 'MOBILE TierChip (Lean)', async () => true, 'mobile-tierchip-lean')

  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
    if (tag === 'CANVAS') break
  }
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press('ArrowRight')
    await wait(30)
    await page.keyboard.press('Space')
    await wait(60)
  }
  let reachedRunM = false
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const aria = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'))
    if (aria && aria.toLowerCase().includes('run the line')) { reachedRunM = true; break }
  }
  console.log('MOBILE reached RUN THE LINE:', reachedRunM)
  await focusBlurDiff(page, 'MOBILE RUN THE LINE (BreakerLever)', async () => true, 'mobile-runtheline')

  await page.close()
}

await browser.close()
