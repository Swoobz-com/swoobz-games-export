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
const bodyText = () => page.evaluate(() => document.body.innerText)
await clickText('ENTER THE ASSAY LINE')
await new Promise(r=>setTimeout(r,150))
const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const tile = box.w/32
for (let col=0; col<8; col++) await page.mouse.click(box.x+col*tile+tile/2, box.y+tile/2)
await new Promise(r=>setTimeout(r,60))
const pace = await bodyText()
if (pace.includes('PACE: INSTANT')) { await clickText('PACE:'); await new Promise(r=>setTimeout(r,50)) } // ensure BEAD (staggered) so coin flies are visible longer / one at a time
await clickText('PLUNGE')
await new Promise(r=>setTimeout(r,180))
await page.screenshot({path:'shots-pulse-effects/coinfly-inflight.png'})
await browser.close()
