import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-FINAL-0704'

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

// 1. iPhone 14 Pro: coachmark should never block a tap anywhere on the board.
{
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  const before = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent && d.textContent.includes('to arm the key'))
    return el ? el.textContent : document.body.innerText.slice(0, 200)
  })
  console.log('BEFORE any tap:', before)
  // Tap a top-left board tile (the exact spot the regression hit) WITHOUT dismissing the coachmark first.
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { left: r.left, top: r.top }
  })
  await page.touchscreen.tap(geo.left + 20, geo.top + 20)
  await wait(150)
  const after = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent && d.textContent.includes('to arm the key'))
    return el ? el.textContent : document.body.innerText.slice(0, 200)
  })
  console.log('AFTER tapping a top-left tile through the still-visible coachmark:', after)
  console.log('Tap reached the board:', before !== after)
  await page.screenshot({ path: `${OUT}/coachmark-passthrough-check.png` })
}

// 2. Desktop: canvas focus ring visible via sibling overlay.
{
  const page2 = await browser.newPage()
  await page2.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page2.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await tapText(page2, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page2.screenshot({ path: `${OUT}/canvas-ring-BLURRED.png` })
  await page2.evaluate(() => document.querySelector('canvas').focus())
  await wait(150)
  await page2.screenshot({ path: `${OUT}/canvas-ring-FOCUSED.png` })
  // Confirm the overlay div actually exists and has the expected border.
  const ringInfo = await page2.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const sibling = canvas.nextElementSibling
    if (!sibling) return null
    const cs = getComputedStyle(sibling)
    return { border: cs.border, boxShadow: cs.boxShadow, display: cs.display }
  })
  console.log('Canvas ring overlay computed style:', JSON.stringify(ringInfo))
  await page2.close()
}

await browser.close()
console.log('DONE')
