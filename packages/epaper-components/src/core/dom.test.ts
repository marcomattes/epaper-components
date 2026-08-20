// Unit tests for the shared DOM/string helpers: the escaping contract, the
// "don't touch the DOM unless it changed" patch helpers and the cleanup
// registry.
import { describe, it, expect } from 'vitest';
import {
  esc,
  html,
  boolAttr,
  numAttr,
  intAttr,
  clampedNumAttr,
  define,
  randId,
  addCleanup,
  runCleanups,
  onGlobal,
  patchText,
  patchAttr,
  patchBoolAttr,
  patchClassModifier,
  captureWrap,
  syncEyebrowTitle,
  type EyebrowTitleRefs,
} from './dom';

/** Detached element carrying the given attributes, for the *Attr readers. */
const elWith = (attrs: Record<string, string>): HTMLElement => {
  const el = document.createElement('div');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/** Records DOM writes synchronously so a "no-op" claim can be proven. */
const watch = (el: Node, init: MutationObserverInit): (() => MutationRecord[]) => {
  const mo = new MutationObserver(() => {
    /* records are drained synchronously via takeRecords() */
  });
  mo.observe(el, init);
  return () => mo.takeRecords();
};

describe('esc', () => {
  it('escapes each of the five characters individually', () => {
    expect(esc('&')).toBe('&amp;');
    expect(esc('<')).toBe('&lt;');
    expect(esc('>')).toBe('&gt;');
    expect(esc('"')).toBe('&quot;');
    expect(esc("'")).toBe('&#039;');
  });

  it('escapes a combined string without double-escaping the ampersand', () => {
    expect(esc(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#039;y&#039;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
  });

  it('maps null and undefined to the empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('stringifies numbers, including zero and NaN', () => {
    expect(esc(0)).toBe('0');
    expect(esc(42)).toBe('42');
    expect(esc(-1.5)).toBe('-1.5');
    expect(esc(NaN)).toBe('NaN');
  });

  it('stringifies objects and escapes the result', () => {
    expect(esc({})).toBe('[object Object]');
    expect(esc({ toString: () => '<b>&</b>' })).toBe('&lt;b&gt;&amp;&lt;/b&gt;');
    expect(esc(['<', '>'])).toBe('&lt;,&gt;');
  });

  it('leaves an already-safe string untouched', () => {
    expect(esc('plain text 123')).toBe('plain text 123');
  });
});

describe('html tagged template', () => {
  it('escapes interpolated values but not the static markup', () => {
    const out = html`<p class="x">${'<script>'}</p>`;
    expect(out).toBe('<p class="x">&lt;script&gt;</p>');
  });

  it('handles the zero-values case (static template only)', () => {
    expect(html`just static markup`).toBe('just static markup');
  });

  it('handles a trailing static string after the last value', () => {
    expect(html`a${1}b`).toBe('a1b');
  });

  it('handles a template that ends on a value (empty trailing chunk)', () => {
    expect(html`a${'<'}`).toBe('a&lt;');
  });

  it('escapes every value in a multi-value template', () => {
    expect(html`${'&'}|${'<'}|${'>'}`).toBe('&amp;|&lt;|&gt;');
  });

  it('renders null and undefined values as empty', () => {
    expect(html`[${null}][${undefined}]`).toBe('[][]');
  });
});

describe('boolAttr', () => {
  it('is false when the attribute is absent', () => {
    expect(boolAttr(elWith({}), 'open')).toBe(false);
  });

  it('is true when the attribute is present but empty', () => {
    expect(boolAttr(elWith({ open: '' }), 'open')).toBe(true);
  });

  it('is true for the literal string "true"', () => {
    expect(boolAttr(elWith({ open: 'true' }), 'open')).toBe(true);
  });

  it('is false for the explicit "false" opt-out', () => {
    expect(boolAttr(elWith({ open: 'false' }), 'open')).toBe(false);
  });

  it('is true for any other value', () => {
    expect(boolAttr(elWith({ open: 'no' }), 'open')).toBe(true);
  });
});

describe('numAttr', () => {
  it('falls back when the attribute is absent', () => {
    expect(numAttr(elWith({}), 'size', 7)).toBe(7);
  });

  it('falls back for an empty value', () => {
    expect(numAttr(elWith({ size: '' }), 'size', 7)).toBe(7);
  });

  it('falls back for a whitespace-only value', () => {
    expect(numAttr(elWith({ size: '   ' }), 'size', 7)).toBe(7);
  });

  it('falls back for non-numeric text', () => {
    expect(numAttr(elWith({ size: 'abc' }), 'size', 7)).toBe(7);
    expect(numAttr(elWith({ size: '12px' }), 'size', 7)).toBe(7);
  });

  it('falls back for Infinity and NaN', () => {
    expect(numAttr(elWith({ size: 'Infinity' }), 'size', 7)).toBe(7);
    expect(numAttr(elWith({ size: '-Infinity' }), 'size', 7)).toBe(7);
    expect(numAttr(elWith({ size: 'NaN' }), 'size', 7)).toBe(7);
  });

  it('reads integers, fractions and negatives', () => {
    expect(numAttr(elWith({ size: '42' }), 'size', 7)).toBe(42);
    expect(numAttr(elWith({ size: '2.5' }), 'size', 7)).toBe(2.5);
    expect(numAttr(elWith({ size: '-3' }), 'size', 7)).toBe(-3);
    expect(numAttr(elWith({ size: '0' }), 'size', 7)).toBe(0);
  });

  it('trims surrounding whitespace around a real number', () => {
    expect(numAttr(elWith({ size: ' 8 ' }), 'size', 7)).toBe(8);
  });
});

describe('intAttr', () => {
  it('falls back when the attribute is absent, empty or whitespace-only', () => {
    expect(intAttr(elWith({}), 'n', 3)).toBe(3);
    expect(intAttr(elWith({ n: '' }), 'n', 3)).toBe(3);
    expect(intAttr(elWith({ n: '  ' }), 'n', 3)).toBe(3);
  });

  it('falls back for non-numeric text, Infinity and NaN', () => {
    expect(intAttr(elWith({ n: 'abc' }), 'n', 3)).toBe(3);
    expect(intAttr(elWith({ n: 'Infinity' }), 'n', 3)).toBe(3);
    expect(intAttr(elWith({ n: 'NaN' }), 'n', 3)).toBe(3);
  });

  it('rejects fractions where numAttr accepts them', () => {
    expect(numAttr(elWith({ n: '2.5' }), 'n', 3)).toBe(2.5);
    expect(intAttr(elWith({ n: '2.5' }), 'n', 3)).toBe(3);
  });

  it('accepts integers, including negatives and zero', () => {
    expect(intAttr(elWith({ n: '42' }), 'n', 3)).toBe(42);
    expect(intAttr(elWith({ n: '-4' }), 'n', 3)).toBe(-4);
    expect(intAttr(elWith({ n: '0' }), 'n', 3)).toBe(0);
  });
});

describe('clampedNumAttr', () => {
  it('returns a value already inside the range unchanged', () => {
    expect(clampedNumAttr(elWith({ v: '5' }), 'v', 1, 0, 10)).toBe(5);
  });

  it('clamps below the minimum', () => {
    expect(clampedNumAttr(elWith({ v: '-20' }), 'v', 1, 0, 10)).toBe(0);
  });

  it('clamps above the maximum', () => {
    expect(clampedNumAttr(elWith({ v: '99' }), 'v', 1, 0, 10)).toBe(10);
  });

  it('clamps the fallback too when the attribute is absent or invalid', () => {
    expect(clampedNumAttr(elWith({}), 'v', 50, 0, 10)).toBe(10);
    expect(clampedNumAttr(elWith({ v: 'abc' }), 'v', -5, 0, 10)).toBe(0);
  });

  it('keeps the inclusive bounds', () => {
    expect(clampedNumAttr(elWith({ v: '0' }), 'v', 1, 0, 10)).toBe(0);
    expect(clampedNumAttr(elWith({ v: '10' }), 'v', 1, 0, 10)).toBe(10);
  });
});

describe('define', () => {
  it('registers the element once', () => {
    class First extends HTMLElement {}
    define('x-dom-define-a', First);
    expect(customElements.get('x-dom-define-a')).toBe(First);
  });

  it('is a no-op on a second call with the same tag', () => {
    class First extends HTMLElement {}
    class Second extends HTMLElement {}
    define('x-dom-define-b', First);
    define('x-dom-define-b', Second);
    expect(customElements.get('x-dom-define-b')).toBe(First);
    expect(customElements.get('x-dom-define-b')).not.toBe(Second);
  });
});

describe('randId', () => {
  it('honours the prefix', () => {
    expect(randId('ink-tip')).toMatch(/^ink-tip-[a-z0-9]+$/);
  });

  it('produces a different id on each call', () => {
    const ids = new Set(Array.from({ length: 50 }, () => randId('p')));
    expect(ids.size).toBe(50);
  });
});

describe('addCleanup / runCleanups', () => {
  it('runs every registered fn exactly once', () => {
    const host = {};
    const calls: string[] = [];
    addCleanup(host, () => calls.push('a'));
    addCleanup(host, () => calls.push('b'));
    addCleanup(host, () => calls.push('c'));
    runCleanups(host);
    expect(calls).toEqual(['a', 'b', 'c']);
  });

  it('clears the list so a second run is a no-op', () => {
    const host = {};
    const calls: string[] = [];
    addCleanup(host, () => calls.push('once'));
    runCleanups(host);
    runCleanups(host);
    expect(calls).toEqual(['once']);
  });

  it('is safe on a host that never registered anything', () => {
    expect(() => runCleanups({})).not.toThrow();
  });

  it('keeps running the remaining fns after one throws', () => {
    const host = {};
    const calls: string[] = [];
    addCleanup(host, () => calls.push('first'));
    addCleanup(host, () => {
      throw new Error('boom');
    });
    addCleanup(host, () => calls.push('third'));
    expect(() => runCleanups(host)).not.toThrow();
    expect(calls).toEqual(['first', 'third']);
  });

  it('keeps separate registries per host', () => {
    const a = {};
    const b = {};
    const calls: string[] = [];
    addCleanup(a, () => calls.push('a'));
    addCleanup(b, () => calls.push('b'));
    runCleanups(a);
    expect(calls).toEqual(['a']);
    runCleanups(b);
    expect(calls).toEqual(['a', 'b']);
  });
});

describe('onGlobal', () => {
  it('attaches a document listener and the returned remover detaches it', () => {
    const host = {};
    let hits = 0;
    const off = onGlobal(host, document, 'click', () => {
      hits += 1;
    });
    document.dispatchEvent(new MouseEvent('click'));
    expect(hits).toBe(1);
    off();
    document.dispatchEvent(new MouseEvent('click'));
    expect(hits).toBe(1);
  });

  it('attaches a window listener', () => {
    const host = {};
    let hits = 0;
    const off = onGlobal(host, window, 'resize', () => {
      hits += 1;
    });
    window.dispatchEvent(new Event('resize'));
    expect(hits).toBe(1);
    off();
    window.dispatchEvent(new Event('resize'));
    expect(hits).toBe(1);
  });

  it('detaches through runCleanups(host)', () => {
    const host = {};
    let docHits = 0;
    let winHits = 0;
    onGlobal(host, document, 'keydown', () => {
      docHits += 1;
    });
    onGlobal(host, window, 'resize', () => {
      winHits += 1;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new Event('resize'));
    expect([docHits, winHits]).toEqual([1, 1]);

    runCleanups(host);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new Event('resize'));
    expect([docHits, winHits]).toEqual([1, 1]);
  });

  it('round-trips options so removal matches the capture-phase registration', () => {
    const host = {};
    const target = document.createElement('div');
    document.body.appendChild(target);
    const seen: string[] = [];
    const off = onGlobal(
      host,
      document,
      'click',
      (ev) => {
        seen.push(ev.eventPhase === Event.CAPTURING_PHASE ? 'capture' : 'other');
      },
      { capture: true },
    );

    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toEqual(['capture']);

    off();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toEqual(['capture']);
    target.remove();
  });
});

describe('patchText', () => {
  it('writes when the text changed', () => {
    const el = document.createElement('span');
    patchText(el, 'hello');
    expect(el.textContent).toBe('hello');
    patchText(el, 'world');
    expect(el.textContent).toBe('world');
  });

  it('does not touch the DOM when the text is unchanged', () => {
    const el = document.createElement('span');
    el.textContent = 'same';
    const drain = watch(el, { childList: true, characterData: true, subtree: true });
    patchText(el, 'same');
    expect(drain()).toEqual([]);
  });

  it('does not touch the DOM when both are empty', () => {
    const el = document.createElement('span');
    const drain = watch(el, { childList: true, characterData: true, subtree: true });
    patchText(el, '');
    expect(drain()).toEqual([]);
    expect(el.childNodes.length).toBe(0);
  });

  it('does write when the text really changes (observer sees it)', () => {
    const el = document.createElement('span');
    el.textContent = 'a';
    const drain = watch(el, { childList: true, characterData: true, subtree: true });
    patchText(el, 'b');
    expect(drain().length).toBeGreaterThan(0);
  });
});

describe('patchAttr', () => {
  it('sets a new attribute', () => {
    const el = document.createElement('div');
    patchAttr(el, 'aria-label', 'Close');
    expect(el.getAttribute('aria-label')).toBe('Close');
  });

  it('updates a changed attribute', () => {
    const el = elWith({ 'aria-label': 'Close' });
    patchAttr(el, 'aria-label', 'Open');
    expect(el.getAttribute('aria-label')).toBe('Open');
  });

  it('does not touch the DOM when the value is unchanged', () => {
    const el = elWith({ 'aria-label': 'Close' });
    const drain = watch(el, { attributes: true });
    patchAttr(el, 'aria-label', 'Close');
    expect(drain()).toEqual([]);
  });

  it('removes the attribute for null', () => {
    const el = elWith({ hidden: 'x' });
    patchAttr(el, 'hidden', null);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  it('removes the attribute for undefined', () => {
    const el = elWith({ hidden: 'x' });
    patchAttr(el, 'hidden', undefined);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  it('does not touch the DOM when clearing an already-absent attribute', () => {
    const el = document.createElement('div');
    const drain = watch(el, { attributes: true });
    patchAttr(el, 'aria-label', null);
    patchAttr(el, 'aria-label', undefined);
    expect(drain()).toEqual([]);
    expect(el.hasAttribute('aria-label')).toBe(false);
  });

  it('writes the empty string as a real value rather than removing', () => {
    const el = document.createElement('div');
    patchAttr(el, 'data-x', '');
    expect(el.getAttribute('data-x')).toBe('');
    expect(el.hasAttribute('data-x')).toBe(true);
  });
});

describe('patchBoolAttr', () => {
  it('adds the attribute when turning on', () => {
    const el = document.createElement('div');
    patchBoolAttr(el, 'hidden', true);
    expect(el.getAttribute('hidden')).toBe('');
  });

  it('removes the attribute when turning off', () => {
    const el = elWith({ hidden: '' });
    patchBoolAttr(el, 'hidden', false);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  it('does not touch the DOM when already on', () => {
    const el = elWith({ hidden: '' });
    const drain = watch(el, { attributes: true });
    patchBoolAttr(el, 'hidden', true);
    expect(drain()).toEqual([]);
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('does not touch the DOM when already off', () => {
    const el = document.createElement('div');
    const drain = watch(el, { attributes: true });
    patchBoolAttr(el, 'hidden', false);
    expect(drain()).toEqual([]);
    expect(el.hasAttribute('hidden')).toBe(false);
  });

  it('preserves an existing non-empty value when already on', () => {
    const el = elWith({ hidden: 'until-found' });
    patchBoolAttr(el, 'hidden', true);
    expect(el.getAttribute('hidden')).toBe('until-found');
  });
});

describe('patchClassModifier', () => {
  it('adds the modifier class', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn';
    patchClassModifier(el, 'ink-btn--', 'primary');
    expect([...el.classList]).toEqual(['ink-btn', 'ink-btn--primary']);
  });

  it('swaps one modifier for another', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn ink-btn--primary';
    patchClassModifier(el, 'ink-btn--', 'ghost');
    expect(el.classList.contains('ink-btn--primary')).toBe(false);
    expect(el.classList.contains('ink-btn--ghost')).toBe(true);
  });

  it('removes the modifier when passed null', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn ink-btn--primary';
    patchClassModifier(el, 'ink-btn--', null);
    expect([...el.classList]).toEqual(['ink-btn']);
  });

  it('preserves unrelated classes, including other prefixes', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn ink-btn--primary is-loading ink-size--lg';
    patchClassModifier(el, 'ink-btn--', 'ghost');
    expect([...el.classList].sort()).toEqual(
      ['ink-btn', 'ink-btn--ghost', 'ink-size--lg', 'is-loading'].sort(),
    );
  });

  it('is a no-op when the modifier is already present', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn ink-btn--primary';
    const drain = watch(el, { attributes: true });
    patchClassModifier(el, 'ink-btn--', 'primary');
    expect(drain()).toEqual([]);
    expect(el.className).toBe('ink-btn ink-btn--primary');
  });

  it('is a no-op when clearing and no prefixed class exists', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn';
    const drain = watch(el, { attributes: true });
    patchClassModifier(el, 'ink-btn--', null);
    expect(drain()).toEqual([]);
  });

  it('drops every stale prefixed class when several are present', () => {
    const el = document.createElement('div');
    el.className = 'ink-btn ink-btn--a ink-btn--b';
    patchClassModifier(el, 'ink-btn--', 'c');
    expect([...el.classList]).toEqual(['ink-btn', 'ink-btn--c']);
  });
});

describe('captureWrap', () => {
  it('wraps the existing children in a span by default', () => {
    const host = document.createElement('div');
    host.innerHTML = '<b>one</b> two';
    const first = host.firstElementChild;
    const wrap = captureWrap(host);
    expect(wrap.tagName).toBe('SPAN');
    expect(host.children.length).toBe(1);
    expect(host.firstElementChild).toBe(wrap);
    expect(wrap.firstElementChild).toBe(first);
    expect(wrap.textContent).toBe('one two');
  });

  it('accepts a custom wrapper tag', () => {
    const host = document.createElement('div');
    host.textContent = 'x';
    const wrap = captureWrap(host, 'div');
    expect(wrap.tagName).toBe('DIV');
    expect(wrap.textContent).toBe('x');
    expect(host.childNodes.length).toBe(1);
  });

  it('produces an empty wrapper when the host had no children', () => {
    const host = document.createElement('div');
    const wrap = captureWrap(host, 'section');
    expect(wrap.tagName).toBe('SECTION');
    expect(wrap.childNodes.length).toBe(0);
    expect(host.firstChild).toBe(wrap);
  });
});

describe('syncEyebrowTitle', () => {
  const emptyRefs = (): EyebrowTitleRefs => ({ eyebrow: null, titleEl: null });

  it('creates both elements when absent', () => {
    const left = document.createElement('div');
    const refs = syncEyebrowTitle(left, 'Label', 'Heading', emptyRefs());

    expect(refs.eyebrow).not.toBeNull();
    expect(refs.eyebrow!.tagName).toBe('DIV');
    expect(refs.eyebrow!.className).toBe('ink-card__eyebrow');
    expect(refs.eyebrow!.textContent).toBe('Label');

    expect(refs.titleEl).not.toBeNull();
    expect(refs.titleEl!.tagName).toBe('H3');
    expect(refs.titleEl!.className).toBe('ink-card__title');
    expect(refs.titleEl!.textContent).toBe('Heading');

    expect([...left.children].map((c) => c.className)).toEqual([
      'ink-card__eyebrow',
      'ink-card__title',
    ]);
  });

  it('inserts the eyebrow before existing content', () => {
    const left = document.createElement('div');
    const existing = document.createElement('p');
    left.appendChild(existing);
    syncEyebrowTitle(left, 'Label', null, emptyRefs());
    expect(left.firstElementChild!.className).toBe('ink-card__eyebrow');
    expect(left.lastElementChild).toBe(existing);
  });

  it('patches in place instead of recreating when both are present', () => {
    const left = document.createElement('div');
    const first = syncEyebrowTitle(left, 'A', 'B', emptyRefs());
    const second = syncEyebrowTitle(left, 'A2', 'B2', first);

    expect(second.eyebrow).toBe(first.eyebrow);
    expect(second.titleEl).toBe(first.titleEl);
    expect(second.eyebrow!.textContent).toBe('A2');
    expect(second.titleEl!.textContent).toBe('B2');
    expect(left.children.length).toBe(2);
  });

  it('does not rewrite the text when it is unchanged', () => {
    const left = document.createElement('div');
    const refs = syncEyebrowTitle(left, 'A', 'B', emptyRefs());
    const drain = watch(left, { childList: true, characterData: true, subtree: true });
    syncEyebrowTitle(left, 'A', 'B', refs);
    expect(drain()).toEqual([]);
  });

  it('removes both elements when cleared', () => {
    const left = document.createElement('div');
    const refs = syncEyebrowTitle(left, 'A', 'B', emptyRefs());
    const eyebrowEl = refs.eyebrow!;
    const titleEl = refs.titleEl!;
    const cleared = syncEyebrowTitle(left, null, null, refs);

    expect(cleared.eyebrow).toBeNull();
    expect(cleared.titleEl).toBeNull();
    expect(eyebrowEl.isConnected).toBe(false);
    expect(titleEl.parentElement).toBeNull();
    expect(left.children.length).toBe(0);
  });

  it('stays null when nothing exists and nothing is requested', () => {
    const left = document.createElement('div');
    const refs = syncEyebrowTitle(left, null, null, emptyRefs());
    expect(refs).toEqual({ eyebrow: null, titleEl: null });
    expect(left.children.length).toBe(0);
  });

  it('handles the eyebrow and the title independently', () => {
    const left = document.createElement('div');
    const withBoth = syncEyebrowTitle(left, 'A', 'B', emptyRefs());
    const titleOnly = syncEyebrowTitle(left, null, 'B', withBoth);
    expect(titleOnly.eyebrow).toBeNull();
    expect(titleOnly.titleEl).toBe(withBoth.titleEl);
    expect([...left.children].map((c) => c.className)).toEqual(['ink-card__title']);

    const eyebrowOnly = syncEyebrowTitle(left, 'A', null, titleOnly);
    expect(eyebrowOnly.titleEl).toBeNull();
    expect(eyebrowOnly.eyebrow).not.toBeNull();
    expect([...left.children].map((c) => c.className)).toEqual(['ink-card__eyebrow']);
  });

  it('treats an empty string as "cleared"', () => {
    const left = document.createElement('div');
    const refs = syncEyebrowTitle(left, 'A', 'B', emptyRefs());
    const cleared = syncEyebrowTitle(left, '', '', refs);
    expect(cleared.eyebrow).toBeNull();
    expect(cleared.titleEl).toBeNull();
    expect(left.children.length).toBe(0);
  });
});
