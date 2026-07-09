// visreg-vaultplate-mobilefold-0706.mjs — targeted follow-up: viewport-relative
// (non-fullPage) CTA-above-fold + no-page-scroll check on mobile Pixel 7 /
// iPhone 14 Pro across all 4 phases, since the DesktopControlColumn/vault-ctl-cta
// testids don't exist on the mobile action-bar layout.
import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 6612
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = 'shots-visreg-vaultplate-0706'

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) || null
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}

async function foldProbe(page) {
  return page.evaluate(() => {
    const scrollHeight = document.documentElement.scrollHeight
    const innerHeight = window.innerHeight
    const bar = document.querySelector('.vault-actionbar') || document.querySelector('.vault-settledpanel')
    let ctaRect = null, ctaText = null
    if (bar) {
      const buttons = [...bar.querySelectorAll('button')]
      const primary = buttons.find(b => /bet again|take profit|send it|ape in/i.test((b.textContent||'').trim())) || buttons[buttons.length-1] || null
      if (primary) {
        const r = primary.getBoundingClientRect()
        ctaRect = { top: Math.round(r.top), bottom: Math.round(r.bottom) }
        ctaText = (primary.textContent||'').trim()
      }
    }
    return {
      hasVScroll: scrollHeight > innerHeight + 2,
      scrollHeight, innerHeight,
      ctaRect, ctaText,
      ctaAboveFold: ctaRect ? ctaRect.bottom <= innerHeight : null,
      barClass: bar ? bar.className : null,
    }
  })
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const devices = [ { name: 'pixel7', w: 412, h: 915 }, { name: 'iphone14pro', w: 393, h: 852 } ]
  const out = {}
  for (const d of devices) {
    await page.setViewport({ width: d.w, height: d.h, deviceScaleFactor: 1 })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(700)
    await clickText(page, 'got it'); await clickText(page, 'skip'); await wait(300)
    out[d.name] = {}
    out[d.name].lobby = await foldProbe(page)
    await page.screenshot({ path: `${OUT}/fold-${d.name}-lobby.png` })

    await clickText(page, 'ape in'); await wait(700)
    out[d.name].betEntry = await foldProbe(page)
    await page.screenshot({ path: `${OUT}/fold-${d.name}-betentry.png` })

    await clickText(page, 'shitcoin'); await wait(200)
    await clickText(page, 'send it'); await wait(900)
    out[d.name].playing = await foldProbe(page)
    await page.screenshot({ path: `${OUT}/fold-${d.name}-playing.png` })

    const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3]]
    for (const [cx, cy] of cellSeq) {
      const settledNow = await page.evaluate(() => !!document.querySelector('.vault-settledpanel'))
      if (settledNow) break
      const box = await page.evaluate(() => { const c = document.querySelector('canvas'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
      if (box) {
        const fx = 0.05 + ((cx + 0.5) / 7) * 0.9
        const fy = 0.06 + ((cy + 0.5) / 7) * 0.82
        await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
      }
      await wait(350)
    }
    await wait(600)
    out[d.name].settled = await foldProbe(page)
    await page.screenshot({ path: `${OUT}/fold-${d.name}-settled.png` })
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/mobilefold-results.json`, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}
run().catch(e => { console.error('FATAL', e); process.exit(1) })
