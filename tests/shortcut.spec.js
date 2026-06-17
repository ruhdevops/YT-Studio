import { test, expect } from "@playwright/test";

test("search shortcut / works", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.keyboard.press("/");
  const isFocused = await page.evaluate(() => document.activeElement === document.getElementById("searchInput"));
  expect(isFocused).toBe(true);
});

test("dashboard shortcut D works", async ({ page }) => {
  await page.goto("http://localhost:5173");
  await page.keyboard.press("d");
  const isVisible = await page.evaluate(() => document.getElementById("dashboardModal").style.display === "block");
  expect(isVisible).toBe(true);
});
