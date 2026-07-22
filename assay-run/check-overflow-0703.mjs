import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5501/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
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
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(400)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)

const info = await page.evaluate(() => {
  const de = document.documentElement
  const balance = [...document.querySelectorAll('div')].find(d => d.textContent === 'BALANCE')
  const balanceValueDiv = balance ? balance.parentElement : null
  return {
    scrollWidth: de.scrollWidth,
    innerWidth: window.innerWidth,
    hasHScroll: de.scrollWidth > window.innerWidth,
    balanceRect: balanceValueDiv ? balanceValueDiv.getBoundingClientRect().toJSON() : null,
    bodyScrollWidth: document.body.scrollWidth,
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/fresh-header-390.png' })
await browser.close()
process.exit(0)
