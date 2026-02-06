import { test, expect } from "@playwright/test";

const WC_PAGES: ReadonlyArray<[path: string, name: string]> = [
  ["/demo-wc/index.html", "Overview"],
  ["/demo-wc/layout.html", "Layout"],
  ["/demo-wc/components.html", "Components"],
  ["/demo-wc/forms.html", "Forms"],
];

for (const [path, name] of WC_PAGES) {
  test.describe(`WC ${name} page (${path})`, () => {
    test("CSS and JS loaded", async ({ page }) => {
      const failed: string[] = [];
      page.on("response", (res) => {
        const url = res.url();
        if ((url.endsWith(".css") || url.endsWith(".js")) && res.status() !== 200) {
          failed.push(url);
        }
      });

      await page.goto(path);
      expect(failed).toEqual([]);
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
      await expect(nav.locator("a")).toHaveCount(4);
    });

    test("current page is marked in nav", async ({ page }) => {
      await page.goto(path);
      const current = page.locator('.eink-nav a[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(name);
    });

    test("web components are registered", async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const defined = await page.evaluate(
        () => customElements.get("eink-button") !== undefined
      );
      expect(defined).toBe(true);
    });

    test("visual snapshot", async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page).toHaveScreenshot(`wc-${name.toLowerCase()}.png`, {
        fullPage: true,
      });
    });
  });
}

// WC-specific: verify custom elements render with correct CSS classes
test.describe("WC demo — element rendering", () => {
  test("eink-card renders as block with border", async ({ page }) => {
    await page.goto("/demo-wc/components.html", { waitUntil: "networkidle" });
    const card = page.locator("eink-card").first();
    await expect(card).toBeVisible();
    const display = await card.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("block");
  });

  test("eink-button renders inner button with correct classes", async ({ page }) => {
    await page.goto("/demo-wc/components.html", { waitUntil: "networkidle" });
    const btn = page.locator("eink-button[variant='primary'] button").first();
    await expect(btn).toBeVisible();
    await expect(btn).toHaveClass(/eink-btn--primary/);
  });

  test("eink-stack has flex display", async ({ page }) => {
    await page.goto("/demo-wc/layout.html", { waitUntil: "networkidle" });
    const stack = page.locator("eink-stack").first();
    const display = await stack.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("flex");
  });

  test("eink-grid has grid display", async ({ page }) => {
    await page.goto("/demo-wc/layout.html", { waitUntil: "networkidle" });
    const grid = page.locator("eink-grid").first();
    const display = await grid.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("grid");
  });

  test("eink-alert variant attribute applies styles", async ({ page }) => {
    await page.goto("/demo-wc/components.html", { waitUntil: "networkidle" });
    const alert = page.locator('eink-alert[variant="error"]');
    await expect(alert).toBeVisible();
    const bg = await alert.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should have a non-transparent background for error variant
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("eink-input creates inner input element", async ({ page }) => {
    await page.goto("/demo-wc/forms.html", { waitUntil: "networkidle" });
    const input = page.locator("eink-input input").first();
    await expect(input).toBeVisible();
    await expect(input).toHaveClass(/eink-input/);
  });

  test("eink-select creates inner select element", async ({ page }) => {
    await page.goto("/demo-wc/forms.html", { waitUntil: "networkidle" });
    const select = page.locator("eink-select select").first();
    await expect(select).toBeVisible();
    await expect(select).toHaveClass(/eink-select/);
  });

  test("eink-checkbox creates inner checkbox", async ({ page }) => {
    await page.goto("/demo-wc/forms.html", { waitUntil: "networkidle" });
    const cb = page.locator("eink-checkbox input[type='checkbox']").first();
    await expect(cb).toBeVisible();
  });

  test("eink-divider renders as block with border", async ({ page }) => {
    await page.goto("/demo-wc/layout.html", { waitUntil: "networkidle" });
    const divider = page.locator("eink-divider").first();
    const display = await divider.evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe("block");
  });
});

// ARIA verification on WC demo pages
test.describe("WC demo — ARIA attributes", () => {
  test("alerts on components page have role attributes", async ({ page }) => {
    await page.goto("/demo-wc/components.html", { waitUntil: "networkidle" });
    const infoAlert = page.locator('eink-alert[variant="info"]');
    await expect(infoAlert).toHaveAttribute("role", "status");
    const errorAlert = page.locator('eink-alert[variant="error"]');
    await expect(errorAlert).toHaveAttribute("role", "alert");
  });

  test("invalid input on forms page forwards aria-describedby to inner input", async ({
    page,
  }) => {
    await page.goto("/demo-wc/forms.html", { waitUntil: "networkidle" });
    const input = page.locator(
      'eink-input[aria-describedby="wc-input-invalid-error"] input'
    );
    await expect(input).toHaveAttribute("aria-describedby", "wc-input-invalid-error");
  });

  test("dividers have role=separator", async ({ page }) => {
    await page.goto("/demo-wc/layout.html", { waitUntil: "networkidle" });
    const divider = page.locator("eink-divider").first();
    await expect(divider).toHaveAttribute("role", "separator");
  });
});
