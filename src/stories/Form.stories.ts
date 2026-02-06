import type { Meta, StoryObj } from "@storybook/html";

const meta: Meta = {
  title: "Patterns/Form",
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Form shell uses .eink-field + .eink-label + help/error text for accessible, border-first forms. Inputs honor :focus-visible, disabled, and aria-invalid for E-Ink-friendly states.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const ErrorSummary: Story = {
  render: () => `
    <div class="eink-error-summary" role="alert" style="max-width:28rem">
      <div class="eink-error-summary__title">There are 3 errors in this form</div>
      <ul>
        <li><a href="#f-name">Full name is required</a></li>
        <li><a href="#f-email">Enter a valid email address</a></li>
        <li><a href="#f-terms">You must accept the terms</a></li>
      </ul>
    </div>`,
};

export const CompleteForm: Story = {
  render: () => `
    <form novalidate style="max-width:28rem">
      <div class="eink-stack">
        <div class="eink-field">
          <label class="eink-label eink-label--required" for="f-name">Full name</label>
          <input type="text" id="f-name" class="eink-input" aria-invalid="true" aria-describedby="f-name-error" required>
          <span class="eink-error-message" id="f-name-error">Full name is required.</span>
        </div>
        <div class="eink-field">
          <label class="eink-label eink-label--required" for="f-email">Email</label>
          <input type="email" id="f-email" class="eink-input" value="not-an-email" aria-invalid="true" aria-describedby="f-email-help f-email-error" required>
          <span class="eink-help" id="f-email-help">We'll send your confirmation here.</span>
          <span class="eink-error-message" id="f-email-error">Enter a valid email address.</span>
        </div>
        <div class="eink-field">
          <label class="eink-label" for="f-phone">Phone <span class="eink-text-xs eink-text-muted">(optional)</span></label>
          <input type="tel" id="f-phone" class="eink-input" placeholder="+1 (555) 000-0000">
          <span class="eink-help">Include country code.</span>
        </div>
        <div class="eink-field">
          <label class="eink-label eink-label--required" for="f-country">Country</label>
          <select id="f-country" class="eink-select" required>
            <option value="">Select</option>
            <option>Germany</option>
            <option>France</option>
            <option>United Kingdom</option>
          </select>
        </div>
        <div class="eink-field">
          <label class="eink-label" for="f-bio">Bio <span class="eink-text-xs eink-text-muted">(optional)</span></label>
          <textarea id="f-bio" class="eink-textarea" placeholder="About you"></textarea>
        </div>
        <div class="eink-field">
          <label class="eink-label" for="f-ref">Referral code</label>
          <input type="text" id="f-ref" class="eink-input" value="AUTO-2024" disabled>
          <span class="eink-help">Automatically applied.</span>
        </div>
        <fieldset style="border:none;padding:0">
          <legend class="eink-label" style="margin-bottom:var(--eink-space-2)">Notifications</legend>
          <div class="eink-stack eink-stack--sm">
            <div class="eink-field eink-field--inline">
              <input type="checkbox" class="eink-checkbox" id="f-n-email" checked>
              <label for="f-n-email">Email</label>
            </div>
            <div class="eink-field eink-field--inline">
              <input type="checkbox" class="eink-checkbox" id="f-n-sms">
              <label for="f-n-sms">SMS</label>
            </div>
          </div>
        </fieldset>
        <div class="eink-field eink-field--inline">
          <input type="checkbox" class="eink-checkbox" id="f-terms" aria-invalid="true" aria-describedby="f-terms-error" required>
          <label for="f-terms">I accept the terms</label>
        </div>
        <span class="eink-error-message" id="f-terms-error">You must accept the terms.</span>
        <div class="eink-cluster">
          <button type="submit" class="eink-btn eink-btn--primary">Submit</button>
          <button type="reset" class="eink-btn eink-btn--ghost">Reset</button>
        </div>
      </div>
    </form>`,
};

export const Fieldset: Story = {
  render: () => `
    <fieldset style="max-width:28rem">
      <legend>Shipping address</legend>
      <div class="eink-stack eink-stack--sm">
        <div class="eink-field">
          <label class="eink-label" for="f-street">Street</label>
          <input type="text" id="f-street" class="eink-input" placeholder="123 Main St">
        </div>
        <div class="eink-grid" style="--eink-grid-min:10rem">
          <div class="eink-field">
            <label class="eink-label" for="f-city">City</label>
            <input type="text" id="f-city" class="eink-input" placeholder="Berlin">
          </div>
          <div class="eink-field">
            <label class="eink-label" for="f-zip">Postal code</label>
            <input type="text" id="f-zip" class="eink-input" placeholder="10115">
          </div>
        </div>
      </div>
    </fieldset>`,
};
