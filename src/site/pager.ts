// Local site-glue Custom Element. Not part of the npm package.
// Owns:
//   • global key bindings (PgUp/PgDn/Arrow/Space/Home/End)
//   • IntersectionObserver that mirrors the active section into the URL hash
//   • bidirectional binding with <e-pagination> and a header anchor list
import { addCleanup, define, onGlobal, runCleanups } from '../core/dom';

interface PageChangeDetail {
  value: number;
}

/**
 * @summary Site-wide pager controller. Reads sections [id^="page-"] and
 *          coordinates keys, hash-routing and the bottom <e-pagination>.
 *
 * @attr {number} [data-pages] - Optional explicit page count. When absent,
 *   the controller counts `section[id^="page-"]` elements.
 *
 * @fires {CustomEvent<{value: number}>} e-page - Fired when the active page changes.
 */
export class ESitePager extends HTMLElement {
  private _wired = false;
  private _sections: HTMLElement[] = [];
  private _current = 1;
  private _io: IntersectionObserver | null = null;
  /** Suppress IO-driven hash sync while a programmatic scroll is in flight. */
  private _suppressIo = 0;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    // Defer until the surrounding DOM is ready (script is at the end of body,
    // but custom-element upgrade can race with template parsing in some bundlers).
    queueMicrotask(() => this._init());
  }

  disconnectedCallback() {
    if (this._io) {
      this._io.disconnect();
      this._io = null;
    }
    runCleanups(this);
    this._wired = false;
  }

  /** 1-based current page. */
  get current(): number {
    return this._current;
  }

  /** Programmatically jump to a page (1-based). */
  goto(page: number, opts?: { source?: 'key' | 'hash' | 'pag' | 'init' | 'click' }): void {
    const total = this._sections.length;
    if (total === 0) return;
    const p = Math.min(Math.max(1, Math.floor(page)), total);
    const target = this._sections[p - 1];
    if (!target) return;
    this._current = p;
    this._suppressIo++;
    target.scrollIntoView({ block: 'start' });
    // Release the IO suppression on the next frame after scroll settles.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this._suppressIo = Math.max(0, this._suppressIo - 1);
      });
    });
    this._writeHash(p);
    this._emit(p);
    void opts;
  }

  private _init(): void {
    const declared = Number(this.dataset['pages'] || '');
    const all = [...document.querySelectorAll<HTMLElement>('section[id^="page-"]')];
    this._sections = Number.isFinite(declared) && declared > 0 ? all.slice(0, declared) : all;
    if (this._sections.length === 0) return;

    // Initial page from hash or default to 1.
    const initial = this._pageFromHash() ?? 1;
    this._current = initial;
    if (initial > 1) {
      // Defer one frame so layout exists.
      requestAnimationFrame(() => this.goto(initial, { source: 'init' }));
    } else {
      this._emit(initial);
    }

    // ---- Keyboard ----
    onGlobal(this, document, 'keydown', this._onKey);

    // ---- Hash routing ----
    onGlobal(this, window, 'hashchange', this._onHash);
    onGlobal(this, window, 'popstate', this._onHash);

    // ---- IntersectionObserver: mirror active page into hash + emit ----
    this._io = new IntersectionObserver(
      (entries) => {
        if (this._suppressIo > 0) return;
        // Pick the entry with the largest intersection ratio that is intersecting.
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;
        const idx = this._sections.indexOf(best.target as HTMLElement);
        if (idx < 0) return;
        const page = idx + 1;
        if (page === this._current) return;
        this._current = page;
        this._writeHash(page);
        this._emit(page);
      },
      { threshold: [0.4, 0.6] },
    );
    for (const s of this._sections) this._io.observe(s);
    addCleanup(this, () => this._io?.disconnect());
  }

  private _onKey = (e: KeyboardEvent): void => {
    // Ignore keys while typing in form fields.
    const t = e.target as Element | null;
    if (
      t &&
      (t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'SELECT' ||
        (t as HTMLElement).isContentEditable)
    ) {
      return;
    }
    const total = this._sections.length;
    let next: number;
    switch (e.key) {
      case 'PageDown':
      case 'ArrowDown':
        next = Math.min(total, this._current + 1);
        break;
      case 'PageUp':
      case 'ArrowUp':
        next = Math.max(1, this._current - 1);
        break;
      case ' ':
      case 'Spacebar':
        next = e.shiftKey ? Math.max(1, this._current - 1) : Math.min(total, this._current + 1);
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = total;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next === this._current) return;
    this.goto(next, { source: 'key' });
  };

  private _onHash = (): void => {
    const p = this._pageFromHash();
    if (p == null || p === this._current) return;
    this.goto(p, { source: 'hash' });
  };

  private _pageFromHash(): number | null {
    const m = window.location.hash.match(/^#page-(\d+)$/);
    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1 || n > this._sections.length) return null;
    return n;
  }

  private _writeHash(page: number): void {
    const target = `#page-${page}`;
    if (window.location.hash === target) return;
    history.replaceState(null, '', target);
  }

  private _emit(page: number): void {
    const detail: PageChangeDetail = { value: page };
    this.dispatchEvent(new CustomEvent('e-page', { detail, bubbles: true }));
  }
}

define('e-site-pager', ESitePager);
