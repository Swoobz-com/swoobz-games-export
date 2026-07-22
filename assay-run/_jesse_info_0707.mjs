import puppeteer from 'puppeteer-core'
import fs from 'fs'

const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad'
fs.mkdirSync(OUT, { recursive: true })

const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run(vp, label) {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, args: ['--autoplay-policy=no-user-gesture-required'], defaultViewport: null })
  const page = await browser.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
  await page.setViewport(vp)
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await sleep(1600)

  // ---- COLD IDLE: is the "?" present + where, relative to PLAY SAFE ----
  await page.screenshot({ path: `${OUT}/jesse_${label}_1_cold.png` })

  const disc = await page.evaluate((INFO_SEL) => {
    const btn = document.querySelector(INFO_SEL)
    const safe = document.querySelector('button[aria-label^="Play safe"]')
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), text: (el.textContent||'').trim().slice(0,24) } }
    // is ? visible in viewport?
    const inVP = (el) => { if(!el) return false; const b = el.getBoundingClientRect(); return b.top>=0 && b.left>=0 && b.bottom<=window.innerHeight && b.right<=window.innerWidth }
    return { info: r(btn), safe: r(safe), infoInVP: inVP(btn), vpw: window.innerWidth, vph: window.innerHeight }
  }, INFO_SEL)

  // overlap check info vs playsafe
  let overlap = null
  if (disc.info && disc.safe) {
    const a = disc.info, b = disc.safe
    const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x))
    const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
    overlap = ox > 0 && oy > 0 ? { ox, oy } : 'none'
  }

  // ---- Scrape the DIVE DEPTH selector on the main screen (tier labels + multipliers) ----
  const selectorText = await page.evaluate(() => {
    // grab any element mentioning DIVE DEPTH region; fallback whole body text scan for tier labels
    const body = document.body.innerText
    return body
  })

  // ---- OPEN the panel via the "?" ----
  await page.click(INFO_SEL)
  await sleep(500)
  await page.screenshot({ path: `${OUT}/jesse_${label}_2_open.png` })

  const panel = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-modal="true"]')
    if (!dlg) return { present: false }
    const focusEl = document.activeElement
    // gather section text
    const txt = dlg.innerText
    const b = dlg.getBoundingClientRect()
    // extract tier rows: look for "mines" lines
    const mineLines = txt.split('\n').filter((l) => /mines|up to|%|INSTANT|DUCAT|CLAIM LINE|RUN THE LINE|HAUL|TO WIN|provably|seed/i.test(l))
    return {
      present: true,
      focusOnClose: focusEl ? (focusEl.getAttribute('aria-label') || focusEl.textContent || '').trim().slice(0,30) : null,
      rect: { w: Math.round(b.width), h: Math.round(b.height), inVP: b.top >= -1 && b.bottom <= window.innerHeight + 1 },
      hasEmDash: /—/.test(txt),
      fullText: txt,
      keyLines: mineLines,
    }
  })

  // ---- CLOSE via top × ----
  await page.click('button[aria-label="Close how to play"]')
  await sleep(350)
  const afterX = await page.evaluate(() => ({ dlg: !!document.querySelector('[role="dialog"][aria-modal="true"]'), focus: (document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim().slice(0,40) }))

  // ---- Re-open, CLOSE via Esc ----
  await page.click(INFO_SEL); await sleep(350)
  await page.keyboard.press('Escape'); await sleep(300)
  const afterEsc = await page.evaluate(() => ({ dlg: !!document.querySelector('[role="dialog"][aria-modal="true"]'), focus: (document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent||'').trim().slice(0,40) }))

  // ---- Re-open, CLOSE via bottom CLOSE button ----
  await page.click(INFO_SEL); await sleep(350)
  const closeBottom = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-modal="true"]')
    const btns = [...dlg.querySelectorAll('button')]
    const cl = btns.find((b) => /^close$/i.test(b.textContent.trim()))
    if (cl) { cl.click(); return true }
    return false
  })
  await sleep(300)
  const afterBottom = await page.evaluate(() => ({ dlg: !!document.querySelector('[role="dialog"][aria-modal="true"]') }))

  // ---- Re-open, CLOSE via backdrop click ----
  await page.click(INFO_SEL); await sleep(350)
  await page.mouse.click(4, 4); await sleep(300)
  const afterBackdrop = await page.evaluate(() => ({ dlg: !!document.querySelector('[role="dialog"][aria-modal="true"]') }))

  await browser.close()
  return { label, vp, disc, overlap, panel, afterX, afterEsc, closeBottom, afterBottom, afterBackdrop, errs, selectorText }
}

const desk = await run({ width: 1440, height: 900, deviceScaleFactor: 1 }, 'desk')
const mob = await run({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'mob')

for (const r of [desk, mob]) {
  console.log('\n================', r.label, JSON.stringify(r.vp))
  console.log('  ? button:', JSON.stringify(r.disc.info), 'inVP=', r.disc.infoInVP)
  console.log('  PLAY SAFE:', JSON.stringify(r.disc.safe))
  console.log('  overlap(?/playsafe):', JSON.stringify(r.overlap))
  console.log('  panel present:', r.panel.present, 'focusOnOpen:', r.panel.focusOnClose, 'inVP:', JSON.stringify(r.panel.rect), 'emdash:', r.panel.hasEmDash)
  console.log('  closeX->', JSON.stringify(r.afterX), '| Esc->', JSON.stringify(r.afterEsc), '| bottomCLOSE clicked=', r.closeBottom, '->', JSON.stringify(r.afterBottom), '| backdrop->', JSON.stringify(r.afterBackdrop))
  console.log('  console errors:', r.errs.length ? r.errs.slice(0,5) : 'none')
  console.log('  --- PANEL KEY LINES ---')
  for (const l of (r.panel.keyLines||[])) console.log('    | ' + l)
}

// dump full desktop panel text + main-screen text for number cross-check
fs.writeFileSync(`${OUT}/jesse_panel_fulltext.txt`, 'PANEL:\n' + (desk.panel.fullText||'') + '\n\n===MAIN SCREEN BODY===\n' + (desk.selectorText||''))
console.log('\nwrote', `${OUT}/jesse_panel_fulltext.txt`)
