import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, selectTier, paintTilesMouse, commit, clickText } from './_a11yHelpers.mjs'

async function main() {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
  const page = (await browser.pages())[0]
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(500)
  await reachPlanning(page)
  await selectTier(page, 'HADAL TRENCH')
  await paintTilesMouse(page, Array.from({ length: 40 }, (_, i) => i))
  await wait(100)
  await commit(page)
  for (let i = 0; i < 400; i++) {
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('Dive busted.')) break
    await wait(10)
  }
  await wait(700)
  const txt = await page.evaluate(() => document.body.innerText)
  console.log('----FULL TEXT----')
  console.log(txt)
  await browser.close()
}
main().catch(e => { console.error(e); process.exit(1) })
