const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Mock API
  await page.route('https://yt-studio-api.ruhdevopsytstudio.workers.dev', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        videos: [
          { id: 'video1', title: 'Test Video 1', thumbnail: 'https://via.placeholder.com/160x90', channel: 'Test Channel' }
        ]
      })
    });
  });

  const filePath = 'file://' + path.resolve('index.html');
  await page.goto(filePath);

  // Wait for content to load (grid to have children)
  await page.waitForSelector('.grid .card');
  console.log('Grid rendered.');

  // Click card
  await page.click('.grid .card');

  // Verify modal is visible
  const modal = page.locator('#modal');
  const isVisible = await modal.isVisible();
  console.log('Modal visible after click:', isVisible);

  const player = page.locator('#player');
  const playerSrc = await player.getAttribute('src');
  console.log('Player src:', playerSrc);

  // Click close button
  await page.click('#close');
  const isStillVisible = await modal.isVisible();
  console.log('Modal visible after close click:', isStillVisible);

  await page.screenshot({ path: '/home/jules/verification/fix_verify.png' });

  await browser.close();
  if (isVisible && !isStillVisible && playerSrc.includes('video1')) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
