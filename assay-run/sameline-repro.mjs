import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5189/'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', args: ['--autoplay-policy=no-user-gesture-required'] })
const page = (await browser.pages())[0]
await page.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, isLandscape: false }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36' })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await wait(600)
const click = async (t) => { await page.evaluate((tx) => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(tx)); if(b) b.click() }, t) }
await click('ENTER THE ASSAY LINE'); await wait(400)
const box = await page.evaluate(() => { const c=document.querySelector('canvas'); const r=c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width} })
const tile = box.w/32
for (let i=0;i<8;i++){ const col=5+i*3, row=6+(i%4)*3; await page.touchscreen.tap(box.x+col*tile+tile/2, box.y+row*tile+tile/2); await wait(60) }
await click('PLUNGE'); await wait(3000)
await click('ASSAY AGAIN'); await wait(400)
// Now SAME LINE should be present (lastTrail >= 8)
const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => { const r=b.getBoundingClientRect(); return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) } }))
console.log(JSON.stringify(btns, null, 2))
await page.screenshot({ path: 'shots-mobile-qa/sameline-row.png' })
await browser.close()
