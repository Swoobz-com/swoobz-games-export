// backdrop-fix-verify-0706.mjs — visual sanity check for the doortrekken-de-
// achtergrond fix (backdrop photo now spans board + control column).
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5901'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-backdrop-fix'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function diag(page) {
  return page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const grid = document.querySelector('[data-testid="vault-grid-mainGrid"]')
    const board = document.querySelector('[data-testid="vault-canvas-shell"]')
    const control = document.querySelector('[data-testid="DesktopControlColumn"]')
    const cs = bd ? getComputedStyle(bd) : null
    const br = bd ? bd.getBoundingClientRect() : null
    const gr = grid ? grid.getBoundingClientRect() : null
    const cr = control ? control.getBoundingClientRect() : null
    const boardR = board ? board.getBoundingClientRect() : null
    return {
      backdropBgImage: cs ? cs.backgroundImage.slice(0, 160) : null,
      backdropZIndex: cs ? cs.zIndex : null,
      backdropRect: br ? { w: Math.round(br.width), h: Math.round(br.height), l: Math.round(br.left), r: Math.round(br.right) } : null,
      gridRect: gr ? { w: Math.round(gr.width), h: Math.round(gr.height) } : null,
      controlRect: cr ? { l: Math.round(cr.left), r: Math.round(cr.right) } : null,
      boardRect: boardR ? { l: Math.round(boardR.left), r: Math.round(boardR.right) } : null,
      spansFullShell: br && cr ? (Math.abs(br.left - (boardR?.left ?? 0)) < 40 && Math.abs(br.right - cr.right) < 40) : null,
    }
  })
}

async function run() {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await b.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLEERR', m.text()) })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  const results = {}
  for (const world of ['bluechips', 'altseason', 'shitcoin']) {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(500)
    await clickText(page, world)
    await wait(500)
    results[world] = await diag(page)
    await page.screenshot({ path: `${OUT}/betentry-${world}-1440x900.png` })
  }
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(500)
  await clickText(page, 'bluechips')
  await wait(300)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(900)
  results.playing = await diag(page)
  await page.screenshot({ path: `${OUT}/playing-bluechips-1440x900.png` })
  const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  if (box) await page.mouse.click(box.x + box.w * 0.3, box.y + box.h * 0.3)
  await wait(500)
  await clickText(page, 'take profit')
  await wait(900)
  results.settled = await diag(page)
  await page.screenshot({ path: `${OUT}/settled-bluechips-1440x900.png` })
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await wait(500)
  results.mobile = await page.evaluate(() => {
    const bd = document.querySelector('[data-testid="vault-grid-backdrop"]')
    const cs = bd ? getComputedStyle(bd) : null
    return { present: !!bd, bgImage: cs ? cs.backgroundImage.slice(0, 120) : null }
  })
  await page.screenshot({ path: `${OUT}/mobile-betentry-412x915.png` })
  await b.close()
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
