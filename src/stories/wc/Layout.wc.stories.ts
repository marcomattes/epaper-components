import type { Meta, StoryObj } from "@storybook/html";

interface GridArgs {
  min: string;
}

const meta: Meta<GridArgs> = {
  title: "Web Components/Layout",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Layout primitives as custom elements. Styles rely on CSS vars; attributes reflect into class or style-var changes for low repaint on E-Ink.",
      },
    },
  },
  argTypes: {
    min: {
      control: "text",
      description:
        "Value for --epaper-grid-min via the min attribute (e.g., 14rem, 220px)",
    },
  },
  args: {
    min: "18rem",
  },
};

export default meta;
type Story = StoryObj<GridArgs>;

export const Grid: Story = {
  render: (args) => `
    <epaper-grid min="${args.min}">
      <div class="epaper-card"><div class="epaper-card__body">One</div></div>
      <div class="epaper-card"><div class="epaper-card__body">Two</div></div>
      <div class="epaper-card"><div class="epaper-card__body">Three</div></div>
    </epaper-grid>
    <p class="epaper-note" style="margin-top:var(--epaper-space-2)">
      Attribute <code>min="${args.min}"</code> sets <code>--epaper-grid-min</code>; verify style var propagation.
    </p>
  `,
};

export const StackAndCluster: Story = {
  render: () => `
    <epaper-stack gap="lg">
      <div class="epaper-card"><div class="epaper-card__body">Stack item one</div></div>
      <div class="epaper-card"><div class="epaper-card__body">Stack item two</div></div>
    </epaper-stack>
    <div style="height:var(--epaper-space-4)"></div>
    <epaper-cluster gap="var(--epaper-space-3)" style="align-items:center;">
      <span class="epaper-badge">Cluster</span>
      <span class="epaper-badge">align center</span>
      <span class="epaper-badge">wraps</span>
    </epaper-cluster>
  `,
};
