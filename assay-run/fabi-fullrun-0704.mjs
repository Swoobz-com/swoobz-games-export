import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5182/'
const OUT = './fabi-shots-0704'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function hueOf(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  if (d === 0) return null
  let h
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  return h
}
async function scanColors(page, label) {
  const b64 = await page.screenshot({ encoding: 'base64' })
  fs.writeFileSync(`${OUT}/${label}.png`, Buffer.from(b64, 'base64'))
  const result = await page.evaluate(async (data) => {
    const img = new Image(); await new Promise(r=>{img.onload=r; img.src='data:image/png;base64,'+data})
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height
    const ctx = c.getContext('2d'); ctx.drawImage(img,0,0)
    const full = ctx.getImageData(0,0,c.width,c.height).data
    return { data: Array.from(full), w:c.width, h:c.height }
  }, b64)
  const { data, w, h } = result
  let trueCyan=0, purple=0
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    const i=(y*w+x)*4, r=data[i],g=data[i+1],b=data[i+2]
    const max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min
    if (chroma<40||max<70) continue
    const hue = hueOf(r,g,b); if (hue===null) continue
    if (hue>=172&&hue<=202&&b>=g-8) trueCyan++
    if (hue>=255&&hue<=325&&chroma>40) purple++
  }
  console.log(`[${label}] TRUE-CYAN=${trueCyan} purple=${purple}`)
}
async function textDump(page, label) {
  const text = await page.evaluate(() => document.body.innerText)
  fs.writeFileSync(`${OUT}/${label}-text.txt`, text)
  console.log(`[${label}] em-dash=${text.includes('—')} casino=${/\b(WIN|JACKPOT|LUCKY|HOT|MEGA|MASSIVE|EPIC|LEGENDARY)\b/.test(text)}`)
  console.log(text.split('\n').filter(l=>l.trim()).slice(0,40).join(' | '))
}

const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new' })
const page = (await browser.pages())[0]
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await wait(400)
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('ENTER THE ASSAY LINE')); b && b.click() })
await wait(400)
// dismiss coachmark if present
await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent==='X'||x.getAttribute('aria-label')?.includes('dismiss')); b&&b.click() })

const canvasBox = await page.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height} })
const cell = canvasBox.w / 10
const startX = canvasBox.x + cell*1.5
const startY = canvasBox.y + cell*1.5
await page.mouse.move(startX, startY)
await page.mouse.down()
for (let k=1;k<=8;k++) {
  await page.mouse.move(canvasBox.x + cell*(1.5+k), startY, { steps: 3 })
  await wait(40)
}
await page.mouse.up()
await wait(400)
await scanColors(page, 'fullpath-marked')
await textDump(page, 'fullpath-marked')

const ran = await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('RUN THE LINE')); if(b){b.click(); return true} return false })
console.log('RUN THE LINE clicked:', ran)
await wait(6000)
await scanColors(page, 'fullpath-settled')
await textDump(page, 'fullpath-settled')

await browser.close()
console.log('DONE')
