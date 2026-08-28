// String-table resolution. The registry is module-global by design, so these
// tests register under their own locale tags rather than mutating `en`/`de`
// and leaking into other suites.
import { describe, it, expect, afterEach } from 'vitest';
import { label, setLocaleStrings, strings, t } from './i18n';

const el = (html = '<span></span>'): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('strings', () => {
  it('defaults to English when nothing declares a language', () => {
    expect(strings(el()).stale).toBe('Stale');
  });

  it('ships a German table', () => {
    expect(strings(el('<span locale="de"></span>')).stale).toBe('Veraltet');
  });

  it('falls back from a region tag to its base language', () => {
    expect(strings(el('<span locale="de-AT"></span>')).stale).toBe('Veraltet');
  });

  it('falls back to English for an unknown language', () => {
    expect(strings(el('<span locale="xx"></span>')).stale).toBe('Stale');
  });
});

describe('t', () => {
  it('substitutes placeholders', () => {
    expect(t(el(), 'pageOf', { page: 2, total: 9 })).toBe('Page 2 of 9');
  });

  it('leaves an unknown placeholder untouched rather than printing undefined', () => {
    expect(t(el(), 'pageOf', { page: 2 })).toBe('Page 2 of {total}');
  });
});

describe('setLocaleStrings', () => {
  it('merges a partial override onto the base language', () => {
    setLocaleStrings('de-CH', { stale: 'Nicht mehr aktuell' });
    const table = strings(el('<span locale="de-CH"></span>'));
    expect(table.stale).toBe('Nicht mehr aktuell');
    // Untouched keys still come from the German base, not from English.
    expect(table.fresh).toBe('Aktuell');
  });
});

describe('label', () => {
  it('lets a per-instance attribute win over the locale table', () => {
    expect(label(el('<span prev-label="Vorherige"></span>'), 'prev-label', 'previous')).toBe(
      'Vorherige',
    );
  });

  it('falls back to the locale table when the attribute is absent or empty', () => {
    expect(label(el(), 'prev-label', 'previous')).toBe('Previous');
    expect(label(el('<span prev-label=""></span>'), 'prev-label', 'previous')).toBe('Previous');
  });
});
