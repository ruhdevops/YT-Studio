import { test, expect } from '@playwright/test';

test.describe('Dashboard UX Enhancement', () => {
    test.beforeEach(async ({ page }) => {
        // Point to the local index.html using the local server
        await page.goto('http://localhost:8000');
    });

    test('Dashboard button has correct accessibility attributes', async ({ page }) => {
        const dashboardBtn = page.locator('#dashboardBtn');
        await expect(dashboardBtn).toHaveAttribute('aria-controls', 'dashboardModal');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(dashboardBtn).toHaveAttribute('title', 'Dashboard (D)');
    });

    test('Dashboard toggles via button click', async ({ page }) => {
        const dashboardBtn = page.locator('#dashboardBtn');
        const dashboardModal = page.locator('#dashboardModal');

        // Initially closed
        await expect(dashboardModal).not.toBeVisible();
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');

        // Click to open
        await dashboardBtn.click();

        // Check if dashboard is visible.
        // Note: Side panels might be display: block but off-screen.
        // However, app.js sets display to 'block' and aria-hidden to 'false'.
        await expect(dashboardModal).toHaveAttribute('aria-hidden', 'false');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'true');

        // Close via close button in panel
        const closeBtn = page.locator('#closeDashboard');
        await closeBtn.click();
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');
    });

    test('Dashboard toggles via keyboard shortcut D', async ({ page }) => {
        const dashboardBtn = page.locator('#dashboardBtn');
        const dashboardModal = page.locator('#dashboardModal');

        // Initially closed
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');

        // Press 'd' to open
        await page.keyboard.press('d');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'true');
        await expect(dashboardModal).toHaveAttribute('aria-hidden', 'false');

        // Press 'd' again to close
        await page.keyboard.press('d');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');
    });

    test('Dashboard closes via Escape key', async ({ page }) => {
        const dashboardBtn = page.locator('#dashboardBtn');

        // Open it
        await page.keyboard.press('d');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'true');

        // Press Escape
        await page.keyboard.press('Escape');
        await expect(dashboardBtn).toHaveAttribute('aria-expanded', 'false');
    });
});
