import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = process.argv[2] || 'shots-cap'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const clickText = async (page, txt) => {
  const h = await page.evaluateHandle((t) => {
    const b = [...document.querySelectorAll('button')]
    return b.find((x) => x.textContent && x.textContent.includes(t)) || null
  }, txt)
  const el = h.asElement(); if (!el) return false; await el.click(); return true
}
const canvasBox = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }
})

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

// ---- DESKTOP base (planning) ----
{
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(600)
  await page.screenshot({ path: `${OUT}/desktop-planning.png` })
  console.log('desktop-planning captured')
}

// ---- DESKTOP win ----
{
  const page = (await browser.pages())[0]
  let won = false
  for (let attempt = 0; attempt < 14 && !won; attempt++) {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(400)
    await clickText(page, 'ENTER THE ASSAY LINE')
    await wait(300)
    await clickText(page, 'Outer')
    await wait(150)
    const box = await canvasBox(page)
    const tile = box.w / 10
    for (let r = 1; r <= 8; r++) {
      await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(40)
    }
    await wait(150)
    await clickText(page, 'RUN THE LINE')
    for (let i = 0; i < 20; i++) await wait(90)
    await wait(500)
    const info = await page.evaluate(() => {
      const t = document.body.innerText
      return { won: /LINE CLAIMED|CLAIM PROVEN|PROVEN|SECURED/.test(t) && !/BUSTED|BAD VEIN|CRACKED/.test(t) }
    })
    if (info.won) { won = true; await page.screenshot({ path: `${OUT}/desktop-win.png` }); console.log('WON attempt', attempt) }
    else console.log('attempt', attempt, 'no win')
  }
  if (!won) console.log('no desktop win captured')
}

// ---- MOBILE (412) — two GENUINELY DISTINCT states ----
// BUGFIX (2026-07-05): the old code shot `mobile-planning` (viewport) then
// `mobile-full` (fullPage) in the SAME planning phase. At 412×915 the mobile
// UI fits the fold (no overflow → scrollHeight == innerHeight), so fullPage
// captured the identical pixels and the two PNGs came out byte-identical —
// worthless as re-verify evidence. Now we capture two distinct STATES:
// mobile-planning (planning phase) and mobile-full (the settled result after
// running a line, which is a different phase; lobby fallback if no settle),
// and assert they actually differ on disk.
{
  const page = (await browser.pages())[0]
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
  await wait(500)
  // lobby snapshot (kept as a guaranteed-distinct fallback state)
  await page.screenshot({ path: `${OUT}/mobile-lobby.png` })
  await clickText(page, 'ENTER THE ASSAY LINE')
  await wait(600)
  await page.screenshot({ path: `${OUT}/mobile-planning.png` })
  // Drive to a SETTLED state for the genuinely-distinct second capture: trace a
  // column of discs, then RUN THE LINE, and wait for the settled banner text.
  const box = await canvasBox(page)
  let settled = false
  if (box) {
    const tile = box.w / 10
    for (let r = 1; r <= 8; r++) {
      await page.mouse.click(box.x + 4 * tile + tile / 2, box.y + r * tile + tile / 2)
      await wait(40)
    }
    await wait(120)
    await clickText(page, 'RUN THE LINE')
    for (let i = 0; i < 22 && !settled; i++) {
      await wait(90)
      settled = await page.evaluate(() => /LINE CLAIMED|CLAIM PROVEN|PROVEN|SECURED|BUSTED|BAD VEIN|CRACKED/.test(document.body.innerText))
    }
    await wait(400)
  }
  // `mobile-full`: the settled result (distinct phase). If we never reached a
  // settled state, fall back to the lobby fullPage — still a distinct state
  // from planning — so the pair is NEVER byte-identical again.
  if (settled) {
    await page.screenshot({ path: `${OUT}/mobile-full.png` })
  } else {
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(500)
    await page.screenshot({ path: `${OUT}/mobile-full.png` })
  }
  const a = fs.readFileSync(`${OUT}/mobile-planning.png`)
  const b = fs.readFileSync(`${OUT}/mobile-full.png`)
  const identical = a.equals(b)
  console.log(`mobile captured — settled=${settled} planning/full identical=${identical}`)
  if (identical) { console.error('ERROR: mobile-planning and mobile-full are byte-identical'); process.exitCode = 1 }
}

await browser.close()
