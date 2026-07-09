import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5186/'
const OUT = 'shots-vault-pivot-0704'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const errors = []

async function run(viewport, label) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    defaultViewport: viewport,
  })
  const page = (await browser.pages())[0]
  page.on('pageerror', (e) => errors.push(`${label} PAGEERROR: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${label} CONSOLE.ERROR: ${m.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await wait(400)

  // Lobby
  await page.screenshot({ path: `${OUT}/${label}-01-lobby.png` })

  // Enter -> planning
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
  await wait(300)
  await page.screenshot({ path: `${OUT}/${label}-02-planning.png` })

  // Check tier selector state + tap Flooded tier
  const tierInfo = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const tierBtns = btns.filter((b) => /Floor/.test(b.textContent || ''))
    return tierBtns.map((b) => ({ text: b.textContent, ariaCurrent: b.getAttribute('aria-current'), disabled: b.disabled }))
  })
  fs.writeFileSync(`${OUT}/${label}-tier-info-before.json`, JSON.stringify(tierInfo, null, 2))

  const clickedFlooded = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const b = btns.find((b) => /Flooded Floor/.test(b.textContent || ''))
    if (b) {
      b.click()
      return true
    }
    return false
  })
  await wait(200)
  const tierInfoAfter = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const tierBtns = btns.filter((b) => /Floor/.test(b.textContent || ''))
    return tierBtns.map((b) => ({ text: b.textContent, ariaCurrent: b.getAttribute('aria-current'), disabled: b.disabled }))
  })
  fs.writeFileSync(`${OUT}/${label}-tier-info-after.json`, JSON.stringify({ clickedFlooded, tierInfoAfter }, null, 2))
  await page.screenshot({ path: `${OUT}/${label}-03-flooded-selected.png` })

  // Paint a claim-line by dragging over the canvas, then plunge
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (canvasBox) {
    const tile = canvasBox.w / 10
    await page.mouse.move(canvasBox.x + tile * 0.5, canvasBox.y + tile * 0.5)
    await page.mouse.down()
    for (let i = 0; i < 10; i++) {
      const cx = canvasBox.x + tile * (i + 0.5)
      const cy = canvasBox.y + tile * 0.5
      await page.mouse.move(cx, cy, { steps: 2 })
      await wait(15)
    }
    await page.mouse.up()
  }
  await wait(200)
  await page.screenshot({ path: `${OUT}/${label}-04-painted.png` })

  await clickText('THROW BREAKER')
  await wait(2500)
  await page.screenshot({ path: `${OUT}/${label}-05-assaying-or-settled.png` })
  await wait(1500)
  await page.screenshot({ path: `${OUT}/${label}-06-settled.png` })

  const bodyText = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(`${OUT}/${label}-bodytext.txt`, bodyText)

  await browser.close()
}

await run({ width: 1920, height: 1080, deviceScaleFactor: 1 }, 'desktop1920')
await run({ width: 412, height: 915, deviceScaleFactor: 2 }, 'pixel7')

fs.writeFileSync(`${OUT}/errors.json`, JSON.stringify(errors, null, 2))
console.log('DONE. Errors:', errors.length)
console.log(errors.join('\n'))
