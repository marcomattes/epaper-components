import type { Meta, StoryObj } from "@storybook/html";

interface InputArgs {
  label: string;
  placeholder: string;
  disabled: boolean;
  invalid: boolean;
  helpText: string;
  errorText: string;
  required: boolean;
}

const meta: Meta<InputArgs> = {
  title: "Components/Input",
  argTypes: {
    label: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    invalid: { control: "boolean" },
    helpText: { control: "text" },
    errorText: { control: "text" },
    required: { control: "boolean" },
  },
  render: (args) => {
    const labelCls = args.required ? "eink-label eink-label--required" : "eink-label";
    const attrs = [
      'type="text"',
      'class="eink-input"',
      args.placeholder ? `placeholder="${args.placeholder}"` : "",
      args.disabled ? "disabled" : "",
      args.invalid ? 'aria-invalid="true"' : "",
    ]
      .filter(Boolean)
      .join(" ");
    const help = args.helpText ? `<span class="eink-help">${args.helpText}</span>` : "";
    const error =
      args.invalid && args.errorText
        ? `<span class="eink-error-message">${args.errorText}</span>`
        : "";
    return `
      <div class="eink-field" style="max-width:24rem">
        <label class="${labelCls}">${args.label}</label>
        <input ${attrs}>
        ${help}${error}
      </div>`;
  },
};

export default meta;
type Story = StoryObj<InputArgs>;

export const Default: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder",
    disabled: false,
    invalid: false,
    helpText: "",
    errorText: "",
    required: false,
  },
};

export const WithHelp: Story = {
  args: {
    label: "Email",
    placeholder: "you@example.com",
    disabled: false,
    invalid: false,
    helpText: "We'll never share your email.",
    errorText: "",
    required: false,
  },
};

export const Required: Story = {
  args: {
    label: "Full name",
    placeholder: "Jane Doe",
    disabled: false,
    invalid: false,
    helpText: "",
    errorText: "",
    required: true,
  },
};

export const Invalid: Story = {
  args: {
    label: "Email",
    placeholder: "",
    disabled: false,
    invalid: true,
    helpText: "",
    errorText: "Enter a valid email address.",
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: "Referral code",
    placeholder: "",
    disabled: true,
    invalid: false,
    helpText: "Automatically applied.",
    errorText: "",
    required: false,
  },
};

export const Textarea: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:24rem">
      <div class="eink-field">
        <label class="eink-label">Default</label>
        <textarea class="eink-textarea" placeholder="Write something"></textarea>
      </div>
      <div class="eink-field">
        <label class="eink-label">Disabled</label>
        <textarea class="eink-textarea" disabled>Cannot edit.</textarea>
      </div>
      <div class="eink-field">
        <label class="eink-label">Invalid</label>
        <textarea class="eink-textarea" aria-invalid="true">Bad content</textarea>
        <span class="eink-error-message">Content is invalid.</span>
      </div>
    </div>`,
};

export const SearchWithIcon: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:24rem">
      <div class="eink-field">
        <label class="eink-label" for="search-1">Library search</label>
        <input id="search-1" class="eink-input eink-input--search" type="search" placeholder="Search titles">
        <span class="eink-help">CSS-drawn icon; no external assets, minimal repaint on E-Ink.</span>
      </div>
      <div class="eink-field">
        <label class="eink-label" for="search-2">Disabled search</label>
        <input id="search-2" class="eink-input eink-input--search" type="search" value="Indexing…" disabled>
      </div>
    </div>
  `,
};
