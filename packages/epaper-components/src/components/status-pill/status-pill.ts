import { boolAttr, define, patchAttr, patchText } from '../../core/dom';
import { t, type LocaleStrings } from '../../core/i18n';

/** Symbol and text rendered for one status value. */
export interface StatusPillMeta {
  symbol: string;
  label: string;
}

/**
 * Built-in vocabulary. Deliberately the same five keys as `e-status-board`,
 * so a board and the pills beside it read consistently. The label is a
 * string-table key rather than English text, so `setLocaleStrings()` reaches
 * it the same way it reaches `e-event-log`'s severity words.
 */
const BUILT_IN_KEYS: Record<string, { symbol: string; key: keyof LocaleStrings }> = {
  ok: { symbol: '✓', key: 'statusOk' },
  warning: { symbol: '!', key: 'statusWarning' },
  critical: { symbol: '×', key: 'statusCritical' },
  offline: { symbol: '○', key: 'statusOffline' },
  neutral: { symbol: '—', key: 'statusNeutral' },
};

/** The built-in vocabulary resolved to the element's locale. */
function builtInMeta(el: Element): Record<string, StatusPillMeta> {
  const meta: Record<string, StatusPillMeta> = {};
  for (const [key, { symbol, key: tableKey }] of Object.entries(BUILT_IN_KEYS)) {
    meta[key] = { symbol, label: t(el, tableKey) };
  }
  return meta;
}

const SIZES = new Set(['sm', 'md', 'lg']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Merge an author-declared vocabulary over the built-ins. Malformed entries
 * are skipped rather than rendering `undefined` into the pill.
 */
function metaFrom(
  raw: string | null,
  builtIn: Record<string, StatusPillMeta>,
): Record<string, StatusPillMeta> {
  if (!raw) return builtIn;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return builtIn;
    const merged: Record<string, StatusPillMeta> = { ...builtIn };
    for (const [key, value] of Object.entries(parsed)) {
      if (!key || !isRecord(value)) continue;
      const { symbol, label } = value;
      if (typeof symbol !== 'string' || typeof label !== 'string') continue;
      merged[key] = { symbol, label };
    }
    return merged;
  } catch {
    return builtIn;
  }
}

/**
 * @summary Single-value status pill with a symbol-and-text cue.
 * @since v1.3.0
 *
 * The one-value counterpart to `e-status-board`: the "free / busy",
 * "in stock / sold out", "running / stopped" marker that a door sign, shelf
 * label or machine tile leads with. Its vocabulary is open — `statuses`
 * declares any keys the deployment needs, so a room sign says "Belegt"
 * instead of bending occupancy onto `warning`.
 *
 * Meaning is never carried by colour alone: every state renders a symbol and
 * a word, which is what makes it readable on a greyscale panel.
 *
 * The label resolves in this order: the `label` attribute, then the element's
 * own text content, then the vocabulary entry. Text children are honoured
 * rather than discarded, matching how `e-badge` and `e-tag` treat theirs.
 *
 * @attr {string} [status='neutral'] - Status key. One of the built-in `ok`/`warning`/`critical`/`offline`/`neutral`, or any key declared in `statuses`.
 * @attr {string} [statuses] - JSON map of status keys to `{symbol, label}`, merged over the built-ins.
 * @attr {string} [label] - Overrides the label text for the current status.
 * @attr {'sm'|'md'|'lg'} [size='md'] - Type scale. `lg` reads across a room.
 * @attr {boolean} [announce] - Exposes the pill as a polite live region so a status change is announced.
 *
 * @slot - Optional text label, used when no `label` attribute is set.
 *
 * @example
 * <e-status-pill status="ok" label="Frei"></e-status-pill>
 * @example
 * <e-status-pill
 *   statuses='{"busy":{"symbol":"●","label":"Belegt"}}'
 *   status="busy"
 *   size="lg"></e-status-pill>
 */
export class EStatusPill extends HTMLElement {
  static readonly observedAttributes = ['status', 'statuses', 'label', 'size', 'announce'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _symbol: HTMLElement | null = null;
  private _label: HTMLElement | null = null;
  private _authored = '';

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    // Authored text is the label unless an attribute overrides it. Reading it
    // before the render is what keeps `<e-status-pill>Belegt</e-status-pill>`
    // from silently disappearing into `replaceChildren` below.
    this._authored = (this.textContent ?? '').trim();
    // Built with the DOM API rather than an innerHTML template: no
    // author-controlled string is interpolated, and the nodes are the ones
    // every later update patches in place.
    const root = document.createElement('span');
    root.className = 'ink-status-pill';
    const symbol = document.createElement('span');
    symbol.className = 'ink-status-pill__symbol';
    symbol.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'ink-status-pill__label';
    root.append(symbol, label);
    this.replaceChildren(root);
    this._root = root;
    this._symbol = symbol;
    this._label = label;
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _patch(): void {
    if (!this._root || !this._symbol || !this._label) return;
    const builtIn = builtInMeta(this);
    const meta = metaFrom(this.getAttribute('statuses'), builtIn);
    const status = this.getAttribute('status') || 'neutral';
    const cue = meta[status] ?? builtIn['neutral']!;
    const text = this.getAttribute('label') || this._authored || cue.label;
    const size = this.getAttribute('size');

    patchAttr(this._root, 'data-status', status);
    patchAttr(this._root, 'data-size', size && SIZES.has(size) ? size : null);
    patchText(this._symbol, cue.symbol);
    patchText(this._label, text);
    // The symbol is decorative, so the pill's accessible name is the word on
    // its own — announced only when the page opts in, since a door sign that
    // interrupts a screen reader on every poll is worse than a silent one.
    patchAttr(this, 'role', boolAttr(this, 'announce') ? 'status' : null);
    patchAttr(this, 'aria-live', boolAttr(this, 'announce') ? 'polite' : null);
  }
}

define('e-status-pill', EStatusPill);
