import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
await new Promise(r=>setTimeout(r,700))
const info = await page.evaluate(() => {
  const els = [...document.querySelectorAll('body *')].filter(e => e.textContent && e.textContent.trim() === 'SWOOBZ' && e.children.length === 0)
  return els.map(e => ({ text: e.textContent, color: getComputedStyle(e).color, textShadow: getComputedStyle(e).textShadow, tag: e.tagName, cls: e.className }))
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
