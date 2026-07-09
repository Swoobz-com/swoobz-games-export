// Consolidated fix-pass verification: mobile CTA fold + PLAY SAFE reachability
// + a screenshot pass across desktop/mobile phases. Mirrors the existing
// mobiletouch-cta-foldcheck-0704.mjs pattern, updated for the new vocabulary
// ("RUN THE LINE" / "Heavy Floor") and extended to also check PLAY SAFE.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-consolidated-0704'
fs.mkdirSync(OUT, { recursive: true })
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
  const box = await el.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await page.touchscreen.tap(box.x, box.y)
  return true
}

const pageState = (page, label) =>
  page.evaluate((l) => {
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.textContent && x.textContent.includes('RUN THE LINE'),
    )
    const br = b ? b.getBoundingClientRect() : null
    const safe = [...document.querySelectorAll('button')].find(
      (x) => x.textContent && x.textContent.includes('PLAY SAFE'),
    )
    const sr = safe ? safe.getBoundingClientRect() : null
    return {
      label: l,
      scrollY: window.scrollY,
      docScrollHeight: document.documentElement.scrollHeight,
      viewportH: window.innerHeight,
      ctaTop: br ? Math.round(br.top) : null,
      ctaBottom: br ? Math.round(br.bottom) : null,
      ctaOnScreenAtScroll0: br ? br.top >= 0 && br.top < window.innerHeight : null,
      ctaFound: !!b,
      safeTop: sr ? Math.round(sr.top) : null,
      safeOnScreen: sr ? sr.top >= 0 && sr.top < window.innerHeight && sr.left >= 0 && sr.left < window.innerWidth : null,
      safeFound: !!safe,
    }
  }, label)

async function run(dev) {
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const page = (await browser.pages())[0]
  await page.emulate({
    viewport: { width: dev.width, height: dev.height, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
  })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  await wait(400)

  const states = []
  // Lobby — screenshot before entering planning.
  await page.screenshot({ path: `${OUT}/${dev.name}-00-lobby.png`, fullPage: false })

  await tapText(page, 'ENTER THE ASSAY LINE')
  await wait(500)
  states.push(await pageState(page, 'A-just-opened-planning-0-boxes'))
  await page.screenshot({ path: `${OUT}/${dev.name}-01-planning-scroll0.png`, fullPage: false })
  await page.screenshot({ path: `${OUT}/${dev.name}-01b-planning-fullpage.png`, fullPage: true })

  // Dismiss the coachmark if present so it doesn't cover the board for the
  // rest of this pass (also proves the dismiss control works).
  const dismissed = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
    if (btn) {
      btn.click()
      return true
    }
    return false
  })

  // Force the pan-viewport to the top-left corner first (mobile board >
  // pan window, and the board centers its initial scroll — corner tiles are
  // NOT necessarily inside the initial visible window at the smaller window
  // size) so the corner-tile tap coordinates below are reliably reachable.
  await page.evaluate(() => {
    const scrollables = [...document.querySelectorAll('div')].filter(
      (d) => d.scrollWidth > d.clientWidth || d.scrollHeight > d.clientHeight,
    )
    scrollables.forEach((d) => {
      d.scrollLeft = 0
      d.scrollTop = 0
    })
  })
  await wait(100)
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    const cr = c.getBoundingClientRect()
    return { left: cr.left, top: cr.top }
  })
  const TILE = 46
  for (let i = 0; i < 8; i++) {
    const col = i % 4
    const row = Math.floor(i / 4)
    await page.touchscreen.tap(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2)
    await wait(60)
  }
  states.push(await pageState(page, 'B-after-8-boxes-min-line'))

  await tapText(page, 'Heavy')
  await wait(200)
  states.push(await pageState(page, 'C-after-heavy-floor-selected'))
  await page.screenshot({ path: `${OUT}/${dev.name}-02-planning-heavy-scroll0.png`, fullPage: false })

  // Run the line and poll PLAY SAFE reachability during 'assaying'.
  await tapText(page, 'RUN THE LINE')
  await wait(150)
  states.push(await pageState(page, 'D-mid-assaying'))
  await page.screenshot({ path: `${OUT}/${dev.name}-03-assaying.png`, fullPage: false })
  await wait(1500)
  states.push(await pageState(page, 'E-assaying-1.5s'))

  await browser.close()
  return { dismissed, states }
}

const all = {}
for (const dev of DEVICES) {
  console.log('===', dev.name, '===')
  all[dev.name] = await run(dev)
  console.log(JSON.stringify(all[dev.name], null, 2))
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(all, null, 2))
