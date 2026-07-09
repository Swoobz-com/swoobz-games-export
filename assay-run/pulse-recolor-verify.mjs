import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5183/'
const OUT = 'shots-pulse-recolor'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: 'new',
  defaultViewport: null,
})

const errors = []

async function newPage(viewport) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${JSON.stringify(viewport)}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`CONSOLE.ERROR ${JSON.stringify(viewport)}: ${m.text()}`)
  })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  return page
}

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

const canvasBox = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })

async function paintSerpentine(page, n, box) {
  const tile = box.w / 32
  let count = 0
  for (let row = 0; row < 32 && count < n; row++) {
    const cols = row % 2 === 0 ? [...Array(32).keys()] : [...Array(32).keys()].reverse()
    for (const col of cols) {
      if (count >= n) break
      const x = box.x + col * tile + tile / 2
      const y = box.y + row * tile + tile / 2
      await page.mouse.click(x, y)
      count++
    }
  }
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

// ── DESKTOP 1440x900 ────────────────────────────────────────────────────────
{
  const page = await newPage({ width: 1440, height: 900 })
  await shot(page, 'desktop1440-lobby')
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(200)
  await shot(page, 'desktop1440-planning-empty')
  const box = await canvasBox(page)
  await paintSerpentine(page, 8, box)
  await wait(250)
  await shot(page, 'desktop1440-planning-pinned')
  // Set pace to instant for a fast settle capture
  await clickText(page, 'PACE:')
  await wait(150)
  await clickText(page, 'PLUNGE')
  await wait(150)
  await shot(page, 'desktop1440-assaying')
  await wait(1500)
  await shot(page, 'desktop1440-settled')
  await page.close()
}

// ── DESKTOP 1920x1080 ────────────────────────────────────────────────────────
{
  const page = await newPage({ width: 1920, height: 1080 })
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(200)
  const box = await canvasBox(page)
  await paintSerpentine(page, 8, box)
  await wait(200)
  await shot(page, 'desktop1920-planning-pinned')
  await clickText(page, 'PLUNGE')
  await wait(2000)
  await shot(page, 'desktop1920-settled')
  await page.close()
}

// ── MOBILE 390x844 (iPhone 14 Pro) ──────────────────────────────────────────
{
  const page = await newPage({ width: 390, height: 844 })
  await shot(page, 'mobile390-lobby')
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(200)
  await shot(page, 'mobile390-planning')
  await page.close()
}

// ── MOBILE 412x915 (Pixel 7) ─────────────────────────────────────────────────
{
  const page = await newPage({ width: 412, height: 915 })
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(200)
  const box = await canvasBox(page)
  // Mobile is pan-only fixed tile size; tap within the visible viewport window
  await page.mouse.click(box.x + 40, box.y + 40)
  await page.mouse.click(box.x + 90, box.y + 40)
  await page.mouse.click(box.x + 140, box.y + 40)
  await wait(200)
  await shot(page, 'mobile412-planning-pinned')
  await page.close()
}

// ── BUST capture (force a loss) — retry loop up to N attempts on desktop ────
{
  const page = await newPage({ width: 1440, height: 900 })
  let busted = false
  for (let attempt = 0; attempt < 25 && !busted; attempt++) {
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(120)
    const box = await canvasBox(page)
    if (!box) break
    await paintSerpentine(page, 8, box)
    await wait(120)
    await clickText(page, 'PLUNGE')
    await wait(700)
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('BAD VEIN')) {
      busted = true
      await shot(page, 'desktop1440-bad-vein-punch')
      await wait(600)
      await shot(page, 'desktop1440-settled-loss')
    } else if (txt.includes('CLAIM PROVEN')) {
      await shot(page, `desktop1440-settled-win-attempt${attempt}`)
      await clickText(page, 'ASSAY AGAIN')
      await wait(200)
    }
  }
  console.log('busted:', busted)
  await page.close()
}

console.log('ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
