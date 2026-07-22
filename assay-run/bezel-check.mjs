import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}
await clickText('ENTER THE ASSAY LINE')
await new Promise(r=>setTimeout(r,200))
// Right specimen case (ASSAY TALLY, contains volt/cyan dial) close-up incl bezel ring
await page.screenshot({path:'shots-pulse-effects/right-specimen-case-zoom.png', clip:{x:1030, y:90, width:220, height:400}})
// Top-left corner bracket + lamp breathe area
await page.screenshot({path:'shots-pulse-effects/topleft-corner-zoom.png', clip:{x:440, y:38, width:200, height:120}})
await page.screenshot({path:'shots-pulse-effects/topright-corner-zoom.png', clip:{x:800, y:38, width:200, height:120}})
await browser.close()
