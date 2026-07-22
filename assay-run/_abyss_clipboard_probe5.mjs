import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const wait = ms => new Promise(r => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const ctx = browser.defaultBrowserContext()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])

// PAGE 1: direct write, then close
const page1 = await browser.newPage()
await page1.setViewport({ width: 1440, height: 900 })
await page1.goto(URL, { waitUntil: 'load' })
await page1.bringToFront()
const r1 = await page1.evaluate(async () => { try { await navigator.clipboard.writeText('page1-text'); return 'OK' } catch (e) { return 'ERR:' + e.message } })
console.log('page1 direct write:', r1)
await page1.close()

// PAGE 2: brand new page in the SAME browser/context, direct write again
const page2 = await browser.newPage()
await page2.setViewport({ width: 1440, height: 900 })
await page2.goto(URL, { waitUntil: 'load' })
await page2.bringToFront()
await wait(300)
const r2 = await page2.evaluate(async () => { try { await navigator.clipboard.writeText('page2-text'); return 'OK' } catch (e) { return 'ERR:' + e.message } })
console.log('page2 (2nd page in browser) direct write:', r2)
await page2.close()

// PAGE 3: another new page, re-override permissions right before, then write
const page3 = await browser.newPage()
await ctx.overridePermissions(URL, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])
await page3.setViewport({ width: 1440, height: 900 })
await page3.goto(URL, { waitUntil: 'load' })
await page3.bringToFront()
await wait(300)
const r3 = await page3.evaluate(async () => { try { await navigator.clipboard.writeText('page3-text'); return 'OK' } catch (e) { return 'ERR:' + e.message } })
console.log('page3 (re-granted before) direct write:', r3)
await page3.close()

await browser.close()
