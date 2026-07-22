// INDEPENDENT verifier driver — swoobz-accessibility-qa fibgate.
// Fresh, own script (not reused from the maker). Verifies the RUGS mine-count
// stepper 44x44 hit-target fix on a live, freshly-restarted dev server.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const OUT = '_indep-verify-rugsstepper-0709'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--window-size=1500,1000'],
    defaultViewport: { width: 1440, height: 900 },
  })
  const page = await browser.newPage()
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(800)

  // Confirm we're on a phase that shows the RugsTuner (BetEntry, mode with a
  // RUG_BANDS entry — bluechips is the default first mode option).
  const phase = await page.evaluate(() => {
    const el = document.querySelector('[data-testid^="vault-betentry-"]') ||
      document.querySelector('[data-testid^="vault-lobby-"]')
    return el ? el.getAttribute('data-testid') : 'UNKNOWN:' + document.body.innerText.slice(0, 200)
  })
  console.log('phase probe:', phase)

  await page.screenshot({ path: `${OUT}/01-initial.png` })

  // Locate the stepper buttons by their accessible name (aria-label).
  const findBtn = async (label) => {
    return page.evaluateHandle((lbl) => {
      const btns = Array.from(document.querySelectorAll('button[aria-label]'))
      return btns.find((b) => b.getAttribute('aria-label') === lbl) || null
    }, label)
  }

  let minusBtn = await findBtn('Fewer rugs')
  let plusBtn = await findBtn('More rugs')

  const minusExists = await page.evaluate((el) => !!el, minusBtn)
  const plusExists = await page.evaluate((el) => !!el, plusBtn)
  console.log('minusBtn found:', minusExists, 'plusBtn found:', plusExists)

  if (!minusExists || !plusExists) {
    console.log('RUGS stepper not found on initial phase — dumping visible mode/testids')
    const dump = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid')).slice(0, 60)
    })
    console.log(JSON.stringify(dump))
    await browser.close()
    return
  }

  // ---- 1. Measure the ACTUAL clickable element (the wrapper <button>) ----
  const measure = async (handle, label) => {
    const rect = await page.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom }
    }, handle)
    const tag = await page.evaluate((el) => el.tagName, handle)
    const outerHTML = await page.evaluate((el) => el.outerHTML.slice(0, 300), handle)
    console.log(`[${label}] tag=${tag} rect=`, JSON.stringify(rect))
    console.log(`[${label}] outerHTML snippet:`, outerHTML)
    return rect
  }

  let minusRect = await measure(minusBtn, 'minus (enabled, wrapper button)')
  let plusRect = await measure(plusBtn, 'plus (enabled, wrapper button)')

  // ---- 2. Verify this wrapper is what ACTUALLY receives the click (not just styled 44x44 with a dead handler) ----
  // Read initial count text, click plus, confirm the value changed.
  const readCount = async () => page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'))
    const valSpan = spans.find((s) => /^\d+\s/.test(s.textContent || '') && s.querySelector('span'))
    return valSpan ? valSpan.textContent.trim() : null
  })
  const before = await readCount()
  // Click via real mouse coords at the CENTER of the measured wrapper rect (not el.click()) — proves the geometry itself is clickable, not just the JS handler.
  const plusCenterX = plusRect.x + plusRect.width / 2
  const plusCenterY = plusRect.y + plusRect.height / 2
  await page.mouse.click(plusCenterX, plusCenterY)
  await wait(200)
  const after = await readCount()
  console.log('count before click:', before, '-> after center-click on wrapper rect:', after)

  // ---- 3. Verify computed style of the VISIBLE swatch (inner aria-hidden span) is unchanged ----
  const swatchStyle = await page.evaluate((el) => {
    const span = el.querySelector('span[aria-hidden="true"]')
    if (!span) return null
    const cs = getComputedStyle(span)
    const r = span.getBoundingClientRect()
    return {
      background: cs.backgroundColor,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      borderRadius: cs.borderRadius,
      width: r.width,
      height: r.height,
      ariaHidden: span.getAttribute('aria-hidden'),
    }
  }, plusBtn)
  console.log('visible swatch (plus, enabled) computed style:', JSON.stringify(swatchStyle))

  const minusSwatchStyle = await page.evaluate((el) => {
    const span = el.querySelector('span[aria-hidden="true"]')
    if (!span) return null
    const cs = getComputedStyle(span)
    const r = span.getBoundingClientRect()
    return {
      background: cs.backgroundColor,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      borderRadius: cs.borderRadius,
      width: r.width,
      height: r.height,
    }
  }, minusBtn)
  console.log('visible swatch (minus, enabled) computed style:', JSON.stringify(minusSwatchStyle))

  // ---- 4. Semantics: exactly one tab stop per control, accessible name present ----
  const minusAttrs = await page.evaluate((el) => ({
    tag: el.tagName,
    ariaLabel: el.getAttribute('aria-label'),
    tabIndexInnerSpan: el.querySelector('span[aria-hidden="true"]') ? el.querySelector('span[aria-hidden="true"]').getAttribute('tabindex') : 'N/A',
    innerSpanRole: el.querySelector('span[aria-hidden="true"]') ? el.querySelector('span[aria-hidden="true"]').getAttribute('role') : 'N/A',
    childButtonCount: el.querySelectorAll('button').length,
  }), minusBtn)
  console.log('minus semantics:', JSON.stringify(minusAttrs))

  // Count how many focusable elements exist inside the stepper container total (should be exactly 2: minus + plus).
  const stepperFocusables = await page.evaluate(() => {
    const stepper = document.querySelector('button[aria-label="Fewer rugs"]')?.closest('div')
    if (!stepper) return null
    const focusables = stepper.querySelectorAll('button, [tabindex]')
    return Array.from(focusables).map((f) => ({ tag: f.tagName, ariaLabel: f.getAttribute('aria-label'), tabindex: f.getAttribute('tabindex') }))
  })
  console.log('all focusables inside stepper row container:', JSON.stringify(stepperFocusables))

  // ---- 5. Keyboard activation: tab to the minus button, press Enter/Space, confirm count changes ----
  // Focus the minus button directly and dispatch a real key event.
  await page.evaluate((el) => el.focus(), minusBtn)
  const focusedIsMinus = await page.evaluate(() => document.activeElement.getAttribute('aria-label'))
  console.log('after .focus() on minus, document.activeElement aria-label:', focusedIsMinus)
  const beforeKbd = await readCount()
  await page.keyboard.press('Enter')
  await wait(200)
  const afterKbdEnter = await readCount()
  console.log('count before kbd Enter:', beforeKbd, '-> after:', afterKbdEnter)
  await page.keyboard.press(' ')
  await wait(200)
  const afterKbdSpace = await readCount()
  console.log('count after kbd Space:', afterKbdSpace)

  // ---- 6. Focus indicator visible ----
  await page.screenshot({ path: `${OUT}/02-minus-focused.png` })
  const focusOutline = await page.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { outline: cs.outline, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow }
  }, minusBtn)
  console.log('minus button focus computed style:', JSON.stringify(focusOutline))

  // ---- 7. Drive count DOWN to min to test the disabled variant ----
  for (let i = 0; i < 20; i++) {
    const disabled = await page.evaluate((el) => el.disabled, minusBtn)
    if (disabled) break
    await page.mouse.click(minusCenter(minusRect).x, minusCenter(minusRect).y)
    await wait(80)
    // re-fetch rect each time in case of reflow (shouldn't change, but be safe)
    minusBtn = await findBtn('Fewer rugs')
    minusRect = await measure(minusBtn, `minus (iter ${i})`)
  }
  function minusCenter(r) {
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }

  const finalCount = await readCount()
  const minusDisabledNow = await page.evaluate((el) => el.disabled, minusBtn)
  console.log('final count at floor:', finalCount, 'minus.disabled:', minusDisabledNow)

  // Measure the DISABLED variant rect + swatch style.
  const minusDisabledRect = await measure(minusBtn, 'minus (DISABLED, wrapper button)')
  const minusDisabledSwatch = await page.evaluate((el) => {
    const span = el.querySelector('span[aria-hidden="true"]')
    const cs = getComputedStyle(span)
    const r = span.getBoundingClientRect()
    return { background: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, opacity: cs.opacity, width: r.width, height: r.height }
  }, minusBtn)
  console.log('minus DISABLED visible swatch computed style:', JSON.stringify(minusDisabledSwatch))

  // Try clicking the disabled wrapper at its exact center — must NOT change count.
  const countBeforeDisabledClick = await readCount()
  await page.mouse.click(minusDisabledRect.x + minusDisabledRect.width / 2, minusDisabledRect.y + minusDisabledRect.height / 2)
  await wait(150)
  const countAfterDisabledClick = await readCount()
  console.log('DISABLED click test — count before:', countBeforeDisabledClick, 'after click on disabled wrapper:', countAfterDisabledClick, '(should be UNCHANGED)')

  await page.screenshot({ path: `${OUT}/03-min-disabled.png` })

  // ---- 8. Row background contrast reference sample (for UI-component contrast) ----
  const rowBg = await page.evaluate((el) => {
    let node = el
    for (let i = 0; i < 6 && node; i++) {
      const cs = getComputedStyle(node)
      if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        return { el: node.tagName + '.' + (node.className || '').toString().slice(0, 40), bg: cs.backgroundColor }
      }
      node = node.parentElement
    }
    return null
  }, minusBtn)
  console.log('nearest ancestor opaque background (contrast reference):', JSON.stringify(rowBg))

  await browser.close()
  console.log('DONE')
}

main().catch((e) => {
  console.error('DRIVER ERROR:', e)
  process.exit(1)
})
