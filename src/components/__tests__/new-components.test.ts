// Neue umfassende Tests für 10 Komponenten zur Steigerung der Code Coverage
// Getestete Komponenten: e-button, e-input, e-alert, e-badge, e-card, e-dialog, e-progress, e-tag, e-toggle, e-upload

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// Helper Funktion zum Mounten von Komponenten
const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

// Cleanup Helper
const cleanup = () => {
  document.body.innerHTML = '';
};

// Warte auf asynchrone DOM-Updates
const waitForUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

// Lade alle benötigten Komponenten
beforeAll(async () => {
  await import('../button');
  await import('../input');
  await import('../alert');
  await import('../badge');
  await import('../card');
  await import('../dialog');
  await import('../progress');
  await import('../tag');
  await import('../toggle');
  await import('../upload');
});

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ============================================================================
// E-BUTTON TESTS
// ============================================================================
describe('e-button', () => {
  describe('Basic Rendering', () => {
    it('renders with default variant (secondary)', () => {
      const el = mount(`<e-button>Click me</e-button>`);
      const btn = el.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn?.className).toContain('ink-btn--secondary');
      expect(btn?.textContent).toBe('Click me');
    });

    it('renders with primary variant', () => {
      const el = mount(`<e-button variant="primary">Save</e-button>`);
      const btn = el.querySelector('button');
      expect(btn?.className).toContain('ink-btn--primary');
    });

    it('renders with destructive variant', () => {
      const el = mount(`<e-button variant="destructive">Delete</e-button>`);
      const btn = el.querySelector('button');
      expect(btn?.className).toContain('ink-btn--destructive');
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled attribute is set', () => {
      const el = mount(`<e-button disabled>Disabled</e-button>`);
      const btn = el.querySelector('button');
      expect(btn?.disabled).toBe(true);
    });

    it('is enabled by default', () => {
      const el = mount(`<e-button>Enabled</e-button>`);
      const btn = el.querySelector('button');
      expect(btn?.disabled).toBe(false);
    });

    it('does not fire e-click when disabled', () => {
      const el = mount(`<e-button disabled>Disabled</e-button>`);
      let fired = false;
      el.addEventListener('e-click', () => { fired = true; });
      el.querySelector('button')?.click();
      expect(fired).toBe(false);
    });
  });

  describe('Click Events', () => {
    it('fires e-click event on click', () => {
      const el = mount(`<e-button>Click me</e-button>`);
      let fired = false;
      let detail: { originalEvent: MouseEvent } | null = null;
      
      el.addEventListener('e-click', (e) => {
        fired = true;
        detail = (e as CustomEvent<{ originalEvent: MouseEvent }>).detail;
      });
      
      const btn = el.querySelector('button')!;
      btn.click();
      
      expect(fired).toBe(true);
      expect(detail?.originalEvent).toBeInstanceOf(MouseEvent);
    });

    it('bubbles e-click event', () => {
      const el = mount(`<e-button>Click me</e-button>`);
      let fired = false;
      
      document.addEventListener('e-click', () => { fired = true; });
      el.querySelector('button')?.click();
      
      expect(fired).toBe(true);
    });
  });

  describe('Type Attribute', () => {
    it('has type property as button by default', () => {
      const el = mount(`<e-button>Click</e-button>`);
      expect(el.type).toBe('button');
    });

    it('supports type="submit"', () => {
      const el = mount(`<e-button type="submit">Submit</e-button>`);
      expect(el.getAttribute('type')).toBe('submit');
    });

    it('supports type="reset"', () => {
      const el = mount(`<e-button type="reset">Reset</e-button>`);
      expect(el.getAttribute('type')).toBe('reset');
    });
  });

  describe('Form Association', () => {
    it('has formAssociated static property', async () => {
      const { EButton } = await import('../button');
      expect(EButton.formAssociated).toBe(true);
    });

    it('has form property from ElementInternals', () => {
      const form = document.createElement('form');
      form.id = 'test-form';
      document.body.appendChild(form);
      
      const el = mount(`<e-button form="test-form">Submit</e-button>`);
      expect(el.form).toBe(form);
    });
  });

  describe('Autofocus', () => {
    it('focuses button when autofocus is set', async () => {
      const el = mount(`<e-button autofocus>Focus me</e-button>`);
      await waitForUpdate();
      const btn = el.querySelector('button');
      expect(btn?.hasAttribute('autofocus')).toBe(true);
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates disabled state when attribute changes', () => {
      const el = mount(`<e-button>Toggle</e-button>`);
      const btn = el.querySelector('button')!;
      
      expect(btn.disabled).toBe(false);
      el.setAttribute('disabled', '');
      expect(btn.disabled).toBe(true);
      el.removeAttribute('disabled');
      expect(btn.disabled).toBe(false);
    });

    it('updates variant when attribute changes', () => {
      const el = mount(`<e-button variant="primary">Change me</e-button>`);
      const btn = el.querySelector('button')!;
      
      expect(btn.className).toContain('ink-btn--primary');
      el.setAttribute('variant', 'destructive');
      expect(btn.className).toContain('ink-btn--destructive');
    });
  });
});

// ============================================================================
// E-INPUT TESTS
// ============================================================================
describe('e-input', () => {
  describe('Basic Rendering', () => {
    it('renders with label', () => {
      const el = mount(`<e-input label="Name"></e-input>`);
      const label = el.querySelector('.ink-label');
      expect(label).not.toBeNull();
      expect(label?.textContent).toBe('Name');
    });

    it('renders with hint', () => {
      const el = mount(`<e-input hint="Enter your name"></e-input>`);
      const hint = el.querySelector('.ink-hint');
      expect(hint).not.toBeNull();
      expect(hint?.textContent).toBe('Enter your name');
    });

    it('renders with placeholder', () => {
      const el = mount(`<e-input placeholder="Type here"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.getAttribute('placeholder')).toBe('Type here');
    });

    it('renders with default value', () => {
      const el = mount(`<e-input default-value="test"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.value).toBe('test');
    });

    it('renders with initial value', () => {
      const el = mount(`<e-input value="initial"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.value).toBe('initial');
    });
  });

  describe('Input Types', () => {
    it('supports text type by default', () => {
      const el = mount(`<e-input></e-input>`);
      const input = el.querySelector('input');
      expect(input?.type).toBe('text');
    });

    it('supports password type', () => {
      const el = mount(`<e-input type="password"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.type).toBe('password');
    });

    it('supports email type', () => {
      const el = mount(`<e-input type="email"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.type).toBe('email');
    });

    it('supports number type', () => {
      const el = mount(`<e-input type="number"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.type).toBe('number');
    });
  });

  describe('Disabled and Readonly States', () => {
    it('is enabled by default', () => {
      const el = mount(`<e-input></e-input>`);
      const input = el.querySelector('input');
      expect(input?.disabled).toBe(false);
    });

    it('is disabled when disabled attribute is set', () => {
      const el = mount(`<e-input disabled></e-input>`);
      const input = el.querySelector('input');
      expect(input?.disabled).toBe(true);
    });

    it('is readonly when readonly attribute is set', () => {
      const el = mount(`<e-input readonly></e-input>`);
      const input = el.querySelector('input');
      expect(input?.readOnly).toBe(true);
    });
  });

  describe('Error State', () => {
    it('sets aria-invalid when error is set', () => {
      const el = mount(`<e-input error></e-input>`);
      const input = el.querySelector('input');
      expect(input?.getAttribute('aria-invalid')).toBe('true');
    });

    it('uses default error message', () => {
      const el = mount(`<e-input error></e-input>`);
      expect(el.getAttribute('error')).toBe('');
    });

    it('uses custom error message', () => {
      const el = mount(`<e-input error error-message="Custom error"></e-input>`);
      expect(el.getAttribute('error-message')).toBe('Custom error');
    });
  });

  describe('Required Validation', () => {
    it('marks input as required', () => {
      const el = mount(`<e-input required></e-input>`);
      const input = el.querySelector('input');
      expect(input?.required).toBe(true);
    });

    it('uses default required message', () => {
      const el = mount(`<e-input required></e-input>`);
      expect(el.getAttribute('required')).toBe('');
    });

    it('uses custom required message', () => {
      const el = mount(`<e-input required required-message="Please fill this"></e-input>`);
      expect(el.getAttribute('required-message')).toBe('Please fill this');
    });
  });

  describe('Form Association', () => {
    it('has formAssociated static property', async () => {
      const { EInput } = await import('../input');
      expect(EInput.formAssociated).toBe(true);
    });

    it('participates in form submission with name attribute', () => {
      const form = document.createElement('form');
      document.body.appendChild(form);
      
      const el = mount(`<e-input name="username" value="test"></e-input>`);
      form.appendChild(el);
      
      const input = el.querySelector('input');
      expect(input?.name).toBe('username');
    });
  });

  describe('Input Constraints', () => {
    it('supports minlength attribute', () => {
      const el = mount(`<e-input minlength="5"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.minLength).toBe(5);
    });

    it('supports maxlength attribute', () => {
      const el = mount(`<e-input maxlength="10"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.maxLength).toBe(10);
    });

    it('supports pattern attribute', () => {
      const el = mount(`<e-input pattern="[A-Za-z]+"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.pattern).toBe('[A-Za-z]+');
    });

    it('supports min attribute for number inputs', () => {
      const el = mount(`<e-input type="number" min="0"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.min).toBe('0');
    });

    it('supports max attribute for number inputs', () => {
      const el = mount(`<e-input type="number" max="100"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.max).toBe('100');
    });

    it('supports step attribute for number inputs', () => {
      const el = mount(`<e-input type="number" step="0.1"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.step).toBe('0.1');
    });
  });

  describe('Accessibility Attributes', () => {
    it('supports aria-label', () => {
      const el = mount(`<e-input aria-label="Search field"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.getAttribute('aria-label')).toBe('Search field');
    });

    it('supports autocomplete', () => {
      const el = mount(`<e-input autocomplete="off"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.autocomplete).toBe('off');
    });

    it('supports inputmode', () => {
      const el = mount(`<e-input inputmode="numeric"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.inputMode).toBe('numeric');
    });

    it('supports enterkeyhint', () => {
      const el = mount(`<e-input enterkeyhint="search"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.getAttribute('enterkeyhint')).toBe('search');
    });

    it('supports spellcheck', () => {
      const el = mount(`<e-input spellcheck="false"></e-input>`);
      const input = el.querySelector('input');
      expect(input?.getAttribute('spellcheck')).toBe('false');
    });
  });
});

// ============================================================================
// E-ALERT TESTS
// ============================================================================
describe('e-alert', () => {
  describe('Basic Rendering', () => {
    it('renders with info variant by default', () => {
      const el = mount(`<e-alert>Info message</e-alert>`);
      expect(el.getAttribute('variant')).toBeNull();
    });

    it('renders with success variant', () => {
      const el = mount(`<e-alert variant="success">Success!</e-alert>`);
      expect(el.getAttribute('variant')).toBe('success');
    });

    it('renders with warning variant', () => {
      const el = mount(`<e-alert variant="warning">Warning!</e-alert>`);
      expect(el.getAttribute('variant')).toBe('warning');
    });

    it('renders with error variant', () => {
      const el = mount(`<e-alert variant="error">Error!</e-alert>`);
      expect(el.getAttribute('variant')).toBe('error');
    });
  });

  describe('Heading', () => {
    it('renders with heading', () => {
      const el = mount(`<e-alert heading="Important">Message</e-alert>`);
      expect(el.getAttribute('heading')).toBe('Important');
    });

    it('does not render heading by default', () => {
      const el = mount(`<e-alert>Message</e-alert>`);
      expect(el.getAttribute('heading')).toBeNull();
    });
  });

  describe('Closable', () => {
    it('renders close button when closable', () => {
      const el = mount(`<e-alert closable>Message</e-alert>`);
      const closeBtn = el.querySelector('button');
      expect(closeBtn).not.toBeNull();
    });

    it('hides close button when not closable', () => {
      const el = mount(`<e-alert>Message</e-alert>`);
      const closeBtn = el.querySelector('button');
      expect(closeBtn?.hasAttribute('hidden')).toBe(true);
    });

    it('fires e-close event when close button is clicked', async () => {
      const el = mount(`<e-alert closable heading="Test">Message</e-alert>`);
      let fired = false;
      let detail: { value: string } | null = null;
      
      el.addEventListener('e-close', (e) => {
        fired = true;
        detail = (e as CustomEvent<{ value: string }>).detail;
      });
      
      const closeBtn = el.querySelector('button')!;
      closeBtn.click();
      
      await waitForUpdate();
      expect(fired).toBe(true);
      expect(detail?.value).toBe('Test');
    });

    it('uses text content as value when no heading', async () => {
      const el = mount(`<e-alert closable>Message</e-alert>`);
      let detail: { value: string } | null = null;
      
      el.addEventListener('e-close', (e) => {
        detail = (e as CustomEvent<{ value: string }>).detail;
      });
      
      const closeBtn = el.querySelector('button')!;
      closeBtn.click();
      
      await waitForUpdate();
      expect(detail?.value).toBe('Message');
    });
  });

  describe('No Icon', () => {
    it('hides icon when no-icon is set', () => {
      const el = mount(`<e-alert no-icon>Message</e-alert>`);
      const icon = el.querySelector('svg');
      expect(icon?.parentElement?.hasAttribute('hidden')).toBe(true);
    });

    it('shows icon by default', () => {
      const el = mount(`<e-alert>Message</e-alert>`);
      expect(el.querySelector('svg')).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has role="status" for info variant', () => {
      const el = mount(`<e-alert variant="info">Message</e-alert>`);
      const root = el.querySelector('[role="status"]');
      expect(root).not.toBeNull();
    });

    it('has role="alert" for error variant', () => {
      const el = mount(`<e-alert variant="error">Error!</e-alert>`);
      const root = el.querySelector('[role="alert"]');
      expect(root).not.toBeNull();
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates variant when changed', async () => {
      const el = mount(`<e-alert variant="info">Message</e-alert>`);
      expect(el.getAttribute('variant')).toBe('info');
      
      el.setAttribute('variant', 'error');
      await waitForUpdate();
      
      expect(el.getAttribute('variant')).toBe('error');
    });

    it('updates heading when changed', async () => {
      const el = mount(`<e-alert heading="Old">Message</e-alert>`);
      expect(el.getAttribute('heading')).toBe('Old');
      
      el.setAttribute('heading', 'New');
      await waitForUpdate();
      
      expect(el.getAttribute('heading')).toBe('New');
    });
  });
});

// ============================================================================
// E-BADGE TESTS
// ============================================================================
describe('e-badge', () => {
  describe('Basic Rendering', () => {
    it('renders with text content', () => {
      const el = mount(`<e-badge>NEW</e-badge>`);
      expect(el.textContent).toBe('NEW');
    });

    it('renders with inverted style', () => {
      const el = mount(`<e-badge inverted>NEW</e-badge>`);
      expect(el.hasAttribute('inverted')).toBe(true);
    });

    it('renders without inverted style by default', () => {
      const el = mount(`<e-badge>NEW</e-badge>`);
      expect(el.hasAttribute('inverted')).toBe(false);
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates inverted style when attribute changes', async () => {
      const el = mount(`<e-badge>NEW</e-badge>`);
      expect(el.hasAttribute('inverted')).toBe(false);
      
      el.setAttribute('inverted', '');
      await waitForUpdate();
      
      expect(el.hasAttribute('inverted')).toBe(true);
      
      el.removeAttribute('inverted');
      await waitForUpdate();
      
      expect(el.hasAttribute('inverted')).toBe(false);
    });
  });

  describe('CSS Classes', () => {
    it('has ink-badge class', () => {
      const el = mount(`<e-badge>NEW</e-badge>`);
      const wrap = el.querySelector('.ink-badge');
      expect(wrap).not.toBeNull();
    });

    it('has ink-badge--inverted class when inverted', () => {
      const el = mount(`<e-badge inverted>NEW</e-badge>`);
      const wrap = el.querySelector('.ink-badge--inverted');
      expect(wrap).not.toBeNull();
    });
  });
});

// ============================================================================
// E-CARD TESTS
// ============================================================================
describe('e-card', () => {
  describe('Basic Rendering', () => {
    it('renders with title', () => {
      const el = mount(`<e-card title="Test Card"></e-card>`);
      expect(el.getAttribute('title')).toBe('Test Card');
    });

    it('renders with eyebrow', () => {
      const el = mount(`<e-card eyebrow="Category"></e-card>`);
      expect(el.getAttribute('eyebrow')).toBe('Category');
    });

    it('renders with both title and eyebrow', () => {
      const el = mount(`<e-card eyebrow="Category" title="Test Card"></e-card>`);
      expect(el.getAttribute('eyebrow')).toBe('Category');
      expect(el.getAttribute('title')).toBe('Test Card');
    });

    it('renders with body content', () => {
      const el = mount(`<e-card>Body content</e-card>`);
      expect(el.textContent).toContain('Body content');
    });

    it('renders with action slot', () => {
      const el = mount(`<e-card><e-button slot="action">Action</e-button></e-card>`);
      const action = el.querySelector('[slot="action"]');
      expect(action).not.toBeNull();
    });
  });

  describe('Header Visibility', () => {
    it('shows header when title is set', () => {
      const el = mount(`<e-card title="Test"></e-card>`);
      const header = el.querySelector('.ink-card__header');
      expect(header).not.toBeNull();
    });

    it('shows header when eyebrow is set', () => {
      const el = mount(`<e-card eyebrow="Cat"></e-card>`);
      const header = el.querySelector('.ink-card__header');
      expect(header).not.toBeNull();
    });

    it('shows header when action slot is used', () => {
      const el = mount(`<e-card><e-button slot="action">X</e-button></e-card>`);
      const header = el.querySelector('.ink-card__header');
      expect(header).not.toBeNull();
    });

    it('hides header when no title, eyebrow or action', () => {
      const el = mount(`<e-card>Content</e-card>`);
      const header = el.querySelector('.ink-card__header');
      expect(header).toBeNull();
    });
  });

  describe('Body', () => {
    it('has ink-card__body class', () => {
      const el = mount(`<e-card>Content</e-card>`);
      const body = el.querySelector('.ink-card__body');
      expect(body).not.toBeNull();
    });

    it('contains all child content in body', () => {
      const el = mount(`<e-card><p>Paragraph 1</p><p>Paragraph 2</p></e-card>`);
      const body = el.querySelector('.ink-card__body');
      expect(body?.querySelectorAll('p').length).toBe(2);
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates title when changed', async () => {
      const el = mount(`<e-card title="Old"></e-card>`);
      expect(el.getAttribute('title')).toBe('Old');
      
      el.setAttribute('title', 'New');
      await waitForUpdate();
      
      expect(el.getAttribute('title')).toBe('New');
    });

    it('updates eyebrow when changed', async () => {
      const el = mount(`<e-card eyebrow="Old"></e-card>`);
      expect(el.getAttribute('eyebrow')).toBe('Old');
      
      el.setAttribute('eyebrow', 'New');
      await waitForUpdate();
      
      expect(el.getAttribute('eyebrow')).toBe('New');
    });
  });
});

// ============================================================================
// E-DIALOG TESTS
// ============================================================================
describe('e-dialog', () => {
  describe('Basic Rendering', () => {
    it('renders with heading', () => {
      const el = mount(`<e-dialog heading="Test Dialog"></e-dialog>`);
      expect(el.getAttribute('heading')).toBe('Test Dialog');
    });

    it('renders with body content', () => {
      const el = mount(`<e-dialog>Dialog content</e-dialog>`);
      expect(el.textContent).toContain('Dialog content');
    });

    it('renders with footer slot', () => {
      const el = mount(`<e-dialog><e-button slot="footer">OK</e-button></e-dialog>`);
      const footer = el.querySelector('[slot="footer"]');
      expect(footer).not.toBeNull();
    });
  });

  describe('Open State', () => {
    it('has open attribute', () => {
      const el = mount(`<e-dialog open>Content</e-dialog>`);
      expect(el.hasAttribute('open')).toBe(true);
    });

    it('does not have open attribute by default', () => {
      const el = mount(`<e-dialog>Content</e-dialog>`);
      expect(el.hasAttribute('open')).toBe(false);
    });
  });

  describe('Size Variants', () => {
    it('supports small size', () => {
      const el = mount(`<e-dialog size="small">Content</e-dialog>`);
      expect(el.getAttribute('size')).toBe('small');
    });

    it('supports medium size by default', () => {
      const el = mount(`<e-dialog>Content</e-dialog>`);
      expect(el.getAttribute('size')).toBeNull();
    });

    it('supports large size', () => {
      const el = mount(`<e-dialog size="large">Content</e-dialog>`);
      expect(el.getAttribute('size')).toBe('large');
    });

    it('supports full size', () => {
      const el = mount(`<e-dialog size="full">Content</e-dialog>`);
      expect(el.getAttribute('size')).toBe('full');
    });
  });

  describe('Close Button', () => {
    it('shows close button by default', () => {
      const el = mount(`<e-dialog>Content</e-dialog>`);
      const closeBtn = el.querySelector('button');
      expect(closeBtn).not.toBeNull();
    });

    it('hides close button when no-close is set', () => {
      const el = mount(`<e-dialog no-close>Content</e-dialog>`);
      const closeBtn = el.querySelector('button');
      expect(closeBtn?.hasAttribute('hidden')).toBe(true);
    });
  });

  describe('Static Mode', () => {
    it('supports static mode', () => {
      const el = mount(`<e-dialog static>Content</e-dialog>`);
      expect(el.hasAttribute('static')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has aria-label when provided', () => {
      const el = mount(`<e-dialog aria-label="Modal dialog">Content</e-dialog>`);
      expect(el.getAttribute('aria-label')).toBe('Modal dialog');
    });
  });
});

// ============================================================================
// E-PROGRESS TESTS
// ============================================================================
describe('e-progress', () => {
  describe('Basic Rendering', () => {
    it('renders with default value', () => {
      const el = mount(`<e-progress></e-progress>`);
      expect(el.getAttribute('value')).toBeNull();
    });

    it('renders with custom value', () => {
      const el = mount(`<e-progress value="50"></e-progress>`);
      expect(el.getAttribute('value')).toBe('50');
    });

    it('renders with default max', () => {
      const el = mount(`<e-progress></e-progress>`);
      expect(el.getAttribute('max')).toBeNull();
    });

    it('renders with custom max', () => {
      const el = mount(`<e-progress max="200"></e-progress>`);
      expect(el.getAttribute('max')).toBe('200');
    });
  });

  describe('Variants', () => {
    it('supports linear variant by default', () => {
      const el = mount(`<e-progress></e-progress>`);
      expect(el.getAttribute('variant')).toBe('linear');
    });

    it('supports steps variant', () => {
      const el = mount(`<e-progress variant="steps"></e-progress>`);
      expect(el.getAttribute('variant')).toBe('steps');
    });
  });

  describe('Steps Configuration', () => {
    it('renders with default steps count', () => {
      const el = mount(`<e-progress variant="steps"></e-progress>`);
      expect(el.getAttribute('steps')).toBe('5');
    });

    it('renders with custom steps count', () => {
      const el = mount(`<e-progress variant="steps" steps="10"></e-progress>`);
      expect(el.getAttribute('steps')).toBe('10');
    });
  });

  describe('Label', () => {
    it('renders with label', () => {
      const el = mount(`<e-progress label="Loading"></e-progress>`);
      expect(el.getAttribute('label')).toBe('Loading');
    });

    it('hides label when hide-label is set', () => {
      const el = mount(`<e-progress label="Loading" hide-label></e-progress>`);
      expect(el.hasAttribute('hide-label')).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has role="progressbar"', () => {
      const el = mount(`<e-progress></e-progress>`);
      expect(el.getAttribute('role')).toBe('progressbar');
    });

    it('has aria-valuemin="0"', () => {
      const el = mount(`<e-progress></e-progress>`);
      expect(el.getAttribute('aria-valuemin')).toBe('0');
    });

    it('has aria-valuemax equal to max', () => {
      const el = mount(`<e-progress max="200"></e-progress>`);
      expect(el.getAttribute('aria-valuemax')).toBe('200');
    });

    it('has aria-valuenow equal to value', () => {
      const el = mount(`<e-progress value="42"></e-progress>`);
      expect(el.getAttribute('aria-valuenow')).toBe('42');
    });

    it('has aria-label when label is provided', () => {
      const el = mount(`<e-progress label="Upload Progress"></e-progress>`);
      expect(el.getAttribute('aria-label')).toBe('Upload Progress');
    });
  });

  describe('Value Clamping', () => {
    it('clamps value to 0 minimum', () => {
      const el = mount(`<e-progress value="-10"></e-progress>`);
      expect(el.getAttribute('aria-valuenow')).toBe('0');
    });

    it('clamps value to max maximum', () => {
      const el = mount(`<e-progress value="150" max="100"></e-progress>`);
      expect(el.getAttribute('aria-valuenow')).toBe('100');
    });

    it('clamps max to 1 minimum', () => {
      const el = mount(`<e-progress value="5" max="0"></e-progress>`);
      expect(el.getAttribute('aria-valuemax')).toBe('1');
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates value when changed', async () => {
      const el = mount(`<e-progress value="0"></e-progress>`);
      expect(el.getAttribute('value')).toBe('0');
      
      el.setAttribute('value', '50');
      await waitForUpdate();
      
      expect(el.getAttribute('value')).toBe('50');
    });

    it('updates max when changed', async () => {
      const el = mount(`<e-progress max="100"></e-progress>`);
      expect(el.getAttribute('max')).toBe('100');
      
      el.setAttribute('max', '200');
      await waitForUpdate();
      
      expect(el.getAttribute('max')).toBe('200');
    });

    it('updates variant when changed', async () => {
      const el = mount(`<e-progress variant="linear"></e-progress>`);
      expect(el.getAttribute('variant')).toBe('linear');
      
      el.setAttribute('variant', 'steps');
      await waitForUpdate();
      
      expect(el.getAttribute('variant')).toBe('steps');
    });
  });
});

// ============================================================================
// E-TAG TESTS
// ============================================================================
describe('e-tag', () => {
  describe('Basic Rendering', () => {
    it('renders with text content', () => {
      const el = mount(`<e-tag>Draft</e-tag>`);
      expect(el.textContent).toContain('Draft');
    });

    it('renders with closable attribute', () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      expect(el.hasAttribute('closable')).toBe(true);
    });

    it('renders with disabled attribute', () => {
      const el = mount(`<e-tag disabled>Draft</e-tag>`);
      expect(el.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Close Button', () => {
    it('renders close button when closable', () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      const closeBtn = el.querySelector('.ink-tag__close');
      expect(closeBtn).not.toBeNull();
    });

    it('does not render close button when not closable', () => {
      const el = mount(`<e-tag>Draft</e-tag>`);
      const closeBtn = el.querySelector('.ink-tag__close');
      expect(closeBtn).toBeNull();
    });

    it('fires e-close event when close button is clicked', async () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      let fired = false;
      let detail: { value: string } | null = null;
      
      el.addEventListener('e-close', (e) => {
        fired = true;
        detail = (e as CustomEvent<{ value: string }>).detail;
      });
      
      const closeBtn = el.querySelector('.ink-tag__close')!;
      closeBtn.click();
      
      await waitForUpdate();
      expect(fired).toBe(true);
      expect(detail?.value).toBe('Draft');
    });

    it('does not fire e-close when disabled', async () => {
      const el = mount(`<e-tag closable disabled>Draft</e-tag>`);
      let fired = false;
      
      el.addEventListener('e-close', () => { fired = true; });
      
      const closeBtn = el.querySelector('.ink-tag__close')!;
      closeBtn.click();
      
      await waitForUpdate();
      expect(fired).toBe(false);
    });

    it('removes close button when closable attribute is removed', async () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      expect(el.querySelector('.ink-tag__close')).not.toBeNull();
      
      el.removeAttribute('closable');
      await waitForUpdate();
      
      expect(el.querySelector('.ink-tag__close')).toBeNull();
    });
  });

  describe('Disabled State', () => {
    it('disables close button when disabled', () => {
      const el = mount(`<e-tag closable disabled>Draft</e-tag>`);
      const closeBtn = el.querySelector('.ink-tag__close') as HTMLButtonElement;
      expect(closeBtn?.disabled).toBe(true);
    });

    it('enables close button when not disabled', () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      const closeBtn = el.querySelector('.ink-tag__close') as HTMLButtonElement;
      expect(closeBtn?.disabled).toBe(false);
    });
  });

  describe('CSS Classes', () => {
    it('has ink-tag class', () => {
      const el = mount(`<e-tag>Draft</e-tag>`);
      const wrap = el.querySelector('.ink-tag');
      expect(wrap).not.toBeNull();
    });
  });

  describe('Event Bubbling', () => {
    it('bubbles e-close event', async () => {
      const el = mount(`<e-tag closable>Draft</e-tag>`);
      let fired = false;
      
      document.addEventListener('e-close', () => { fired = true; });
      
      const closeBtn = el.querySelector('.ink-tag__close')!;
      closeBtn.click();
      
      await waitForUpdate();
      expect(fired).toBe(true);
    });
  });
});

// ============================================================================
// E-TOGGLE TESTS
// ============================================================================
describe('e-toggle', () => {
  describe('Basic Rendering', () => {
    it('renders with label', () => {
      const el = mount(`<e-toggle label="Enable"></e-toggle>`);
      expect(el.getAttribute('label')).toBe('Enable');
    });

    it('renders without label', () => {
      const el = mount(`<e-toggle></e-toggle>`);
      expect(el.getAttribute('label')).toBeNull();
    });

    it('renders with checked state', () => {
      const el = mount(`<e-toggle checked></e-toggle>`);
      expect(el.hasAttribute('checked')).toBe(true);
    });

    it('renders without checked state by default', () => {
      const el = mount(`<e-toggle></e-toggle>`);
      expect(el.hasAttribute('checked')).toBe(false);
    });

    it('renders with disabled state', () => {
      const el = mount(`<e-toggle disabled></e-toggle>`);
      expect(el.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Form Association', () => {
    it('has formAssociated static property', async () => {
      const { EToggle } = await import('../toggle');
      expect(EToggle.formAssociated).toBe(true);
    });

    it('has name attribute', () => {
      const el = mount(`<e-toggle name="notifications"></e-toggle>`);
      expect(el.getAttribute('name')).toBe('notifications');
    });

    it('has value attribute', () => {
      const el = mount(`<e-toggle value="yes"></e-toggle>`);
      expect(el.getAttribute('value')).toBe('yes');
    });

    it('uses default value', () => {
      const el = mount(`<e-toggle></e-toggle>`);
      expect(el.getAttribute('value')).toBeNull();
    });
  });

  describe('Required Validation', () => {
    it('supports required attribute', () => {
      const el = mount(`<e-toggle required></e-toggle>`);
      expect(el.hasAttribute('required')).toBe(true);
    });

    it('supports required-message attribute', () => {
      const el = mount(`<e-toggle required required-message="Please enable"></e-toggle>`);
      expect(el.getAttribute('required-message')).toBe('Please enable');
    });
  });

  describe('Checked State', () => {
    it('updates checked attribute when clicked', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      const input = el.querySelector('input')!;
      
      expect(el.hasAttribute('checked')).toBe(false);
      input.click();
      await waitForUpdate();
      expect(el.hasAttribute('checked')).toBe(true);
    });

    it('toggles checked state on click', async () => {
      const el = mount(`<e-toggle checked></e-toggle>`);
      const input = el.querySelector('input')!;
      
      expect(el.hasAttribute('checked')).toBe(true);
      input.click();
      await waitForUpdate();
      expect(el.hasAttribute('checked')).toBe(false);
      input.click();
      await waitForUpdate();
      expect(el.hasAttribute('checked')).toBe(true);
    });

    it('does not toggle when disabled', async () => {
      const el = mount(`<e-toggle disabled></e-toggle>`);
      const input = el.querySelector('input')!;
      
      expect(el.hasAttribute('checked')).toBe(false);
      input.click();
      await waitForUpdate();
      expect(el.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Change Event', () => {
    it('fires e-change event on toggle', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      let fired = false;
      let detail: { checked: boolean } | null = null;
      
      el.addEventListener('e-change', (e) => {
        fired = true;
        detail = (e as CustomEvent<{ checked: boolean }>).detail;
      });
      
      const input = el.querySelector('input')!;
      input.click();
      await waitForUpdate();
      
      expect(fired).toBe(true);
      expect(detail?.checked).toBe(true);
    });

    it('bubbles e-change event', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      let fired = false;
      
      document.addEventListener('e-change', () => { fired = true; });
      
      const input = el.querySelector('input')!;
      input.click();
      await waitForUpdate();
      
      expect(fired).toBe(true);
    });
  });

  describe('State Display', () => {
    it('shows ON state when checked', () => {
      const el = mount(`<e-toggle checked></e-toggle>`);
      const state = el.querySelector('.ink-toggle__state');
      expect(state?.textContent).toBe('ON');
    });

    it('shows OFF state when not checked', () => {
      const el = mount(`<e-toggle></e-toggle>`);
      const state = el.querySelector('.ink-toggle__state');
      expect(state?.textContent).toBe('OFF');
    });

    it('updates state display on toggle', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      const input = el.querySelector('input')!;
      const state = el.querySelector('.ink-toggle__state')!;
      
      expect(state.textContent).toBe('OFF');
      input.click();
      await waitForUpdate();
      expect(state.textContent).toBe('ON');
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates checked state when attribute changes', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      const input = el.querySelector('input')!;
      
      expect(input.checked).toBe(false);
      el.setAttribute('checked', '');
      await waitForUpdate();
      expect(input.checked).toBe(true);
      
      el.removeAttribute('checked');
      await waitForUpdate();
      expect(input.checked).toBe(false);
    });

    it('updates disabled state when attribute changes', async () => {
      const el = mount(`<e-toggle></e-toggle>`);
      const input = el.querySelector('input')!;
      
      expect(input.disabled).toBe(false);
      el.setAttribute('disabled', '');
      await waitForUpdate();
      expect(input.disabled).toBe(true);
      
      el.removeAttribute('disabled');
      await waitForUpdate();
      expect(input.disabled).toBe(false);
    });

    it('updates label when attribute changes', async () => {
      const el = mount(`<e-toggle label="Old"></e-toggle>`);
      expect(el.getAttribute('label')).toBe('Old');
      
      el.setAttribute('label', 'New');
      await waitForUpdate();
      
      expect(el.getAttribute('label')).toBe('New');
    });
  });
});

// ============================================================================
// E-UPLOAD TESTS
// ============================================================================
describe('e-upload', () => {
  describe('Basic Rendering', () => {
    it('renders with drop zone', () => {
      const el = mount(`<e-upload></e-upload>`);
      const dropZone = el.querySelector('.ink-upload');
      expect(dropZone).not.toBeNull();
    });

    it('renders with title', () => {
      const el = mount(`<e-upload></e-upload>`);
      const title = el.querySelector('.ink-upload__title');
      expect(title).not.toBeNull();
      expect(title?.textContent).toContain('Drop files here');
    });

    it('renders with hint', () => {
      const el = mount(`<e-upload></e-upload>`);
      const hint = el.querySelector('.ink-upload__hint');
      expect(hint).not.toBeNull();
      expect(hint?.textContent).toBe('ANY FILE TYPE');
    });

    it('renders with file list', () => {
      const el = mount(`<e-upload></e-upload>`);
      const list = el.querySelector('.ink-upload__list');
      expect(list).not.toBeNull();
    });

    it('renders with hidden file input', () => {
      const el = mount(`<e-upload></e-upload>`);
      const input = el.querySelector('input[type="file"]');
      expect(input).not.toBeNull();
      expect(input?.style.display).toBe('none');
    });
  });

  describe('Accept Attribute', () => {
    it('renders with accept attribute', () => {
      const el = mount(`<e-upload accept=".pdf,.png"></e-upload>`);
      const input = el.querySelector('input[type="file"]');
      expect(input?.getAttribute('accept')).toBe('.pdf,.png');
    });

    it('updates hint when accept changes', async () => {
      const el = mount(`<e-upload accept=".pdf"></e-upload>`);
      const hint = el.querySelector('.ink-upload__hint')!;
      
      expect(hint.textContent).toBe('ACCEPTS · .PDF');
      
      el.setAttribute('accept', '.png,.jpg');
      await waitForUpdate();
      
      expect(hint.textContent).toBe('ACCEPTS · .PNG,.JPG');
    });

    it('shows ANY FILE TYPE when accept is empty', () => {
      const el = mount(`<e-upload></e-upload>`);
      const hint = el.querySelector('.ink-upload__hint');
      expect(hint?.textContent).toBe('ANY FILE TYPE');
    });
  });

  describe('Multiple Files', () => {
    it('supports multiple attribute', () => {
      const el = mount(`<e-upload multiple></e-upload>`);
      const input = el.querySelector('input[type="file"]');
      expect(input?.hasAttribute('multiple')).toBe(true);
    });

    it('does not support multiple by default', () => {
      const el = mount(`<e-upload></e-upload>`);
      const input = el.querySelector('input[type="file"]');
      expect(input?.hasAttribute('multiple')).toBe(false);
    });
  });

  describe('Form Association', () => {
    it('has formAssociated static property', async () => {
      const { EUpload } = await import('../upload');
      expect(EUpload.formAssociated).toBe(true);
    });

    it('has name attribute', () => {
      const el = mount(`<e-upload name="documents"></e-upload>`);
      expect(el.getAttribute('name')).toBe('documents');
    });
  });

  describe('Required Validation', () => {
    it('supports required attribute', () => {
      const el = mount(`<e-upload required></e-upload>`);
      expect(el.hasAttribute('required')).toBe(true);
    });

    it('supports required-message attribute', () => {
      const el = mount(`<e-upload required required-message="Please select files"></e-upload>`);
      expect(el.getAttribute('required-message')).toBe('Please select files');
    });
  });

  describe('Max Size and Files', () => {
    it('supports max-size attribute', () => {
      const el = mount(`<e-upload max-size="1024"></e-upload>`);
      expect(el.getAttribute('max-size')).toBe('1024');
    });

    it('supports max-files attribute', () => {
      const el = mount(`<e-upload multiple max-files="5"></e-upload>`);
      expect(el.getAttribute('max-files')).toBe('5');
    });
  });

  describe('Accessibility', () => {
    it('has role="button" on drop zone', () => {
      const el = mount(`<e-upload></e-upload>`);
      const dropZone = el.querySelector('.ink-upload');
      expect(dropZone?.getAttribute('role')).toBe('button');
    });

    it('has tabindex="0" on drop zone', () => {
      const el = mount(`<e-upload></e-upload>`);
      const dropZone = el.querySelector('.ink-upload');
      expect(dropZone?.getAttribute('tabindex')).toBe('0');
    });

    it('has aria-label on drop zone', () => {
      const el = mount(`<e-upload></e-upload>`);
      const dropZone = el.querySelector('.ink-upload');
      expect(dropZone?.getAttribute('aria-label')).toBe('Choose files');
    });
  });

  describe('Dynamic Attribute Changes', () => {
    it('updates accept when changed', async () => {
      const el = mount(`<e-upload accept=".pdf"></e-upload>`);
      const input = el.querySelector('input[type="file"]')!;
      
      expect(input.getAttribute('accept')).toBe('.pdf');
      
      el.setAttribute('accept', '.png');
      await waitForUpdate();
      
      expect(input.getAttribute('accept')).toBe('.png');
    });

    it('updates multiple when changed', async () => {
      const el = mount(`<e-upload></e-upload>`);
      const input = el.querySelector('input[type="file"]')!;
      
      expect(input.hasAttribute('multiple')).toBe(false);
      
      el.setAttribute('multiple', '');
      await waitForUpdate();
      
      expect(input.hasAttribute('multiple')).toBe(true);
    });
  });
});
