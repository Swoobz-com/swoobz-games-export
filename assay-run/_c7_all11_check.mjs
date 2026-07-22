import puppeteer from 'puppeteer-core'
import { EXE, URL, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText, setPace } from './_a11yHelpers.mjs'

const NAMED = ['assayCoinFly','assayHeroPop','assayHeroRing','assayBoardSweep','assayBoardBloomRadial','assayCartoucheShine','assayTallyPulse','assayTallySpark','assayLampBreathe','assayTallyShine','assayNeedlePulse']

async function scanLive(page) {
  return page.evaluate((named) => {
    const found = {}
    for (const n of named) found[n] = false
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (cs.animationName && named.includes(cs.animationName)) found[cs.animationName] = true
    }
    return found
  }, NAMED)
}

async function run(reduce) {
  const browser = await puppeteer.launch({ executablePath: EXE, headless: 'new', defaultViewport: { width: 1440, height: 900 } })
  const page = (await browser.pages())[0]
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }])
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await wait(500)
  await reachPlanning(page)
  let won = false
  const samples = []
  for (let a = 0; a < 8 && !won; a++) {
    await selectTier(page, 'REEF SHELF')
    await paintTilesMouse(page, Array.from({ length: 8 }, (_, i) => a * 9 + i))
    await wait(100)
    await commit(page)
    // sample repeatedly through the celebration window to catch each effect
    // at whatever point in its (staggered) lifecycle it fires
    for (let t = 0; t < 12; t++) {
      samples.push(await scanLive(page))
      await wait(150)
    }
    const txt = await page.evaluate(() => document.body.innerText)
    if (/SECURED THE HAUL/.test(txt)) won = true
    else if (/RUGGED BY THE DEEP/.test(txt)) { await clickText(page, 'DIVE AGAIN'); await wait(250); samples.length = 0 }
  }
  const anyTrue = {}
  for (const n of NAMED) anyTrue[n] = samples.some(s => s[n])
  await browser.close()
  return anyTrue
}

async function main() {
  const on = await run(true)
  const off = await run(false)
  console.log(JSON.stringify({ on, off }, null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
