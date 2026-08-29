import { define, EpaperElement, numAttr, patchAttr, patchText } from '../../core/dom';
import { SVG_NS } from '../../core/icons';
import { t } from '../../core/i18n';

type SparklineTrend = 'up' | 'down' | 'flat';

const TREND_META: Record<SparklineTrend, { text: string; glyph: string }> = {
  up: { text: 'Rising', glyph: '▲' },
  down: { text: 'Falling', glyph: '▼' },
  flat: { text: 'Flat', glyph: '—' },
};

/** Where the latest reading sits relative to the configured threshold. */
type ThresholdState = 'above' | 'below' | 'at';

const THRESHOLD_KEY: Record<ThresholdState, 'thresholdAbove' | 'thresholdBelow' | 'thresholdAt'> = {
  above: 'thresholdAbove',
  below: 'thresholdBelow',
  at: 'thresholdAt',
};

const thresholdState = (value: number, threshold: number): ThresholdState => {
  if (value > threshold) return 'above';
  return value < threshold ? 'below' : 'at';
};

/** Accessible summary of the series: label, latest value and trend, or "No data". */
function sparklineAriaLabel(
  el: Element,
  label: string,
  hasData: boolean,
  lastValue: number | undefined,
  trendText: string,
  threshold: number | null,
  state: ThresholdState | null,
): string {
  const prefix = label ? `${label}: ` : '';
  if (!hasData) return `${prefix}No data`;
  const limit =
    threshold != null && state
      ? t(el, 'sparklineThreshold', { state: t(el, THRESHOLD_KEY[state]), threshold })
      : '';
  return `${prefix}${lastValue}; ${trendText.toLowerCase()}${limit}`;
}

const valuesFrom = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .slice(0, 256);
  } catch {
    return [];
  }
};

/**
 * @summary Monochrome mini-chart with a static line and explicit trend cue.
 * @since v1.1.0
 *
 * The chart uses a single SVG polyline, no animation and no color-dependent
 * meaning. The first-to-last direction is repeated as readable text.
 *
 * The dashed guide line marks the `threshold` when one is given. Without it the
 * guide stays on the vertical mid-line it has always used, so an existing chart
 * looks unchanged.
 *
 * @attr {string} values - JSON array of finite numbers.
 * @attr {string} [label] - Visible and accessible series label.
 * @attr {number} [min] - Optional fixed lower bound.
 * @attr {number} [max] - Optional fixed upper bound.
 * @attr {number} [threshold] - Value the dashed guide line marks — a warning limit, a target, a
 *   setpoint. The latest reading's position relative to it is exposed as `data-threshold` on the
 *   figure (`above` / `below` / `at`) and appended to the accessible label. Values outside
 *   `min`…`max` are clamped onto the plot area. @since v2.0.0
 * @attr {boolean} [hide-caption] - Hides the label, latest value and trend caption.
 *
 * @example
 * <e-sparkline label="Requests" values="[12,18,15,24,28,31]"></e-sparkline>
 *
 * @example
 * <e-sparkline label="Kesseldruck" values="[4.1,4.4,5.2,6.0]" max="8" threshold="5.5"></e-sparkline>
 */
export class ESparkline extends EpaperElement {
  static readonly observedAttributes = [
    'values',
    'label',
    'min',
    'max',
    'threshold',
    'hide-caption',
  ];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _svg: SVGSVGElement | null = null;
  private _guide: SVGLineElement | null = null;
  private _line: SVGPolylineElement | null = null;
  private _last: SVGCircleElement | null = null;
  private _empty: HTMLElement | null = null;
  private _caption: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _valueEl: HTMLElement | null = null;
  private _trendEl: HTMLElement | null = null;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;

    const root = document.createElement('figure');
    root.className = 'ink-sparkline';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.classList.add('ink-sparkline__plot');
    svg.setAttribute('viewBox', '0 0 100 36');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const guide = document.createElementNS(SVG_NS, 'line');
    guide.classList.add('ink-sparkline__guide');
    guide.setAttribute('x1', '2');
    guide.setAttribute('x2', '98');
    guide.setAttribute('y1', '18');
    guide.setAttribute('y2', '18');
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.classList.add('ink-sparkline__line');
    const last = document.createElementNS(SVG_NS, 'circle');
    last.classList.add('ink-sparkline__last');
    last.setAttribute('r', '2.5');
    svg.append(guide, line, last);

    const empty = document.createElement('div');
    empty.className = 'ink-sparkline__empty';
    empty.textContent = 'No data';

    const caption = document.createElement('figcaption');
    caption.className = 'ink-sparkline__caption';
    const labelEl = document.createElement('span');
    labelEl.className = 'ink-sparkline__label';
    const valueEl = document.createElement('span');
    valueEl.className = 'ink-sparkline__value';
    const trendEl = document.createElement('span');
    trendEl.className = 'ink-sparkline__trend';
    caption.append(labelEl, valueEl, trendEl);
    root.append(svg, empty, caption);
    this.replaceChildren(root);

    this._root = root;
    this._svg = svg;
    this._guide = guide;
    this._line = line;
    this._last = last;
    this._empty = empty;
    this._caption = caption;
    this._labelEl = labelEl;
    this._valueEl = valueEl;
    this._trendEl = trendEl;
    this._patch();
  }

  attributeChangedCallback() {
    if (this._wired) this._patch();
  }

  private _trend(values: number[]): SparklineTrend {
    if (values.length < 2 || values[0] === values.at(-1)) return 'flat';
    return values.at(-1)! > values[0]! ? 'up' : 'down';
  }

  /** Explicit min/max: attribute override, else the data's own range (widened by 1 if flat). */
  private _bounds(values: number[]): { min: number; max: number } {
    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 1;
    const min = this.hasAttribute('min') ? numAttr(this, 'min', dataMin) : dataMin;
    const rawMax = this.hasAttribute('max') ? numAttr(this, 'max', dataMax) : dataMax;
    const max = rawMax > min ? rawMax : min + 1;
    return { min, max };
  }

  /** Map a data value onto the 36-unit plot band, clamped to the visible range. */
  private _yFor(value: number, min: number, max: number): number {
    return 34 - ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 32;
  }

  private _pointFor(value: number, index: number, count: number, min: number, max: number): string {
    const x = count === 1 ? 50 : 2 + (index / (count - 1)) * 96;
    return `${x.toFixed(2)},${this._yFor(value, min, max).toFixed(2)}`;
  }

  /** The configured threshold, or `null` when the attribute is absent or unusable. */
  private _threshold(): number | null {
    if (!this.hasAttribute('threshold')) return null;
    const raw = numAttr(this, 'threshold', Number.NaN);
    return Number.isFinite(raw) ? raw : null;
  }

  private _patch(): void {
    if (
      !this._root ||
      !this._svg ||
      !this._guide ||
      !this._line ||
      !this._last ||
      !this._empty ||
      !this._caption ||
      !this._labelEl ||
      !this._valueEl ||
      !this._trendEl
    )
      return;

    const values = valuesFrom(this.getAttribute('values'));
    const label = this.getAttribute('label') || '';
    const trend = this._trend(values);
    const lastValue = values.at(-1);
    const { min, max } = this._bounds(values);
    const points = values.map((value, index) =>
      this._pointFor(value, index, values.length, min, max),
    );
    const lastPoint = points.at(-1)?.split(',') ?? [];
    const { text: trendText, glyph } = TREND_META[trend];
    const hasData = values.length > 0;
    const threshold = this._threshold();
    const state =
      threshold != null && lastValue != null ? thresholdState(lastValue, threshold) : null;
    // No threshold: the guide keeps the mid-line position it has had since
    // v1.1.0, so an existing chart is not silently redrawn.
    const guideY = threshold != null ? this._yFor(threshold, min, max).toFixed(2) : '18';

    patchAttr(this, 'role', 'img');
    patchAttr(
      this,
      'aria-label',
      sparklineAriaLabel(this, label, hasData, lastValue, trendText, threshold, state),
    );
    patchAttr(this._root, 'data-trend', trend);
    patchAttr(this._root, 'data-threshold', state);
    patchAttr(this._guide, 'y1', guideY);
    patchAttr(this._guide, 'y2', guideY);
    patchAttr(this._line, 'points', points.join(' '));
    patchAttr(this._last, 'cx', lastPoint[0] ?? null);
    patchAttr(this._last, 'cy', lastPoint[1] ?? null);
    patchAttr(this._last, 'hidden', hasData ? null : '');
    patchAttr(this._svg, 'hidden', hasData ? null : '');
    patchAttr(this._empty, 'hidden', hasData ? '' : null);
    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._valueEl, hasData ? String(lastValue) : '');
    patchText(this._trendEl, `${glyph} ${trendText}`);
    patchAttr(this._caption, 'hidden', this.hasAttribute('hide-caption') ? '' : null);
  }
}

define('e-sparkline', ESparkline);
