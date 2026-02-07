import { test, expect, type Page } from "@playwright/test";

const LANDING = "/index.html";

test.describe("Landing page — SEO meta tags", () => {
  test("has meta description", async ({ page }) => {
    await page.goto(LANDING);
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute("content", /CSS-only component library/);
    await expect(desc).toHaveAttribute("content", /E-Ink/);
  });

  test("has Open Graph tags", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "website"
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /epaper-components/
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      /CSS-only component library/
    );
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "epaper-components"
    );
  });

  test("has Twitter Card tags", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary"
    );
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
      "content",
      /epaper-components/
    );
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      "content",
      /CSS-only component library/
    );
  });

  test("has author and theme-color meta", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator('meta[name="author"]')).toHaveAttribute(
      "content",
      "Marco Mattes"
    );
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#ffffff"
    );
  });

  test("has canonical link", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
});

test.describe("Landing page — Hero section", () => {
  test("has main heading", async ({ page }) => {
    await page.goto(LANDING);
    const heading = page.getByRole("heading", {
      name: /CSS component library/,
    });
    await expect(heading).toBeVisible();
  });

  test("has subtitle with key information", async ({ page }) => {
    await page.goto(LANDING);
    const subtitle = page.locator("main >> text=CSS-first design system");
    await expect(subtitle).toBeVisible();
  });

  test("has feature tags", async ({ page }) => {
    await page.goto(LANDING);
    const tagGroup = page.locator("main .epaper-tag-group").first();
    await expect(tagGroup).toBeVisible();
    await expect(tagGroup.locator(".epaper-tag")).toHaveCount(6);
    await expect(
      tagGroup.locator(".epaper-tag--filled", { hasText: "CSS-only" })
    ).toBeVisible();
    await expect(
      tagGroup.locator(".epaper-tag--filled", { hasText: "Zero JavaScript" })
    ).toBeVisible();
  });

  test("has CTA buttons", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a.epaper-btn--primary[href="demo/components.html"]')
    ).toBeVisible();
    await expect(
      page.locator('a.epaper-btn--secondary[href="#getting-started"]')
    ).toBeVisible();
    await expect(
      page.locator('a.epaper-btn--ghost[href="demo-wc/index.html"]')
    ).toBeVisible();
  });
});

test.describe("Landing page — Badges", () => {
  test("displays badge images", async ({ page }) => {
    await page.goto(LANDING);
    const badges = page.locator(".epaper-cluster img[height='20']");
    await expect(badges).toHaveCount(5);
  });

  test("CI badge links to GitHub Actions", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href*="actions/workflows/ci.yml"] img[alt="CI"]')
    ).toHaveCount(1);
  });

  test("Pages badge links to GitHub Actions", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator(
        'a[href*="actions/workflows/pages.yml"] img[alt="Deploy to GitHub Pages"]'
      )
    ).toHaveCount(1);
  });

  test("license badge links to LICENSE file", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href*="blob/main/LICENSE"] img[alt="License"]')
    ).toHaveCount(1);
  });

  test("version badge is present", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator('img[alt="Version"]')).toHaveCount(1);
  });
});

test.describe("Landing page — Quick links", () => {
  test("has GitHub link", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href="https://github.com/marcomattes/epaper-components"]', {
        hasText: "GitHub",
      })
    ).toBeVisible();
  });

  test("has Storybook link", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href="storybook/"]', { hasText: "Storybook" })
    ).toBeVisible();
  });

  test("has Demo Pages link", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href="demo/index.html"]', { hasText: "Demo Pages" })
    ).toBeVisible();
  });

  test("has npm link", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator('a[href="https://www.npmjs.com/package/epaper-components"]', {
        hasText: "npm",
      })
    ).toBeVisible();
  });
});

test.describe("Landing page — Stats section", () => {
  test("displays four stat cards", async ({ page }) => {
    await page.goto(LANDING);
    const stats = page.locator(".epaper-stat");
    await expect(stats).toHaveCount(4);
  });

  test("shows correct stat values", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.locator(".epaper-stat__value", { hasText: "46+" })).toBeVisible();
    await expect(
      page.locator(".epaper-stat__value", { hasText: "0,0,0" })
    ).toBeVisible();
  });

  test("stat labels are present", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.locator(".epaper-stat__label", { hasText: "Components" })
    ).toBeVisible();
    await expect(
      page.locator(".epaper-stat__label", { hasText: "JavaScript Required" })
    ).toBeVisible();
    await expect(
      page.locator(".epaper-stat__label", { hasText: "Built-in Themes" })
    ).toBeVisible();
    await expect(
      page.locator(".epaper-stat__label", { hasText: "CSS Specificity" })
    ).toBeVisible();
  });
});

test.describe("Landing page — Features section", () => {
  test("has features heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.getByRole("heading", { name: "Built for E-Ink, useful everywhere" })
    ).toBeVisible();
  });

  test("displays six feature cards", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Built for E-Ink, useful everywhere",
      }),
    });
    const cards = section.locator(".epaper-card");
    await expect(cards).toHaveCount(6);
  });

  test("feature titles are present", async ({ page }) => {
    await page.goto(LANDING);
    const titles = [
      "E-Ink Optimized",
      "Zero JavaScript",
      "Zero Specificity",
      "Semantic HTML",
      "Three Themes",
      "Web Components",
    ];
    for (const title of titles) {
      await expect(
        page.locator(".epaper-card__title", { hasText: title })
      ).toBeVisible();
    }
  });
});

test.describe("Landing page — Component showcase", () => {
  test("has showcase heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.getByRole("heading", { name: "Component showcase" })
    ).toBeVisible();
  });

  test("displays four showcase cards", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Component showcase" }),
    });
    const cards = section.locator(".epaper-card");
    await expect(cards).toHaveCount(4);
  });

  test("buttons showcase has all variants", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Component showcase" }),
    });
    await expect(section.locator(".epaper-btn--primary").first()).toBeVisible();
    await expect(section.locator(".epaper-btn--secondary").first()).toBeVisible();
    await expect(section.locator(".epaper-btn--ghost").first()).toBeVisible();
  });

  test("form controls showcase has input, select, checkbox", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Component showcase" }),
    });
    await expect(section.locator(".epaper-input")).toBeVisible();
    await expect(section.locator(".epaper-select")).toBeVisible();
    await expect(section.locator(".epaper-checkbox")).toBeVisible();
  });

  test("alerts showcase has info, success, error variants", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Component showcase" }),
    });
    await expect(section.locator(".epaper-alert--info")).toBeVisible();
    await expect(section.locator(".epaper-alert--success")).toBeVisible();
    await expect(section.locator(".epaper-alert--error")).toBeVisible();
  });

  test("tags showcase has all variants", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Component showcase" }),
    });
    await expect(section.locator(".epaper-tag-group")).toBeVisible();
    await expect(section.locator(".epaper-tag--filled")).toBeVisible();
    await expect(section.locator(".epaper-tag--muted")).toBeVisible();
  });
});

test.describe("Landing page — Code tabs", () => {
  test("has tabs heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.getByRole("heading", { name: "Two ways to use it" })
    ).toBeVisible();
  });

  test("CSS tab is selected by default", async ({ page }) => {
    await page.goto(LANDING);
    const cssTab = page.locator("#code-tab-css");
    await expect(cssTab).toBeChecked();
  });

  test("switching to WC tab shows Web Component code", async ({ page }) => {
    await page.goto(LANDING);
    const wcTab = page.locator('label[for="code-tab-wc"]');
    await wcTab.click();
    const wcPanel = page.locator(".epaper-tabs__panel").nth(1);
    await expect(wcPanel).toBeVisible();
    await expect(wcPanel).toContainText("epaper-card raised");
  });

  test("CSS tab shows class-based code", async ({ page }) => {
    await page.goto(LANDING);
    const cssPanel = page.locator(".epaper-tabs__panel").first();
    await expect(cssPanel).toBeVisible();
    await expect(cssPanel).toContainText('class="epaper-card epaper-card--raised"');
  });
});

test.describe("Landing page — Theme preview", () => {
  test("has themes heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.getByRole("heading", { name: "Three built-in themes" })
    ).toBeVisible();
  });

  test("displays three theme cards", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Three built-in themes" }),
    });
    await expect(section.locator('[data-theme="default"].epaper-card')).toBeVisible();
    await expect(section.locator('[data-theme="inverted"].epaper-card')).toBeVisible();
    await expect(
      section.locator('[data-theme="high-contrast"].epaper-card')
    ).toBeVisible();
  });

  test("each theme card has buttons", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Three built-in themes" }),
    });
    const themeCards = section.locator(".epaper-card");
    for (let i = 0; i < 3; i++) {
      const card = themeCards.nth(i);
      await expect(card.locator(".epaper-btn--primary")).toBeVisible();
      await expect(card.locator(".epaper-btn--secondary")).toBeVisible();
    }
  });
});

test.describe("Landing page — Philosophy blockquote", () => {
  test("has pullquote", async ({ page }) => {
    await page.goto(LANDING);
    const quote = page.locator(".epaper-blockquote--pull");
    await expect(quote).toBeVisible();
    await expect(quote).toContainText("E-Ink screens refresh at 300ms");
  });
});

test.describe("Landing page — Real-world examples", () => {
  test("has examples heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(
      page.getByRole("heading", { name: "Real-world examples" })
    ).toBeVisible();
  });

  test("displays three example cards with links", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Real-world examples" }),
    });
    await expect(
      section.locator(".epaper-card--raised", { hasText: "Newsreader" })
    ).toBeVisible();
    await expect(
      section.locator(".epaper-card--raised", { hasText: "Blog" })
    ).toBeVisible();
    await expect(
      section.locator(".epaper-card--raised", { hasText: "Dashboard" })
    ).toBeVisible();

    await expect(section.locator('a[href="demo/newsreader.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/blog.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/dashboard.html"]')).toBeVisible();
  });
});

test.describe("Landing page — Getting started", () => {
  test("has getting-started section with anchor", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("#getting-started");
    await expect(section).toBeVisible();
  });

  test("has four steps", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("#getting-started");
    await expect(
      section.getByRole("heading", { name: /Include the CSS/ })
    ).toBeVisible();
    await expect(section.getByRole("heading", { name: /Set a theme/ })).toBeVisible();
    await expect(
      section.getByRole("heading", { name: /Use components/ })
    ).toBeVisible();
    await expect(
      section.getByRole("heading", { name: /Add Web Components/ })
    ).toBeVisible();
  });

  test("has no-build-step alert", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("#getting-started");
    const alert = section.locator(".epaper-alert--info");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("No build step required");
  });

  test("anchor link from hero works", async ({ page }) => {
    await page.goto(LANDING);
    await page.locator('a[href="#getting-started"]').click();
    const section = page.locator("#getting-started");
    await expect(section).toBeInViewport();
  });
});

test.describe("Landing page — Explore docs", () => {
  test("has explore heading", async ({ page }) => {
    await page.goto(LANDING);
    await expect(page.getByRole("heading", { name: "Explore the docs" })).toBeVisible();
  });

  test("has six doc category cards", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Explore the docs" }),
    });
    const cards = section.locator(".epaper-card");
    await expect(cards).toHaveCount(6);
  });

  test("doc links navigate to correct pages", async ({ page }) => {
    await page.goto(LANDING);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Explore the docs" }),
    });
    await expect(section.locator('a[href="demo/typography.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/layout.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/components.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/forms.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/dialog.html"]')).toBeVisible();
    await expect(section.locator('a[href="demo/tables.html"]')).toBeVisible();
  });
});

test.describe("Landing page — Visual regression", () => {
  test("full-page screenshot", async ({ page }) => {
    await page.setViewportSize({ width: 1300, height: 2400 });
    await page.goto(LANDING, { waitUntil: "networkidle" });
    await expect(page).toHaveScreenshot("landing-full.png", {
      fullPage: true,
      animations: "disabled",
    });
  });
});
