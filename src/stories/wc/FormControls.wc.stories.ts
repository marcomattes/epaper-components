import type { Meta, StoryObj } from "@storybook/html";

type Story = StoryObj<Record<string, never>>;

const meta: Meta = {
  title: "Web Components/Form Controls",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Native form controls exposed as light-DOM custom elements. Attributes reflect to the inner input/select elements and reuse eink class styling.",
      },
    },
  },
};

export default meta;

export const Inputs: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:22rem">
      <epaper-input placeholder="Default input"></epaper-input>
      <epaper-input aria-invalid="true" value="Invalid value"></epaper-input>
      <epaper-input disabled value="Disabled input"></epaper-input>
      <epaper-input type="email" placeholder="email@example.com"></epaper-input>
      <epaper-input type="search" placeholder="Search" aria-label="Search field"></epaper-input>
      <epaper-textarea placeholder="Textarea"></epaper-textarea>
    </div>
  `,
};

export const SelectAndOptions: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm" style="max-width:22rem">
      <epaper-select>
        <option value="">Choose</option>
        <option>One</option>
        <option>Two</option>
      </epaper-select>
      <epaper-select disabled>
        <option>Disabled select</option>
      </epaper-select>
      <epaper-select aria-invalid="true">
        <option value="">Required</option>
      </epaper-select>
    </div>
  `,
};

export const CheckboxAndRadio: Story = {
  render: () => `
    <div class="epaper-stack eink-stack--sm">
      <label class="epaper-field eink-field--inline">
        <epaper-checkbox checked name="cb-demo"></epaper-checkbox>
        <span>Checked</span>
      </label>
      <label class="epaper-field eink-field--inline">
        <epaper-checkbox aria-invalid="true"></epaper-checkbox>
        <span>Invalid</span>
      </label>
      <label class="epaper-field eink-field--inline">
        <epaper-checkbox disabled></epaper-checkbox>
        <span>Disabled</span>
      </label>
      <div class="epaper-divider"></div>
      <label class="epaper-field eink-field--inline">
        <epaper-radio name="size" value="s" checked></epaper-radio>
        <span>Small</span>
      </label>
      <label class="epaper-field eink-field--inline">
        <epaper-radio name="size" value="m"></epaper-radio>
        <span>Medium</span>
      </label>
      <label class="epaper-field eink-field--inline">
        <epaper-radio name="size" value="l" disabled></epaper-radio>
        <span>Disabled</span>
      </label>
    </div>
  `,
};
