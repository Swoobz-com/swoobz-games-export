import puppeteer from 'puppeteer-core'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = 'C:/Users/Erstr/AppData/Local/Temp/claude/C--Users-Erstr-OneDrive-Bureaublad-swoobz-games-export/eed49dad-7609-4969-843a-cb4e422d24da/scratchpad/mtqa/'
const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: null })
const page = await browser.newPage()
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto('file:///C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/originals/assay/assets/abyss-background.svg', { waitUntil: 'load' })
await page.screenshot({ path: OUT + 'bg-full-1600x900.png' })
// also render the exact center 25% crop as it'd appear on mobile (cover-fit math)
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 1 })
await page.evaluate(() => {
  document.body.style.margin = '0'
  document.body.style.overflow = 'hidden'
  const img = document.querySelector('svg')
})
await page.addStyleTag({content: `html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:#000;} svg{display:block;}`})
await page.evaluate(() => {
  const svg = document.querySelector('svg')
  svg.style.position='fixed'; svg.style.top='0'; svg.style.left='50%';
  svg.style.height='915px'; svg.style.width='auto'; svg.style.transform='translateX(-50%)'
})
await page.screenshot({ path: OUT + 'bg-cover-crop-412x915.png' })
await browser.close()
