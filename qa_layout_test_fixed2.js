const puppeteer = require('puppeteer');
(async () => {
  const url = 'http://localhost:5000';
  const results = [];
  const viewports = [
    { width: 375, height: 800 },
    { width: 1440, height: 900 },
  ];
  for (const vp of viewports) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport(vp);
    const consoleMsgs = [];
    page.on('console', msg => consoleMsgs.push(msg.text()));
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      const screenshotPath = 'C:/Users/Paula-Santiago/Desktop/layout_' + vp.width + '.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      results.push({ viewport: vp, overflow, consoleMsgs, screenshotPath });
    } catch (e) {
      results.push({ viewport: vp, error: e.message });
    }
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
})();
