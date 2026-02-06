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
        "Value for --eink-grid-min via the min attribute (e.g., 14rem, 220px)",
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
    <eink-grid min="${args.min}">
      <div class="eink-card"><div class="eink-card__body">One</div></div>
      <div class="eink-card"><div class="eink-card__body">Two</div></div>
      <div class="eink-card"><div class="eink-card__body">Three</div></div>
    </eink-grid>
    <p class="eink-note" style="margin-top:var(--eink-space-2)">
      Attribute <code>min="${args.min}"</code> sets <code>--eink-grid-min</code>; verify style var propagation.
    </p>
  `,
};

export const StackAndCluster: Story = {
  render: () => `
    <eink-stack gap="lg">
      <div class="eink-card"><div class="eink-card__body">Stack item one</div></div>
      <div class="eink-card"><div class="eink-card__body">Stack item two</div></div>
    </eink-stack>
    <div style="height:var(--eink-space-4)"></div>
    <eink-cluster gap="var(--eink-space-3)" style="align-items:center;">
      <span class="eink-badge">Cluster</span>
      <span class="eink-badge">align center</span>
      <span class="eink-badge">wraps</span>
    </eink-cluster>
  `,
};
