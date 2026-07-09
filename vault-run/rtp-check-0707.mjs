import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5390'
const OUT = 'shots-fairnessqa-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
for (const vp of [{ name: 'desktop-1440', w: 1440, h: 900 }, { name: 'pixel7', w: 412, h: 915 }]) {
  const p = await b.newPage()
  await p.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await p.reload({ waitUntil: 'networkidle0' })
  await wait(600)
  await clickText(p, 'got it'); await clickText(p, 'skip'); await wait(300)
  // world-picker card raw text BEFORE opening any help panel
  const wpText = await p.evaluate(() => document.querySelector('[data-testid="vault-board-worldpicker"]')?.textContent.replace(/\s+/g,' ').trim() || 'NOT FOUND')
  console.log(vp.name, 'WORLDPICKER TEXT:', wpText)
  await p.screenshot({ path: `${OUT}/rtp-${vp.name}-betentry-noinfo.png` })
  // try clicking the help "?" button
  const clicked = await clickText(p, '?') || await p.evaluate(() => {
    const btn = document.querySelector('[aria-label*="help" i], [aria-label*="how to play" i]')
    if (btn) { btn.click(); return true }
    return false
  })
  await wait(400)
  const infoText = await p.evaluate(() => document.querySelector('[role="dialog"][aria-label="How to play Rug or Riches"]')?.textContent.replace(/\s+/g,' ').trim() || 'INFO OVERLAY NOT FOUND')
  console.log(vp.name, 'HELP CLICKED:', clicked, '| INFO TEXT (has RTP?):', /RTP|payback|97%|93\.5%/i.test(infoText), infoText.slice(0, 500))
  await p.screenshot({ path: `${OUT}/rtp-${vp.name}-infoopen.png` })
  await p.close()
}
await b.close()
