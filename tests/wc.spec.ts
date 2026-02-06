import { test, expect } from "@playwright/test";

const bootstrap = `
  <html data-theme="default">
    <head>
      <link rel="stylesheet" href="/dist/eink-ui.css">
      <script type="module">
        import { defineEinkElements } from "/dist/wc/index.js";
        defineEinkElements();
      </script>
    </head>
    <body>
      <eink-button id="btn" variant="primary" size="sm">OK</eink-button>
      <eink-input id="input" type="email" aria-invalid="true" placeholder="mail"></eink-input>
      <eink-checkbox id="cb" checked>Accept</eink-checkbox>
      <eink-grid id="grid" min="18rem">
        <div>One</div><div>Two</div>
      </eink-grid>
    </body>
  </html>
`;

test.describe("Web Components (light DOM)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to server first so relative/absolute paths resolve correctly
    await page.goto("/");
    await page.setContent(bootstrap, { waitUntil: "networkidle" });
  });

  test("button maps attributes to classes and disabled reflects", async ({ page }) => {
    const btn = page.locator("#btn button");
    await expect(btn).toHaveClass(/eink-btn/);
    await expect(btn).toHaveClass(/eink-btn--primary/);
    await expect(btn).toHaveClass(/eink-btn--sm/);

    await page
      .locator("#btn")
      .evaluate((el) => el.setAttribute("variant", "secondary"));
    await expect(btn).toHaveClass(/eink-btn--secondary/);

    await page.locator("#btn").evaluate((el) => el.setAttribute("disabled", ""));
    await expect(btn).toBeDisabled();
  });

  test("form controls reflect attributes to native inputs", async ({ page }) => {
    const input = page.locator("#input input");
    await expect(input).toHaveAttribute("type", "email");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("placeholder", "mail");

    const cb = page.locator("#cb input");
    await expect(cb).toBeChecked();
    await page.locator("#cb").evaluate((el) => el.removeAttribute("checked"));
    await expect(cb).not.toBeChecked();
  });

  test("style vars propagate (grid min column width)", async ({ page }) => {
    const grid = page.locator("#grid");
    await expect(grid).toHaveAttribute("min", "18rem");
    const styleVal = await grid.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--eink-grid-min").trim()
    );
    expect(styleVal).toBe("18rem");
  });
});
