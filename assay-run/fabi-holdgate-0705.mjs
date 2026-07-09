// Independent brand-cohesion holdgate re-verify for the Aztec premium
// elevation pass (fabi, 2026-07-05). Cyan / em-dash / font / jade-bounded /
// numeral-green-isolation / dark-glass register / vocab checks, live on 5182.
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5182/'
const OUT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/assay-run/shots-fabi-holdgate-0705'
fs.mkdirSync(OUT, { recursive: true })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const clickText = async (page, txt) => page.evaluate((t) => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(t))
  if (b) { b.click(); return true }
  return false
}, txt)

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 } })
const page = (await browser.pages())[0]
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE.ERROR: ${m.text()}`) })

await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(700)

const title = await page.evaluate(() => document.title)

// ---- cyan computed-style scan across ALL elements ----
const cyanScan = async () => page.evaluate(() => {
  const targets = ['0, 240, 255', '41, 230, 255', '0, 208, 222']
  const hits = []
  document.querySelectorAll('*').forEach((el) => {
    const cs = getComputedStyle(el)
    ;['color', 'backgroundColor', 'borderColor', 'boxShadow', 'outlineColor'].forEach((prop) => {
      const v = cs[prop]
      if (v && targets.some((t) => v.includes(t))) {
        hits.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 60), prop, val: v })
      }
    })
  })
  return hits
})

// ---- em-dash live text scan ----
const emdashScan = async () => page.evaluate(() => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const hits = []
  let n
  while ((n = walker.nextNode())) {
    if (n.nodeValue.includes('—')) hits.push(n.nodeValue.trim().slice(0, 80))
  }
  return hits
})

// ---- font-family probe on numeric vs prose elements ----
const fontScan = async () => page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    return { sel, text: el.textContent?.trim().slice(0, 30), font: getComputedStyle(el).fontFamily }
  }
  // Heuristic: find elements by visible text content
  const findByText = (re) => {
    const all = [...document.querySelectorAll('body *')]
    const el = all.find((e) => e.children.length === 0 && re.test(e.textContent || ''))
    return el ? { text: el.textContent.trim().slice(0, 30), font: getComputedStyle(el).fontFamily, tag: el.tagName } : null
  }
  return {
    balance: findByText(/^\d{2,4}\.\d{2}$/),
    rtp: findByText(/^\d{2}\.\d{2}%$/),
    caption: findByText(/^Select \d+ more discs/),
  }
})

// ---- dark-glass background probe ----
const bgScan = async () => page.evaluate(() => {
  const body = getComputedStyle(document.body).backgroundColor
  const root = document.getElementById('root')
  const rootBg = root ? getComputedStyle(root).backgroundColor : null
  return { body, rootBg }
})

// ---- casino vocab scan on visible body text ----
const vocabScan = async () => page.evaluate(() => {
  const txt = document.body.innerText
  const re = /\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/gi
  return [...new Set((txt.match(re) || []))]
})

const report = {}
report.title = title
report.lobbyCyan = await cyanScan()
report.lobbyEmdash = await emdashScan()
report.font = await fontScan()
report.bg = await bgScan()
report.vocabLobby = await vocabScan()
await page.screenshot({ path: `${OUT}/01-lobby.png` })

await clickText(page, 'ENTER THE ASSAY LINE')
await wait(400)
await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="Dismiss how-to-play tip"]')
  if (b) b.click()
})
await wait(200)
report.planningCyan = await cyanScan()
report.planningEmdash = await emdashScan()
report.vocabPlanning = await vocabScan()
await page.screenshot({ path: `${OUT}/02-planning.png` })
await page.screenshot({ path: `${OUT}/02-planning-fullpage.png`, fullPage: true })

// jade glyph pixel sample from the canvas
const jadeSample = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c) return null
  const ctx = c.getContext('2d')
  const r = c.getBoundingClientRect()
  const scaleX = c.width / r.width, scaleY = c.height / r.height
  // sample center of first tile (~col0,row0) at its glyph center
  const tileCss = r.width / 10
  const cx = Math.floor((tileCss * 0.5) * scaleX)
  const cy = Math.floor((tileCss * 0.5) * scaleY)
  const d = ctx.getImageData(cx, cy, 1, 1).data
  return { x: cx, y: cy, rgba: [d[0], d[1], d[2], d[3]] }
})
report.jadeSample = jadeSample

// paint a trail + run + capture assaying + settled
const board = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const r = c.getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const tile = board.w / 10
await page.mouse.move(board.x + tile * 0.5, board.y + tile * 0.5)
await page.mouse.down()
for (let i = 0; i < 14; i++) {
  const col = i % 10, row = Math.floor(i / 10)
  await page.mouse.move(board.x + tile * (col + 0.5), board.y + tile * (row + 0.5), { steps: 2 })
  await wait(15)
}
await page.mouse.up()
await wait(200)
await page.screenshot({ path: `${OUT}/03-painted.png` })
await clickText(page, 'RUN THE LINE')
await wait(900)
report.assayingCyan = await cyanScan()
await page.screenshot({ path: `${OUT}/04-assaying.png` })
await wait(3000)
report.settledCyan = await cyanScan()
report.settledEmdash = await emdashScan()
report.vocabSettled = await vocabScan()
await page.screenshot({ path: `${OUT}/05-settled.png` })
await page.screenshot({ path: `${OUT}/05-settled-fullpage.png`, fullPage: true })

// settled hero label color probe
report.heroLabelColor = await page.evaluate(() => {
  const els = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /CRACKED DISC|LINE CLAIMED|CLAIM PROVEN/i.test(e.textContent || ''))
  return els.map((e) => ({ text: e.textContent.trim(), color: getComputedStyle(e).color }))
})

report.consoleErrors = errors
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()
