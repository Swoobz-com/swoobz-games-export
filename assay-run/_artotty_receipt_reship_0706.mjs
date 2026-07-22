import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-artotty-receipt-0706'
fs.mkdirSync(SHOTS, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440-desktop', width: 1440, height: 900, mobile: false, dsf: 2 },
  { name: '412-mobile', width: 412, height: 915, mobile: true, dsf: 2 },
]

const clickText = (page, re) => page.evaluate((rs) => {
  const r = new RegExp(rs, 'i')
  const els = [...document.querySelectorAll('button, div, span')]
  const b = els.find((x) => r.test((x.textContent || '').trim()) && (x.tagName === 'BUTTON' || getComputedStyle(x).cursor === 'pointer'))
  if (b) { b.click(); return b.textContent.trim() }
  return null
}, re.source)

const line8 = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

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
    await page.mouse.click(clickAt.x, clickAt.y)
    await wait(35)
  }
}

function rectInter(a, b) {
  if (!a || !b) return { area: 0 }
  const ix = Math.max(a.left, b.left), iy = Math.max(a.top, b.top)
  const ax = Math.min(a.right, b.right), ay = Math.min(a.bottom, b.bottom)
  const w = ax - ix, h = ay - iy
  return w > 0 && h > 0 ? { w: +w.toFixed(1), h: +h.toFixed(1), area: +(w * h).toFixed(1) } : { w: 0, h: 0, area: 0 }
}

async function measureReceipt(page) {
  return page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    const all = [...document.querySelectorAll('div')]
    const poly = [...document.querySelectorAll('polygon')].find((p) => p.getAttribute('points') === '16,10.8 20.6,16 16,21.2 11.4,16')
    const seal = poly ? poly.closest('div[style*="border-radius: 50%"]') : null
    const payoutLabel = all.find((d) => d.childNodes.length === 1 && d.textContent.trim() === 'PAYOUT')
    const payoutValue = payoutLabel ? payoutLabel.nextElementSibling : null
    const copyBtns = [...document.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('Copy '))
    // settled receipt container = the div containing PAYOUT and SECURED
    let receipt = payoutLabel
    while (receipt && !/SECURED THE HAUL/.test(receipt.textContent)) receipt = receipt.parentElement
    return {
      sealFound: !!seal, payoutFound: !!payoutValue, copyCount: copyBtns.length,
      seal: R(seal), payout: R(payoutValue), payoutLabel: R(payoutLabel),
      copy1: R(copyBtns[0]), copy2: R(copyBtns[1]),
      receipt: R(receipt), payoutText: payoutValue ? payoutValue.textContent.trim() : null,
    }
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })

for (const vp of VIEWPORTS) {
  let done = false
  for (let attempt = 0; attempt < 30 && !done; attempt++) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile })
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(450)
    await clickText(page, /ENTER THE DIVE/)
    await wait(220)
    await clickText(page, /REEF/i)
    await wait(150)
    await traceLine(page, line8)
    await wait(180)
    await clickText(page, /^RUN THE LINE/)
    let settledText = null
    for (let i = 0; i < 45 && !settledText; i++) {
      await wait(120)
      const t = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t
    }
    if (settledText && /SECURED THE HAUL/i.test(settledText)) {
      await wait(350)
      const m = await measureReceipt(page)
      const sealVsPayout = rectInter(m.seal, m.payout)
      const sealVsCopy1 = rectInter(m.seal, m.copy1)
      const copy1VsCopy2 = rectInter(m.copy1, m.copy2)
      const payoutVsSeal = rectInter(m.payout, m.seal)
      await page.screenshot({ path: `${SHOTS}/full-${vp.name}.png` })
      // tight crop of the receipt
      if (m.receipt) {
        const cx = Math.max(0, m.receipt.left - 6), cy = Math.max(0, m.receipt.top - 6)
        await page.screenshot({
          path: `${SHOTS}/receipt-${vp.name}.png`,
          clip: { x: cx, y: cy, width: Math.min(vp.width - cx, m.receipt.w + 12), height: Math.min(vp.height - cy, m.receipt.h + 12) },
        })
      }
      console.log(`[${vp.name}] payout="${m.payoutText}" sealFound=${m.sealFound} copyCount=${m.copyCount}`)
      console.log(`  seal∩PAYOUT=${JSON.stringify(sealVsPayout)} seal∩copy1=${JSON.stringify(sealVsCopy1)} copy1∩copy2=${JSON.stringify(copy1VsCopy2)}`)
      console.log(`  seal=${JSON.stringify(m.seal)} payout=${JSON.stringify(m.payout)}`)
      console.log(`  copy1=${JSON.stringify(m.copy1)} copy2=${JSON.stringify(m.copy2)}`)
      done = true
    }
    await page.close()
  }
  if (!done) console.log(`[${vp.name}] WARNING: no WIN in 30 attempts`)
}

await browser.close()
console.log('DONE ->', SHOTS)
