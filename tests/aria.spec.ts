import { test, expect } from "@playwright/test";

test.describe("ARIA — CSS demo pages", () => {
  // Alerts
  test.describe("Alerts", () => {
    test("info/success/warning alerts have role=status", async ({ page }) => {
      await page.goto("/demo/components.html");
      for (const variant of ["info", "success", "warning"]) {
        const alert = page.locator(`.eink-alert--${variant}`).first();
        await expect(alert).toHaveAttribute("role", "status");
      }
    });

    test("error alert has role=alert", async ({ page }) => {
      await page.goto("/demo/components.html");
      const alert = page.locator(".eink-alert--error").first();
      await expect(alert).toHaveAttribute("role", "alert");
    });

    test("dashboard alert has role=status", async ({ page }) => {
      await page.goto("/demo/dashboard.html");
      const alert = page.locator(".eink-alert--warning").first();
      await expect(alert).toHaveAttribute("role", "status");
    });
  });

  // Dialogs
  test.describe("Dialogs", () => {
    test("all dialogs have aria-labelledby pointing to existing title", async ({
      page,
    }) => {
      await page.goto("/demo/dialog.html");
      const dialogs = page.locator("dialog[aria-labelledby]");
      const count = await dialogs.count();
      expect(count).toBeGreaterThanOrEqual(4);

      for (let i = 0; i < count; i++) {
        const dialog = dialogs.nth(i);
        const labelledBy = await dialog.getAttribute("aria-labelledby");
        expect(labelledBy).toBeTruthy();
        const title = page.locator(`#${labelledBy!}`);
        await expect(title).toBeAttached();
      }
    });
  });

  // Invalid inputs
  test.describe("Invalid inputs linked to error messages", () => {
    test("invalid input has aria-describedby pointing to error span", async ({
      page,
    }) => {
      await page.goto("/demo/components.html");
      const input = page.locator("#input-invalid");
      await expect(input).toHaveAttribute("aria-describedby", "input-invalid-error");
      await expect(page.locator("#input-invalid-error")).toBeAttached();
    });

    test("invalid textarea has aria-describedby pointing to error span", async ({
      page,
    }) => {
      await page.goto("/demo/components.html");
      const textarea = page.locator("#textarea-invalid");
      await expect(textarea).toHaveAttribute(
        "aria-describedby",
        "textarea-invalid-error"
      );
      await expect(page.locator("#textarea-invalid-error")).toBeAttached();
    });

    test("invalid select has aria-describedby pointing to error span", async ({
      page,
    }) => {
      await page.goto("/demo/components.html");
      const select = page.locator("#select-invalid");
      await expect(select).toHaveAttribute("aria-describedby", "select-invalid-error");
      await expect(page.locator("#select-invalid-error")).toBeAttached();
    });
  });

  // Progress bars
  test.describe("Progress bars", () => {
    test("components page progress has role=progressbar with aria-value attrs", async ({
      page,
    }) => {
      await page.goto("/demo/components.html");
      const progress = page.locator('[role="progressbar"]').first();
      await expect(progress).toHaveAttribute("aria-valuenow", "65");
      await expect(progress).toHaveAttribute("aria-valuemin", "0");
      await expect(progress).toHaveAttribute("aria-valuemax", "100");
      await expect(progress).toHaveAttribute("aria-label", "Chapter progress");
    });

    test("dashboard page progress bars have role=progressbar", async ({ page }) => {
      await page.goto("/demo/dashboard.html");
      const progressBars = page.locator('[role="progressbar"]');
      const count = await progressBars.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  // Toolbars
  test.describe("Toolbars", () => {
    test("components page toolbar has role=toolbar with aria-label", async ({
      page,
    }) => {
      await page.goto("/demo/components.html");
      const toolbar = page.locator('[role="toolbar"]');
      await expect(toolbar).toHaveAttribute("aria-label", "Font settings");
    });

    test("dashboard page toolbars have role=toolbar", async ({ page }) => {
      await page.goto("/demo/dashboard.html");
      const toolbars = page.locator('[role="toolbar"]');
      const count = await toolbars.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // Table headers
  test.describe("Table headers", () => {
    test("dashboard table headers have scope=col", async ({ page }) => {
      await page.goto("/demo/dashboard.html");
      const ths = page.locator("th[scope='col']");
      const count = await ths.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});
