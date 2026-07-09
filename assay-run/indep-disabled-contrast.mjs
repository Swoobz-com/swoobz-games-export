import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
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

// RUN THE LINE disabled state (0 boxes painted) — check it's not disabled via
// color-alone (i.e. some non-color affordance too), and grab a screenshot.
const disabledInfo = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('RUN THE LINE'))
  const cs = getComputedStyle(b)
  return { disabled: b.disabled, opacity: cs.opacity, cursor: cs.cursor, background: cs.background.slice(0, 80) }
})
console.log('RUN THE LINE (0 boxes, should be disabled):', JSON.stringify(disabledInfo))
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704/disabled-breakerlever-0box.png', clip: (() => null)() || undefined })

// Coachmark dismiss button hit target size + a check for a min-height-40 catalog item, since 32x32 < the 40px floor used elsewhere in this file.
await page.evaluate(() => window.localStorage.removeItem('assay_coachmark_seen_v1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(300)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(400)
const dismissSize = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
  if (!b) return null
  const r = b.getBoundingClientRect()
  return { width: r.width, height: r.height }
})
console.log('COACHMARK DISMISS BUTTON HIT SIZE:', JSON.stringify(dismissSize))

await browser.close()
