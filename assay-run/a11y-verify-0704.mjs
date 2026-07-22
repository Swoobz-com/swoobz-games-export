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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(400)

// 1. Canvas aria attributes
const canvasA11y = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return { role: c.getAttribute('role'), ariaLabel: c.getAttribute('aria-label'), tabIndex: c.tabIndex }
})
console.log('CANVAS A11Y:', JSON.stringify(canvasA11y))

// 2. aria-live region present
const liveRegion = await page.evaluate(() => {
  const el = document.querySelector('[aria-live="polite"]')
  return el ? { text: el.textContent, atomic: el.getAttribute('aria-atomic') } : null
})
console.log('LIVE REGION:', JSON.stringify(liveRegion))

// 3. Keyboard board paint: focus canvas, press ArrowRight x2, ArrowDown x1, Space, check trail length via status text
await page.evaluate(() => document.querySelector('canvas').focus())
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowRight')
await page.keyboard.press('ArrowDown')
await page.keyboard.press(' ')
await wait(150)
const afterSpace = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find((d) => d.textContent && d.textContent.includes('to arm the key'))
  return el ? el.textContent : document.body.innerText.slice(0, 400)
})
console.log('AFTER KEYBOARD PAINT:', afterSpace)

// Screenshot showing the keyboard cursor + the marked box.
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-consolidated-0704/desktop-kbd-cursor.png' })

// 4. TierRow contrast check via getComputedStyle + manual luminance calc for the active row's text vs background.
const contrast = await page.evaluate(() => {
  function luminance(r, g, b) {
    const a = [r, g, b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
  }
  function parseRgb(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    return m ? [+m[1], +m[2], +m[3]] : [0, 0, 0]
  }
  const btns = [...document.querySelectorAll('button')]
  const activeRow = btns.find((b) => b.getAttribute('aria-current') === 'true')
  if (!activeRow) return null
  const span = activeRow.querySelector('span')
  const textColor = parseRgb(getComputedStyle(span).color)
  // Composite background: walk up and take the first non-transparent bg, approximated by reading the button's own computed background (it's a gradient over COAL solid, so sample the button itself via a temp canvas).
  const rect = activeRow.getBoundingClientRect()
  return { textColor, rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height } }
})
console.log('ACTIVE TIER CONTRAST INPUT:', JSON.stringify(contrast))

await browser.close()
