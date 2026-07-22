import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-copyglyph-44bump-0706'
fs.mkdirSync(SHOTS, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: 'pixel7-412x915', width: 412, height: 915 },
  { name: 'iphone14pro-393x852', width: 393, height: 852 },
]

const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

function tapText(page, re) {
  return page.evaluate((rs) => {
    const r = new RegExp(rs, 'i')
    const els = [...document.querySelectorAll('button, div, span')]
    const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
    if (!b) return null
    const rect = b.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, text: b.textContent.trim() }
  }, re.source)
}

async function realTap(page, x, y) {
  await page.touchscreen.tap(x, y)
}

async function tapButtonByText(page, re) {
  const t = await tapText(page, re)
  if (!t) return null
  await realTap(page, t.x, t.y)
  return t
}

async function traceLine(page, cells) {
  for (const [col, row] of cells) {
    const clickAt = await page.evaluate(([col, row]) => {
      const c = document.querySelector('.assayBoardScroll canvas') || document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll')
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      if (scrollEl) {
        const targetLocalX = col * TILE + TILE / 2
        const targetLocalY = row * TILE + TILE / 2
        const viewW = scrollEl.clientWidth, viewH = scrollEl.clientHeight
        scrollEl.scrollLeft = Math.min(Math.max(targetLocalX - viewW / 2, 0), scrollEl.scrollWidth - viewW)
        scrollEl.scrollTop = Math.min(Math.max(targetLocalY - viewH / 2, 0), scrollEl.scrollHeight - viewH)
        const er = scrollEl.getBoundingClientRect()
        return { x: er.left + er.width / 2, y: er.top + er.height / 2 }
      }
      return { x: rawRect.left + col * TILE + TILE / 2, y: rawRect.top + row * TILE + TILE / 2 }
    }, [col, row])
    await realTap(page, clickAt.x, clickAt.y)
    await wait(45)
  }
}

function rectInter(a, b) {
  if (!a || !b) return { w: 0, h: 0, area: 0 }
  const ix = Math.max(a.left, b.left), iy = Math.max(a.top, b.top)
  const ax = Math.min(a.right, b.right), ay = Math.min(a.bottom, b.bottom)
  const w = ax - ix, h = ay - iy
  return w > 0 && h > 0 ? { w: +w.toFixed(1), h: +h.toFixed(1), area: +(w * h).toFixed(1) } : { w: 0, h: 0, area: 0 }
}

async function measureReceipt(page) {
  return page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    const all = [...document.querySelectorAll('div')]
    const poly = [...document.querySelectorAll('polygon')].find((p) => p.getAttribute('points') === '16,10.8 20.6,16 16,21.2 11.4,16' && p.getAttribute('stroke-width') === '1.6')
    const seal = poly ? poly.closest('div[style*="border-radius: 50%"]') : null
    const payoutLabel = all.find((d) => d.childNodes.length === 1 && d.textContent.trim() === 'PAYOUT')
    const payoutValue = payoutLabel ? payoutLabel.nextElementSibling : null
    const copyBtns = [...document.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('Copy '))
    // headline word-break glance-check
    const headline = all.find((d) => d.childNodes.length === 1 && /SECURED THE HAUL|RUGGED BY THE DEEP/i.test(d.textContent.trim()))
    return {
      sealFound: !!seal, payoutFound: !!payoutValue, copyCount: copyBtns.length,
      seal: R(seal), payout: R(payoutValue), copy1: R(copyBtns[0]), copy2: R(copyBtns[1]),
      payoutText: payoutValue ? payoutValue.textContent.trim() : null,
      headlineText: headline ? headline.textContent.trim() : null,
      docScrollW: document.documentElement.scrollWidth, innerW: window.innerWidth,
      docScrollH: document.documentElement.scrollHeight, innerH: window.innerHeight,
    }
  })
}

async function testCopyFires(page, btnIndex) {
  const before = await page.evaluate((idx) => {
    const b = [...document.querySelectorAll('button')].filter((x) => (x.getAttribute('aria-label') || '').startsWith('Copy '))[idx]
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { rect: { left: +r.left.toFixed(1), top: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }, label: b.textContent.trim() }
  }, btnIndex)
  if (!before) return { found: false }
  await realTap(page, before.rect.left + before.rect.w / 2, before.rect.top + before.rect.h / 2)
  await wait(150)
  const after = await page.evaluate((idx) => {
    const b = [...document.querySelectorAll('button')].filter((x) => (x.getAttribute('aria-label') || '').startsWith('Copy '))[idx]
    return b ? b.textContent.trim() : null
  }, btnIndex)
  return { found: true, rect: before.rect, labelBefore: before.label, labelAfter: after, fired: before.label === 'copy' && after === 'copied' }
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const report = {}

for (const vp of VIEWPORTS) {
  report[vp.name] = {}
  let done = false
  for (let attempt = 0; attempt < 30 && !done; attempt++) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(450)
    await tapButtonByText(page, /ENTER THE DIVE/)
    await wait(220)
    await tapButtonByText(page, /REEF/i)
    await wait(150)
    await traceLine(page, line8)
    await wait(180)
    await tapButtonByText(page, /^RUN THE LINE/)
    let settledText = null
    for (let i = 0; i < 45 && !settledText; i++) {
      await wait(120)
      const t = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t
    }
    if (settledText && /SECURED THE HAUL/i.test(settledText)) {
      await wait(300)
      const m = await measureReceipt(page)
      const sealVsPayout = rectInter(m.seal, m.payout)
      const sealVsCopy1 = rectInter(m.seal, m.copy1)
      const payoutVsCopy1 = rectInter(m.payout, m.copy1)
      const copy1VsCopy2 = rectInter(m.copy1, m.copy2)
      const overflowX = m.docScrollW > m.innerW + 1
      await page.screenshot({ path: `${SHOTS}/receipt-${vp.name}.png`, fullPage: false })

      const copy1Fire = await testCopyFires(page, 0)
      const copy2Fire = await testCopyFires(page, 1)

      report[vp.name] = {
        copy1Height: m.copy1 ? m.copy1.h : null, copy1Width: m.copy1 ? m.copy1.w : null,
        copy2Height: m.copy2 ? m.copy2.h : null, copy2Width: m.copy2 ? m.copy2.w : null,
        sealVsPayout, sealVsCopy1, payoutVsCopy1, copy1VsCopy2, overflowX,
        headlineText: m.headlineText,
        copy1Fire, copy2Fire,
      }
      console.log(`[${vp.name}] copy1=${m.copy1.w}x${m.copy1.h} copy2=${m.copy2.w}x${m.copy2.h}`)
      console.log(`[${vp.name}] seal∩PAYOUT=${sealVsPayout.area} seal∩copy1=${sealVsCopy1.area} payout∩copy1=${payoutVsCopy1.area} copy1∩copy2=${copy1VsCopy2.area} overflowX=${overflowX}`)
      console.log(`[${vp.name}] copy1Fire=${JSON.stringify(copy1Fire)}`)
      console.log(`[${vp.name}] copy2Fire=${JSON.stringify(copy2Fire)}`)
      console.log(`[${vp.name}] headline="${m.headlineText}"`)
      done = true
      await page.close()
    } else {
      await page.close()
    }
  }
  if (!done) { console.log(`[${vp.name}] WARNING: no WIN in 30 attempts`); report[vp.name] = { error: 'no-win' } }
}

await browser.close()
fs.writeFileSync(`${SHOTS}/results.json`, JSON.stringify(report, null, 2))
console.log('\nWROTE', `${SHOTS}/results.json`)
