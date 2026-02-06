import { test, expect, type Page } from "@playwright/test";

const PAGES: ReadonlyArray<[path: string, name: string]> = [
  ["/demo/index.html", "Overview"],
  ["/demo/typography.html", "Typography"],
  ["/demo/layout.html", "Layout"],
  ["/demo/components.html", "Components"],
  ["/demo/forms.html", "Forms"],
  ["/demo/dialog.html", "Dialog"],
  ["/demo/tables.html", "Tables"],
  ["/demo/newsreader.html", "Newsreader"],
  ["/demo/blog.html", "Blog"],
  ["/demo/dashboard.html", "Dashboard"],
];

for (const [path, name] of PAGES) {
  test.describe(`${name} page (${path})`, () => {
    test("all CSS files loaded", async ({ page }) => {
      const failedCSS: string[] = [];
      page.on("response", (res) => {
        if (res.url().endsWith(".css") && res.status() !== 200) {
          failedCSS.push(res.url());
        }
      });

      await page.goto(path);
      expect(failedCSS).toEqual([]);
    });

    test("has page header and footer", async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("header.eink-page-header")).toBeVisible();
      await expect(page.locator("footer.eink-page-footer")).toBeVisible();
    });

    test("navigation links are present", async ({ page }) => {
      await page.goto(path);
      const nav = page.locator(".eink-nav");
      await expect(nav).toBeVisible();
      await expect(nav.locator("a")).toHaveCount(10);
    });

    test("current page is marked in nav", async ({ page }) => {
      await page.goto(path);
      const current = page.locator('.eink-nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(name);
    });

    test("visual snapshot", async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name.toLowerCase()}.png`, {
        fullPage: true,
      });
    });
  });
}
