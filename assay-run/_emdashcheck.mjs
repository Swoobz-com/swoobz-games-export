import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = (await browser.pages())[0]
await page.goto('http://localhost:5182/', { waitUntil: 'networkidle2', timeout: 60000 })
const res = await page.evaluate(() => {
  const styleEls = [...document.querySelectorAll('style')]
  const styleText = styleEls.map(s => s.textContent || '').join('\n')
  // count em-dashes in <style> DOM text and in ALL user-facing text
  const styleEm = (styleText.match(/—/g) || []).length
  const styleComments = (styleText.match(/\/\*/g) || []).length
  const bodyText = document.body.innerText || ''
  const bodyEm = (bodyText.match(/—/g) || []).length
  return { styleEm, styleComments, bodyEm, styleLen: styleText.length }
})
console.log(JSON.stringify(res))
await browser.close()
