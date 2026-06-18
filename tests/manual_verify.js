const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');

  console.log('Testing accessibility attributes...');
  const btn = await page.$('#dashboardBtn');
  const ariaControls = await btn.getAttribute('aria-controls');
  const ariaExpanded = await btn.getAttribute('aria-expanded');
  const title = await btn.getAttribute('title');

  console.log('aria-controls:', ariaControls);
  console.log('aria-expanded:', ariaExpanded);
  console.log('title:', title);

  if (ariaControls !== 'dashboardModal' || ariaExpanded !== 'false' || title !== 'Dashboard (D)') {
    console.error('FAILED accessibility check');
    process.exit(1);
  }

  console.log('Testing keyboard shortcut D to open...');
  await page.keyboard.press('d');
  const ariaExpandedOpen = await btn.getAttribute('aria-expanded');
  console.log('aria-expanded (open):', ariaExpandedOpen);
  if (ariaExpandedOpen !== 'true') {
    console.error('FAILED keyboard open');
    process.exit(1);
  }

  console.log('Testing keyboard shortcut D to close...');
  await page.keyboard.press('d');
  const ariaExpandedClosed = await btn.getAttribute('aria-expanded');
  console.log('aria-expanded (closed):', ariaExpandedClosed);
  if (ariaExpandedClosed !== 'false') {
    console.error('FAILED keyboard close');
    process.exit(1);
  }

  console.log('Testing Escape key to close...');
  await page.keyboard.press('d');
  await page.keyboard.press('Escape');
  const ariaExpandedEsc = await btn.getAttribute('aria-expanded');
  console.log('aria-expanded (esc):', ariaExpandedEsc);
  if (ariaExpandedEsc !== 'false') {
    console.error('FAILED escape close');
    process.exit(1);
  }

  console.log('ALL MANUAL CHECKS PASSED');
  await browser.close();
})();
