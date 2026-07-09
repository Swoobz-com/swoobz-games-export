import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5286'
const OUT = 'shots-brandqa-full-0707'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

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
  const el = h.asElement(); if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function clearAndGo(p) {
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear() } catch (e) {} })
  await p.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' }); await wait(1000)
}

const emdashScan = (p) => p.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const hits = []
  let n
  while ((n = walker.nextNode())) {
    if (n.nodeValue && n.nodeValue.includes('—')) {
      hits.push({ text: n.nodeValue.trim().slice(0, 160), parent: n.parentElement ? n.parentElement.tagName + '.' + (n.parentElement.className || '') : 'none' })
    }
  }
  // also scan aria-label / title attrs
  document.querySelectorAll('[aria-label], [title]').forEach((el) => {
    const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
    if (al && al.includes('—')) hits.push({ text: al.slice(0,160), parent: 'aria-label:' + el.tagName })
    if (ti && ti.includes('—')) hits.push({ text: ti.slice(0,160), parent: 'title:' + el.tagName })
  })
  return hits
})

const casinoVocabScan = (p) => p.evaluate(() => {
  const re = /\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/gi
  const hits = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    const v = n.nodeValue
    if (v && re.test(v)) hits.push({ text: v.trim().slice(0, 160), parent: n.parentElement ? n.parentElement.tagName : 'none' })
    re.lastIndex = 0
  }
  document.querySelectorAll('[aria-label], [title]').forEach((el) => {
    const al = el.getAttribute('aria-label'); const ti = el.getAttribute('title')
    if (al && re.test(al)) hits.push({ text: al.slice(0,160), parent: 'aria-label:' + el.tagName })
    re.lastIndex = 0
    if (ti && re.test(ti)) hits.push({ text: ti.slice(0,160), parent: 'title:' + el.tagName })
    re.lastIndex = 0
  })
  return hits
})

const cyanScan = (p) => p.evaluate(() => {
  const targets = ['0, 240, 255', '0, 240, 255', '41, 230, 255', '0, 208, 222']
  const hits = []
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el)
    const props = [cs.color, cs.backgroundColor, cs.borderColor, cs.boxShadow]
    for (const val of props) {
      if (val && targets.some(t => val.includes(t))) {
        hits.push({ tag: el.tagName, cls: el.className, testid: el.getAttribute('data-testid') })
        break
      }
    }
  })
  return hits
})

const wordmarkScan = (p) => p.evaluate(() => {
  const hasAttr = !!document.querySelector('[data-watermark], .swoobz-watermark')
  const bodyHasSwoobz = document.body.innerHTML.toLowerCase().includes('swoobz')
  return { hasAttr, bodyHasSwoobz }
})

const purpleBanScan = (p) => p.evaluate(() => {
  const hits = []
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el)
    const props = [cs.color, cs.backgroundColor, cs.borderColor]
    for (const val of props) {
      const m = val && val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (m) {
        const r = +m[1], g = +m[2], b = +m[3]
        // purple/lilac-ish: high r+b, low g, and not grayscale
        if (r > 100 && b > 150 && g < r - 30 && g < b - 30 && Math.abs(r-b) < 80) {
          hits.push({ tag: el.tagName, testid: el.getAttribute('data-testid'), rgb: `${r},${g},${b}` })
        }
      }
    }
  })
  return hits
})

const bgScan = (p) => p.evaluate(() => {
  const body = getComputedStyle(document.body).backgroundColor
  const root = document.getElementById('root') || document.querySelector('#app')
  const rootBg = root ? getComputedStyle(root).backgroundColor : null
  return { body, rootBg }
})

const fontScan = (p, sel) => p.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  return getComputedStyle(el).fontFamily
}, sel)

const results = { emdash: {}, casino: {}, cyan: {}, wordmark: {}, purple: {}, bg: {}, fonts: {}, altseason: {} }

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })

// ---- helper to walk phases on desktop 1440x900 for a given world ----
async function walkWorld(page, worldLabel, worldButtonText) {
  await clearAndGo(page)
  // lobby
  await wait(300)
  const lobbyShot = `${OUT}/${worldLabel}-lobby.png`
  await page.screenshot({ path: lobbyShot })
  results.emdash[`${worldLabel}-lobby`] = await emdashScan(page)
  results.casino[`${worldLabel}-lobby`] = await casinoVocabScan(page)
  results.cyan[`${worldLabel}-lobby`] = (await cyanScan(page)).length
  results.bg[`${worldLabel}-lobby`] = await bgScan(page)

  // select world if a picker exists
  if (worldButtonText) {
    await clickText(page, worldButtonText)
    await wait(300)
  }
  // ape in -> bet entry
  await clickText(page, 'ape in')
  await wait(400)
  results.emdash[`${worldLabel}-betentry`] = await emdashScan(page)
  results.casino[`${worldLabel}-betentry`] = await casinoVocabScan(page)
  await page.screenshot({ path: `${OUT}/${worldLabel}-betentry.png` })

  // send it -> playing
  await clickText(page, 'send it')
  await wait(500)
  results.emdash[`${worldLabel}-playing`] = await emdashScan(page)
  results.casino[`${worldLabel}-playing`] = await casinoVocabScan(page)
  results.cyan[`${worldLabel}-playing`] = (await cyanScan(page)).length
  results.fonts[`${worldLabel}-playing-numeral`] = await fontScan(page, '[data-testid="vault-hud-pump-value"], [data-testid="vault-grid-hud-inner"]')
  await page.screenshot({ path: `${OUT}/${worldLabel}-playing.png` })

  // open how-to-play modal — try clicking the corner help icon via testid/selector guess
  const helpClicked = await page.evaluate(() => {
    const cand = document.querySelector('[data-testid="vault-corner-help"], [aria-label*="help" i], [aria-label*="how" i]')
    if (cand) { cand.click(); return true }
    return false
  })
  await wait(300)
  results.emdash[`${worldLabel}-howtoplay`] = await emdashScan(page)
  results.casino[`${worldLabel}-howtoplay`] = await casinoVocabScan(page)
  await page.screenshot({ path: `${OUT}/${worldLabel}-howtoplay.png` })
  // close modal if open
  await page.evaluate(() => { document.querySelectorAll('button').forEach(b=>{ if((b.textContent||'').trim()==='✕') b.click() }) })
  await wait(200)
}

const page = await b.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })

await walkWorld(page, 'bluechips-desktop', null)

fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
await b.close()
