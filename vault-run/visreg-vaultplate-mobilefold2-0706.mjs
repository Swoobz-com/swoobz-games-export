// visreg-vaultplate-mobilefold2-0706.mjs — robust text-based CTA-above-fold
// probe on mobile (class-selector version returned nulls for 3/4 phases
// because the wrapper className guess didn't match every phase). Finds the
// actionable primary button BY TEXT directly and reports its rect vs the
// viewport, plus whether the initial (unscrolled) viewport already shows it.
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

async function findButtonRect(page, patterns) {
  return page.evaluate((patterns) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    for (const p of patterns) {
      const re = new RegExp(p, 'i')
      const el = els.find((e) => e.offsetParent !== null && re.test(norm(e)))
      if (el) {
        const r = el.getBoundingClientRect()
        return { text: norm(el), top: Math.round(r.top), bottom: Math.round(r.bottom), matched: p }
      }
    }
    return null
  }, patterns)
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
    out[d.name] = { innerHeight: d.h }

    const lobbyCta = await findButtonRect(page, ['^ape in'])
    out[d.name].lobby = { ...lobbyCta, aboveFold: lobbyCta ? lobbyCta.bottom <= d.h : null }

    await clickText(page, 'ape in'); await wait(700)
    const betEntryCta = await findButtonRect(page, ['^send it'])
    out[d.name].betEntry = { ...betEntryCta, aboveFold: betEntryCta ? betEntryCta.bottom <= d.h : null }

    await clickText(page, 'shitcoin'); await wait(200)
    await clickText(page, 'send it'); await wait(900)
    const playingCta = await findButtonRect(page, ['^take profit'])
    out[d.name].playing = { ...playingCta, aboveFold: playingCta ? playingCta.bottom <= d.h : null }

    const cellSeq = [[0,0],[6,6],[3,3],[1,5],[5,1],[2,4],[4,2],[0,6],[6,0],[1,1],[5,5],[2,2],[4,4],[3,0],[0,3],[6,3]]
    for (const [cx, cy] of cellSeq) {
      const settledNow = await findButtonRect(page, ['^bet again'])
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
    const settledCta = await findButtonRect(page, ['^bet again'])
    out[d.name].settled = { ...settledCta, aboveFold: settledCta ? settledCta.bottom <= d.h : null }
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/mobilefold2-results.json`, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
}
run().catch(e => { console.error('FATAL', e); process.exit(1) })
