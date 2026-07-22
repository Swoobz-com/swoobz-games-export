import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-artotty-infopanel-0707'
fs.mkdirSync(OUT, { recursive: true })

const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'

async function launch(viewport) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: false,
    defaultViewport: { ...viewport, deviceScaleFactor: 2 },
    args: ['--autoplay-policy=no-user-gesture-required', `--window-size=${viewport.width + 40},${viewport.height + 120}`],
  })
  const page = (await browser.pages())[0]
  const errs = []
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(900)
  return { browser, page, errs }
}

async function clickText(page, t) {
  const h = await page.evaluateHandle((tt) => [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes(tt)) || null, t)
  const el = h.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function run(viewport, tag) {
  const { browser, page, errs } = await launch(viewport)
  const res = { tag, errs }

  // 1. LOBBY chrome — "?" pill discoverability + overlap vs PLAY SAFE
  await page.screenshot({ path: `${OUT}/${tag}-1-lobby.png` })
  res.chrome = await page.evaluate((infoSel) => {
    const info = document.querySelector(infoSel)
    const safe = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'PLAY SAFE')
    if (!info || !safe) return { ok: false, info: !!info, safe: !!safe }
    const a = info.getBoundingClientRect(), b = safe.getBoundingClientRect()
    const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom)
    const cs = getComputedStyle(info)
    return { overlap, info: { l: Math.round(a.left), r: Math.round(a.right), t: Math.round(a.top), w: Math.round(a.width), h: Math.round(a.height) }, safe: { l: Math.round(b.left), r: Math.round(b.right) }, bg: cs.background.slice(0, 40), border: cs.border }
  }, INFO_SEL)

  // crop the top-right chrome cluster
  const clip = tag.includes('mobile')
    ? { x: viewport.width - 220, y: 0, width: 220, height: 60 }
    : { x: viewport.width - 260, y: 0, width: 260, height: 60 }
  await page.screenshot({ path: `${OUT}/${tag}-2-chrome-crop.png`, clip })

  // 2. OPEN the panel
  await page.click(INFO_SEL)
  await wait(400)
  res.opened = await page.evaluate((s) => !!document.querySelector(s), DIALOG_SEL)
  await page.screenshot({ path: `${OUT}/${tag}-3-info-open.png` })

  // panel geometry + reduced-motion animation name at rest
  res.panel = await page.evaluate((s) => {
    const d = document.querySelector(s)
    if (!d) return null
    const r = d.getBoundingClientRect()
    const cs = getComputedStyle(d)
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), maxScroll: d.scrollHeight - d.clientHeight, anim: cs.animationName }
  }, DIALOG_SEL)

  // 3. scroll the panel to bottom, capture lower sections
  await page.evaluate((s) => { const d = document.querySelector(s); if (d) d.scrollTop = d.scrollHeight }, DIALOG_SEL)
  await wait(250)
  await page.screenshot({ path: `${OUT}/${tag}-4-info-bottom.png` })

  // 4. em-dash / content sanity from rendered text
  res.dialogText = await page.evaluate((s) => document.querySelector(s)?.innerText || null, DIALOG_SEL)
  res.emDash = /—/.test(res.dialogText || '')

  // 5. close, go to planning state, confirm "?" pill not cluttering in-game board
  await page.keyboard.press('Escape')
  await wait(250)
  await clickText(page, 'ENTER THE DIVE')
  await wait(500)
  await page.screenshot({ path: `${OUT}/${tag}-5-planning.png` })

  await browser.close()
  return res
}

async function main() {
  const desktop = await run({ width: 1440, height: 900 }, 'desktop-1440')
  const mobile = await run({ width: 412, height: 915 }, 'mobile-412')
  console.log(JSON.stringify({ desktop, mobile }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
