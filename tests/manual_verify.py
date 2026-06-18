import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        await page.goto('http://localhost:8000')
        await asyncio.sleep(2)

        btn = page.locator('#dashboardBtn')

        print('Testing click to open...')
        await btn.click()
        await asyncio.sleep(1)
        aria_expanded_open = await btn.get_attribute('aria-expanded')
        print(f'aria-expanded (open) after click: {aria_expanded_open}')

        if aria_expanded_open == 'true':
            await page.screenshot(path="/home/jules/verification/dashboard_open_click.png")
            print("Successfully opened dashboard via click")
        else:
            print("Failed to open dashboard via click")

        print('Testing keyboard shortcut d...')
        # Close it first if open
        if aria_expanded_open == 'true':
            await page.keyboard.press('Escape')
            await asyncio.sleep(1)

        await page.keyboard.press('d')
        await asyncio.sleep(1)
        aria_expanded_d = await btn.get_attribute('aria-expanded')
        print(f'aria-expanded after d: {aria_expanded_d}')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
