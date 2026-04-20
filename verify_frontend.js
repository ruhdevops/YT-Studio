const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    // We don't have a live server here usually, but I can check the file content or try to start one.
    // Given the constraints and the nature of the change (preconnect hints),
    // a visual check is mostly to ensure I didn't break the HTML structure.
    await page.goto('file://' + process.cwd() + '/index.html');
    await page.screenshot({ path: 'frontend_check.png' });
    console.log('Frontend screenshot saved.');

    const title = await page.title();
    console.log('Page Title:', title);

    if (title === 'Ruh Al Tarikh') {
      console.log('✅ Frontend verification PASSED');
    } else {
      console.log('❌ Frontend verification FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('Frontend check failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
