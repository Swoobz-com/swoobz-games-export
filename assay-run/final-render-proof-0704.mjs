// Final render-proof pass: desktop 1920, plus a full played round (Lean floor,
// low bomb count) captured through to settlement, on both desktop and one
// mobile device, to see the Glass Box certificate + coin reveal + hero pop.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-consolidated-0704'
fs.mkdirSync(OUT, { recursive: true })
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

async function playRound(page, { tiles = 8 } = {}) {
  await tapText(page, 'Lean')
  await wait(150)
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top, w: cr.width }
  })
  const dim = 10
  const tileCss = geo.w / dim
  for (let i = 0; i < tiles; i++) {
    const col = i % dim
    const row = Math.floor(i / dim)
    await page.mouse.click(geo.left + col * tileCss + tileCss / 2, geo.top + row * tileCss + tileCss / 2)
    await wait(30)
  }
  await tapText(page, 'RUN THE LINE')
  // Poll for settlement up to 6s.
  for (let i = 0; i < 40; i++) {
    const settled = await page.evaluate(() =>
      !!document.body.innerText.match(/LINE SECURED|CRACKED BOX · BUSTED/),
    )
    if (settled) break
    await wait(150)
  }
  await wait(300)
}

async function desktopPass() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)
  await page.screenshot({ path: `${OUT}/desktop1920-00-lobby.png` })

  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  await page.screenshot({ path: `${OUT}/desktop1920-01-planning.png` })

  await playRound(page, { tiles: 8 })
  await page.screenshot({ path: `${OUT}/desktop1920-02-settled.png` })
  const outcomeText = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(
      (d) => d.textContent && d.textContent.includes('GLASS BOX CERTIFICATE'),
    )
    return el ? el.textContent : null
  })
  console.log('Certificate text:', outcomeText)

  // Focus-visible check: tab to a TierRow-equivalent control and screenshot.
  await tapText(page, 'ASSAY AGAIN')
  await wait(300)
  // Tab into the page and screenshot to visually confirm focus rings.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await wait(100)
  await page.screenshot({ path: `${OUT}/desktop1920-03-focus-tabbed.png` })

  await browser.close()
}

await desktopPass()
console.log('done')
