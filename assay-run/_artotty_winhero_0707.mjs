import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-artotty-winhero-0707'
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

async function traceLine(page, cells) {
  for (const [col, row] of cells) {
    const clickAt = await page.evaluate(([col, row]) => {
      const c = document.querySelector('.assayBoardScroll canvas') || document.querySelector('canvas')
      const scrollEl = c.closest('.assayBoardScroll')
      const rawRect = c.getBoundingClientRect()
      const TILE = rawRect.width / 14
      if (scrollEl) {
        const tx = col * TILE + TILE / 2, ty = row * TILE + TILE / 2
        const viewW = scrollEl.clientWidth, viewH = scrollEl.clientHeight
        scrollEl.scrollLeft = Math.min(Math.max(tx - viewW / 2, 0), scrollEl.scrollWidth - viewW)
        scrollEl.scrollTop = Math.min(Math.max(ty - viewH / 2, 0), scrollEl.scrollHeight - viewH)
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

async function measure(page) {
  return page.evaluate(() => {
    const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: +r.left.toFixed(1), top: +r.top.toFixed(1), right: +r.right.toFixed(1), bottom: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    const all = [...document.querySelectorAll('div,span')]
    // hero cartouche: the div whose direct text has SECURED THE HAUL AND is inside the aria-hidden pop wrapper
    const heroLabel = all.find((el) => el.tagName === 'SPAN' && el.textContent.trim() === 'SECURED THE HAUL')
    let hero = heroLabel
    while (hero && !(hero.style && hero.style.borderRadius && hero.style.borderRadius.includes('40px'))) hero = hero.parentElement
    // TO WIN hero (arming) - div with text 'TO WIN' or 'LINE CLAIMED' big pay
    const towin = all.find((el) => /^(TO WIN|HAUL · LIVE|LINE CLAIMED|LINE BROKE)$/.test(el.textContent.trim()) && el.children.length === 0)
    let towinBox = towin ? towin.parentElement : null
    // receipt PAYOUT
    const payoutLabel = all.find((d) => d.childNodes.length === 1 && d.textContent.trim() === 'PAYOUT')
    const payoutValue = payoutLabel ? payoutLabel.nextElementSibling : null
    let receipt = payoutLabel
    while (receipt && !/SECURED THE HAUL|RUGGED BY THE DEEP/.test(receipt.textContent)) receipt = receipt.parentElement
    // hero amount span (big) - sibling: find span with fontSize 42
    const amount = all.find((el) => el.tagName === 'SPAN' && getComputedStyle(el).fontSize === '42px')
    const mult = heroLabel ? (() => { let s = heroLabel.parentElement.parentElement; return [...s.querySelectorAll('span')].find((x) => /x$/.test(x.textContent.trim())) })() : null
    return {
      heroFound: !!hero, hero: R(hero),
      amountText: amount ? amount.textContent.trim() : null, amount: R(amount),
      multText: mult ? mult.textContent.trim() : null, mult: R(mult),
      towinText: towin ? towin.textContent.trim() : null, towinBox: R(towinBox),
      payoutText: payoutValue ? payoutValue.textContent.trim() : null, payout: R(payoutValue),
      receipt: R(receipt),
    }
  })
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--force-color-profile=srgb'] })

async function runOutcome(vp, want, tierRe, cells) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const page = await browser.newPage()
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.mobile, hasTouch: vp.mobile })
    await page.goto(URL, { waitUntil: 'load' })
    await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
    await page.reload({ waitUntil: 'load' })
    await wait(450)
    await clickText(page, /ENTER THE DIVE/)
    await wait(220)
    await clickText(page, tierRe)
    await wait(150)
    await traceLine(page, cells)
    await wait(180)
    await clickText(page, /^RUN THE LINE/)
    let settledText = null
    for (let i = 0; i < 50 && !settledText; i++) {
      await wait(90)
      const t = await page.evaluate(() => document.body.innerText)
      if (/SECURED THE HAUL|RUGGED BY THE DEEP/i.test(t)) settledText = t
    }
    const won = settledText && /SECURED THE HAUL/i.test(settledText)
    const bust = settledText && /RUGGED BY THE DEEP/i.test(settledText)
    if ((want === 'win' && won) || (want === 'bust' && bust)) {
      if (want === 'win') {
        // capture hero mid-pop: pop opaque 425-1394ms of 1700; screenshot ~500ms after detect
        await wait(430)
        const m = await measure(page)
        await page.screenshot({ path: `${SHOTS}/winhero-${vp.name}.png` })
        // overlaps
        const heroVsReceipt = rectInter(m.hero, m.receipt)
        const heroVsTowin = rectInter(m.hero, m.towinBox)
        console.log(`[WIN ${vp.name}] heroFound=${m.heroFound} amount="${m.amountText}" mult="${m.multText}" hero=${JSON.stringify(m.hero)}`)
        console.log(`  hero∩receipt=${JSON.stringify(heroVsReceipt)} hero∩towin(${m.towinText})=${JSON.stringify(heroVsTowin)}`)
        console.log(`  receipt=${JSON.stringify(m.receipt)} payout="${m.payoutText}"`)
        // wait for fade then capture settled receipt at 25px
        await wait(1600)
        await page.screenshot({ path: `${SHOTS}/winsettled-${vp.name}.png` })
        const m2 = await measure(page)
        console.log(`  [after fade] heroFound=${m2.heroFound} payout="${m2.payoutText}"`)
      } else {
        await wait(500)
        const m = await measure(page)
        await page.screenshot({ path: `${SHOTS}/bust-${vp.name}.png` })
        // pixel scan for gold/coins on bust
        console.log(`[BUST ${vp.name}] heroFound=${m.heroFound} payout="${m.payoutText}" receipt=${JSON.stringify(m.receipt)}`)
        // check page text for coin fly / gold hero leftover
        const leak = await page.evaluate(() => {
          const spans = [...document.querySelectorAll('span,div')]
          const goldHero = spans.find((s) => s.textContent.trim() === 'SECURED THE HAUL')
          const coins = document.querySelectorAll('[class*="coin"],[style*="assayCoinFly"]').length
          return { goldHeroPresent: !!goldHero, coinNodes: coins }
        })
        console.log(`  leak: goldHeroPresent=${leak.goldHeroPresent} coinNodes=${leak.coinNodes}`)
      }
      await page.close()
      return true
    }
    await page.close()
  }
  console.log(`[${want} ${vp.name}] FAILED to reach in 40 attempts`)
  return false
}

const bigLine = []
for (let c = 1; c <= 13; c++) bigLine.push([c, 3])
const shortLine = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

for (const vp of VIEWPORTS) {
  await runOutcome(vp, 'win', /REEF/i, shortLine)
  await runOutcome(vp, 'bust', /HADAL/i, bigLine)
}

await browser.close()
console.log('DONE ->', SHOTS)
