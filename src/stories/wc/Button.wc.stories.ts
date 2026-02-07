import type { Meta, StoryObj } from "@storybook/html";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "default" | "lg";

interface ButtonArgs {
  variant: Variant;
  size: Size;
  disabled: boolean;
  label: string;
}

const meta: Meta<ButtonArgs> = {
  title: "Web Components/Button",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Light-DOM `<epaper-button>` that wraps a native `<button>` and maps attributes to eink classes. No JS required beyond the custom element registration.",
      },
    },
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    size: { control: "select", options: ["sm", "default", "lg"] },
    disabled: { control: "boolean" },
    label: { control: "text" },
  },
  render: (args) => {
    const disabled = args.disabled ? " disabled" : "";
    const size = args.size && args.size !== "default" ? ` size="${args.size}"` : "";
    return `<epaper-button variant="${args.variant}"${size}${disabled}>${args.label}</epaper-button>`;
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

export const Disabled: Story = {
  args: { variant: "primary", size: "default", disabled: true, label: "Disabled" },
};

export const Sizes: Story = {
  render: () => `
    <div class="epaper-cluster" style="align-items:center;">
      <epaper-button variant="primary" size="sm">Small</epaper-button>
      <epaper-button variant="primary">Default</epaper-button>
      <epaper-button variant="primary" size="lg">Large</epaper-button>
    </div>
  `,
};
