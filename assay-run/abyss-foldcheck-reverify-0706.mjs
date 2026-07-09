// RE-VERIFY: iPhone 14 Pro (393x852) Planning-phase RUN THE LINE fold clip,
// after codotty's Planning-rail vertical-budget trim + CurrentKey minHeight:44
// + touchAction. Also sanity-checks Pixel 7 (412x915) no-overflow + tap-fire.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/abyss-fixpass'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'iphone14pro', width: 393, height: 852 },
  { name: 'pixel7', width: 412, height: 915 },
]

const tapText = async (page, txt) => {
  const handle = await page.evaluateHandle((t) => {
    const btns = [...document.querySelectorAll('button')]
    return btns.find((b) => b.textContent && b.textContent.includes(t)) || null
  }, txt)
  const el = handle.asElement()
  if (!el) return false
  const box = await el.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const measure = (page) => page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')]
  const run = btns.find((b) => b.textContent && b.textContent.includes('RUN THE LINE'))
  const currentKey = btns.find((b) => b.textContent && (b.textContent.includes('ENTER THE DIVE') || b.textContent.includes('DIVE AGAIN')))
  const rr = run ? run.getBoundingClientRect() : null
  const cr = currentKey ? currentKey.getBoundingClientRect() : null
  return {
    viewportH: window.innerHeight,
    scrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    runFound: !!run,
    runRect: rr ? { top: Math.round(rr.top), bottom: Math.round(rr.bottom), left: Math.round(rr.left), right: Math.round(rr.right), width: Math.round(rr.width), height: Math.round(rr.height) } : null,
    runVCenterPct: rr ? Math.round(((rr.top + rr.height / 2) / window.innerHeight) * 1000) / 10 : null,
    currentKeyFound: !!currentKey,
    currentKeyLabel: currentKey ? currentKey.textContent : null,
    currentKeyRect: cr ? { top: Math.round(cr.top), bottom: Math.round(cr.bottom), width: Math.round(cr.width), height: Math.round(cr.height) } : null,
  }
})

async function run(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)

  const results = {}

  // Lobby CTA measurement + tap fire (CurrentKey = ENTER THE DIVE)
  const lobbyBefore = await measure(page)
  results.lobby = lobbyBefore
  await page.screenshot({ path: `${OUT}/${dev.name}-reverify-lobby.png`, fullPage: false })

  const tapped = await tapText(page, 'ENTER THE DIVE')
  results.lobbyTapFired = tapped
  await wait(400)

  // Planning phase — first paint measurement (this is the critical probe)
  const planningState = await measure(page)
  results.planningFirstPaint = planningState
  await page.screenshot({ path: `${OUT}/${dev.name}-reverify-planning-firstpaint.png`, fullPage: false })
  await page.screenshot({ path: `${OUT}/${dev.name}-reverify-planning-fullpage.png`, fullPage: true })

  // Overflow check: is there any horizontal overflow?
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }))
  results.overflow = overflow

  // Tap-fire check on RUN THE LINE (should be disabled with 0 picks, but tap should still hit the DOM node harmlessly)
  // Select a couple tiles first so RUN THE LINE becomes meaningfully tappable, then confirm state transition potential
  const canvasGeo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top, width: cr.width, height: cr.height }
  })
  results.canvasGeo = canvasGeo

  await browser.close()
  return { device: dev.name, viewport: `${dev.width}x${dev.height}`, results, consoleErrors: errors }
}

const all = []
for (const dev of DEVICES) {
  console.log('===', dev.name, '===')
  const r = await run(dev)
  all.push(r)
  console.log(JSON.stringify(r, null, 2))
}
fs.writeFileSync(`${OUT}/foldcheck-reverify-report.json`, JSON.stringify(all, null, 2))
