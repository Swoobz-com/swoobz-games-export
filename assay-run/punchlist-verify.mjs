import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5194/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'pixel7', width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36' },
  { name: 'iphone14pro', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, isLandscape: false, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
]

if (!fs.existsSync('shots-punchlist')) fs.mkdirSync('shots-punchlist')

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })

const click = async (page, t) => {
  await page.evaluate((tx) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(tx))
    if (b) b.click()
  }, t)
}

const consoleErrors = []

for (const vp of VIEWPORTS) {
  const page = await browser.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[${vp.name}] ${msg.text()}`)
  })
  page.on('pageerror', (err) => consoleErrors.push(`[${vp.name}] pageerror: ${err.message}`))
  await page.emulate({
    viewport: { width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch, isLandscape: vp.isLandscape },
    userAgent: vp.ua,
  })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)

  console.log(`\n=== ${vp.name} (${vp.width}x${vp.height}) ===`)

  // ── Item 5: wordmark present + unclipped ──
  const wordmark = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    const el = spans.find((s) => s.textContent.trim() === 'SWOOBZ')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, withinViewportX: r.x >= 0 && r.x + r.width <= window.innerWidth, withinViewportY: r.y >= 0 }
  })
  console.log('wordmark:', JSON.stringify(wordmark))

  // ── Lobby screenshot ──
  await page.screenshot({ path: `shots-punchlist/${vp.name}-01-lobby.png` })

  await click(page, 'ENTER THE ASSAY LINE')
  await wait(400)

  // ── Item 1: session chip + safety link (should be ABSENT before any round; safety link should be present regardless) ──
  const safetyLinkPre = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'PLAY SAFE')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { w: r.width, h: r.height, x: r.x, y: r.y }
  })
  console.log('safety link (pre-round, planning phase):', JSON.stringify(safetyLinkPre))

  // Play round 1
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width }
  })
  const tile = box.w / 32
  for (let i = 0; i < 8; i++) {
    const col = 5 + i * 3
    const row = 6 + (i % 4) * 3
    await page.touchscreen.tap(box.x + col * tile + tile / 2, box.y + row * tile + tile / 2)
    await wait(60)
  }
  await click(page, 'PLUNGE')
  await wait(3000)

  // ── Item 2: Glass Box full seed/hash ──
  const receiptText = await page.evaluate(() => {
    const divs = [...document.querySelectorAll('div')]
    const seedDiv = divs.find((d) => d.textContent.includes('seed') && d.textContent.includes('copy'))
    const hashDiv = divs.find((d) => d.textContent.includes('hash') && d.textContent.includes('copy'))
    return {
      seed: seedDiv ? seedDiv.textContent.trim() : null,
      hash: hashDiv ? hashDiv.textContent.trim() : null,
    }
  })
  console.log('receipt seed line:', receiptText.seed)
  console.log('receipt hash line:', receiptText.hash)
  const seedHexLen = receiptText.seed ? (receiptText.seed.match(/seed\s*([0-9a-f]+)/i) || [])[1]?.length : 0
  const hashHexLen = receiptText.hash ? (receiptText.hash.match(/hash\s*([0-9a-f]+)/i) || [])[1]?.length : 0
  console.log('seed hex length:', seedHexLen, '(expect 64)')
  console.log('hash hex length:', hashHexLen, '(expect 64)')

  await page.screenshot({ path: `shots-punchlist/${vp.name}-02-settled-receipt.png`, fullPage: true })

  // ── Item 1 (cont): session chip after round 1 ──
  const sessionChip = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('span')]
    const el = spans.find((s) => s.textContent.includes('SESSION ·'))
    return el ? el.textContent.trim() : null
  })
  console.log('session chip (after round 1):', sessionChip)

  // ── Item 3: ASSAY AGAIN -> round 2+ state, measure ALL planning-row buttons ──
  await click(page, 'ASSAY AGAIN')
  await wait(400)
  const btns = await page.evaluate(() => {
    const targets = ['CLEAR', 'PACE', 'SAME LINE', 'PLUNGE']
    return [...document.querySelectorAll('button')]
      .filter((b) => targets.some((t) => b.textContent.includes(t)))
      .map((b) => {
        const r = b.getBoundingClientRect()
        return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) }
      })
  })
  console.log('round-2+ planning controls (should all be >=40x40, PLUNGE single line):', JSON.stringify(btns, null, 2))
  const allPass = btns.every((b) => b.w >= 40 && b.h >= 40)
  console.log('ALL >=40x40:', allPass)
  const plungeBtn = btns.find((b) => b.text.includes('PLUNGE'))
  console.log('PLUNGE height (should be single-line, roughly 40-50px not 79+):', plungeBtn?.h)

  await page.screenshot({ path: `shots-punchlist/${vp.name}-03-round2-planning-controls.png` })

  // ── Item 1 (cont): open safety panel ──
  await click(page, 'PLAY SAFE')
  await wait(300)
  const safetyPanelVisible = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.textContent.trim().startsWith('PLAY SAFE') && d.getAttribute('role') !== null)
    return !!document.querySelector('[role="dialog"]')
  })
  console.log('safety panel opened:', safetyPanelVisible)
  await page.screenshot({ path: `shots-punchlist/${vp.name}-04-safety-panel.png` })

  await page.close()
}

console.log('\n=== Console errors ===')
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(none)')

await browser.close()
