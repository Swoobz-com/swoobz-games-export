// Follow-up: confirm whether the coachmark/RUN THE LINE visual overlap found
// on iPhone 14 Pro (393x852) is also a HIT-TEST block (elementFromPoint), not
// just a cosmetic z-order issue, and whether a real tap at RUN THE LINE's
// center actually reaches the button.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-a11y-verify-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 393, height: 852, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false } })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => window.localStorage.removeItem('assay_coachmark_seen_v1'))
await page.reload({ waitUntil: 'networkidle0' })
await wait(500)
await tapText(page, 'ENTER THE ASSAY LINE')
await wait(600)

// Paint 8 boxes so the line is armed.
await page.evaluate(() => {
  const scrollables = [...document.querySelectorAll('div')].filter((d) => d.scrollWidth > d.clientWidth || d.scrollHeight > d.clientHeight)
  scrollables.forEach((d) => { d.scrollLeft = 0; d.scrollTop = 0 })
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
await wait(200)

const info = await page.evaluate(() => {
  const run = [...document.querySelectorAll('button')].find((b) => b.textContent && b.textContent.includes('RUN THE LINE'))
  const r = run.getBoundingClientRect()
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  const topEl = document.elementFromPoint(cx, cy)
  const describe = (el) => el ? { tag: el.tagName, cls: el.className, id: el.id, text: (el.textContent || '').slice(0, 40), ariaLabel: el.getAttribute && el.getAttribute('aria-label'), zIndex: getComputedStyle(el).zIndex } : null
  return {
    runRect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
    elementAtRunCenter: describe(topEl),
    isRunItself: topEl === run,
    isDescendantOfRun: run.contains(topEl),
    coachmarkPresent: !!document.querySelector('[aria-label="How to play"]'),
  }
})
console.log('HIT-TEST AT RUN THE LINE CENTER (coachmark still up):', JSON.stringify(info, null, 2))

// Now actually attempt the tap and see if the phase changes (does it register on RUN or get swallowed by coachmark?).
const phaseBefore = await page.evaluate(() => document.body.innerText.includes('CLAIM PROVEN') || document.body.innerText.includes('LINE SECURED'))
await tapText(page, 'RUN THE LINE')
await wait(400)
const afterTapState = await page.evaluate(() => {
  const stillHasClearBtn = !![...document.querySelectorAll('button')].find((b) => b.textContent === 'CLEAR')
  const bodyText = document.body.innerText.slice(0, 200)
  return { stillHasClearBtn, bodyTextSnippet: bodyText }
})
console.log('AFTER TAP ATTEMPT ON RUN THE LINE (coachmark was covering it):', JSON.stringify(afterTapState, null, 2))

await page.screenshot({ path: `${OUT}/iphone14pro-hittest-coachmark-overlap.png` })
await browser.close()
