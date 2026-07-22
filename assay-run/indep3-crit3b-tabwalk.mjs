import puppeteer from 'puppeteer-core'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
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
await tapText(page, 'ENTER')
await wait(500)

// Tab to canvas first.
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab')
  const tag = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
  if (tag === 'CANVAS') break
}
// mark 5 boxes
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('ArrowRight')
  await wait(40)
  await page.keyboard.press('Space')
  await wait(80)
}

// Now walk tabs and print each focused element for up to 30 steps.
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab')
  const info = await page.evaluate(() => {
    const el = document.activeElement
    return {
      tag: el && el.tagName,
      aria: el && el.getAttribute('aria-label'),
      text: el && el.textContent && el.textContent.slice(0, 40),
      cls: el && el.className,
      disabled: el && el.disabled,
    }
  })
  console.log(i, JSON.stringify(info))
}

await browser.close()
