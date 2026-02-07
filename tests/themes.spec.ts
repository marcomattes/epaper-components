import { test, expect } from "@playwright/test";

test.describe("Theme: default", () => {
  test("applies dark text on light background", async ({ page }) => {
    await page.goto("/demo/index.html");
    const body = page.locator("body");
    const color = await body.evaluate((el) => getComputedStyle(el).color);
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).toMatch(/rgb\(\s*23,\s*23,\s*23\s*\)/);
    expect(bg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
  });
});

test.describe("Theme: inverted", () => {
  test("applies light text on dark background", async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.locator("html").evaluate((el) => {
      el.setAttribute("data-theme", "inverted");
    });
    const body = page.locator("body");
    const color = await body.evaluate((el) => getComputedStyle(el).color);
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).toMatch(/rgb\(\s*245,\s*245,\s*245\s*\)/);
    expect(bg).toMatch(/rgb\(\s*23,\s*23,\s*23\s*\)/);
  });
});

test.describe("Theme: high-contrast", () => {
  test("applies pure black on pure white", async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.locator("html").evaluate((el) => {
      el.setAttribute("data-theme", "high-contrast");
    });
    const body = page.locator("body");
    const color = await body.evaluate((el) => getComputedStyle(el).color);
    const bg = await body.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).toMatch(/rgb\(\s*0,\s*0,\s*0\s*\)/);
    expect(bg).toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
  });

  test("borders are pure black", async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.locator("html").evaluate((el) => {
      el.setAttribute("data-theme", "high-contrast");
    });
    const header = page.locator(".epaper-page-header");
    const borderColor = await header.evaluate(
      (el) => getComputedStyle(el).borderBottomColor
    );
    expect(borderColor).toMatch(/rgb\(\s*0,\s*0,\s*0\s*\)/);
  });
});

test.describe("Scoped themes", () => {
  test("nested data-theme overrides parent", async ({ page }) => {
    await page.goto("/demo/index.html");
    const invertedSection = page.locator('[data-theme="inverted"]').first();
    const bg = await invertedSection.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    expect(bg).not.toMatch(/rgb\(\s*255,\s*255,\s*255\s*\)/);
  });

  test("theme preview cards each show their own theme", async ({ page }) => {
    await page.goto("/demo/index.html");
    const defaultCard = page.locator('[data-theme="default"]').first();
    const invertedCard = page.locator('[data-theme="inverted"]').first();

    const defaultBg = await defaultCard.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    const invertedBg = await invertedCard.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );

    expect(defaultBg).not.toBe(invertedBg);
  });
});
