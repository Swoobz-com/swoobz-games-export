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

for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Tab')
  const info = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el ? el.tagName : null,
      isBody: el === document.body,
      text: el ? (el.textContent || '').slice(0, 30) : null,
      ariaLabel: el ? el.getAttribute('aria-label') : null,
      tabIndexAttr: el ? el.getAttribute('tabindex') : null,
      outerHTMLSnippet: el ? el.outerHTML.slice(0, 150) : null,
    }
  })
  console.log(`Tab ${i + 1}:`, JSON.stringify(info))
}
await browser.close()
