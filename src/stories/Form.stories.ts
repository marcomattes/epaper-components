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
    <div class="epaper-error-summary" role="alert" style="max-width:28rem">
      <div class="epaper-error-summary__title">There are 3 errors in this form</div>
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
      <div class="epaper-stack">
        <div class="epaper-field">
          <label class="epaper-label eink-label--required" for="f-name">Full name</label>
          <input type="text" id="f-name" class="epaper-input" aria-invalid="true" aria-describedby="f-name-error" required>
          <span class="epaper-error-message" id="f-name-error">Full name is required.</span>
        </div>
        <div class="epaper-field">
          <label class="epaper-label eink-label--required" for="f-email">Email</label>
          <input type="email" id="f-email" class="epaper-input" value="not-an-email" aria-invalid="true" aria-describedby="f-email-help f-email-error" required>
          <span class="epaper-help" id="f-email-help">We'll send your confirmation here.</span>
          <span class="epaper-error-message" id="f-email-error">Enter a valid email address.</span>
        </div>
        <div class="epaper-field">
          <label class="epaper-label" for="f-phone">Phone <span class="epaper-text-xs eink-text-muted">(optional)</span></label>
          <input type="tel" id="f-phone" class="epaper-input" placeholder="+1 (555) 000-0000">
          <span class="epaper-help">Include country code.</span>
        </div>
        <div class="epaper-field">
          <label class="epaper-label eink-label--required" for="f-country">Country</label>
          <select id="f-country" class="epaper-select" required>
            <option value="">Select</option>
            <option>Germany</option>
            <option>France</option>
            <option>United Kingdom</option>
          </select>
        </div>
        <div class="epaper-field">
          <label class="epaper-label" for="f-bio">Bio <span class="epaper-text-xs eink-text-muted">(optional)</span></label>
          <textarea id="f-bio" class="epaper-textarea" placeholder="About you"></textarea>
        </div>
        <div class="epaper-field">
          <label class="epaper-label" for="f-ref">Referral code</label>
          <input type="text" id="f-ref" class="epaper-input" value="AUTO-2024" disabled>
          <span class="epaper-help">Automatically applied.</span>
        </div>
        <fieldset style="border:none;padding:0">
          <legend class="epaper-label" style="margin-bottom:var(--epaper-space-2)">Notifications</legend>
          <div class="epaper-stack eink-stack--sm">
            <div class="epaper-field eink-field--inline">
              <input type="checkbox" class="epaper-checkbox" id="f-n-email" checked>
              <label for="f-n-email">Email</label>
            </div>
            <div class="epaper-field eink-field--inline">
              <input type="checkbox" class="epaper-checkbox" id="f-n-sms">
              <label for="f-n-sms">SMS</label>
            </div>
          </div>
        </fieldset>
        <div class="epaper-field eink-field--inline">
          <input type="checkbox" class="epaper-checkbox" id="f-terms" aria-invalid="true" aria-describedby="f-terms-error" required>
          <label for="f-terms">I accept the terms</label>
        </div>
        <span class="epaper-error-message" id="f-terms-error">You must accept the terms.</span>
        <div class="epaper-cluster">
          <button type="submit" class="epaper-btn epaper-btn--primary">Submit</button>
          <button type="reset" class="epaper-btn epaper-btn--ghost">Reset</button>
        </div>
      </div>
    </form>`,
};

export const Fieldset: Story = {
  render: () => `
    <fieldset style="max-width:28rem">
      <legend>Shipping address</legend>
      <div class="epaper-stack eink-stack--sm">
        <div class="epaper-field">
          <label class="epaper-label" for="f-street">Street</label>
          <input type="text" id="f-street" class="epaper-input" placeholder="123 Main St">
        </div>
        <div class="epaper-grid" style="--epaper-grid-min:10rem">
          <div class="epaper-field">
            <label class="epaper-label" for="f-city">City</label>
            <input type="text" id="f-city" class="epaper-input" placeholder="Berlin">
          </div>
          <div class="epaper-field">
            <label class="epaper-label" for="f-zip">Postal code</label>
            <input type="text" id="f-zip" class="epaper-input" placeholder="10115">
          </div>
        </div>
      </div>
    </fieldset>`,
};
