// Quick supplementary visual check — keyboard-nav focus ring collateral
// (one of the "other 4 fixes" flagged as a possible collateral-shift risk).
// Not a full a11y audit (that's swoobz-accessibility-qa's job, already PASS
// per AGENT_MEMORY) — just confirms the ring RENDERS cleanly, no visual break.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.PORT || '5288'
const OUT = 'shots-visregqa0707-focusring'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: false, args: ['--window-size=1500,1000'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await page.goto('http://localhost:' + PORT + '/', { waitUntil: 'networkidle0' })
  await wait(900)
  const gh = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    return els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes('got it')) || null
  })
  const gotIt = gh.asElement()
  if (gotIt) await gotIt.click()
  await wait(300)
  const bh = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('[data-testid^="vault-world-card-"]')]
    return els.find((e) => e.textContent.toLowerCase().includes('bluechips')) || null
  })
  const bc = bh.asElement()
  if (bc) await bc.click()
  await wait(500)
  const sh = await page.evaluateHandle(() => {
    const els = [...document.querySelectorAll('button,[role=button]')]
    return els.find((e) => e.offsetParent !== null && e.textContent.toLowerCase().includes('send it')) || null
  })
  const sendIt = sh.asElement()
  if (sendIt) await sendIt.click()
  await wait(1200)
  // Tab into the canvas grid (per accessibility-qa memory: exactly one press in)
  await page.keyboard.press('Tab')
  await wait(150)
  await page.keyboard.press('Tab')
  await wait(150)
  await page.keyboard.press('Tab')
  await wait(200)
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.tagName)
  await page.screenshot({ path: `${OUT}/focus-canvas.png` })
  // crop around a plausible tile focus-ring region for close inspection
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  })
  if (canvasBox) await page.screenshot({ path: `${OUT}/focus-canvas-crop.png`, clip: canvasBox })
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ focusedTag: focused }, null, 1))
  console.log('DONE, focusedTag=', focused)
  await browser.close()
})()
