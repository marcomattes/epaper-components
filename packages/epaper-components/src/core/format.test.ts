// Locale resolution and Intl wrapper behaviour. These pin the two properties
// every caller depends on: the locale is read from the element's own context,
// and malformed input degrades to plain output instead of throwing into a
// component's render path.
import { describe, it, expect, afterEach } from 'vitest';
import {
  formatDate,
  formatNumber,
  formatRelativeTime,
  monthLabel,
  resolveLocale,
  weekdayLabels,
} from './format';

const el = (html = '<span></span>'): HTMLElement => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('lang');
});

describe('resolveLocale', () => {
  it('prefers the element locale attribute', () => {
    expect(resolveLocale(el('<span locale="de-DE"></span>'))).toBe('de-DE');
  });

  it('falls back to the nearest lang ancestor', () => {
    const node = el('<div lang="fr"><span></span></div>').querySelector('span')!;
    expect(resolveLocale(node)).toBe('fr');
  });

  it('falls back to the document language', () => {
    document.documentElement.lang = 'es';
    expect(resolveLocale(el())).toBe('es');
  });

  it('returns undefined when nothing declares a language', () => {
    expect(resolveLocale(el())).toBeUndefined();
  });

  it('ignores a blank locale attribute', () => {
    expect(resolveLocale(el('<span locale="   "></span>'))).toBeUndefined();
  });
});

describe('formatNumber', () => {
  it('groups thousands for the resolved locale', () => {
    expect(formatNumber(el('<span locale="de-DE"></span>'), 1299)).toBe('1.299');
    expect(formatNumber(el('<span locale="en-US"></span>'), 1299)).toBe('1,299');
  });

  it('renders currency', () => {
    expect(formatNumber(el('<span locale="de-DE"></span>'), 1299, { currency: 'EUR' })).toContain(
      '1.299,00',
    );
  });

  it('honours a fixed precision', () => {
    expect(formatNumber(el('<span locale="en-US"></span>'), 3.14159, { precision: 2 })).toBe(
      '3.14',
    );
  });

  it('can suppress grouping', () => {
    expect(formatNumber(el('<span locale="en-US"></span>'), 1299, { grouping: false })).toBe(
      '1299',
    );
  });

  it('returns an empty string for non-finite input', () => {
    expect(formatNumber(el(), Number.NaN)).toBe('');
    expect(formatNumber(el(), Number.POSITIVE_INFINITY)).toBe('');
  });

  it('falls back rather than throwing on a malformed locale', () => {
    expect(formatNumber(el('<span locale="not a locale"></span>'), 3.5, { precision: 1 })).toBe(
      '3.5',
    );
  });
});

describe('formatDate', () => {
  it('returns an empty string for an unparseable date', () => {
    expect(formatDate(el(), 'nonsense')).toBe('');
  });

  it('formats a valid date without throwing', () => {
    expect(formatDate(el('<span locale="en-US"></span>'), '2026-08-28')).not.toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-28T12:00:00Z');

  it('describes the past', () => {
    const then = new Date('2026-08-25T12:00:00Z');
    expect(formatRelativeTime(el('<span locale="en-US"></span>'), then, now)).toBe('3 days ago');
  });

  it('describes the future, which is what a countdown needs', () => {
    const later = new Date('2026-08-28T12:10:00Z');
    expect(formatRelativeTime(el('<span locale="en-US"></span>'), later, now)).toBe(
      'in 10 minutes',
    );
  });

  it('localizes', () => {
    const then = new Date('2026-08-25T12:00:00Z');
    expect(formatRelativeTime(el('<span locale="de-DE"></span>'), then, now)).toContain('Tagen');
  });
});

describe('weekdayLabels', () => {
  it('starts on Sunday by default', () => {
    const labels = weekdayLabels(el('<span locale="en-US"></span>'), 0, 'short');
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe('Sun');
  });

  it('can start the week on Monday, as most of Europe does', () => {
    const labels = weekdayLabels(el('<span locale="en-US"></span>'), 1, 'short');
    expect(labels[0]).toBe('Mon');
  });

  it('localizes', () => {
    expect(weekdayLabels(el('<span locale="de-DE"></span>'), 1, 'short')[0]).toContain('Mo');
  });
});

describe('monthLabel', () => {
  it('localizes the month name', () => {
    expect(monthLabel(el('<span locale="de-DE"></span>'), 0, 2026)).toBe('Januar');
    expect(monthLabel(el('<span locale="en-US"></span>'), 0, 2026)).toBe('January');
  });
});
