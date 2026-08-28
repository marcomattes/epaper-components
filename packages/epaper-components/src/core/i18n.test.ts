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

describe('new component vocabulary added alongside e-barcode, e-status-pill and friends', () => {
  it('keeps the English defaults components already pin', () => {
    const table = strings(el());
    expect(table.rating).toBe('Rating');
    expect(table.decimalSeparator).toBe('Decimal separator');
    expect(table.changed).toBe('Changed');
    expect(table.from).toBe('from');
    expect(table.onThisPage).toBe('ON THIS PAGE');
    expect(table.inPageNavigation).toBe('In-page navigation');
    expect(table.linkToSection).toBe('Link to this section');
    expect(table.anyFileType).toBe('ANY FILE TYPE');
    expect(table.statusOk).toBe('OK');
    expect(table.statusWarning).toBe('Warning');
    expect(table.statusCritical).toBe('Critical');
    expect(table.statusOffline).toBe('Offline');
    expect(table.statusNeutral).toBe('Neutral');
  });

  it('ships a German translation for every added key', () => {
    const table = strings(el('<span locale="de"></span>'));
    expect(table.rating).toBe('Bewertung');
    expect(table.changed).toBe('Geändert');
    expect(table.from).toBe('von');
    expect(table.statusWarning).toBe('Warnung');
    expect(table.statusCritical).toBe('Kritisch');
  });

  it('interpolates the e-barcode messages', () => {
    expect(t(el(), 'barcodeLabel', { format: 'EAN13', value: '4006381333931' })).toBe(
      'EAN13 barcode 4006381333931',
    );
    expect(t(el(), 'barcodeNeedsDigits', { format: 'EAN13', min: 12, max: 13 })).toBe(
      'EAN13 needs 12 or 13 digits.',
    );
    expect(t(el(), 'barcodeCheckDigit', { found: '0', expected: '1' })).toBe(
      'Check digit is 0, expected 1.',
    );
    expect(t(el(), 'code128CannotEncode', { char: 'ü' })).toBe(
      'Code 128 cannot encode character "ü".',
    );
  });

  it('interpolates the e-sparkline threshold phrase', () => {
    expect(t(el(), 'sparklineThreshold', { state: t(el(), 'thresholdAbove'), threshold: 5 })).toBe(
      '; above threshold 5',
    );
  });

  it('interpolates the e-qrcode messages', () => {
    expect(t(el(), 'qrCodeFor', { value: 'hello' })).toBe('QR code for hello');
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
