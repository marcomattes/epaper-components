import type { Meta } from "@storybook/html";

const quickLinks = [
  { label: "Layout", storyPath: "/story/layout-page-structure" },
  { label: "Typography", storyPath: "/story/typography-type-scale" },
  { label: "Buttons", storyPath: "/story/components-button" },
  { label: "Form", storyPath: "/story/form-complete-form" },
  { label: "Tables", storyPath: "/story/table-basic" },
  { label: "Dialog", storyPath: "/story/dialog-simple" },
  { label: "Web Components", storyPath: "/story/web-components-button-basic" },
];

const showcaseItems = [
  {
    title: "Karten & Content-Blöcke",
    description:
      "Nutze Card, Divider und Prose-Utilities, um Inhalte klar zu gliedern.",
    snippet:
      '<article class="epaper-card"><h3>Release Notes</h3><p>Neue Utility-Klassen für responsive Layouts.</p><button class="epaper-button">Mehr lesen</button></article>',
    storyPath: "/story/components-card",
  },
  {
    title: "Formulare mit klarer Hierarchie",
    description:
      "Eingaben, Fieldsets und Error-Patterns sind auf Lesbarkeit in E-Ink-Umgebungen optimiert.",
    snippet:
      '<form class="epaper-form-shell"><label for="mail">E-Mail</label><input id="mail" class="epaper-input" type="email" placeholder="name@example.com" /><button class="epaper-button">Absenden</button></form>',
    storyPath: "/story/form-complete-form",
  },
  {
    title: "Tabellen & Datenansichten",
    description:
      "Von kompakten Tabellen bis zu breiten Datenansichten inklusive Stripe/Borders.",
    snippet:
      '<table class="epaper-table eink-table--striped"><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>Sync</td><td>Aktiv</td></tr></tbody></table>',
    storyPath: "/story/table-basic",
  },
];

const meta: Meta = {
  title: "Docs/_Base",
};

export default meta;

export const Placeholder = {
  name: "Start",
  render: () => {
    const links = quickLinks
      .map(
        ({ label, storyPath }) => `<li><a href="?path=${storyPath}">${label}</a></li>`
      )
      .join("");

    const showcase = showcaseItems
      .map(
        ({ title, description, snippet, storyPath }) => `
          <article class="epaper-card">
            <h3>${title}</h3>
            <p>${description}</p>
            <pre><code>${snippet}</code></pre>
            <p><a class="epaper-button" href="?path=${storyPath}">Mehr lesen</a></p>
          </article>
        `
      )
      .join("");

    return `
      <div class="epaper-stack" style="padding: 1rem; max-width: 72rem; margin: 0 auto;">
        <header class="epaper-stack">
          <h1>E-Ink CSS UI Framework</h1>
          <p>
            Willkommen im Storybook. Starte hier mit schnellen Links und ausgewählten
            Showcase-Elementen aus der Library.
          </p>
        </header>

        <section class="epaper-card">
          <h2>Schnellzugriff</h2>
          <p>Direkt zu den wichtigsten Story-Gruppen springen:</p>
          <ul>
            ${links}
          </ul>
        </section>

        <section class="epaper-stack">
          <h2>Showcase</h2>
          ${showcase}
        </section>
      </div>
    `;
  },
};
