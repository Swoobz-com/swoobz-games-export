import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE.ERROR: ' + m.text()) })
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)
// Balance dial check (lobby, before any round)
await page.screenshot({path:'shots-pulse-effects/fix-balance-header.png', clip:{x:440,y:38,width:560,height:80}})
await clickText('ENTER THE ASSAY LINE')
await new Promise(r=>setTimeout(r,150))
let won = false
for (let attempt=0; attempt<40 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
  const tile = box.w/32
  for (let col=0; col<8; col++) await page.mouse.click(box.x+col*tile+tile/2, box.y+tile/2)
  await new Promise(r=>setTimeout(r,60))
  const pace = await bodyText()
  if (pace.includes('PACE: BEAD')) { await clickText('PACE:'); await new Promise(r=>setTimeout(r,50)) }
  await clickText('PLUNGE')
  await new Promise(r=>setTimeout(r,900))
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    await page.screenshot({path:'shots-pulse-effects/fix-hallmark-seal.png', clip:{x:900,y:640,width:120,height:80}})
    await page.screenshot({path:'shots-pulse-effects/fix-full-settled.png'})
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r=>setTimeout(r,300))
    await clickText('ASSAY AGAIN')
    await new Promise(r=>setTimeout(r,120))
  }
}
console.log('won', won, 'errors', JSON.stringify(errors))
await browser.close()
