import puppeteer from 'puppeteer-core'
import fs from 'fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))
const OUT = 'shots-artotty-evenlight-0706'
fs.mkdirSync(OUT, { recursive: true })
const clickText = (page, rs) => page.evaluate((s) => { const re = new RegExp(s, 'i'); const b = [...document.querySelectorAll('button')].find(x => re.test(x.textContent.trim())); if (b) { b.click(); return true } return false }, rs)

const browser = await puppeteer.launch({ executablePath: EXE, headless: false, defaultViewport: null, args: ['--autoplay-policy=no-user-gesture-required', '--window-size=1460,980'] })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(1500)
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /×|✕|got it|dismiss/i.test(x.textContent || x.getAttribute('aria-label') || '')); if (b) b.click() }).catch(() => {})
await clickText(page, 'ENTER THE DIVE'); await wait(700)
const geo = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, w: r.width, h: r.height } })
const TILE = geo.w / 14
const cells = []
for (let row = 3; row <= 10; row++) { const cols = row % 2 ? [3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3]; for (const col of cols) cells.push([col, row]) }
let placed = 0
for (const [col, row] of cells) { await page.mouse.click(geo.left + col * TILE + TILE / 2, geo.top + row * TILE + TILE / 2); placed++; await wait(60); if (placed >= 12) break }
await wait(500)
await page.screenshot({ path: `${OUT}/runstate-armed-full.png` })
await page.screenshot({ path: `${OUT}/runstate-board.png`, clip: { x: Math.round(geo.left), y: Math.round(geo.top), width: Math.round(Math.min(geo.w, 560)), height: Math.round(Math.min(geo.h, 560)) } })
const cta = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).find(t => /RUN THE LINE|CLAIM|SECURED/i.test(t)) || '')
console.log('armed pods:', placed, 'CTA:', cta)
await browser.close()
console.log('DONE', OUT)
