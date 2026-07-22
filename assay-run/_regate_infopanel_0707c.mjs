import { launch, wait } from './_a11yHelpers.mjs'
const { browser, page } = await launch({ width: 1440, height: 900 })
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.includes('How to play'))
  btn?.click()
})
await wait(500)
const result = await page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]')
  const spans = [...dialog.querySelectorAll('span')]
  const bloodSpans = spans.map(s => ({ text: s.textContent.trim(), color: getComputedStyle(s).color })).filter(s => s.color === 'rgb(255, 93, 93)')
  const goldSpans = spans.map(s => ({ text: s.textContent.trim(), color: getComputedStyle(s).color })).filter(s => s.color === 'rgb(240, 181, 66)')
  return { bloodSpans, goldCount: goldSpans.length, goldSample: goldSpans.slice(0,6) }
})
console.log(JSON.stringify(result, null, 2))
await browser.close()
