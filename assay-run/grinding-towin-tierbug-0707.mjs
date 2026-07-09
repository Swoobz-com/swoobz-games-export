// Isolated verification: does the pre-commit "TO WIN" hero (potentialBps in
// AssayExperience.tsx ~L592) correctly use the SELECTED tier's ladder, or
// does it silently default to Standard's ladder regardless of selection?
import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, txt) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
    if (b && !b.disabled) { b.click(); return true }
    return false
  }, txt)
}
async function bodyText(page) { return page.evaluate(() => document.body.innerText) }
async function getCanvasBox(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
}
async function paintTiles(page, n) {
  const box = await getCanvasBox(page)
  const dim = 14
  const tile = box.w / dim
  const coords = []
  let count = 0
  for (let row = 0; row < dim && count < n; row++) for (let col = 0; col < dim && count < n; col++) { coords.push([row, col]); count++ }
  for (const [row, col] of coords) { await page.mouse.click(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2); await wait(6) }
}
async function selectTierConfirmed(page, label) {
  for (let i = 0; i < 5; i++) {
    const active = await page.evaluate((lab) => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(lab))
      return btn ? btn.getAttribute('aria-current') : null
    }, label)
    if (active === 'true') return true
    await clickText(page, label)
    await wait(80)
  }
  return false
}
async function readToWinHero(page) {
  return page.evaluate(() => {
    const labelDiv = [...document.querySelectorAll('div')].find((d) => d.children.length === 0 && d.textContent === 'TO WIN')
    if (!labelDiv || !labelDiv.parentElement) return null
    const row = labelDiv.parentElement.children[1]
    return row ? { amount: row.children[0]?.textContent, mult: row.children[1]?.textContent } : null
  })
}
async function readTierCeilings(page) {
  return page.evaluate(() => {
    const labels = ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH']
    return labels.map((lab) => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(lab))
      return btn ? btn.textContent : null
    })
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await wait(200)
if ((await bodyText(page)).includes('ENTER THE DIVE')) { await clickText(page, 'ENTER THE DIVE'); await wait(150) }

console.log('Tier ceilings (static DIVE DEPTH row, should differ per tier):')
console.log(JSON.stringify(await readTierCeilings(page), null, 2))

for (const tier of ['REEF SHELF', 'MIDNIGHT ZONE', 'HADAL TRENCH']) {
  await clickText(page, 'CLEAR'); await wait(40)
  const confirmed = await selectTierConfirmed(page, tier)
  await paintTiles(page, 8)
  await wait(100)
  const toWin = await readToWinHero(page)
  console.log(`tier=${tier} (aria-current confirmed=${confirmed}), trail=8 -> TO WIN hero reads:`, JSON.stringify(toWin))
}

await browser.close()
