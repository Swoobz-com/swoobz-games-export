import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 4 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5183/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)
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
    const sealBox = await page.evaluate(() => {
      const svgs = [...document.querySelectorAll('svg')]
      const sealSvg = svgs.find(s => s.getAttribute('viewBox') === '0 0 32 32')
      const parent = sealSvg.parentElement
      const r = parent.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    })
    await page.screenshot({path:'shots-pulse-effects/fix-hallmark-seal3.png', clip:{x:sealBox.x-8,y:sealBox.y-8,width:sealBox.w+16,height:sealBox.h+16}})
  } else if (txt.includes('BAD VEIN')) {
    await new Promise(r=>setTimeout(r,300))
    await clickText('ASSAY AGAIN')
    await new Promise(r=>setTimeout(r,120))
  }
}
console.log('won', won)
await browser.close()
