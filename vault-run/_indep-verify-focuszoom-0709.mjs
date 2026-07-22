import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 5281
const OUT = '_indep-verify-rugsstepper-0709'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--window-size=1500,1000'],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 3 },
  })
  const page = await browser.newPage()
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(800)

  // Real keyboard tab-walk from body to find and land on the minus button,
  // so :focus-visible triggers exactly as it would for a real keyboard user
  // (not a scripted .focus() call, which can suppress focus-visible heuristics).
  await page.click('body')
  let found = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    await wait(60)
    const label = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('aria-label'))
    if (label === 'Fewer rugs') { found = true; console.log('Reached "Fewer rugs" via Tab at step', i + 1); break }
  }
  if (!found) { console.log('Could not reach Fewer rugs via Tab walk within 40 tabs'); }

  const rect = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[aria-label]'))
    const b = btns.find((x) => x.getAttribute('aria-label') === 'Fewer rugs')
    const r = b.getBoundingClientRect()
    const cs = getComputedStyle(b)
    return { x: r.x, y: r.y, width: r.width, height: r.height, outline: cs.outline, outlineOffset: cs.outlineOffset, boxShadow: cs.boxShadow }
  })
  console.log('minus button rect + focus style (via real Tab):', JSON.stringify(rect))

  const pad = 30
  await page.screenshot({
    path: `${OUT}/04-focus-zoom-realtab.png`,
    clip: { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.width + pad * 2, height: rect.height + pad * 2 },
  })

  // Also capture unfocused baseline for diff comparison (blur then screenshot same region)
  await page.evaluate(() => document.activeElement && document.activeElement.blur())
  await wait(150)
  await page.screenshot({
    path: `${OUT}/05-unfocused-zoom.png`,
    clip: { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.width + pad * 2, height: rect.height + pad * 2 },
  })

  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
