import type { Meta, StoryObj } from "@storybook/html";

interface ButtonArgs {
  variant: "primary" | "secondary" | "ghost";
  size: "sm" | "default" | "lg";
  disabled: boolean;
  label: string;
}

const meta: Meta<ButtonArgs> = {
  title: "Components/Button",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Border-first buttons tuned for E-Ink. Variants adjust fill vs. outline; focus uses the global ring and disabled relies on muted variables.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
    disabled: { control: "boolean" },
    label: { control: "text" },
  },
  render: (args) => {
    const classes = ["eink-btn"];
    if (args.variant) classes.push(`eink-btn--${args.variant}`);
    if (args.size && args.size !== "default") classes.push(`eink-btn--${args.size}`);
    const disabled = args.disabled ? " disabled" : "";
    return `<button class="${classes.join(" ")}"${disabled}>${args.label}</button>`;
  },
};

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: { variant: "primary", size: "default", disabled: false, label: "Primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", size: "default", disabled: false, label: "Secondary" },
};

export const Ghost: Story = {
  args: { variant: "ghost", size: "default", disabled: false, label: "Ghost" },
};

export const Small: Story = {
  args: { variant: "primary", size: "sm", disabled: false, label: "Small" },
};

export const Large: Story = {
  args: { variant: "primary", size: "lg", disabled: false, label: "Large" },
};

export const Disabled: Story = {
  args: { variant: "primary", size: "default", disabled: true, label: "Disabled" },
};

export const AllVariants: Story = {
  render: () => `
    <div class="eink-cluster">
      <button class="eink-btn eink-btn--primary">Primary</button>
      <button class="eink-btn eink-btn--secondary">Secondary</button>
      <button class="eink-btn eink-btn--ghost">Ghost</button>
    </div>
    <div class="eink-cluster" style="margin-top:var(--eink-space-4)">
      <button class="eink-btn eink-btn--primary eink-btn--sm">Small</button>
      <button class="eink-btn eink-btn--primary">Default</button>
      <button class="eink-btn eink-btn--primary eink-btn--lg">Large</button>
    </div>
    <div class="eink-cluster" style="margin-top:var(--eink-space-4)">
      <button class="eink-btn eink-btn--primary" disabled>Primary</button>
      <button class="eink-btn eink-btn--secondary" disabled>Secondary</button>
      <button class="eink-btn eink-btn--ghost" disabled>Ghost</button>
    </div>
  `,
};
