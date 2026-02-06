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
    <div class="eink-stack eink-stack--sm" style="max-width:22rem">
      <eink-input placeholder="Default input"></eink-input>
      <eink-input aria-invalid="true" value="Invalid value"></eink-input>
      <eink-input disabled value="Disabled input"></eink-input>
      <eink-input type="email" placeholder="email@example.com"></eink-input>
      <eink-input type="search" placeholder="Search" aria-label="Search field"></eink-input>
      <eink-textarea placeholder="Textarea"></eink-textarea>
    </div>
  `,
};

export const SelectAndOptions: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm" style="max-width:22rem">
      <eink-select>
        <option value="">Choose</option>
        <option>One</option>
        <option>Two</option>
      </eink-select>
      <eink-select disabled>
        <option>Disabled select</option>
      </eink-select>
      <eink-select aria-invalid="true">
        <option value="">Required</option>
      </eink-select>
    </div>
  `,
};

export const CheckboxAndRadio: Story = {
  render: () => `
    <div class="eink-stack eink-stack--sm">
      <label class="eink-field eink-field--inline">
        <eink-checkbox checked name="cb-demo"></eink-checkbox>
        <span>Checked</span>
      </label>
      <label class="eink-field eink-field--inline">
        <eink-checkbox aria-invalid="true"></eink-checkbox>
        <span>Invalid</span>
      </label>
      <label class="eink-field eink-field--inline">
        <eink-checkbox disabled></eink-checkbox>
        <span>Disabled</span>
      </label>
      <div class="eink-divider"></div>
      <label class="eink-field eink-field--inline">
        <eink-radio name="size" value="s" checked></eink-radio>
        <span>Small</span>
      </label>
      <label class="eink-field eink-field--inline">
        <eink-radio name="size" value="m"></eink-radio>
        <span>Medium</span>
      </label>
      <label class="eink-field eink-field--inline">
        <eink-radio name="size" value="l" disabled></eink-radio>
        <span>Disabled</span>
      </label>
    </div>
  `,
};
