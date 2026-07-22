import { launch, wait } from './_a11yHelpers.mjs'
const INFO_SEL = 'button[aria-label="How to play · Abyss Line game info"]'
const DIALOG_SEL = '[role="dialog"][aria-labelledby="abyss-info-title"]'
const { browser, page } = await launch({ width: 1440, height: 900 })
await page.evaluate((s) => document.querySelector(s)?.click(), INFO_SEL)
await wait(500)
const out = await page.evaluate((dlgSel) => {
  const dlg = document.querySelector(dlgSel)
  const spans = [...dlg.querySelectorAll('span')].filter((e) => /^\d{2}\.\d{2}%$/.test(e.textContent.trim()))
  return spans.map((s) => ({ text: s.textContent, inlineStyle: s.getAttribute('style'), computedLS: getComputedStyle(s).letterSpacing }))
}, DIALOG_SEL)
console.log(JSON.stringify(out, null, 2))
await browser.close()
