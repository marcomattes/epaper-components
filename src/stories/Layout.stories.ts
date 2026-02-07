import type { Meta, StoryObj } from "@storybook/html";

const box = (text: string) =>
  `<div style="border:1px dashed var(--epaper-border-color);padding:var(--epaper-space-3);text-align:center;font-size:var(--epaper-text-sm);color:var(--epaper-fg-muted);background:var(--epaper-bg-subtle)">${text}</div>`;

const meta: Meta = {
  title: "Foundations/Layout",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Layout primitives favor borders and stable spacing to avoid E-Ink ghosting. Combine container, stack, cluster, grid, divider, and section patterns for responsive pages.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Stack: Story = {
  render: () => `
    <div style="display:flex;gap:var(--epaper-space-6)">
      <div>
        <span class="epaper-badge">--sm</span>
        <div class="epaper-stack eink-stack--sm" style="margin-top:var(--epaper-space-2)">
          ${box("1")}${box("2")}${box("3")}
        </div>
      </div>
      <div>
        <span class="epaper-badge">default</span>
        <div class="epaper-stack" style="margin-top:var(--epaper-space-2)">
          ${box("1")}${box("2")}${box("3")}
        </div>
      </div>
      <div>
        <span class="epaper-badge">--lg</span>
        <div class="epaper-stack eink-stack--lg" style="margin-top:var(--epaper-space-2)">
          ${box("1")}${box("2")}${box("3")}
        </div>
      </div>
    </div>`,
};

export const Cluster: Story = {
  render: () => `
    <div class="epaper-cluster">
      ${box("Alpha")}${box("Bravo")}${box("Charlie")}${box("Delta")}${box("Echo")}${box("Foxtrot")}${box("Golf")}
    </div>`,
};

export const GridDefault: Story = {
  name: "Grid (16rem)",
  render: () => `
    <div class="epaper-grid">
      ${box("1")}${box("2")}${box("3")}${box("4")}${box("5")}${box("6")}
    </div>`,
};

export const GridWide: Story = {
  name: "Grid (22rem)",
  render: () => `
    <div class="epaper-grid" style="--epaper-grid-min:22rem">
      ${box("1")}${box("2")}${box("3")}${box("4")}
    </div>`,
};

export const Divider: Story = {
  render: () => `
    <p>Content above.</p>
    <hr class="epaper-divider">
    <p>Between dividers.</p>
    <hr class="epaper-divider eink-divider--strong">
    <p>Below strong divider.</p>`,
};

export const Sections: Story = {
  render: () => `
    <div style="border:var(--epaper-border-thin) solid var(--epaper-border-color)">
      <div class="epaper-page-header" style="margin-bottom:0">
        <div style="padding-inline:var(--epaper-space-4)"><strong>Page Header</strong></div>
      </div>
      <div class="epaper-section" style="padding-inline:var(--epaper-space-4)">Section 1</div>
      <div class="epaper-section" style="padding-inline:var(--epaper-space-4)">Section 2 (auto border-top)</div>
      <div class="epaper-page-footer" style="margin-top:0">
        <div style="padding-inline:var(--epaper-space-4)"><small>Page Footer</small></div>
      </div>
    </div>`,
};
