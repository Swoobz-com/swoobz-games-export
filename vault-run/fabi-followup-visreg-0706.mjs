// fabi-followup-visreg-0706.mjs — INDEPENDENT re-verification of the
// HOW-IT-WORKS chip + mobile hint polish, on top of the already-PASSED
// lobby-splash-removal. Fresh puppeteer-core driver.
import puppeteer from 'puppeteer-core'
import fs from 'fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '5217'
const OUT = process.argv[3] || 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/ae0f5ec2-dc4c-47ea-a2ca-1ea3484743ef/scratchpad/shots-fabi-followup-0706'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t, within) {
  const h = await page.evaluateHandle(({ t, within }) => {
    const root = within ? document.querySelector(within) : document
    if (!root) return null
    const els = [...root.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, { t, within })
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function rect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top*100)/100, bottom: Math.round(r.bottom*100)/100, left: Math.round(r.left*100)/100, right: Math.round(r.right*100)/100, w: Math.round(r.width*100)/100, h: Math.round(r.height*100)/100 }
  }, sel)
}

async function viewportInfo(page) {
  return page.evaluate(() => ({
    innerW: window.innerWidth, innerH: window.innerHeight,
    scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth,
  }))
}

async function panelEdges(page) {
  return page.evaluate(() => {
    const sels = [...document.querySelectorAll('[data-testid^="vault-ctl-"],[data-testid^="vault-betentry-"]')]
    return sels.map((e) => {
      const r = e.getBoundingClientRect()
      const visible = e.offsetParent !== null && r.width > 0 && r.height > 0
      return visible ? { testid: e.getAttribute('data-testid'), left: Math.round(r.left*100)/100, right: Math.round(r.right*100)/100, top: Math.round(r.top*100)/100, bottom: Math.round(r.bottom*100)/100, w: Math.round(r.width*100)/100 } : null
    }).filter(Boolean)
  })
}

async function pickerProbe(page) {
  return page.evaluate(() => {
    const modes = ['bluechips', 'altseason', 'shitcoin']
    const hits = []
    for (const m of modes) {
      const el = document.querySelector(`[data-testid="vault-world-card-${m}"]`)
      if (!el) continue
      const r = el.getBoundingClientRect()
      const visible = el.offsetParent !== null && r.width > 0 && r.height > 0
      if (visible) hits.push({ mode: m, top: Math.round(r.top), left: Math.round(r.left*100)/100, right: Math.round(r.right*100)/100, w: Math.round(r.width*100)/100, h: Math.round(r.height*100)/100 })
    }
    return hits
  })
}

async function introProbe(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="vault-ctl-intro"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const label = el.querySelector('span')
    return {
      rect: { left: Math.round(r.left*100)/100, right: Math.round(r.right*100)/100, top: Math.round(r.top*100)/100, bottom: Math.round(r.bottom*100)/100, w: Math.round(r.width*100)/100, h: Math.round(r.height*100)/100 },
      border: cs.border, borderRadius: cs.borderRadius, background: cs.background,
      text: (el.textContent||'').trim(),
      scrollHOverflow: el.scrollHeight > el.clientHeight + 1,
    }
  })
}

async function dismissOnboarding(page) {
  await wait(600)
  await clickText(page, 'got it')
  await clickText(page, 'skip')
  await wait(250)
}

async function mobileHintProbe(page) {
  return page.evaluate(() => {
    // find bet-console hint text node
    const candidates = [...document.querySelectorAll('span,div,p')]
    for (const e of candidates) {
      const txt = (e.childNodes.length && [...e.childNodes].every(n => n.nodeType === 3)) ? (e.textContent||'').trim() : ''
      if (!txt) continue
      const cs = getComputedStyle(e)
      if (cs.fontSize === '12px' && parseFloat(cs.fontFamily.includes('mono')?'1':'1')) {
        // heuristic: mono 12px hint text under bet-console
        if (e.closest('[data-testid="bet-console"]') || e.closest('[class*="bet-console"]')) {
          const r = e.getBoundingClientRect()
          return { text: txt, fontSize: cs.fontSize, opacity: cs.opacity, color: cs.color, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } }
        }
      }
    }
    return null
  })
}

async function fullBetConsoleDump(page) {
  return page.evaluate(() => {
    const bc = document.querySelector('[data-testid="bet-console"]')
    if (!bc) return null
    const r = bc.getBoundingClientRect()
    return { rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }, scrollWOverflow: bc.scrollWidth > bc.clientWidth + 1 }
  })
}

const report = { port: PORT, desktop: {}, mobile: {} }

async function runDesktop(browser, w, h) {
  const page = await browser.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  const dr = {}

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await dismissOnboarding(page)
  await wait(400)

  dr.betEntry = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    cta: await rect(page, '[data-testid="vault-ctl-cta"]'),
    wager: await rect(page, '[data-testid="vault-ctl-wager"]'),
    intro: await introProbe(page),
    picker: await pickerProbe(page),
    panels: await panelEdges(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/w${w}h${h}-bet-entry.png` })

  // spot-check PLAYING
  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it', '[data-testid="vault-ctl-cta"]')
  await wait(700)
  dr.playing = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    panels: await panelEdges(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/w${w}h${h}-playing.png` })

  // reveal a couple cells then take profit -> settled
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (box) {
    for (const [col, row] of [[1,1],[3,3]]) {
      const fx = 0.08 + ((col + 0.5) / 5) * 0.84
      const fy = 0.1 + ((row + 0.5) / 5) * 0.78
      await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      await wait(350)
    }
  }
  await clickText(page, 'take profit')
  await wait(300)
  await clickText(page, 'cash')
  await wait(700)

  dr.settled = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    ctrl: await rect(page, '[data-testid="DesktopControlColumn"]'),
    panels: await panelEdges(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/w${w}h${h}-settled.png` })

  if (errs.length) dr.consoleErrors = errs
  await page.close()
  return dr
}

async function runMobile(browser) {
  const page = await browser.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
  const mr = {}

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
  await dismissOnboarding(page)
  await wait(400)

  mr.betEntry = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    intro: await introProbe(page),
    picker: await pickerProbe(page),
    betConsole: await fullBetConsoleDump(page),
    hint: await mobileHintProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-bet-entry.png`, fullPage: false })

  await clickText(page, 'bluechips')
  await wait(150)
  await clickText(page, 'send it')
  await wait(700)
  mr.playing = {
    board: await rect(page, '[data-testid="vault-canvas-shell"]'),
    betConsole: await fullBetConsoleDump(page),
    hint: await mobileHintProbe(page),
    viewport: await viewportInfo(page),
  }
  await page.screenshot({ path: `${OUT}/mobile-playing.png` })

  if (errs.length) mr.consoleErrors = errs
  await page.close()
  return mr
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required'] })
  report.desktop['1440x900'] = await runDesktop(browser, 1440, 900)
  console.log('=== desktop 1440x900 done ===')
  report.desktop['1920x1080'] = await runDesktop(browser, 1920, 1080)
  console.log('=== desktop 1920x1080 done ===')
  report.mobile = await runMobile(browser)
  console.log('=== mobile done ===')
  await browser.close()
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
  console.log('WROTE', `${OUT}/report.json`)
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
