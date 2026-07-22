import { launch, wait, reachPlanning, selectTier, paintTilesMouse, commit, pollForPhaseText, clickText } from './_a11yHelpers.mjs'
import fs from 'node:fs'

const OUT = 'shots-a11y-final-0707'
fs.mkdirSync(OUT, { recursive: true })

async function main() {
  const { browser, page, consoleErrors } = await launch({ width: 1440, height: 900 })
  await page.screenshot({ path: `${OUT}/smoke-00-lobby.png` })
  await reachPlanning(page)
  await page.screenshot({ path: `${OUT}/smoke-01-planning.png` })
  await selectTier(page, 'REEF SHELF')
  await paintTilesMouse(page, [0,1,2,3,4,5,6,7])
  await page.screenshot({ path: `${OUT}/smoke-02-trail-painted.png` })
  await commit(page)
  const settled = await pollForPhaseText(page, /SECURED THE HAUL|RUGGED BY THE DEEP/i, 6000)
  await page.screenshot({ path: `${OUT}/smoke-03-settled.png` })
  console.log('SETTLED TEXT MATCH:', settled ? settled.slice(0, 200) : null)
  console.log('CONSOLE ERRORS:', consoleErrors)
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
