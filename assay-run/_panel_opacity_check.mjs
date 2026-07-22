import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5182/', { waitUntil: 'load', timeout: 60000 })
await wait(600)
const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas')
  const boardWrap = canvas ? canvas.parentElement : null
  const header = [...document.querySelectorAll('div')].find(d => /ABYSS LINE/.test(d.textContent||'') && /BALANCE|RTP/.test(d.parentElement?.textContent||''))
  function bgOf(el){ return el ? getComputedStyle(el).backgroundColor : null }
  // walk up from canvas to find the first element with a non-transparent bg (the board panel)
  let el = canvas, found = null
  while (el && el !== document.body) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { found = { tag: el.tagName, cls: el.className, bg }; break }
    el = el.parentElement
  }
  return { boardPanelBg: found }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
