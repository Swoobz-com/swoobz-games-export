import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5399/', { waitUntil: 'networkidle0' })
const clickText = async (txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)
const bodyText = () => page.evaluate(() => document.body.innerText)
await clickText('ENTER THE ASSAY LINE')
await new Promise(r => setTimeout(r, 150))
let won = false
for (let attempt = 0; attempt < 60 && !won; attempt++) {
  await clickText('CLEAR')
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const tile = box.w / 32
  for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
  await new Promise(r => setTimeout(r, 40))
  await clickText('PLUNGE')
  await new Promise(r => setTimeout(r, 1200))
  const txt = await bodyText()
  if (txt.includes('CLAIM PROVEN')) {
    won = true
    const fonts = await page.evaluate(() => {
      const leaf = [...document.querySelectorAll('*')].filter(el => {
        const t = el.textContent?.trim() || ''
        return el.children.length === 0 && /[0-9]/.test(t) && t.length > 0 && t.length < 40
      })
      return leaf.map(el => ({ text: el.textContent.trim(), font: getComputedStyle(el).fontFamily }))
    })
    console.log(JSON.stringify(fonts, null, 2))
  } else {
    await new Promise(r => setTimeout(r, 150))
    await clickText('ASSAY AGAIN')
    await new Promise(r => setTimeout(r, 80))
  }
}
await browser.close()
