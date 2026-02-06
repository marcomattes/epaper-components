import type { Meta, StoryObj } from "@storybook/html";

interface SelectArgs {
  label: string;
  disabled: boolean;
  invalid: boolean;
  required: boolean;
}

const meta: Meta<SelectArgs> = {
  title: "Components/Select",
  argTypes: {
    label: { control: "text" },
    disabled: { control: "boolean" },
    invalid: { control: "boolean" },
    required: { control: "boolean" },
  },
  render: (args) => {
    const labelCls = args.required ? "eink-label eink-label--required" : "eink-label";
    const attrs = [
      'class="eink-select"',
      args.disabled ? "disabled" : "",
      args.invalid ? 'aria-invalid="true"' : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `
      <div class="eink-field" style="max-width:24rem">
        <label class="${labelCls}">${args.label}</label>
        <select ${attrs}>
          <option value="">Choose an option</option>
          <option value="1">Option one</option>
          <option value="2">Option two</option>
          <option value="3">Option three</option>
        </select>
        ${args.invalid ? '<span class="eink-error-message">A selection is required.</span>' : ""}
      </div>`;
  },
};

export default meta;
type Story = StoryObj<SelectArgs>;

export const Default: Story = {
  args: { label: "Country", disabled: false, invalid: false, required: false },
};

export const Required: Story = {
  args: { label: "Country", disabled: false, invalid: false, required: true },
};

export const Invalid: Story = {
  args: { label: "Country", disabled: false, invalid: true, required: true },
};

export const Disabled: Story = {
  args: { label: "Country", disabled: true, invalid: false, required: false },
};
