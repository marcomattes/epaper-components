import { expect, test, type Locator, type Page } from "@playwright/test";

type SectionTarget = {
  path: string;
  label: string;
  heading?: { name: string; level?: number };
  locator?: (page: Page) => Locator;
};

const sectionByHeading = (page: Page, name: string, level = 2) =>
  page
    .locator("section, article")
    .filter({ has: page.getByRole("heading", { name, level }) });

const TARGETS: SectionTarget[] = [
  // Components page — one snapshot per component section
  { path: "/demo/components.html", label: "card", heading: { name: "Card" } },
  { path: "/demo/components.html", label: "buttons", heading: { name: "Buttons" } },
  {
    path: "/demo/components.html",
    label: "text-input",
    heading: { name: "Text input" },
  },
  { path: "/demo/components.html", label: "textarea", heading: { name: "Textarea" } },
  { path: "/demo/components.html", label: "select", heading: { name: "Select" } },
  { path: "/demo/components.html", label: "checkbox", heading: { name: "Checkbox" } },
  { path: "/demo/components.html", label: "radio", heading: { name: "Radio" } },
  { path: "/demo/components.html", label: "picture", heading: { name: "Picture" } },
  {
    path: "/demo/components.html",
    label: "additional-components",
    heading: { name: "Additional components" },
  },

  // Forms page — key patterns
  {
    path: "/demo/forms.html",
    label: "error-summary",
    heading: { name: "Error summary" },
  },
  {
    path: "/demo/forms.html",
    label: "complete-form",
    heading: { name: "Complete form example" },
  },
  {
    path: "/demo/forms.html",
    label: "fieldset-grouping",
    heading: { name: "Fieldset grouping" },
  },
  {
    path: "/demo/forms.html",
    label: "form-layout-patterns",
    heading: { name: "Layout patterns" },
  },

  // Layout primitives
  { path: "/demo/layout.html", label: "container", heading: { name: "Container" } },
  { path: "/demo/layout.html", label: "stack", heading: { name: "Stack" } },
  { path: "/demo/layout.html", label: "cluster", heading: { name: "Cluster" } },
  { path: "/demo/layout.html", label: "grid", heading: { name: "Grid" } },
  { path: "/demo/layout.html", label: "divider", heading: { name: "Divider" } },
  {
    path: "/demo/layout.html",
    label: "page-structure",
    heading: { name: "Page structure" },
  },

  // Typography specimens
  {
    path: "/demo/typography.html",
    label: "type-scale",
    heading: { name: "Type scale" },
  },
  {
    path: "/demo/typography.html",
    label: "font-stacks",
    heading: { name: "Font stacks" },
  },
  {
    path: "/demo/typography.html",
    label: "line-length",
    heading: { name: "Line length (measure)" },
  },
  {
    path: "/demo/typography.html",
    label: "prose-block",
    heading: { name: "Prose block" },
  },
  {
    path: "/demo/typography.html",
    label: "inline-elements",
    heading: { name: "Inline elements" },
  },
  {
    path: "/demo/typography.html",
    label: "code-block",
    heading: { name: "Code block" },
  },
  {
    path: "/demo/typography.html",
    label: "hyphenation-word-break",
    heading: { name: "Hyphenation & word-break" },
  },

  // Dialog variants
  {
    path: "/demo/dialog.html",
    label: "dialog-native",
    heading: { name: "Native dialog element" },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-trigger",
    heading: { name: "Interactive trigger with polyfill", level: 3 },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-simple",
    heading: { name: "Simple confirmation dialog", level: 3 },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-form",
    heading: { name: "Dialog with form content", level: 3 },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-scrollable",
    heading: { name: "Dialog with scrollable content", level: 3 },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-theme-variants",
    heading: { name: "Theme variants", level: 3 },
  },
  {
    path: "/demo/dialog.html",
    label: "dialog-notes",
    heading: { name: "Implementation notes" },
  },

  // Tables variants
  {
    path: "/demo/tables.html",
    label: "tables-responsive-strategy",
    heading: { name: "Responsive strategy" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-basic",
    heading: { name: "Basic table" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-striped",
    heading: { name: "Striped table" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-bordered",
    heading: { name: "Bordered table" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-compact",
    heading: { name: "Compact table" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-wide",
    heading: { name: "Wide table (horizontal scroll)" },
  },
  {
    path: "/demo/tables.html",
    label: "tables-theme-comparison",
    heading: { name: "Theme comparison" },
  },
];

for (const target of TARGETS) {
  test.describe(`${target.path} – ${target.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1300, height: 2400 });
      await page.goto(target.path, { waitUntil: "networkidle" });
    });

    test("visual + aria snapshot", async ({ page }) => {
      const locator = target.locator
        ? target.locator(page)
        : sectionByHeading(page, target.heading!.name, target.heading!.level ?? 2);

      const element = locator.first();
      await expect(element).toBeVisible();
      await element.scrollIntoViewIfNeeded();

      await expect(element).toHaveScreenshot(`${target.label}.png`, {
        animations: "disabled",
        caret: "hide",
      });
    });
  });
}
