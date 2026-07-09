import puppeteer from 'puppeteer-core'
import fs from 'fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.argv[2] || '6301'
const OUT = 'shots-fabi-holdgate-0706'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, t) {
  const h = await page.evaluateHandle((t) => {
    const els = [...document.querySelectorAll('button,[role=button],a')]
    const norm = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
    const lc = t.toLowerCase()
    return (
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e) === lc) ||
      els.find((e) => e.offsetParent !== null && !e.disabled && norm(e).includes(lc)) ||
      null
    )
  }, t)
  const el = h.asElement()
  if (!el) return false
  try { await el.click() } catch { return false }
  return true
}
async function clickCell(page, col, row, cols, rows) {
  const box = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const r = c.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })
  if (!box) return false
  const fx = 0.05 + ((col + 0.5) / cols) * 0.9
  const fy = 0.06 + ((row + 0.5) / rows) * 0.82
  await page.mouse.click(box.x + box.w * fx, box.y + box.h * fy)
  return true
}
function scrollInfo(page) {
  return page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    hasVScroll: document.documentElement.scrollHeight > window.innerHeight,
  }))
}
function topbarText(page) {
  return page.evaluate(() => document.body.innerText.slice(0, 80))
}

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--force-device-scale-factor=1'] })
  const page = await browser.newPage()
  const devices = [ { name: 'pixel7', w: 412, h: 915 }, { name: 'iphone14pro', w: 393, h: 852 } ]
  const out = {}
  for (const dev of devices) {
    await page.setViewport({ width: dev.w, height: dev.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' })
    await wait(600)
    await clickText(page, 'got it')
    await clickText(page, 'skip')
    await wait(250)
    await clickText(page, 'ape in')
    await wait(500)
    await clickText(page, 'bluechips')
    await wait(200)
    const sentIt = await clickText(page, 'send it')
    await wait(900)
    await clickCell(page, 1, 1, 5, 5)
    await wait(500)
    const clickedTakeProfit = await clickText(page, 'take profit')
    await wait(900)
    const info = await scrollInfo(page)
    const txt = await topbarText(page)
    out[dev.name] = { sentIt, clickedTakeProfit, info, txt }
    await page.screenshot({ path: `${OUT}/m-${dev.name}-3-playing-FIXED.png`, fullPage: true })
  }
  await browser.close()
  console.log(JSON.stringify(out, null, 2))
}
run().catch((e) => { console.error('FATAL', e); process.exit(1) })
