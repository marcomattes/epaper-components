import type { Meta, StoryObj } from "@storybook/html";

const ROWS = `
  <tr><td>Kindle Paperwhite</td><td>6.8"</td><td>1236 &times; 1648</td><td>300</td></tr>
  <tr><td>Kindle Scribe</td><td>10.2"</td><td>1860 &times; 2480</td><td>300</td></tr>
  <tr><td>Kobo Libra 2</td><td>7.0"</td><td>1264 &times; 1680</td><td>300</td></tr>
  <tr><td>Tolino Vision 6</td><td>7.0"</td><td>1264 &times; 1680</td><td>300</td></tr>
  <tr><td>reMarkable 2</td><td>10.3"</td><td>1404 &times; 1872</td><td>226</td></tr>`;

const HEAD = `<tr><th>Device</th><th>Screen</th><th>Resolution</th><th>PPI</th></tr>`;

function table(modifiers: string) {
  return `
    <div class="epaper-table-wrap">
      <table class="epaper-table ${modifiers}">
        <thead>${HEAD}</thead>
        <tbody>${ROWS}</tbody>
      </table>
    </div>`;
}

const meta: Meta = {
  title: "Components/Table",
};

export default meta;
type Story = StoryObj;

export const Basic: Story = { render: () => table("") };

export const Striped: Story = { render: () => table("eink-table--striped") };

export const Bordered: Story = { render: () => table("eink-table--bordered") };

export const Compact: Story = { render: () => table("eink-table--compact") };

export const StripedCompact: Story = {
  render: () => table("eink-table--striped eink-table--compact"),
};

export const WideScroll: Story = {
  render: () => `
    <div class="epaper-table-wrap">
      <table class="epaper-table eink-table--bordered">
        <thead>
          <tr><th>Mode</th><th>Speed</th><th>Ghosting</th><th>Flash</th><th>Levels</th><th>Best for</th><th>UI impact</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr><td>GC16</td><td>~450ms</td><td>None</td><td>Full</td><td>16</td><td>Pages</td><td>Full repaint</td><td>Clears artifacts</td></tr>
          <tr><td>DU</td><td>~120ms</td><td>Low</td><td>None</td><td>2</td><td>Text</td><td>Partial</td><td>No grayscale</td></tr>
          <tr><td>A2</td><td>~80ms</td><td>High</td><td>None</td><td>2</td><td>Menus</td><td>Minimal</td><td>Needs periodic GC16</td></tr>
        </tbody>
      </table>
    </div>`,
};
