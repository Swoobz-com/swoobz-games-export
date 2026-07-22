import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const b = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
const p = (await b.pages())[0]
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p.goto('http://localhost:5182/', { waitUntil: 'domcontentloaded' })
await new Promise(r => setTimeout(r, 700))
await p.click('button[aria-label="How to play · Abyss Line game info"]')
await new Promise(r => setTimeout(r, 250))
const anim = await p.evaluate(() => {
  const d = document.querySelector('[role="dialog"][aria-labelledby="abyss-info-title"]')
  if (!d) return null
  const cs = getComputedStyle(d)
  return { animationName: cs.animationName, open: true }
})
console.log('REDUCED-MOTION dialog:', JSON.stringify(anim))
await b.close()
