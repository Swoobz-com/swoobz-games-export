import puppeteer from 'puppeteer-core';
const EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.argv[2] || '5182';
const widths = [[375, 667, 'M375'], [390, 844, 'M390'], [393, 852, 'M393iP14'], [412, 915, 'M412P7']];

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: false,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  args: ['--window-size=430,984', '--autoplay-policy=no-user-gesture-required'],
});
const page = (await browser.pages())[0];

for (const [W, H, TAG] of widths) {
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(1200);
  const overflow = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  console.log(TAG, JSON.stringify(overflow));
}
await browser.close();
