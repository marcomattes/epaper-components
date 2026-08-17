import { define, numAttr, patchAttr, patchText } from '../core/dom';
import { SVG_NS } from '../core/icons';

type SparklineTrend = 'up' | 'down' | 'flat';

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
 * @attr {string} values - JSON array of finite numbers.
 * @attr {string} [label] - Visible and accessible series label.
 * @attr {number} [min] - Optional fixed lower bound.
 * @attr {number} [max] - Optional fixed upper bound.
 * @attr {boolean} [hide-caption] - Hides the label, latest value and trend caption.
 *
 * @example
 * <e-sparkline label="Requests" values="[12,18,15,24,28,31]"></e-sparkline>
 */
export class ESparkline extends HTMLElement {
  static observedAttributes = ['values', 'label', 'min', 'max', 'hide-caption'];

  private _wired = false;
  private _root: HTMLElement | null = null;
  private _svg: SVGSVGElement | null = null;
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
    if (values.length < 2 || values[0] === values[values.length - 1]) return 'flat';
    return values[values.length - 1]! > values[0]! ? 'up' : 'down';
  }

  private _patch(): void {
    if (
      !this._root ||
      !this._svg ||
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
    const lastValue = values[values.length - 1];
    const dataMin = values.length ? Math.min(...values) : 0;
    const dataMax = values.length ? Math.max(...values) : 1;
    const min = this.hasAttribute('min') ? numAttr(this, 'min', dataMin) : dataMin;
    const rawMax = this.hasAttribute('max') ? numAttr(this, 'max', dataMax) : dataMax;
    const max = rawMax > min ? rawMax : min + 1;
    const span = max - min;
    const points = values.map((value, index) => {
      const x = values.length === 1 ? 50 : 2 + (index / (values.length - 1)) * 96;
      const y = 34 - ((Math.min(max, Math.max(min, value)) - min) / span) * 32;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const lastPoint = points[points.length - 1]?.split(',') ?? [];
    const trendText = trend === 'up' ? 'Rising' : trend === 'down' ? 'Falling' : 'Flat';
    const hasData = values.length > 0;

    patchAttr(this, 'role', 'img');
    patchAttr(
      this,
      'aria-label',
      hasData
        ? `${label ? `${label}: ` : ''}${lastValue}; ${trendText.toLowerCase()}`
        : `${label ? `${label}: ` : ''}No data`,
    );
    patchAttr(this._root, 'data-trend', trend);
    patchAttr(this._line, 'points', points.join(' '));
    patchAttr(this._last, 'cx', lastPoint[0] ?? null);
    patchAttr(this._last, 'cy', lastPoint[1] ?? null);
    patchAttr(this._last, 'hidden', hasData ? null : '');
    patchAttr(this._svg, 'hidden', hasData ? null : '');
    patchAttr(this._empty, 'hidden', hasData ? '' : null);
    patchText(this._labelEl, label);
    patchAttr(this._labelEl, 'hidden', label ? null : '');
    patchText(this._valueEl, hasData ? String(lastValue) : '');
    patchText(this._trendEl, `${trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'} ${trendText}`);
    patchAttr(this._caption, 'hidden', this.hasAttribute('hide-caption') ? '' : null);
  }
}

define('e-sparkline', ESparkline);
