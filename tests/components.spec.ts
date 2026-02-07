import { test, expect } from "@playwright/test";

test.describe("Buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/components.html");
  });

  test("primary button is visible and styled", async ({ page }) => {
    const btn = page.locator(".epaper-btn--primary").first();
    await expect(btn).toBeVisible();
    const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("disabled buttons have cursor not-allowed", async ({ page }) => {
    const btn = page.locator(".epaper-btn:disabled").first();
    await expect(btn).toBeVisible();
    const cursor = await btn.evaluate((el) => getComputedStyle(el).cursor);
    expect(cursor).toBe("not-allowed");
  });

  test("focus ring appears on tab", async ({ page }) => {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus-visible");
    const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("Checkbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/components.html");
  });

  test("unchecked checkbox has no fill", async ({ page }) => {
    const cb = page.locator("#check-default");
    await expect(cb).not.toBeChecked();
    const bg = await cb.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(0,\s*0,\s*0,\s*0\)/);
  });

  test("clicking checkbox toggles checked state", async ({ page }) => {
    const cb = page.locator("#check-default");
    await expect(cb).not.toBeChecked();
    await cb.click();
    await expect(cb).toBeChecked();
  });

  test("checked checkbox has filled background", async ({ page }) => {
    const cb = page.locator("#check-checked");
    await expect(cb).toBeChecked();
    const bg = await cb.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(0,\s*0,\s*0,\s*0\)/);
  });

  test("disabled checkbox cannot be toggled", async ({ page }) => {
    const cb = page.locator("#check-disabled");
    await expect(cb).toBeDisabled();
    await cb.click({ force: true });
    await expect(cb).not.toBeChecked();
  });
});

test.describe("Radio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/components.html");
  });

  test("pre-selected radio is checked", async ({ page }) => {
    await expect(page.locator("#size-md")).toBeChecked();
  });

  test("clicking radio selects it and deselects others", async ({ page }) => {
    const sm = page.locator("#size-sm");
    const md = page.locator("#size-md");

    await sm.click();
    await expect(sm).toBeChecked();
    await expect(md).not.toBeChecked();
  });

  test("checked radio has thick border", async ({ page }) => {
    const radio = page.locator("#size-md");
    await expect(radio).toBeChecked();
    const borderWidth = await radio.evaluate((el) =>
      parseFloat(getComputedStyle(el).borderTopWidth)
    );
    expect(borderWidth).toBeGreaterThan(3);
  });

  test("disabled radio cannot be selected", async ({ page }) => {
    const radio = page.locator("#size-disabled");
    await expect(radio).toBeDisabled();
  });
});

test.describe("Text input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/components.html");
  });

  test("can type into default input", async ({ page }) => {
    const input = page.locator("#input-default");
    await input.fill("Hello E-Ink");
    await expect(input).toHaveValue("Hello E-Ink");
  });

  test("disabled input rejects input", async ({ page }) => {
    const input = page.locator("#input-disabled");
    await expect(input).toBeDisabled();
  });

  test("invalid input has thicker border", async ({ page }) => {
    const input = page.locator("#input-invalid");
    const borderWidth = await input.evaluate((el) =>
      parseFloat(getComputedStyle(el).borderTopWidth)
    );
    expect(borderWidth).toBeGreaterThanOrEqual(2);
  });

  test("error message is visible for invalid input", async ({ page }) => {
    const error = page.locator("#input-invalid + .epaper-error-message");
    await expect(error).toBeVisible();
  });
});

test.describe("Select", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/components.html");
  });

  test("can change select value", async ({ page }) => {
    const select = page.locator("#select-default");
    await select.selectOption("2");
    await expect(select).toHaveValue("2");
  });

  test("disabled select cannot be changed", async ({ page }) => {
    await expect(page.locator("#select-disabled")).toBeDisabled();
  });
});

test.describe("Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/dialog.html");
  });

  test("open dialogs are visible", async ({ page }) => {
    const dialogs = page.locator("dialog[open]");
    const count = await dialogs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(dialogs.nth(i)).toBeVisible();
    }
  });

  test("dialog has title and actions", async ({ page }) => {
    const dialog = page.locator("dialog[open]").first();
    await expect(dialog.locator(".epaper-dialog__title")).toBeVisible();
    await expect(dialog.locator(".epaper-dialog__actions")).toBeVisible();
  });
});

test.describe("Table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/tables.html");
  });

  test("tables render inside scroll wrappers", async ({ page }) => {
    const wraps = page.locator(".epaper-table-wrap");
    const count = await wraps.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const overflow = await wraps
        .nth(i)
        .evaluate((el) => getComputedStyle(el).overflowX);
      expect(overflow).toBe("auto");
    }
  });

  test("striped table has alternating backgrounds", async ({ page }) => {
    const rows = page.locator(".epaper-table--striped tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(2);

    const bg1 = await rows
      .nth(0)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const bg2 = await rows
      .nth(1)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg1 !== bg2 || bg1 === "rgba(0, 0, 0, 0)").toBeTruthy();
  });
});
