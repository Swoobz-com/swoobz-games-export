import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await wait(500)
await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await clickText(page, 'button[aria-label]') // no-op
const dismiss = await page.evaluateHandle(() => document.querySelector('button[aria-label="Dismiss how-to-play tip"]'))
const delEl = dismiss.asElement()
if (delEl) await delEl.click()
await wait(150)
await clickText(page, 'Heavy Floor')
await wait(200)
const board = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const tile = board.w/10
await page.mouse.move(board.x+tile*0.5, board.y+tile*0.5)
await page.mouse.down()
for (let i=0;i<30;i++){ const col=i%10, row=Math.floor(i/10); await page.mouse.move(board.x+tile*(col+0.5), board.y+tile*(row+0.5),{steps:2}); await wait(10)}
await page.mouse.up()
await wait(200)
await clickText(page, 'RUN THE LINE')
await wait(4500)
const certRect = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('div')].filter((d) => (d.textContent||'').includes('SUN-STONE RECKONING'))
  const el = rows[rows.length-1]
  const r = el.getBoundingClientRect()
  return {x:r.x,y:r.y,w:r.width,h:r.height, text: el.textContent}
})
console.log('certRect', certRect)
await page.screenshot({ path: 'shots-aztec-visreg-0704/_crop-seal-live.png', clip: { x: Math.max(0,certRect.x-40), y: Math.max(0,certRect.y-40), width: 560, height: 100 } })
await browser.close()
