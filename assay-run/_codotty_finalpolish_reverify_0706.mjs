import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-codotty-finalpolish-0706'
fs.mkdirSync(SHOTS, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { name: '1440x900-desktop', width: 1440, height: 900, mobile: false },
  { name: '1920x1080-desktop', width: 1920, height: 1080, mobile: false },
  { name: '412x915-pixel7', width: 412, height: 915, mobile: true },
  { name: '393x852-iphone14pro', width: 393, height: 852, mobile: true },
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
  if (!a || !b) return { w: 0, h: 0, area: 0 }
  const ix = Math.max(a.left, b.left), iy = Math.max(a.top, b.top)
  const ax = Math.min(a.right, b.right), ay = Math.min(a.bottom, b.bottom)
  const w = ax - ix, h = ay - iy
  return w > 0 && h > 0 ? { w: +w.toFixed(1), h: +h.toFixed(1), area: +(w * h).toFixed(1) } : { w: 0, h: 0, area: 0 }
}

async function measureReceipt(page) {
  return page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    const all = [...document.querySelectorAll('div')]
    const poly = [...document.querySelectorAll('polygon')].find((p) => p.getAttribute('points') === '16,10.8 20.6,16 16,21.2 11.4,16' && p.getAttribute('stroke-width') === '1.6')
    const seal = poly ? poly.closest('div[style*="border-radius: 50%"]') : null
    const payoutLabel = all.find((d) => d.childNodes.length === 1 && d.textContent.trim() === 'PAYOUT')
    const payoutValue = payoutLabel ? payoutLabel.nextElementSibling : null
    const copyBtns = [...document.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('Copy '))
    // headline: leaf div containing "WRECK RECKONING"
    const headline = all.find((d) => /WRECK RECKONING/.test(d.textContent) && !all.some((c) => c !== d && d.contains(c) && /WRECK RECKONING/.test(c.textContent)))
    // hex value spans: spans starting with "seed" / "hash"
    const spans = [...document.querySelectorAll('span')]
    const seedSpan = spans.find((s) => /^seed/.test(s.textContent.trim()))
    const hashSpan = spans.find((s) => /^hash/.test(s.textContent.trim()))
    const cs = (el) => el ? { wordBreak: getComputedStyle(el).wordBreak, overflowWrap: getComputedStyle(el).overflowWrap } : null
    const btnSize = (b) => b ? { w: +b.getBoundingClientRect().width.toFixed(2), h: +b.getBoundingClientRect().height.toFixed(2), minW: getComputedStyle(b).minWidth, minH: getComputedStyle(b).minHeight } : null
    return {
      sealFound: !!seal, payoutFound: !!payoutValue, copyCount: copyBtns.length,
      seal: R(seal), payout: R(payoutValue), copy1: R(copyBtns[0]), copy2: R(copyBtns[1]),
      copy1Size: btnSize(copyBtns[0]), copy2Size: btnSize(copyBtns[1]),
      payoutText: payoutValue ? payoutValue.textContent.trim() : null,
      headlineStyle: cs(headline), headlineText: headline ? headline.textContent.trim().replace(/\s+/g, ' ') : null,
      seedStyle: cs(seedSpan), hashStyle: cs(hashSpan),
      headlineWidth: headline ? +headline.getBoundingClientRect().width.toFixed(1) : null,
    }
  })
}

// click copy#1 and #2, verify each flips to "copied"
async function testCopyFires(page) {
  return page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
    const btns = [...document.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('Copy '))
    const out = []
    for (const b of btns) {
      const before = b.textContent.trim()
      b.click()
      await sleep(60)
      const after = b.textContent.trim()
      out.push({ before, after, fired: after === 'copied' })
    }
    return out
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const report = []

for (const vp of VIEWPORTS) {
  let done = false
  for (let attempt = 0; attempt < 24 && !done; attempt++) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.mobile, hasTouch: vp.mobile })
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
      await wait(250)
      const m = await measureReceipt(page)
      const sealVsPayout = rectInter(m.seal, m.payout)
      const sealVsCopy1 = rectInter(m.seal, m.copy1)
      const copy1VsCopy2 = rectInter(m.copy1, m.copy2)
      const copyFire = await testCopyFires(page)
      await page.screenshot({ path: `${SHOTS}/receipt-${vp.name}.png` })
      report.push({
        viewport: vp.name, payoutText: m.payoutText,
        copy1Size: m.copy1Size, copy2Size: m.copy2Size,
        sealVsPayout, sealVsCopy1, copy1VsCopy2,
        headlineStyle: m.headlineStyle, headlineText: m.headlineText, headlineWidth: m.headlineWidth,
        seedStyle: m.seedStyle, hashStyle: m.hashStyle,
        copyFire,
      })
      console.log(`[${vp.name}] copy1=${m.copy1Size.w}x${m.copy1Size.h} (min ${m.copy1Size.minW}/${m.copy1Size.minH}) copy2=${m.copy2Size.w}x${m.copy2Size.h}`)
      console.log(`   seal∩PAYOUT=${sealVsPayout.area} seal∩copy1=${sealVsCopy1.area} copy1∩copy2=${copy1VsCopy2.area}`)
      console.log(`   headline wordBreak=${m.headlineStyle?.wordBreak}/overflowWrap=${m.headlineStyle?.overflowWrap} | seed wordBreak=${m.seedStyle?.wordBreak} | hash=${m.hashStyle?.wordBreak}`)
      console.log(`   copyFire=${copyFire.map((c) => c.fired).join(',')}`)
      done = true
    }
    await page.close()
  }
  if (!done) { console.log(`[${vp.name}] WARNING: no WIN in 24 attempts`); report.push({ viewport: vp.name, error: 'no-win' }) }
}

await browser.close()
fs.writeFileSync(`${SHOTS}/results.json`, JSON.stringify(report, null, 2))
console.log('\nWROTE', `${SHOTS}/results.json`)
