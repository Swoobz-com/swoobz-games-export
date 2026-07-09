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
await page.evaluate(() => document.activeElement && document.activeElement.blur())
for (let i = 0; i < 30; i++) {
  await page.keyboard.press('Tab')
  const t = await page.evaluate(() => document.activeElement.textContent)
  if (t && t.includes('Lean Floor')) break
}
const ancestors = await page.evaluate(() => {
  const el = document.activeElement
  const out = []
  let p = el.parentElement
  while (p) {
    const cs = getComputedStyle(p)
    out.push({ tag: p.tagName, cls: p.className, overflow: cs.overflow, overflowX: cs.overflowX, overflowY: cs.overflowY })
    p = p.parentElement
  }
  return out
})
console.log('TierRow ancestor overflow chain:', JSON.stringify(ancestors, null, 1))
await browser.close()
