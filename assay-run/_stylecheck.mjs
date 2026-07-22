import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle0' })
const styles = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('style').forEach((s) => {
    const t = s.textContent || ''
    if (t.includes('—')) {
      const idx = t.indexOf('—')
      out.push(t.slice(Math.max(0, idx - 100), idx + 100))
    }
  })
  return out
})
console.log(JSON.stringify(styles, null, 2))
await browser.close()
