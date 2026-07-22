import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/rgc5-qa'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = (page, re) =>
  page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const b = [...document.querySelectorAll('button, div, span')].find(
      (x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'),
    )
    if (b) {
      b.click()
      return (b.textContent || '').trim()
    }
    return null
  }, re.source)

async function findClickable(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const b = [...document.querySelectorAll('button, div, span, a')].find(
      (x) => r.test((x.textContent || x.getAttribute('aria-label') || '').trim()) && (x.tagName === 'BUTTON' || x.tagName === 'A' || getComputedStyle(x).cursor === 'pointer'),
    )
    if (!b) return null
    const rect = b.getBoundingClientRect()
    return { text: (b.textContent || '').trim(), ariaLabel: b.getAttribute('aria-label'), rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height, visible: rect.width > 0 && rect.height > 0 } }
  }, re.source)
}

async function safetyPanelOpen(page) {
  return page.evaluate(() => {
    const el = [...document.querySelectorAll('div,span,h1,h2,h3')].find((x) => (x.textContent || '').trim() === 'PLAY SAFE' && x.closest('[aria-label="Play safe"]'))
    const modal = document.querySelector('[aria-label="Play safe"]')
    return !!modal
  })
}

// Scroll-aware tile tap (matches the proven `.assayBoardScroll` mobile-fix
// pattern from prior RG-C5/visreg audits — see AGENT_MEMORY.md, "mobile
// canvas is 644x644 raw but only a ~180x180 window is visible via
// `.assayBoardScroll` overflow:auto"; naive raw-rect math clicks the same
// aliased tile repeatedly on mobile). Desktop has no scroll ancestor and
// clicks the tile's raw on-canvas position directly.
async function tapCell(page, col, row) {
  const clickAt = await page.evaluate(
    ([col, row]) => {
      const c = document.querySelector('.assayBoardScroll canvas') || document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll')
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      if (scrollEl) {
        const targetLocalX = col * TILE + TILE / 2
        const targetLocalY = row * TILE + TILE / 2
        const viewW = scrollEl.clientWidth
        const viewH = scrollEl.clientHeight
        scrollEl.scrollLeft = Math.min(Math.max(targetLocalX - viewW / 2, 0), scrollEl.scrollWidth - viewW)
        scrollEl.scrollTop = Math.min(Math.max(targetLocalY - viewH / 2, 0), scrollEl.scrollHeight - viewH)
        const er = scrollEl.getBoundingClientRect()
        return { x: er.left + er.width / 2, y: er.top + er.height / 2 }
      }
      return { x: rawRect.left + col * TILE + TILE / 2, y: rawRect.top + row * TILE + TILE / 2 }
    },
    [col, row],
  )
  await page.mouse.click(clickAt.x, clickAt.y)
}

async function testViewport(browser, viewport, label) {
  const page = await browser.newPage()
  await page.setViewport(viewport)
  await page.goto(URL, { waitUntil: 'load' })
  await wait(500)
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch {}
  })
  await page.reload({ waitUntil: 'load' })
  await wait(600)

  const report = []

  // PHASE 1 — cold-open / lobby (before "ENTER THE DIVE" is pressed).
  {
    const safety = await findClickable(page, /PLAY SAFE/)
    report.push({ phase: 'lobby (cold open, pre-ENTER THE DIVE)', safetyFound: !!safety, safety })
    if (safety) {
      await clickText(page, /PLAY SAFE/)
      await wait(200)
      const opened = await safetyPanelOpen(page)
      report[report.length - 1].opened = opened
      await page.screenshot({ path: `${OUT}/safety-${label}-lobby.png` })
      await clickText(page, /^CLOSE$/)
      await wait(150)
    }
  }

  // Enter the dive -> planning/arming phase.
  await clickText(page, /ENTER THE DIVE/)
  await wait(300)

  // PHASE 2 — bet-entry/arming (in planning, before trail selected).
  {
    const safety = await findClickable(page, /PLAY SAFE/)
    report.push({ phase: 'bet-entry (planning, arming, 0 tiles)', safetyFound: !!safety, safety })
    if (safety) {
      await clickText(page, /PLAY SAFE/)
      await wait(200)
      const opened = await safetyPanelOpen(page)
      report[report.length - 1].opened = opened
      await page.screenshot({ path: `${OUT}/safety-${label}-betentry.png` })
      await clickText(page, /^CLOSE$/)
      await wait(150)
    }
  }

  // Plot a trail (planning, armed).
  const cells = []
  for (let row = 3; row < 4; row++) for (let col = 3; col < 11; col++) cells.push([col, row])
  for (const [c, r] of cells) {
    await tapCell(page, c, r)
    await wait(15)
  }
  await wait(150)

  // PHASE 3 — planning (armed, trail plotted, ready to commit).
  {
    const safety = await findClickable(page, /PLAY SAFE/)
    report.push({ phase: 'planning (armed, trail plotted)', safetyFound: !!safety, safety })
    if (safety) {
      await clickText(page, /PLAY SAFE/)
      await wait(200)
      const opened = await safetyPanelOpen(page)
      report[report.length - 1].opened = opened
      await page.screenshot({ path: `${OUT}/safety-${label}-planning.png` })
      await clickText(page, /^CLOSE$/)
      await wait(150)
    }
  }

  // Commit -> active/assaying phase. Use DUCAT (staggered) pace so 'assaying'
  // phase is actually observable for a few hundred ms before it resolves.
  await clickText(page, /^RUN THE LINE/)
  await wait(200) // land mid-cascade, still in 'assaying'

  // PHASE 4 — active (assaying, cascade running).
  {
    const safety = await findClickable(page, /PLAY SAFE/)
    report.push({ phase: 'active (assaying, cascade running)', safetyFound: !!safety, safety })
    if (safety) {
      await clickText(page, /PLAY SAFE/)
      await wait(200)
      const opened = await safetyPanelOpen(page)
      report[report.length - 1].opened = opened
      await page.screenshot({ path: `${OUT}/safety-${label}-active.png` })
      await clickText(page, /^CLOSE$/)
      await wait(150)
    }
  }

  // Wait out the round to settle (either a win or a bust; either is fine for this probe).
  for (let i = 0; i < 60; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL|RUGGED BY THE DEEP/.test(txt)) break
    await wait(80)
  }
  await wait(300)

  // PHASE 5 — settled.
  {
    const safety = await findClickable(page, /PLAY SAFE/)
    report.push({ phase: 'settled', safetyFound: !!safety, safety })
    if (safety) {
      await clickText(page, /PLAY SAFE/)
      await wait(200)
      const opened = await safetyPanelOpen(page)
      report[report.length - 1].opened = opened
      await page.screenshot({ path: `${OUT}/safety-${label}-settled.png` })
      await clickText(page, /^CLOSE$/)
      await wait(150)
    }
  }

  await page.close()
  return report
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--window-size=1500,1000'] })

const desktop = await testViewport(browser, { width: 1440, height: 900, deviceScaleFactor: 1 }, 'desktop')
console.log('\n===== DESKTOP 1440x900 =====')
console.log(JSON.stringify(desktop, null, 2))

const mobile = await testViewport(browser, { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'pixel7')
console.log('\n===== MOBILE PIXEL 7 412x915 =====')
console.log(JSON.stringify(mobile, null, 2))

fs.writeFileSync(`${OUT}/safety-report.json`, JSON.stringify({ desktop, mobile }, null, 2))
await browser.close()
