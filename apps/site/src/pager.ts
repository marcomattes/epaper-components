// Local site-glue Custom Element. Not part of the npm package.
//
// Every page is its own document, so this no longer scrolls between
// sections — it turns pages. It owns exactly one thing: the global key
// bindings that walk the sequence, resolved against the prev/next links the
// build already put in the footer. Which sequence that is — the numbered
// spine or the articles under /guides/ — is decided by the build, so this
// works on an article without knowing articles exist.
import { define, onGlobal, runCleanups } from '../../../packages/epaper-components/src/core/dom';

/**
 * @summary Site-wide pager controller. Maps PgUp/PgDn/Home/End onto the
 *          previous/next page links in the footer.
 *
 * Arrow keys are deliberately not bound: a page like /components/ is far
 * taller than the viewport, and stealing ArrowDown would make it unreadable.
 */
export class ESitePager extends HTMLElement {
  private _wired = false;

  connectedCallback() {
    if (this._wired) return;
    this._wired = true;
    onGlobal(this, document, 'keydown', this._onKey);
  }

  disconnectedCallback() {
    runCleanups(this);
    this._wired = false;
  }

  /** Follow a rel link if the current page has one. */
  private _go(rel: 'prev' | 'next'): boolean {
    const a = document.querySelector<HTMLAnchorElement>(`.site-pagenav a[rel="${rel}"]`);
    if (!a) return false;
    window.location.href = a.href;
    return true;
  }

  private _first(): boolean {
    window.location.href = '/';
    return true;
  }

  private _last(): boolean {
    const last = document.querySelector<HTMLAnchorElement>('#site-nav a[data-last]');
    if (!last) return false;
    window.location.href = last.href;
    return true;
  }

  private _onKey = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
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

    let handled = false;
    switch (e.key) {
      case 'PageDown':
        handled = this._go('next');
        break;
      case 'PageUp':
        handled = this._go('prev');
        break;
      case ' ':
      case 'Spacebar':
        // Space still scrolls a long page; only take it over at the end.
        if (isAtBottom() && !e.shiftKey) handled = this._go('next');
        else if (isAtTop() && e.shiftKey) handled = this._go('prev');
        break;
      case 'Home':
        handled = this._first();
        break;
      case 'End':
        handled = this._last();
        break;
      default:
        return;
    }
    if (handled) e.preventDefault();
  };
}

function isAtBottom(): boolean {
  const el = document.scrollingElement ?? document.documentElement;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
}

function isAtTop(): boolean {
  const el = document.scrollingElement ?? document.documentElement;
  return el.scrollTop <= 2;
}

define('e-site-pager', ESitePager);
