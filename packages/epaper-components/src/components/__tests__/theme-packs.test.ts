import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import '../../styles/tokens.css';
import '../../styles/components.css';
import '../../styles/themes/mono-high-contrast.css';
import '../../styles/themes/kaleido.css';

beforeAll(async () => {
  await import('../alert/alert');
});

afterEach(() => {
  document.querySelectorAll('[data-theme-test]').forEach((node) => node.remove());
});

const token = (element: Element, name: string): string =>
  getComputedStyle(element).getPropertyValue(name).trim();

describe('panel theme packs', () => {
  it('scopes the high-contrast monochrome tokens to a container', () => {
    const outer = document.createElement('div');
    outer.dataset['themeTest'] = '';
    outer.className = 'ink-page';
    const themed = document.createElement('section');
    themed.className = 'ink-theme--mono-high-contrast';
    outer.appendChild(themed);
    document.body.appendChild(outer);

    expect(token(outer, '--ink-border-width')).toBe('2px');
    expect(token(themed, '--ink-border-width')).toBe('3px');
    expect(token(themed, '--ink-focus-width')).toBe('4px');
    expect(token(themed, '--ink-control-h-md')).toBe('48px');
    expect(token(themed, '--ink-accent')).toBe('#000');
  });

  it('maps Kaleido status tokens without removing non-color error cues', () => {
    const root = document.createElement('div');
    root.dataset['themeTest'] = '';
    root.dataset['inkTheme'] = 'kaleido';
    root.className = 'ink-page';
    root.innerHTML = '<e-alert variant="error" heading="Failure"></e-alert>';
    document.body.appendChild(root);

    const alert = root.querySelector<HTMLElement>('.ink-alert')!;
    expect(token(root, '--ink-success')).toBe('#1f8a3b');
    expect(token(root, '--ink-warning')).toBe('#e26a1b');
    expect(token(root, '--ink-danger')).toBe('#d11a1a');
    expect(getComputedStyle(alert).borderColor).toBe('rgb(209, 26, 26)');
    expect(getComputedStyle(alert.querySelector('.ink-alert__icon')!).backgroundImage).not.toBe(
      'none',
    );
  });
});
