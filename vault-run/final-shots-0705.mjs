import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5779/'
const OUTDIR = 'shots-revert-final-0705'
fs.mkdirSync(OUTDIR, { recursive: true })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
async function clickText(page, text) {
  const handle = await page.evaluateHandle((t) => {
    const all = Array.from(document.querySelectorAll('button'))
    return all.find((b) => b.textContent && b.textContent.trim().toLowerCase().includes(t.toLowerCase())) || null
  }, text)
  const el = handle.asElement()
  if (!el) return false
  await el.click()
  return true
}

async function sweepToSettle(page) {
  await clickText(page, 'MANUAL')
  const canvas = await page.$('[data-testid="vault-canvas-shell"] canvas')
  const box = canvas ? await canvas.boundingBox() : null
  if (!box) return
  outer: for (let gx = 1; gx <= 9; gx++) {
    for (let gy = 1; gy <= 9; gy++) {
      const settledDesktop = await page.$('[data-testid="vault-settled-betagain"]')
      const settledMobile = await page.$('[data-testid="vault-settledpanel"]')
      if (settledDesktop || settledMobile) break outer
      await page.mouse.click(box.x + (box.width * gx) / 10, box.y + (box.height * gy) / 10)
      await sleep(90)
    }
  }
}

async function captureViewport(browser, w, h, label) {
  const page = await browser.newPage()
  await page.setViewport({ width: w, height: h })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await sleep(400)

  await page.screenshot({ path: `${OUTDIR}/${label}-1-lobby.png`, fullPage: true })
  await clickText(page, 'ape in')
  await sleep(300)
  await page.screenshot({ path: `${OUTDIR}/${label}-2-betentry.png`, fullPage: true })
  const sendIt = await page.$('[data-testid="vault-betentry-confirm"] button')
  if (sendIt) await sendIt.click()
  await sleep(400)
  await page.screenshot({ path: `${OUTDIR}/${label}-3-playing.png`, fullPage: true })
  await sweepToSettle(page)
  await sleep(500)
  await page.screenshot({ path: `${OUTDIR}/${label}-4-settled.png`, fullPage: true })
  await page.close()
  return { pageErrors }
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const r1440 = await captureViewport(browser, 1440, 900, 'desktop-1440x900')
  const r1920 = await captureViewport(browser, 1920, 1080, 'desktop-1920x1080')
  const rMobile = await captureViewport(browser, 390, 844, 'mobile-390x844')
  await browser.close()
  fs.writeFileSync(`${OUTDIR}/errors.json`, JSON.stringify({ r1440, r1920, rMobile }, null, 2))
  console.log(JSON.stringify({ r1440, r1920, rMobile }, null, 2))
}
main().catch((e) => { console.error(e); process.exit(1) })
