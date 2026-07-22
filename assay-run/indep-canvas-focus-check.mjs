import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(400)

// Tab to canvas via real keyboard.
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const isCanvas = await page.evaluate(() => document.activeElement && document.activeElement.tagName === 'CANVAS')
  if (isCanvas) break
}
const check = await page.evaluate(() => {
  const c = document.activeElement
  const cs = getComputedStyle(c)
  // Walk ancestors checking for overflow:hidden that could clip an outline.
  const overflowAncestors = []
  let p = c.parentElement
  while (p) {
    const pcs = getComputedStyle(p)
    if (pcs.overflow === 'hidden' || pcs.overflowX === 'hidden' || pcs.overflowY === 'hidden') {
      overflowAncestors.push({ tag: p.tagName, cls: p.className, overflow: pcs.overflow, overflowX: pcs.overflowX, overflowY: pcs.overflowY, rect: p.getBoundingClientRect() })
    }
    p = p.parentElement
  }
  const r = c.getBoundingClientRect()
  return {
    isCanvas: c.tagName === 'CANVAS',
    outlineStyle: cs.outlineStyle,
    outlineColor: cs.outlineColor,
    outlineWidth: cs.outlineWidth,
    outlineOffset: cs.outlineOffset,
    matchesFocusVisible: c.matches(':focus-visible'),
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    overflowAncestors,
  }
})
console.log('CANVAS FOCUS COMPUTED STYLE + OVERFLOW ANCESTORS:', JSON.stringify(check, null, 2))

// Wide screenshot around canvas + full page for visual confirmation.
await page.screenshot({ path: `${OUT}/desktop-canvas-focus-widecrop.png`, clip: { x: Math.max(0, check.rect.left - 60), y: Math.max(0, check.rect.top - 60), width: check.rect.width + 120, height: check.rect.height + 120 } })
await page.screenshot({ path: `${OUT}/desktop-canvas-focus-fullpage.png` })

await browser.close()
