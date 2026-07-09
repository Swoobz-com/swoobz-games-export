import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 } })
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
const box = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
const tile = box.w / 32
for (let col = 0; col < 8; col++) await page.mouse.click(box.x + col * tile + tile / 2, box.y + tile / 2)
await new Promise(r => setTimeout(r, 40))
const pace = await bodyText()
if (pace.includes('PACE: BEAD')) { await clickText('PACE:'); await new Promise(r => setTimeout(r, 30)) }
await clickText('PLUNGE')
await new Promise(r => setTimeout(r, 270))
const dbg = await page.evaluate(() => {
  const bezels = [...document.querySelectorAll('div')].filter(d => {
    const cs = getComputedStyle(d)
    return (cs.borderTopWidth === '3px')
  })
  return { count: bezels.length, samples: bezels.slice(0,4).map(d => ({ btc: getComputedStyle(d).borderTopColor, w: d.offsetWidth, h: d.offsetHeight })), fullTxt: document.body.innerText, innerWidth: window.innerWidth, hasCase1: document.body.innerText.includes('SPECIMEN CASE') || document.body.innerText.includes('No. I') }
})
console.log(JSON.stringify(dbg, null, 2))
await page.screenshot({ path: 'shots-brandqa-0703/debug-t270.png' })
await browser.close()
