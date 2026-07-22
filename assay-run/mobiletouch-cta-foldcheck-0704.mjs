// Follow-up isolation probe: is THROW BREAKER below-the-fold from the very
// first frame of planning (structural regression from the VAULT FLOOR 3-tier
// row addition), or only after a long trail is built? Also confirms whether
// the page itself ever auto-scrolled during interaction (vs staying pinned
// at scrollY=0 the whole time, which would mean the button genuinely
// requires a native page-scroll gesture the player must discover).
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-mobiletouch-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const DEVICES = [
  { name: 'pixel7', width: 412, height: 915 },
  { name: 'iphone14pro', width: 393, height: 852 },
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

const pageState = (page, label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes('THROW BREAKER'))
  const br = b ? b.getBoundingClientRect() : null
  return {
    label: l,
    scrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    viewportH: window.innerHeight,
    breakerTop: br ? Math.round(br.top) : null,
    breakerVCenterPct: br ? Math.round(((br.top + br.height / 2) / window.innerHeight) * 1000) / 10 : null,
    breakerFound: !!b,
    breakerDisabled: b ? b.disabled : null,
  }
}, label)

async function run(dev) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = (await browser.pages())[0]
  await page.emulate({ viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)

  const states = []
  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(400)
  states.push(await pageState(page, 'A-just-opened-planning-0-tiles'))

  // Select minimum 8 tiles (top-left corner, all visible in initial centered view or not).
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4, row = Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(60)
  }
  states.push(await pageState(page, 'B-after-8-tiles-min-trail'))

  await tapText(page, 'Flooded Floor')
  await wait(200)
  states.push(await pageState(page, 'C-after-flooded-tier-selected'))

  await page.screenshot({ path: `${OUT}/${dev.name}-foldcheck-planning.png`, fullPage: false })
  await page.screenshot({ path: `${OUT}/${dev.name}-foldcheck-planning-fullpage.png`, fullPage: true })

  await browser.close()
  return states
}

const all = {}
for (const dev of DEVICES) {
  console.log('===', dev.name, '===')
  all[dev.name] = await run(dev)
  console.log(JSON.stringify(all[dev.name], null, 2))
}
fs.writeFileSync(`${OUT}/foldcheck-report.json`, JSON.stringify(all, null, 2))
