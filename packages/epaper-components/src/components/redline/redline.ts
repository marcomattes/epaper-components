import {
  boolAttr,
  define,
  EpaperElement,
  patchAttr,
  patchBoolAttr,
  patchText,
} from '../../core/dom';
import { t } from '../../core/i18n';

/** A single diffed token: a word kept as-is, removed from `before`, or added in `after`. */
interface WordOp {
  type: 'same' | 'del' | 'ins';
  text: string;
}

/** One paragraph pairing, already reduced to what changed. */
interface ParagraphRow {
  changed: boolean;
  before: string;
  after: string;
}

/**
 * Above this many words in either paragraph, a full LCS table (`O(n*m)` time
 * and space) stops being worth it on a device with no GC headroom to spare.
 * Longer paragraphs still get a correct diff — just at whole-paragraph
 * granularity, via {@link diffTokens}'s fallback branch.
 */
const MAX_WORDS_FOR_LCS = 400;

/** Splits on one-or-more blank lines; a single line break stays inside a paragraph. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replaceAll(/\s+/g, ' ').trim())
    .filter((p) => p !== '');
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w !== '');
}

/** Classic LCS backtrack. `a`/`b` are already tokenized (words or paragraphs). */
function diffTokens(a: readonly string[], b: readonly string[]): WordOp[] {
  const n = a.length;
  const m = b.length;
  if (n > MAX_WORDS_FOR_LCS || m > MAX_WORDS_FOR_LCS) {
    return [
      ...a.map((text): WordOp => ({ type: 'del', text })),
      ...b.map((text): WordOp => ({ type: 'ins', text })),
    ];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: WordOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i] });
      i++;
    } else {
      ops.push({ type: 'ins', text: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ type: 'del', text: a[i++] });
  while (j < m) ops.push({ type: 'ins', text: b[j++] });
  return ops;
}

/**
 * Pairs the paragraph-level diff's del/ins runs positionally, so an in-place
 * edit ("paragraph 2 reworded") reads as one changed row with a word-level
 * diff, not a whole-paragraph delete plus a whole-paragraph insert.
 */
function pairParagraphs(ops: readonly WordOp[]): ParagraphRow[] {
  const rows: ParagraphRow[] = [];
  let dels: string[] = [];
  let inss: string[] = [];
  const flush = (): void => {
    const len = Math.max(dels.length, inss.length);
    for (let k = 0; k < len; k++) {
      rows.push({ changed: true, before: dels[k] ?? '', after: inss[k] ?? '' });
    }
    dels = [];
    inss = [];
  };
  for (const op of ops) {
    if (op.type === 'same') {
      flush();
      rows.push({ changed: false, before: op.text, after: op.text });
    } else if (op.type === 'del') {
      dels.push(op.text);
    } else {
      inss.push(op.text);
    }
  }
  flush();
  return rows;
}

function diffParagraphs(before: string, after: string): ParagraphRow[] {
  return pairParagraphs(diffTokens(splitParagraphs(before), splitParagraphs(after)));
}

/** Coalesces consecutive same-type word ops into single text/`<ins>`/`<del>` nodes. */
function renderWordDiff(target: HTMLElement, before: string, after: string): void {
  const ops = diffTokens(splitWords(before), splitWords(after));
  const nodes: (Text | HTMLElement)[] = [];
  let run: WordOp['type'] | null = null;
  let words: string[] = [];
  const flush = (): void => {
    if (run === null || words.length === 0) return;
    const text = words.join(' ');
    if (run === 'same') {
      nodes.push(document.createTextNode(text));
    } else {
      const el = document.createElement(run === 'del' ? 'del' : 'ins');
      el.textContent = text;
      nodes.push(el);
    }
    words = [];
  };
  for (const op of ops) {
    if (op.type !== run) {
      flush();
      run = op.type;
    }
    words.push(op.text);
  }
  flush();
  const withSpacers = nodes.flatMap((n, i) => (i === 0 ? [n] : [document.createTextNode(' '), n]));
  target.replaceChildren(...withSpacers);
}

/**
 * @summary Word-level diff between two text versions, with `<ins>`/`<del>` markup.
 * @since v2.0.0
 *
 * Paragraphs (blank-line separated) are compared by position; an edited
 * paragraph is shown as a single row with a word-level diff inside it, an
 * added or removed paragraph as a whole `<ins>`/`<del>` row. Inserting or
 * removing a paragraph mid-document shifts the pairing for everything after
 * it — edit paragraphs in place for the most legible result.
 *
 * @attr {string} [before] - Previous text version.
 * @attr {string} [after] - Current text version.
 * @attr {string} [label] - Accessible comparison label.
 * @attr {boolean} [changes-only] - Shows only the changed paragraphs. Reactive; also
 *   toggled by the built-in button, which fires `e-change`.
 *
 * @fires {CustomEvent<{value: boolean}>} e-change - Fired when the "changes only" button is
 *   toggled. `value` is the new `changes-only` state.
 *
 * @example
 * <e-redline
 *   label="Section 4.2"
 *   before="The tenant may sublet the unit with written consent."
 *   after="The tenant may not sublet the unit."
 * ></e-redline>
 */
export class ERedline extends EpaperElement {
  static readonly observedAttributes = ['before', 'after', 'label', 'changes-only'];

  private _wired = false;
  private _summary: HTMLElement | null = null;
  private _toggle: HTMLButtonElement | null = null;
  private _body: HTMLElement | null = null;
  private readonly _rows: HTMLElement[] = [];
  private readonly _rowSignatures: string[] = [];

  connectedCallback() {
    if (!this._wired) {
      this._wired = true;
      this.innerHTML = `<div class="ink-redline">
        <div class="ink-redline__toolbar">
          <p class="ink-redline__summary"></p>
          <button type="button" class="ink-redline__toggle" aria-pressed="false"></button>
        </div>
        <div class="ink-redline__body"></div>
      </div>`;
      const root = this.firstElementChild as HTMLElement;
      this._summary = root.querySelector('.ink-redline__summary');
      this._toggle = root.querySelector('.ink-redline__toggle');
      this._body = root.querySelector('.ink-redline__body');
      this._toggle!.addEventListener('click', this._onToggleClick);
    }
    this._render();
  }

  attributeChangedCallback() {
    if (this._wired) this._render();
  }

  private readonly _onToggleClick = (): void => {
    const next = !boolAttr(this, 'changes-only');
    patchBoolAttr(this, 'changes-only', next);
    this.dispatchEvent(new CustomEvent('e-change', { detail: { value: next }, bubbles: true }));
  };

  private _render(): void {
    if (!this._summary || !this._toggle || !this._body) return;
    const before = this.getAttribute('before') || '';
    const after = this.getAttribute('after') || '';
    const label = this.getAttribute('label') || '';
    const changesOnly = boolAttr(this, 'changes-only');

    patchAttr(this, 'role', 'group');
    patchAttr(this, 'aria-label', label || null);

    const rows = diffParagraphs(before, after);
    const changedCount = rows.filter((r) => r.changed).length;
    patchText(
      this._summary,
      changedCount === 0
        ? t(this, 'redlineNoChanges')
        : t(this, 'redlineSummary', { changed: changedCount, total: rows.length }),
    );
    patchText(this._toggle, t(this, changesOnly ? 'redlineShowAll' : 'redlineChangesOnly'));
    patchAttr(this._toggle, 'aria-pressed', changesOnly ? 'true' : 'false');

    while (this._rows.length > rows.length) {
      this._rows.pop()!.remove();
      this._rowSignatures.pop();
    }
    rows.forEach((row, i) => {
      // `\u0000` as an escape, not a literal NUL: a raw one makes grep treat
      // this whole file as binary and skip it.
      const signature = `${row.changed ? '1' : '0'}\u0000${row.before}\u0000${row.after}`;
      let p = this._rows[i];
      if (!p) {
        p = document.createElement('p');
        p.className = 'ink-redline__row';
        this._body!.appendChild(p);
        this._rows[i] = p;
        this._rowSignatures[i] = '';
      }
      patchAttr(p, 'data-changed', row.changed ? 'true' : 'false');
      if (this._rowSignatures[i] !== signature) {
        this._rowSignatures[i] = signature;
        if (row.changed) renderWordDiff(p, row.before, row.after);
        else patchText(p, row.before);
      }
      patchBoolAttr(p, 'hidden', changesOnly && !row.changed);
    });
  }
}

define('e-redline', ERedline);
