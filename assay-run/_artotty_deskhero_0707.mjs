import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const SHOTS = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-artotty-deskhero-0707'
fs.mkdirSync(SHOTS, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

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

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--force-color-profile=srgb'] })
const shortLine = [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3]]

for (let attempt = 0; attempt < 40; attempt++) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false })
  await page.goto(URL, { waitUntil: 'load' })
  await page.evaluate(() => { try { window.localStorage.clear() } catch {} })
  await page.reload({ waitUntil: 'load' })
  await wait(450)
  await clickText(page, /ENTER THE DIVE/)
  await wait(220)
  await clickText(page, /REEF/i)
  await wait(150)
  await traceLine(page, shortLine)
  await wait(180)
  // click RUN and immediately start dense sampling for the pop
  await clickText(page, /^RUN THE LINE/)
  let shotIdx = 0
  let sawHero = false
  for (let i = 0; i < 90; i++) {
    await wait(70)
    const st = await page.evaluate(() => {
      const spans = [...document.querySelectorAll('span,div')]
      const label = spans.find((s) => s.tagName === 'SPAN' && s.textContent.trim() === 'SECURED THE HAUL')
      let hero = label
      while (hero && !(hero.style && hero.style.borderRadius && hero.style.borderRadius.includes('40px'))) hero = hero.parentElement
      const op = hero ? +getComputedStyle(hero).opacity : 0
      const settled = /SECURED THE HAUL|RUGGED BY THE DEEP/i.test(document.body.innerText)
      return { hasHero: !!hero, op: +op.toFixed(2), settled }
    })
    if (st.hasHero && st.op > 0.85 && !sawHero) {
      await page.screenshot({ path: `${SHOTS}/deskhero-opaque-${shotIdx++}.png` })
      sawHero = true
      await wait(120)
      await page.screenshot({ path: `${SHOTS}/deskhero-opaque-${shotIdx++}.png` })
      console.log(`[desk] captured opaque hero op=${st.op} at poll ${i}`)
      break
    }
  }
  if (sawHero) { await page.close(); break }
  await page.close()
}
await browser.close()
console.log('DONE ->', SHOTS)
