import { define, numAttr, patchAttr, patchText } from '../../core/dom';
import { formatMoney, formatUnitPrice, MONEY_PLACEHOLDER } from '../../core/format';

const SIZES: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** `null` for an absent or non-numeric attribute, so "no price" stays distinct from 0. */
const optionalNumber = (el: Element, name: string): number | null => {
  const raw = el.getAttribute(name);
  if (raw == null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * @summary Retail price with split euro/cent typography, strike-through original and base price.
 * @since v1.3.0
 *
 * The amount is formatted through `Intl` for the given locale and currency and
 * then set in two sizes — the major unit large, the minor unit small — which
 * is what makes a price readable across a shelf at 1-bit contrast. The
 * currency symbol follows the locale's own position, so `de-DE` renders
 * `3,99 €` and `en-US` renders `$3.99` from the same markup.
 *
 * @attr {number} value - Current price.
 * @attr {string} [currency='EUR'] - ISO 4217 currency code.
 * @attr {string} [locale] - Formatting locale. Defaults to the document language.
 * @attr {number} [original] - Previous price, rendered struck through above the current one.
 * @attr {number} [unit-price] - Base price per `unit`, rendered as a footnote.
 * @attr {string} [unit] - Base-price unit, e.g. `kg` or `l`.
 * @attr {number} [fraction-digits] - Overrides the currency's own number of decimals.
 * @attr {'xs'|'sm'|'md'|'lg'|'xl'} [size='md'] - Type scale, from a 1.5" label (`xs`) to a 10" panel (`xl`).
 * @attr {string} [note] - Small print under the price, e.g. `incl. VAT`.
 * @attr {string} [original-label='Was'] - Screen-reader prefix of the struck-through price.
 *
 * @example
 * <e-price value="3.99" original="4.99" unit-price="7.98" unit="kg" size="lg"></e-price>
 */
export class EPrice extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'currency',
    'locale',
    'original',
    'unit-price',
    'unit',
    'fraction-digits',
    'size',
    'note',
    'original-label',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _original: HTMLElement | null = null;
  private _amount: HTMLElement | null = null;
  private _currency: HTMLElement | null = null;
  private _major: HTMLElement | null = null;
  private _minor: HTMLElement | null = null;
  private _a11y: HTMLElement | null = null;
  private _unit: HTMLElement | null = null;
  private _note: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    const root = document.createElement('div');
    root.className = 'ink-price';

    const original = document.createElement('s');
    original.className = 'ink-price__original';

    const amount = document.createElement('span');
    amount.className = 'ink-price__amount';
    amount.setAttribute('aria-hidden', 'true');
    const currency = document.createElement('span');
    currency.className = 'ink-price__currency';
    const major = document.createElement('span');
    major.className = 'ink-price__major';
    const minor = document.createElement('span');
    minor.className = 'ink-price__minor';
    amount.append(currency, major, minor);

    const a11y = document.createElement('span');
    a11y.className = 'sr-only';

    const unit = document.createElement('span');
    unit.className = 'ink-price__unit';
    const note = document.createElement('span');
    note.className = 'ink-price__note';

    root.append(original, amount, a11y, unit, note);
    this._root = root;
    this._original = original;
    this._amount = amount;
    this._currency = currency;
    this._major = major;
    this._minor = minor;
    this._a11y = a11y;
    this._unit = unit;
    this._note = note;
    this.replaceChildren(root);
    patchAttr(this, 'role', 'group');
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  private _render(): void {
    if (!this._root || !this._original || !this._amount || !this._currency) return;
    if (!this._major || !this._minor || !this._a11y || !this._unit || !this._note) return;

    const locale =
      this.getAttribute('locale') || this.lang || document.documentElement.lang || undefined;
    const currencyCode = this.getAttribute('currency') || 'EUR';
    const digits = optionalNumber(this, 'fraction-digits');
    const size = this.getAttribute('size');
    const value = numAttr(this, 'value', Number.NaN);
    const money = formatMoney(value, currencyCode, locale, digits ?? undefined);

    patchAttr(this._root, 'data-size', size && SIZES.includes(size) ? size : 'md');
    patchAttr(this._root, 'data-negative', money.negative ? 'true' : null);

    patchText(this._currency, money.currency);
    patchAttr(this._currency, 'hidden', money.currency ? null : '');
    patchText(this._major, money.major);
    patchText(this._minor, money.minor ? `${money.decimal}${money.minor}` : '');
    patchAttr(this._minor, 'hidden', money.minor ? null : '');
    // The locale decides which side the symbol sits on; moving one node is
    // cheaper than re-rendering the amount.
    const symbolFirst = money.currencyFirst;
    const currencyIsFirst = this._amount.firstElementChild === this._currency;
    if (symbolFirst !== currencyIsFirst) {
      if (symbolFirst) this._amount.insertBefore(this._currency, this._major);
      else this._amount.appendChild(this._currency);
    }

    const originalValue = optionalNumber(this, 'original');
    const originalText =
      originalValue === null
        ? ''
        : formatMoney(originalValue, currencyCode, locale, digits ?? undefined).text;
    patchText(this._original, originalText);
    patchAttr(this._original, 'hidden', originalText ? null : '');
    const originalLabel = this.getAttribute('original-label') || 'Was';
    patchAttr(
      this._original,
      'aria-label',
      originalText ? `${originalLabel} ${originalText}` : null,
    );

    const unitValue = optionalNumber(this, 'unit-price');
    const unitText =
      unitValue === null
        ? ''
        : formatUnitPrice(
            unitValue,
            currencyCode,
            this.getAttribute('unit') || '',
            locale,
            digits ?? undefined,
          );
    patchText(this._unit, unitText);
    patchAttr(this._unit, 'hidden', unitText ? null : '');

    const note = this.getAttribute('note') || '';
    patchText(this._note, note);
    patchAttr(this._note, 'hidden', note ? null : '');

    patchText(this._a11y, money.text === MONEY_PLACEHOLDER ? 'No price' : money.text);
  }
}

define('e-price', EPrice);
