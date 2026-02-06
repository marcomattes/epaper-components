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
      '<article class="eink-card"><h3>Release Notes</h3><p>Neue Utility-Klassen für responsive Layouts.</p><button class="eink-button">Mehr lesen</button></article>',
  },
  {
    title: "Formulare mit klarer Hierarchie",
    description:
      "Eingaben, Fieldsets und Error-Patterns sind auf Lesbarkeit in E-Ink-Umgebungen optimiert.",
    snippet:
      '<form class="eink-form-shell"><label for="mail">E-Mail</label><input id="mail" class="eink-input" type="email" placeholder="name@example.com" /><button class="eink-button">Absenden</button></form>',
  },
  {
    title: "Tabellen & Datenansichten",
    description:
      "Von kompakten Tabellen bis zu breiten Datenansichten inklusive Stripe/Borders.",
    snippet:
      '<table class="eink-table eink-table--striped"><thead><tr><th>Name</th><th>Status</th></tr></thead><tbody><tr><td>Sync</td><td>Aktiv</td></tr></tbody></table>',
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
        ({ label, storyPath }) =>
          `<li><a href="?path=${storyPath}">${label}</a></li>`,
      )
      .join("");

    const showcase = showcaseItems
      .map(
        ({ title, description, snippet }) => `
          <article class="eink-card">
            <h3>${title}</h3>
            <p>${description}</p>
            <pre><code>${snippet}</code></pre>
          </article>
        `,
      )
      .join("");

    return `
      <div class="eink-stack" style="padding: 1rem; max-width: 72rem; margin: 0 auto;">
        <header class="eink-stack">
          <h1>E-Ink CSS UI Framework</h1>
          <p>
            Willkommen im Storybook. Starte hier mit schnellen Links und ausgewählten
            Showcase-Elementen aus der Library.
          </p>
        </header>

        <section class="eink-card">
          <h2>Schnellzugriff</h2>
          <p>Direkt zu den wichtigsten Story-Gruppen springen:</p>
          <ul>
            ${links}
          </ul>
        </section>

        <section class="eink-stack">
          <h2>Showcase</h2>
          ${showcase}
        </section>
      </div>
    `;
  },
};
