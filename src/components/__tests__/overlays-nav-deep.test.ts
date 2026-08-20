// Behavioural tests for the overlay and navigation groups:
// e-popover, e-popconfirm, e-dialog, e-tabs, e-menu, e-float-button,
// e-float-button-group, e-dropdown, e-collapse, e-back-top, e-splitter,
// e-affix and e-anchor.
//
// Every observed attribute is mutated after mount, every public method is
// called in both directions, every keyboard and pointer path is exercised,
// and every global listener is checked for teardown on disconnect and
// re-wiring on reconnect.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';

beforeAll(async () => {
  await import('../popover');
  await import('../dialog');
  await import('../tabs');
  await import('../menu');
  await import('../float-button');
  await import('../dropdown');
  await import('../collapse');
  await import('../back-top');
  await import('../splitter');
  await import('../affix');
  await import('../anchor');
});

const mounted: HTMLElement[] = [];

// A modal <dialog> makes the rest of the document inert and holds a share of
// the shared scroll lock, so one left open leaks into every later test in the
// file. Removing it runs the element's own teardown, which releases both.
afterEach(() => {
  for (const dialog of document.querySelectorAll('e-dialog')) dialog.remove();
  for (const wrap of mounted.splice(0)) wrap.remove();
  window.scrollTo(0, 0);
});

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  mounted.push(wrap);
  return wrap.firstElementChild as T;
};

/** `<details>` dispatches `toggle` as a queued task, never synchronously. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Splitter and anchor batch their scroll/move work into a rAF callback. */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/** Collect the `detail` of every matching event fired on `target`. */
const record = <T>(target: EventTarget, type: string): T[] => {
  const seen: T[] = [];
  target.addEventListener(type, (e) => {
    seen.push((e as CustomEvent<T>).detail);
  });
  return seen;
};

const press = (target: EventTarget, key: string): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

const mouse = (target: EventTarget, type: string, init: MouseEventInit = {}): MouseEvent => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

interface BoolDetail {
  value: boolean;
}
interface StringDetail {
  value: string;
}

/* ------------------------------------------------------------------ *
 * e-popover
 * ------------------------------------------------------------------ */

describe('e-popover', () => {
  interface Popover extends HTMLElement {
    show(): void;
    close(): void;
  }

  const panelOf = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-popover__panel')!;
  const triggerButton = (el: HTMLElement): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>('[data-trigger] button')!;

  it('builds a root, a trigger wrapper and a hidden dialog panel', () => {
    const el = mount(`<e-popover heading="Sync"><span id="pop-body">Body</span></e-popover>`);
    const root = el.querySelector('.ink-popover')!;
    expect(root.children).toHaveLength(2);
    expect(root.firstElementChild!.hasAttribute('data-trigger')).toBe(true);
    const panel = panelOf(el);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.hidden).toBe(true);
    expect(panel.id).toMatch(/^ink-popover__panel-/);
    expect(el.querySelector('.ink-popover__heading')!.textContent).toBe('Sync');
    expect(el.querySelector('.ink-popover__body #pop-body')).not.toBeNull();
  });

  it('falls back to a generated "Open" trigger and wires the ARIA relationship', () => {
    const el = mount(`<e-popover heading="Sync"></e-popover>`);
    const control = triggerButton(el);
    expect(control.textContent).toBe('Open');
    expect(control.getAttribute('aria-haspopup')).toBe('dialog');
    expect(control.getAttribute('aria-expanded')).toBe('false');
    expect(control.getAttribute('aria-controls')).toBe(panelOf(el).id);
    expect(panelOf(el).getAttribute('aria-label')).toBe('Sync');
  });

  it('hides the heading element when no heading is authored', () => {
    const el = mount(`<e-popover></e-popover>`);
    const heading = el.querySelector<HTMLElement>('.ink-popover__heading')!;
    expect(heading.hidden).toBe(true);
    expect(heading.textContent).toBe('');
    // With no heading the panel borrows the trigger's own name.
    expect(panelOf(el).getAttribute('aria-label')).toBe('Open');
  });

  it('opens from the open attribute already present at mount time', () => {
    const el = mount(`<e-popover heading="Sync" open></e-popover>`);
    expect(panelOf(el).hidden).toBe(false);
    expect(triggerButton(el).getAttribute('aria-expanded')).toBe('true');
  });

  it('treats open="false" as closed', () => {
    const el = mount(`<e-popover heading="Sync" open="false"></e-popover>`);
    expect(panelOf(el).hidden).toBe(true);
    el.setAttribute('open', '');
    expect(panelOf(el).hidden).toBe(false);
    el.setAttribute('open', 'false');
    expect(panelOf(el).hidden).toBe(true);
  });

  it('emits e-open and e-close exactly once through show() and close()', () => {
    const el = mount<Popover>(`<e-popover heading="Sync"></e-popover>`);
    const opens = record<BoolDetail>(el, 'e-open');
    const closes = record<BoolDetail>(el, 'e-close');

    el.show();
    el.show();
    expect(opens).toEqual([{ value: true }]);
    expect(panelOf(el).hidden).toBe(false);

    el.close();
    el.close();
    expect(closes).toEqual([{ value: false }]);
    expect(panelOf(el).hidden).toBe(true);
  });

  it('toggles from a click on the trigger', () => {
    const el = mount(`<e-popover heading="Sync"></e-popover>`);
    const control = triggerButton(el);
    control.click();
    expect(el.hasAttribute('open')).toBe(true);
    expect(control.getAttribute('aria-expanded')).toBe('true');
    control.click();
    expect(el.hasAttribute('open')).toBe(false);
    expect(control.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on an outside mousedown but not on one inside the host', () => {
    const el = mount(`<e-popover heading="Sync" open><span id="pop-inner">x</span></e-popover>`);
    mouse(document.querySelector('#pop-inner')!, 'mousedown');
    expect(el.hasAttribute('open')).toBe(true);
    mouse(document.body, 'mousedown');
    expect(el.hasAttribute('open')).toBe(false);
    // A second outside mousedown while closed must stay a no-op.
    const closes = record<BoolDetail>(el, 'e-close');
    mouse(document.body, 'mousedown');
    expect(closes).toEqual([]);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const el = mount(`<e-popover heading="Sync" open></e-popover>`);
    press(document, 'Escape');
    expect(el.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(triggerButton(el));
  });

  it('ignores Escape while closed and ignores other keys while open', () => {
    const el = mount(`<e-popover heading="Sync"></e-popover>`);
    const closes = record<BoolDetail>(el, 'e-close');
    press(document, 'Escape');
    expect(closes).toEqual([]);
    el.setAttribute('open', '');
    press(document, 'Enter');
    expect(el.hasAttribute('open')).toBe(true);
    expect(closes).toEqual([]);
  });

  it('reflects align and placement changes onto the panel classes', () => {
    const el = mount(`<e-popover heading="Sync" align="right" placement="top"></e-popover>`);
    const panel = panelOf(el);
    expect(panel.classList.contains('ink-popover__panel--align-right')).toBe(true);
    expect(panel.classList.contains('ink-popover__panel--top')).toBe(true);

    el.setAttribute('align', 'left');
    expect(panel.classList.contains('ink-popover__panel--align-right')).toBe(false);
    el.setAttribute('placement', 'bottom');
    expect(panel.classList.contains('ink-popover__panel--top')).toBe(false);

    el.setAttribute('align', 'right');
    expect(panel.classList.contains('ink-popover__panel--align-right')).toBe(true);
    el.removeAttribute('align');
    expect(panel.classList.contains('ink-popover__panel--align-right')).toBe(false);
  });

  it('shows, updates and hides the heading as the attribute changes', () => {
    const el = mount(`<e-popover></e-popover>`);
    const heading = el.querySelector<HTMLElement>('.ink-popover__heading')!;
    el.setAttribute('heading', 'Battery');
    expect(heading.hidden).toBe(false);
    expect(heading.textContent).toBe('Battery');
    expect(panelOf(el).getAttribute('aria-label')).toBe('Battery');

    el.setAttribute('heading', '');
    expect(heading.hidden).toBe(true);
    expect(panelOf(el).getAttribute('aria-label')).toBe('Open');

    el.setAttribute('heading', 'Storage');
    el.removeAttribute('heading');
    expect(heading.hidden).toBe(true);
    expect(heading.textContent).toBe('');
  });

  it('accepts a non-focusable trigger without an ARIA control', () => {
    const el = mount(
      `<e-popover heading="Sync"><span slot="trigger" id="pop-span">Info</span></e-popover>`,
    );
    const span = el.querySelector<HTMLElement>('#pop-span')!;
    expect(el.querySelector('[data-trigger] > #pop-span')).not.toBeNull();
    expect(span.hasAttribute('aria-haspopup')).toBe(false);

    span.click();
    expect(el.hasAttribute('open')).toBe(true);
    // focusTrigger() has nothing to focus and must not throw.
    press(document, 'Escape');
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('drops a stale accessible name when neither heading nor trigger names it', () => {
    const el = mount(`<e-popover heading="Sync"><span slot="trigger"></span></e-popover>`);
    expect(panelOf(el).getAttribute('aria-label')).toBe('Sync');
    el.setAttribute('heading', '');
    expect(panelOf(el).hasAttribute('aria-label')).toBe(false);
  });

  it('drops its global listeners on disconnect and re-wires them on reconnect', () => {
    const el = mount(`<e-popover heading="Sync" open></e-popover>`);
    const parent = el.parentElement!;

    el.remove();
    mouse(document.body, 'mousedown');
    press(document, 'Escape');
    expect(el.hasAttribute('open')).toBe(true);

    parent.appendChild(el);
    expect(panelOf(el).hidden).toBe(false);
    mouse(document.body, 'mousedown');
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('ignores attribute changes made before the element is connected', () => {
    const el = document.createElement('e-popover');
    el.setAttribute('open', '');
    el.setAttribute('heading', 'Detached');
    expect(el.querySelector('.ink-popover__panel')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * e-popconfirm
 * ------------------------------------------------------------------ */

describe('e-popconfirm', () => {
  interface Popconfirm extends HTMLElement {
    show(): void;
    close(): void;
  }

  const panelOf = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-popconfirm__panel')!;
  const triggerButton = (el: HTMLElement): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>('[data-trigger] button')!;
  const actionHost = (el: HTMLElement, action: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-action="${action}"]`)!;

  it('builds an alertdialog panel with cancel before confirm', () => {
    const el = mount(`<e-popconfirm message="Delete this file?"></e-popconfirm>`);
    const panel = panelOf(el);
    expect(panel.getAttribute('role')).toBe('alertdialog');
    expect(panel.hidden).toBe(true);
    expect(panel.getAttribute('aria-label')).toBe('Delete this file?');
    expect(el.querySelector('.ink-popconfirm__message')!.textContent).toBe('Delete this file?');
    const actions = [...el.querySelectorAll('[data-action]')].map((a) =>
      a.getAttribute('data-action'),
    );
    expect(actions).toEqual(['cancel', 'confirm']);
    expect(el.querySelector('.ink-popconfirm__cancel')!.textContent).toBe('Cancel');
    expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe('OK');
  });

  it('renders authored confirm and cancel labels', () => {
    const el = mount(
      `<e-popconfirm message="Delete?" confirm-label="Delete" cancel-label="Keep"></e-popconfirm>`,
    );
    expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe('Delete');
    expect(el.querySelector('.ink-popconfirm__cancel')!.textContent).toBe('Keep');
  });

  it('fires e-confirm with { value: true } and closes when the confirm button is pressed', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const confirms = record<BoolDetail>(el, 'e-confirm');
    const cancels = record<BoolDetail>(el, 'e-cancel');

    el.setAttribute('open', '');
    expect(panelOf(el).contains(document.activeElement)).toBe(true);

    actionHost(el, 'confirm').querySelector('button')!.click();
    expect(confirms).toEqual([{ value: true }]);
    expect(cancels).toEqual([]);
    expect(el.hasAttribute('open')).toBe(false);
    expect(panelOf(el).hidden).toBe(true);
    expect(document.activeElement).toBe(triggerButton(el));
  });

  it('fires e-cancel with { value: false } and closes when the cancel button is pressed', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const confirms = record<BoolDetail>(el, 'e-confirm');
    const cancels = record<BoolDetail>(el, 'e-cancel');

    el.setAttribute('open', '');
    actionHost(el, 'cancel').querySelector('button')!.click();
    expect(cancels).toEqual([{ value: false }]);
    expect(confirms).toEqual([]);
    expect(el.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(triggerButton(el));
  });

  it('resolves at most once per opening', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const confirms = record<BoolDetail>(el, 'e-confirm');
    el.setAttribute('open', '');
    const confirmButton = actionHost(el, 'confirm').querySelector('button')!;
    confirmButton.click();
    confirmButton.click();
    expect(confirms).toEqual([{ value: true }]);
  });

  it('ignores a panel click that misses an action', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const confirms = record<BoolDetail>(el, 'e-confirm');
    const cancels = record<BoolDetail>(el, 'e-cancel');
    el.setAttribute('open', '');
    mouse(el.querySelector('.ink-popconfirm__message')!, 'click');
    expect(confirms).toEqual([]);
    expect(cancels).toEqual([]);
    expect(el.hasAttribute('open')).toBe(true);
  });

  it('cancels on Escape and on an outside mousedown', () => {
    const escaped = mount(`<e-popconfirm message="Delete?" open></e-popconfirm>`);
    const escapeCancels = record<BoolDetail>(escaped, 'e-cancel');
    press(document, 'Escape');
    expect(escapeCancels).toEqual([{ value: false }]);
    expect(escaped.hasAttribute('open')).toBe(false);

    const outside = mount(`<e-popconfirm message="Delete?" open></e-popconfirm>`);
    const outsideCancels = record<BoolDetail>(outside, 'e-cancel');
    mouse(document.body, 'mousedown');
    expect(outsideCancels).toEqual([{ value: false }]);
    expect(outside.hasAttribute('open')).toBe(false);
  });

  it('cancels when the trigger is pressed a second time', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const cancels = record<BoolDetail>(el, 'e-cancel');
    const control = triggerButton(el);
    control.click();
    expect(el.hasAttribute('open')).toBe(true);
    control.click();
    expect(cancels).toEqual([{ value: false }]);
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('closes silently through show() and close()', () => {
    const el = mount<Popconfirm>(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const cancels = record<BoolDetail>(el, 'e-cancel');
    el.show();
    expect(panelOf(el).hidden).toBe(false);
    el.close();
    expect(panelOf(el).hidden).toBe(true);
    expect(cancels).toEqual([]);
  });

  it('does nothing when an action is pressed while the bubble is closed', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const confirms = record<BoolDetail>(el, 'e-confirm');
    mouse(actionHost(el, 'confirm'), 'click');
    expect(confirms).toEqual([]);
  });

  it('patches message, labels and placement after mount', () => {
    const el = mount(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const panel = panelOf(el);

    el.setAttribute('message', 'Discard draft?');
    expect(el.querySelector('.ink-popconfirm__message')!.textContent).toBe('Discard draft?');
    expect(panel.getAttribute('aria-label')).toBe('Discard draft?');

    el.setAttribute('confirm-label', 'Discard');
    expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe('Discard');
    el.setAttribute('confirm-label', '');
    expect(el.querySelector('.ink-popconfirm__confirm')!.textContent).toBe('OK');

    el.setAttribute('cancel-label', 'Keep');
    expect(el.querySelector('.ink-popconfirm__cancel')!.textContent).toBe('Keep');
    el.removeAttribute('cancel-label');
    expect(el.querySelector('.ink-popconfirm__cancel')!.textContent).toBe('Cancel');

    el.setAttribute('align', 'right');
    expect(panel.classList.contains('ink-popconfirm__panel--align-right')).toBe(true);
    el.setAttribute('placement', 'top');
    expect(panel.classList.contains('ink-popconfirm__panel--top')).toBe(true);
    el.removeAttribute('align');
    el.removeAttribute('placement');
    expect(panel.classList.contains('ink-popconfirm__panel--align-right')).toBe(false);
    expect(panel.classList.contains('ink-popconfirm__panel--top')).toBe(false);
  });

  it('opens from the attribute at mount time and moves focus into the panel', () => {
    const el = mount(`<e-popconfirm message="Delete?" open></e-popconfirm>`);
    expect(panelOf(el).hidden).toBe(false);
    expect(panelOf(el).contains(document.activeElement)).toBe(true);
  });

  it('drops its global listeners on disconnect and re-wires them on reconnect', () => {
    const el = mount(`<e-popconfirm message="Delete?" open></e-popconfirm>`);
    const parent = el.parentElement!;
    const cancels = record<BoolDetail>(el, 'e-cancel');

    el.remove();
    mouse(document.body, 'mousedown');
    expect(cancels).toEqual([]);
    expect(el.hasAttribute('open')).toBe(true);

    parent.appendChild(el);
    mouse(document.body, 'mousedown');
    expect(cancels).toEqual([{ value: false }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-dialog
 * ------------------------------------------------------------------ */

describe('e-dialog', () => {
  interface Dialog extends HTMLElement {
    show(): void;
    close(reason?: string): void;
  }

  const nativeOf = (el: HTMLElement): HTMLDialogElement => el.querySelector('dialog')!;

  it('renders header, body and footer and adopts the slotted content', () => {
    const el = mount(`<e-dialog heading="Delete file?" size="small">
        <p id="dlg-body">Body</p>
        <e-button slot="footer" data-close>Cancel</e-button>
      </e-dialog>`);
    const native = nativeOf(el);
    expect(native.className).toBe('ink-dialog');
    expect(native.dataset['size']).toBe('small');
    expect(el.querySelector('.ink-dialog__title')!.textContent).toBe('Delete file?');
    expect(el.querySelector('.ink-dialog__body #dlg-body')).not.toBeNull();
    const footer = el.querySelector<HTMLElement>('.ink-dialog__footer')!;
    expect(footer.hidden).toBe(false);
    expect(footer.querySelector('[data-close]')).not.toBeNull();
    expect(native.getAttribute('aria-labelledby')).toBe(el.querySelector('.ink-dialog__title')!.id);
  });

  it('hides an empty footer and falls back to the medium size', () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    expect(el.querySelector<HTMLElement>('.ink-dialog__footer')!.hidden).toBe(true);
    expect(nativeOf(el).dataset['size']).toBe('medium');
  });

  it('rejects an unknown size and accepts every valid one', () => {
    const el = mount(`<e-dialog heading="H" size="huge"></e-dialog>`);
    const native = nativeOf(el);
    expect(native.dataset['size']).toBe('medium');
    for (const size of ['small', 'large', 'full', 'medium']) {
      el.setAttribute('size', size);
      expect(native.dataset['size']).toBe(size);
    }
    el.setAttribute('size', 'nonsense');
    expect(native.dataset['size']).toBe('medium');
  });

  it('opens and closes through show() and close()', () => {
    const el = mount<Dialog>(`<e-dialog heading="H"></e-dialog>`);
    const opens = record<BoolDetail>(el, 'e-open');
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');

    el.show();
    expect(nativeOf(el).open).toBe(true);
    expect(opens).toEqual([{ value: true }]);

    el.close();
    expect(nativeOf(el).open).toBe(false);
    expect(closes).toEqual([{ value: false, reason: 'api' }]);
  });

  it('carries an explicit close reason through close()', () => {
    const el = mount<Dialog>(`<e-dialog heading="H"></e-dialog>`);
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.show();
    el.close('backdrop');
    expect(closes).toEqual([{ value: false, reason: 'backdrop' }]);
  });

  it('ignores a repeated open and a repeated close', () => {
    const el = mount<Dialog>(`<e-dialog heading="H"></e-dialog>`);
    const opens = record<BoolDetail>(el, 'e-open');
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.show();
    el.setAttribute('open', '');
    expect(opens).toHaveLength(1);
    el.close();
    el.removeAttribute('open');
    expect(closes).toHaveLength(1);
  });

  it('treats open="false" as closed', () => {
    const el = mount(`<e-dialog heading="H" open="false"></e-dialog>`);
    expect(nativeOf(el).open).toBe(false);
    el.setAttribute('open', '');
    expect(nativeOf(el).open).toBe(true);
    el.setAttribute('open', 'false');
    expect(nativeOf(el).open).toBe(false);
  });

  it('dismisses through any descendant marked data-close', () => {
    const el = mount(`<e-dialog heading="H">
        <e-button slot="footer" data-close>Cancel</e-button>
      </e-dialog>`);
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.setAttribute('open', '');
    el.querySelector<HTMLButtonElement>('[data-close] button')!.click();
    expect(closes).toEqual([{ value: false, reason: 'close-button' }]);
    expect(nativeOf(el).open).toBe(false);
  });

  it('dismisses on a genuine backdrop click only', () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.setAttribute('open', '');
    const native = nativeOf(el);
    const rect = native.getBoundingClientRect();

    // Inside the border box: the dialog's own padding, not the backdrop.
    mouse(native, 'click', { clientX: rect.left + 1, clientY: rect.top + 1 });
    expect(closes).toEqual([]);

    // A synthetic click carries 0/0 and must not read as a corner click.
    mouse(native, 'click');
    expect(closes).toEqual([]);

    mouse(native, 'click', { clientX: rect.right + 10, clientY: rect.bottom + 10 });
    expect(closes).toEqual([{ value: false, reason: 'backdrop' }]);
    expect(native.open).toBe(false);
  });

  it('keeps a static dialog open on a backdrop click', () => {
    const el = mount(`<e-dialog heading="H" static></e-dialog>`);
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.setAttribute('open', '');
    const native = nativeOf(el);
    const rect = native.getBoundingClientRect();
    mouse(native, 'click', { clientX: rect.right + 10, clientY: rect.bottom + 10 });
    expect(closes).toEqual([]);
    expect(native.open).toBe(true);
  });

  it('hides the close button and the whole header for no-close without a heading', () => {
    const el = mount(`<e-dialog no-close></e-dialog>`);
    const header = el.querySelector<HTMLElement>('.ink-dialog__header')!;
    const closeBtn = el.querySelector<HTMLElement>('.ink-dialog__close')!;
    expect(closeBtn.hidden).toBe(true);
    expect(header.hidden).toBe(true);

    el.setAttribute('heading', 'Now titled');
    expect(header.hidden).toBe(false);
    expect(closeBtn.hidden).toBe(true);
    expect(el.querySelector('.ink-dialog__title')!.textContent).toBe('Now titled');

    el.removeAttribute('no-close');
    expect(closeBtn.hidden).toBe(false);
    expect(header.hidden).toBe(false);

    el.removeAttribute('heading');
    expect(header.hidden).toBe(false);
    el.setAttribute('no-close', '');
    expect(header.hidden).toBe(true);
  });

  it('forwards a host aria-label only while there is no heading', () => {
    const el = mount(`<e-dialog></e-dialog>`);
    const native = nativeOf(el);
    el.setAttribute('aria-label', 'Session expired');
    expect(native.getAttribute('aria-label')).toBe('Session expired');
    expect(native.hasAttribute('aria-labelledby')).toBe(false);

    el.setAttribute('heading', 'Expired');
    expect(native.hasAttribute('aria-label')).toBe(false);
    expect(native.getAttribute('aria-labelledby')).toBe(el.querySelector('.ink-dialog__title')!.id);

    el.removeAttribute('heading');
    expect(native.getAttribute('aria-label')).toBe('Session expired');
    el.setAttribute('aria-label', '   ');
    expect(native.hasAttribute('aria-label')).toBe(false);
  });

  it('mirrors a native close back onto the attribute', async () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    el.setAttribute('open', '');
    const native = nativeOf(el);
    const cancel = new Event('cancel', { cancelable: true });
    native.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(false);
    native.close();
    await settle();
    expect(el.hasAttribute('open')).toBe(false);
    expect(closes).toEqual([{ value: false, reason: 'escape' }]);
  });

  it('ignores an open attribute set while disconnected and honours it on reconnect', async () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    const parent = el.parentElement!;
    const native = nativeOf(el);

    el.remove();
    el.setAttribute('open', '');
    expect(native.open).toBe(false);

    parent.appendChild(el);
    expect(native.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('re-enters the top layer after a detach while open without reporting a change', async () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    const parent = el.parentElement!;
    const opens = record<BoolDetail>(el, 'e-open');
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');

    el.setAttribute('open', '');
    el.remove();
    parent.appendChild(el);
    await settle();

    expect(nativeOf(el).open).toBe(true);
    expect(el.hasAttribute('open')).toBe(true);
    expect(opens).toHaveLength(1);
    expect(closes).toHaveLength(0);
  });

  it('releases the shared scroll lock when an open dialog is removed', () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    el.setAttribute('open', '');
    expect(document.documentElement.style.overflow).toBe('hidden');
    el.remove();
    expect(document.documentElement.style.overflow).not.toBe('hidden');
  });

  it('stops responding to the close button after disconnect and resumes after reconnect', () => {
    const el = mount(`<e-dialog heading="H"></e-dialog>`);
    const parent = el.parentElement!;
    const closes = record<{ value: boolean; reason: string }>(el, 'e-close');
    const closeBtn = el.querySelector<HTMLButtonElement>('.ink-dialog__close')!;

    el.remove();
    closeBtn.click();
    expect(closes).toEqual([]);

    parent.appendChild(el);
    el.setAttribute('open', '');
    closeBtn.click();
    expect(closes).toEqual([{ value: false, reason: 'close-button' }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-tabs
 * ------------------------------------------------------------------ */

describe('e-tabs', () => {
  const markup = (attrs = ''): string => `<e-tabs ${attrs}>
      <e-tab key="a" label="Apples" icon="home">Apple panel</e-tab>
      <e-tab key="b" label="Bananas" count="3">Banana panel</e-tab>
      <e-tab key="c" label="Cherries">Cherry panel</e-tab>
    </e-tabs>`;

  const tabButtons = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('.ink-tabs__tab'),
  ];
  const panelFor = (el: HTMLElement, key: string): HTMLElement =>
    el.querySelector<HTMLElement>(`[data-panel="${key}"]`)!;

  it('renders a tablist and one persistent panel per tab', () => {
    const el = mount(markup());
    const strip = el.querySelector('.ink-tabs__list')!;
    expect(strip.getAttribute('role')).toBe('tablist');
    const buttons = tabButtons(el);
    expect(buttons.map((b) => b.dataset['key'])).toEqual(['a', 'b', 'c']);
    expect(buttons[0]!.getAttribute('role')).toBe('tab');
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('true');
    expect(buttons[0]!.tabIndex).toBe(0);
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('false');
    expect(buttons[1]!.tabIndex).toBe(-1);
    expect(panelFor(el, 'a').hidden).toBe(false);
    expect(panelFor(el, 'b').hidden).toBe(true);
    expect(panelFor(el, 'a').textContent).toBe('Apple panel');
    expect(panelFor(el, 'a').getAttribute('aria-labelledby')).toBe(buttons[0]!.id);
    expect(buttons[0]!.getAttribute('aria-controls')).toBe(panelFor(el, 'a').id);
  });

  it('renders the icon and count decorations', () => {
    const el = mount(markup());
    const buttons = tabButtons(el);
    expect(buttons[0]!.querySelector('svg')).not.toBeNull();
    const badge = buttons[1]!.querySelector('e-badge')!;
    expect(badge.textContent).toBe('3');
    expect(badge.hasAttribute('inverted')).toBe(false);
  });

  it('honours default-value and inverts the active badge', () => {
    const el = mount(markup('default-value="b"'));
    const buttons = tabButtons(el);
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('true');
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('false');
    expect(panelFor(el, 'b').hidden).toBe(false);
    expect(buttons[1]!.querySelector('e-badge')!.hasAttribute('inverted')).toBe(true);
  });

  it('leaves nothing selected when default-value names no tab', () => {
    const el = mount(markup('default-value="zzz"'));
    // The `|| tabs[0].key` fallback only covers an absent default-value, so a
    // key that matches nothing selects nothing: no panel is shown and no tab
    // keeps a tab stop until something is clicked.
    expect(tabButtons(el).every((b) => b.getAttribute('aria-selected') === 'false')).toBe(true);
    expect(tabButtons(el).every((b) => b.tabIndex === -1)).toBe(true);
    expect(panelFor(el, 'a').hidden).toBe(true);
    // Clicking recovers, which is the only way back into the strip.
    tabButtons(el)[0]!.click();
    expect(panelFor(el, 'a').hidden).toBe(false);
  });

  it('switches on click and reports the new key through e-change', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    const buttons = tabButtons(el);

    buttons[1]!.click();
    expect(changes).toEqual([{ value: 'b' }]);
    expect(buttons[0]!.getAttribute('aria-selected')).toBe('false');
    expect(buttons[0]!.tabIndex).toBe(-1);
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('true');
    expect(buttons[1]!.tabIndex).toBe(0);
    expect(buttons[1]!.querySelector('e-badge')!.hasAttribute('inverted')).toBe(true);
    expect(panelFor(el, 'a').hidden).toBe(true);
    expect(panelFor(el, 'b').hidden).toBe(false);

    // Re-activating the same tab is not a change.
    buttons[1]!.click();
    expect(changes).toHaveLength(1);

    buttons[2]!.click();
    expect(changes).toEqual([{ value: 'b' }, { value: 'c' }]);
    expect(buttons[1]!.querySelector('e-badge')!.hasAttribute('inverted')).toBe(false);
  });

  it('ignores clicks that miss a tab button', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    mouse(panelFor(el, 'a'), 'click');
    expect(changes).toEqual([]);
  });

  it('moves between tabs with the arrow keys and wraps around', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    const buttons = tabButtons(el);

    const right = press(buttons[0]!, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(changes).toEqual([{ value: 'b' }]);
    expect(document.activeElement).toBe(buttons[1]!);

    press(buttons[1]!, 'ArrowDown');
    expect(document.activeElement).toBe(buttons[2]!);
    // Wraps past the end back to the first tab.
    press(buttons[2]!, 'ArrowRight');
    expect(document.activeElement).toBe(buttons[0]!);

    press(buttons[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(buttons[2]!);
    press(buttons[2]!, 'ArrowUp');
    expect(document.activeElement).toBe(buttons[1]!);

    press(buttons[1]!, 'Home');
    expect(document.activeElement).toBe(buttons[0]!);
    press(buttons[0]!, 'End');
    expect(document.activeElement).toBe(buttons[2]!);
    expect(changes.map((c) => c.value)).toEqual(['b', 'c', 'a', 'c', 'b', 'a', 'c']);
  });

  it('ignores unhandled keys and keys pressed outside a tab', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    const buttons = tabButtons(el);
    const other = press(buttons[0]!, 'Enter');
    expect(other.defaultPrevented).toBe(false);
    press(panelFor(el, 'a'), 'ArrowRight');
    expect(changes).toEqual([]);
  });

  it('survives a tab strip with no tabs at all', () => {
    const el = mount(`<e-tabs></e-tabs>`);
    expect(el.querySelector('.ink-tabs__list')!.children).toHaveLength(0);
    expect(el.querySelectorAll('.ink-tabs__panel')).toHaveLength(0);
    press(el.querySelector('.ink-tabs__list')!, 'ArrowRight');
  });

  it('treats a tab without a key as the empty key', () => {
    const el = mount(`<e-tabs><e-tab label="Only">Body</e-tab></e-tabs>`);
    const button = el.querySelector<HTMLButtonElement>('.ink-tabs__tab')!;
    expect(button.dataset['key']).toBe('');
    expect(button.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector<HTMLElement>('[data-panel=""]')!.hidden).toBe(false);
  });

  it('drops its listeners on disconnect and re-wires them on reconnect', () => {
    const el = mount(markup());
    const parent = el.parentElement!;
    const changes = record<StringDetail>(el, 'e-change');
    const buttons = tabButtons(el);

    el.remove();
    buttons[1]!.click();
    press(buttons[1]!, 'ArrowRight');
    expect(changes).toEqual([]);
    expect(buttons[1]!.getAttribute('aria-selected')).toBe('false');

    parent.appendChild(el);
    buttons[1]!.click();
    expect(changes).toEqual([{ value: 'b' }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-menu
 * ------------------------------------------------------------------ */

describe('e-menu', () => {
  const markup = (attrs = 'value="home"'): string => `<e-menu ${attrs}>
      <e-menu-item value="home" icon="home" label="Home"></e-menu-item>
      <e-menu-item value="docs" label="Docs" badge="3">
        <e-menu-item value="docs/api" label="API"></e-menu-item>
        <e-menu-item value="docs/cli" label="CLI"></e-menu-item>
      </e-menu-item>
      <e-menu-item value="about" label="About"></e-menu-item>
    </e-menu>`;

  const btn = (el: HTMLElement, value: string): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>(`.ink-menu__btn[data-value="${value}"]`)!;
  const submenuOf = (el: HTMLElement, value: string): HTMLUListElement =>
    btn(el, value).closest('li')!.querySelector('ul')!;
  const chevronPath = (el: HTMLElement, value: string): string =>
    btn(el, value).lastElementChild!.querySelector('path')!.getAttribute('d')!;

  const CHEV_DOWN = 'M6 9l6 6 6-6';
  const CHEV_UP = 'M6 15l6-6 6 6';

  it('renders a nav/ul tree with icons, badges and chevrons', () => {
    const el = mount(markup());
    const root = el.querySelector('nav > ul.ink-menu')!;
    expect(root.classList.contains('ink-menu--horizontal')).toBe(false);
    expect(root.children).toHaveLength(3);
    expect(btn(el, 'home').getAttribute('aria-current')).toBe('page');
    expect(btn(el, 'home').dataset['hasKids']).toBe('false');
    expect(btn(el, 'home').querySelector('svg')).not.toBeNull();
    expect(btn(el, 'docs').dataset['hasKids']).toBe('true');
    expect(btn(el, 'docs').querySelector('e-badge')!.textContent).toBe('3');
    expect(btn(el, 'docs').querySelector('e-badge')!.hasAttribute('inverted')).toBe(true);
    expect(chevronPath(el, 'docs')).toBe(CHEV_DOWN);
    expect(submenuOf(el, 'docs').hidden).toBe(true);
  });

  it('starts with the branch containing the active value expanded', () => {
    const el = mount(markup('value="docs/api"'));
    expect(submenuOf(el, 'docs').hidden).toBe(false);
    expect(chevronPath(el, 'docs')).toBe(CHEV_UP);
    expect(btn(el, 'docs/api').getAttribute('aria-current')).toBe('page');
    expect(btn(el, 'home').getAttribute('aria-current')).toBe('false');
  });

  it('renders as horizontal when the mode says so', () => {
    const el = mount(markup('value="home" mode="horizontal"'));
    expect(el.querySelector('ul.ink-menu')!.classList.contains('ink-menu--horizontal')).toBe(true);
  });

  it('toggles a branch on click without emitting e-change', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    btn(el, 'docs').click();
    expect(submenuOf(el, 'docs').hidden).toBe(false);
    expect(chevronPath(el, 'docs')).toBe(CHEV_UP);
    expect(changes).toEqual([]);

    btn(el, 'docs').click();
    expect(submenuOf(el, 'docs').hidden).toBe(true);
    expect(chevronPath(el, 'docs')).toBe(CHEV_DOWN);
    expect(changes).toEqual([]);
  });

  it('activates a leaf on click, reflecting the value and emitting e-change', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    btn(el, 'docs').click();
    btn(el, 'docs/cli').click();
    expect(changes).toEqual([{ value: 'docs/cli' }]);
    expect(el.getAttribute('value')).toBe('docs/cli');
    expect(btn(el, 'docs/cli').getAttribute('aria-current')).toBe('page');
    expect(btn(el, 'home').getAttribute('aria-current')).toBe('false');
  });

  it('ignores clicks that miss a menu button', () => {
    const el = mount(markup());
    const changes = record<StringDetail>(el, 'e-change');
    mouse(el.querySelector('nav')!, 'click');
    expect(changes).toEqual([]);
  });

  it('opens the ancestors of a value set from the outside', () => {
    const el = mount(markup());
    expect(submenuOf(el, 'docs').hidden).toBe(true);
    el.setAttribute('value', 'docs/api');
    expect(submenuOf(el, 'docs').hidden).toBe(false);
    expect(chevronPath(el, 'docs')).toBe(CHEV_UP);
    expect(btn(el, 'docs/api').getAttribute('aria-current')).toBe('page');
    expect(btn(el, 'docs').querySelector('e-badge')!.hasAttribute('inverted')).toBe(true);

    el.setAttribute('value', 'docs');
    expect(btn(el, 'docs').getAttribute('aria-current')).toBe('page');
    expect(btn(el, 'docs').querySelector('e-badge')!.hasAttribute('inverted')).toBe(false);
    expect(btn(el, 'docs/api').getAttribute('aria-current')).toBe('false');
  });

  it('clears every aria-current when the value names nothing', () => {
    const el = mount(markup());
    el.setAttribute('value', 'nowhere');
    expect(
      [...el.querySelectorAll('.ink-menu__btn')].every(
        (b) => b.getAttribute('aria-current') === 'false',
      ),
    ).toBe(true);
    el.removeAttribute('value');
    expect(btn(el, 'home').getAttribute('aria-current')).toBe('false');
  });

  it('swaps the orientation class when the mode changes', () => {
    const el = mount(markup());
    const root = el.querySelector('ul.ink-menu')!;
    el.setAttribute('mode', 'horizontal');
    expect(root.classList.contains('ink-menu--horizontal')).toBe(true);
    expect(root.classList.contains('ink-menu')).toBe(true);
    el.setAttribute('mode', 'vertical');
    expect(root.classList.contains('ink-menu--horizontal')).toBe(false);
    el.setAttribute('mode', 'horizontal');
    el.removeAttribute('mode');
    expect(root.classList.contains('ink-menu--horizontal')).toBe(false);
  });

  it('walks visible siblings with ArrowDown and ArrowUp in vertical mode', () => {
    const el = mount(markup());
    const down = press(btn(el, 'home'), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn(el, 'docs'));
    press(btn(el, 'docs'), 'ArrowDown');
    expect(document.activeElement).toBe(btn(el, 'about'));
    // The collapsed submenu is skipped, so this wraps to the first item.
    press(btn(el, 'about'), 'ArrowDown');
    expect(document.activeElement).toBe(btn(el, 'home'));
    press(btn(el, 'home'), 'ArrowUp');
    expect(document.activeElement).toBe(btn(el, 'about'));
  });

  it('opens, descends into and closes a branch with the horizontal arrows', () => {
    const el = mount(markup());
    const open = press(btn(el, 'docs'), 'ArrowRight');
    expect(open.defaultPrevented).toBe(true);
    expect(submenuOf(el, 'docs').hidden).toBe(false);

    press(btn(el, 'docs'), 'ArrowRight');
    expect(document.activeElement).toBe(btn(el, 'docs/api'));

    press(btn(el, 'docs/api'), 'ArrowLeft');
    expect(document.activeElement).toBe(btn(el, 'docs'));

    press(btn(el, 'docs'), 'ArrowLeft');
    expect(submenuOf(el, 'docs').hidden).toBe(true);
    expect(chevronPath(el, 'docs')).toBe(CHEV_DOWN);
  });

  it('leaves focus alone when a leaf at the root is asked for its parent', () => {
    const el = mount(markup());
    btn(el, 'home').focus();
    press(btn(el, 'home'), 'ArrowLeft');
    expect(document.activeElement).toBe(btn(el, 'home'));
  });

  it('jumps to the first and last visible item with Home and End', () => {
    const el = mount(markup());
    const home = press(btn(el, 'docs'), 'Home');
    expect(home.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn(el, 'home'));
    press(btn(el, 'home'), 'End');
    expect(document.activeElement).toBe(btn(el, 'about'));

    // With the branch expanded, End reaches the deepest visible entry.
    btn(el, 'docs').click();
    press(btn(el, 'home'), 'End');
    expect(document.activeElement).toBe(btn(el, 'about'));
    press(btn(el, 'about'), 'ArrowUp');
    expect(document.activeElement).toBe(btn(el, 'docs/cli'));
  });

  it('uses the horizontal arrows for siblings in horizontal mode', () => {
    const el = mount(markup('value="home" mode="horizontal"'));
    press(btn(el, 'home'), 'ArrowRight');
    expect(document.activeElement).toBe(btn(el, 'docs'));
    press(btn(el, 'docs'), 'ArrowLeft');
    expect(document.activeElement).toBe(btn(el, 'home'));
    // The vertical keys do nothing in horizontal mode.
    const down = press(btn(el, 'home'), 'ArrowDown');
    expect(down.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(btn(el, 'home'));
  });

  it('ignores unhandled keys and keys pressed outside a menu button', () => {
    const el = mount(markup());
    btn(el, 'home').focus();
    const other = press(btn(el, 'home'), 'Enter');
    expect(other.defaultPrevented).toBe(false);
    press(el.querySelector('nav')!, 'ArrowDown');
    expect(document.activeElement).toBe(btn(el, 'home'));
  });

  it('does not move focus from a button inside a collapsed branch', () => {
    const el = mount(markup());
    btn(el, 'home').focus();
    press(btn(el, 'docs/api'), 'ArrowDown');
    expect(document.activeElement).toBe(btn(el, 'home'));
  });

  it('renders an empty nav when there are no items', () => {
    const el = mount(`<e-menu></e-menu>`);
    expect(el.querySelector('ul.ink-menu')!.children).toHaveLength(0);
    el.setAttribute('value', 'x');
    expect(el.querySelectorAll('.ink-menu__btn')).toHaveLength(0);
  });

  it('drops its listeners on disconnect and re-wires them on reconnect', () => {
    const el = mount(markup());
    const parent = el.parentElement!;
    const changes = record<StringDetail>(el, 'e-change');

    el.remove();
    btn(el, 'about').click();
    press(btn(el, 'home'), 'ArrowDown');
    expect(changes).toEqual([]);
    expect(el.getAttribute('value')).toBe('home');

    parent.appendChild(el);
    btn(el, 'about').click();
    expect(changes).toEqual([{ value: 'about' }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-float-button / e-float-button-group
 * ------------------------------------------------------------------ */

describe('e-float-button', () => {
  const buttonOf = (el: HTMLElement): HTMLButtonElement => el.querySelector('button')!;

  it('defaults to a primary plus button labelled by the icon name', () => {
    const el = mount(`<e-float-button></e-float-button>`);
    const btn = buttonOf(el);
    expect(btn.className).toBe('ink-fab');
    expect(btn.getAttribute('aria-label')).toBe('plus');
    expect(btn.querySelector('path')!.getAttribute('d')).toBe('M12 4v16M4 12h16');
  });

  it('renders the secondary variant only for primary="false"', () => {
    expect(buttonOf(mount(`<e-float-button primary="false"></e-float-button>`)).className).toBe(
      'ink-fab ink-fab--secondary',
    );
    expect(buttonOf(mount(`<e-float-button primary></e-float-button>`)).className).toBe('ink-fab');
    expect(buttonOf(mount(`<e-float-button primary="true"></e-float-button>`)).className).toBe(
      'ink-fab',
    );
  });

  it('prefers the authored label over the icon name', () => {
    const el = mount(`<e-float-button icon="trash" label="Delete"></e-float-button>`);
    expect(buttonOf(el).getAttribute('aria-label')).toBe('Delete');
  });

  it('swaps the icon glyph and refreshes the label fallback', () => {
    const el = mount(`<e-float-button></e-float-button>`);
    const btn = buttonOf(el);
    el.setAttribute('icon', 'trash');
    expect(btn.querySelector('path')!.getAttribute('d')).toBe(
      'M5 6h14M9 6V4h6v2M7 6l1 14h8l1-14M10 10v6M14 10v6',
    );
    expect(btn.getAttribute('aria-label')).toBe('trash');
  });

  it('does nothing when the icon attribute changes to the value already rendered', () => {
    const el = mount(`<e-float-button icon="plus" label="Add"></e-float-button>`);
    const btn = buttonOf(el);
    const before = btn.innerHTML;
    // Removing `icon` re-resolves to the same 'plus' default, so the whole
    // branch short-circuits and even the label is left untouched.
    el.removeAttribute('icon');
    expect(btn.innerHTML).toBe(before);
    expect(btn.getAttribute('aria-label')).toBe('Add');
  });

  it('keeps an aria-label after the label attribute is removed', () => {
    const el = mount(`<e-float-button icon="trash" label="Delete"></e-float-button>`);
    const btn = buttonOf(el);
    el.setAttribute('label', 'Remove');
    expect(btn.getAttribute('aria-label')).toBe('Remove');
    el.removeAttribute('label');
    expect(btn.getAttribute('aria-label')).toBe('trash');
  });

  it('toggles the secondary class as the primary attribute changes', () => {
    const el = mount(`<e-float-button></e-float-button>`);
    const btn = buttonOf(el);
    el.setAttribute('primary', 'false');
    expect(btn.classList.contains('ink-fab--secondary')).toBe(true);
    el.setAttribute('primary', '');
    expect(btn.classList.contains('ink-fab--secondary')).toBe(false);
    el.setAttribute('primary', 'false');
    el.removeAttribute('primary');
    expect(btn.classList.contains('ink-fab--secondary')).toBe(false);
  });

  it('renders an empty button for an unknown icon name', () => {
    const el = mount(`<e-float-button icon="not-an-icon"></e-float-button>`);
    const btn = buttonOf(el);
    expect(btn.innerHTML).toBe('');
    expect(btn.getAttribute('aria-label')).toBe('not-an-icon');
  });

  it('replaces authored children and rebuilds nothing on reconnect', () => {
    const el = mount(`<e-float-button><span id="fab-child">gone</span></e-float-button>`);
    expect(el.querySelector('#fab-child')).toBeNull();
    const btn = buttonOf(el);
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);
    expect(el.querySelectorAll('button')).toHaveLength(1);
    expect(el.querySelector('button')).toBe(btn);
  });

  it('ignores attribute changes made before connection', () => {
    const el = document.createElement('e-float-button');
    el.setAttribute('icon', 'trash');
    el.setAttribute('label', 'Delete');
    el.setAttribute('primary', 'false');
    expect(el.querySelector('button')).toBeNull();
  });
});

describe('e-float-button-group', () => {
  const markup = (attrs = ''): string => `<e-float-button-group ${attrs}>
      <e-fab-item icon="plus" label="Add"></e-fab-item>
      <e-fab-item icon="trash" label="Delete" value="del"></e-fab-item>
      <e-fab-item></e-fab-item>
    </e-float-button-group>`;

  const groupOf = (el: HTMLElement): HTMLElement => el.querySelector('.ink-fab-group')!;

  it('renders one button per item and keeps the data carriers in place', () => {
    const el = mount(markup());
    const group = groupOf(el);
    expect(group.className).toBe('ink-fab-group');
    const buttons = [...group.querySelectorAll('button')];
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.dataset['index'])).toEqual(['0', '1', '2']);
    expect(buttons.map((b) => b.dataset['value'])).toEqual(['Add', 'del', '']);
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Add', 'Delete', 'plus']);
    expect(buttons[0]!.querySelector('svg')!.getAttribute('width')).toBe('22');
    // The group is appended, so the authored <e-fab-item>s remain siblings.
    expect(el.querySelectorAll('e-fab-item')).toHaveLength(3);
    expect(el.lastElementChild).toBe(group);
  });

  it('starts horizontal only for orientation="horizontal"', () => {
    expect(groupOf(mount(markup('orientation="horizontal"'))).className).toBe(
      'ink-fab-group ink-fab-group--horizontal',
    );
    expect(groupOf(mount(markup('orientation="sideways"'))).className).toBe('ink-fab-group');
  });

  it('toggles the orientation class after mount', () => {
    const el = mount(markup());
    const group = groupOf(el);
    el.setAttribute('orientation', 'horizontal');
    expect(group.classList.contains('ink-fab-group--horizontal')).toBe(true);
    el.setAttribute('orientation', 'vertical');
    expect(group.classList.contains('ink-fab-group--horizontal')).toBe(false);
    el.setAttribute('orientation', 'horizontal');
    el.removeAttribute('orientation');
    expect(group.classList.contains('ink-fab-group--horizontal')).toBe(false);
  });

  it('fires e-select with the index and value of the pressed action', () => {
    const el = mount(markup());
    const selected = record<{ index: number; value: string }>(el, 'e-select');
    const buttons = [...groupOf(el).querySelectorAll('button')];

    buttons[1]!.click();
    expect(selected).toEqual([{ index: 1, value: 'del' }]);

    // A click landing on the inner glyph still resolves to its button.
    mouse(buttons[0]!.querySelector('svg')!, 'click');
    expect(selected).toEqual([
      { index: 1, value: 'del' },
      { index: 0, value: 'Add' },
    ]);

    buttons[2]!.click();
    expect(selected[2]).toEqual({ index: 2, value: '' });
  });

  it('ignores a click that misses a button', () => {
    const el = mount(markup());
    const selected = record<{ index: number; value: string }>(el, 'e-select');
    mouse(groupOf(el), 'click');
    expect(selected).toEqual([]);
  });

  it('renders an empty group when there are no items', () => {
    const el = mount(`<e-float-button-group></e-float-button-group>`);
    const group = groupOf(el);
    expect(group.children).toHaveLength(0);
    const selected = record<{ index: number; value: string }>(el, 'e-select');
    mouse(group, 'click');
    expect(selected).toEqual([]);
  });

  it('ignores an orientation set before connection', () => {
    const el = document.createElement('e-float-button-group');
    el.setAttribute('orientation', 'horizontal');
    expect(el.querySelector('.ink-fab-group')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * e-dropdown
 * ------------------------------------------------------------------ */

describe('e-dropdown', () => {
  const markup = (attrs = ''): string => `<e-dropdown ${attrs}>
      <e-button slot="trigger">Actions</e-button>
      <e-dropdown-item header="Document"></e-dropdown-item>
      <e-dropdown-item icon="doc" label="New" shortcut="⌘N"></e-dropdown-item>
      <e-dropdown-item divider></e-dropdown-item>
      <e-dropdown-item icon="trash" label="Delete" disabled></e-dropdown-item>
      <e-dropdown-item label="Rename"></e-dropdown-item>
    </e-dropdown>`;

  const menuOf = (el: HTMLElement): HTMLElement =>
    el.querySelector<HTMLElement>('.ink-dropdown__menu')!;
  const itemsOf = (el: HTMLElement): HTMLButtonElement[] => [
    ...el.querySelectorAll<HTMLButtonElement>('.ink-dropdown__item'),
  ];
  const control = (el: HTMLElement): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>('[data-trigger] button')!;

  it('renders headers, dividers, items and their decorations', () => {
    const el = mount(markup());
    const menu = menuOf(el);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.hidden).toBe(true);
    expect(menu.id).toMatch(/^ink-dropdown-menu-/);
    const header = menu.querySelector('.ink-dropdown__header')!;
    expect(header.textContent).toBe('Document');
    expect(header.getAttribute('role')).toBe('presentation');
    expect(menu.querySelector('.ink-dropdown__divider')!.getAttribute('role')).toBe('separator');

    const items = itemsOf(el);
    expect(items).toHaveLength(3);
    expect(items[0]!.getAttribute('role')).toBe('menuitem');
    expect(items[0]!.textContent).toBe('New⌘N');
    expect(items[0]!.querySelector('svg')).not.toBeNull();
    expect(items[0]!.querySelector('.ink-dropdown__shortcut')!.textContent).toBe('⌘N');
    expect(items[1]!.disabled).toBe(true);
    expect(items[2]!.querySelector('.ink-dropdown__shortcut')).toBeNull();

    expect(control(el).getAttribute('aria-haspopup')).toBe('menu');
    expect(control(el).getAttribute('aria-expanded')).toBe('false');
    expect(control(el).getAttribute('aria-controls')).toBe(menu.id);
  });

  it('aligns right when asked and re-aligns after mount', () => {
    const el = mount(markup('align="right"'));
    const menu = menuOf(el);
    expect(menu.classList.contains('ink-dropdown__menu--align-right')).toBe(true);
    el.setAttribute('align', 'left');
    expect(menu.classList.contains('ink-dropdown__menu--align-right')).toBe(false);
    el.setAttribute('align', 'right');
    expect(menu.classList.contains('ink-dropdown__menu--align-right')).toBe(true);
    el.removeAttribute('align');
    expect(menu.classList.contains('ink-dropdown__menu--align-right')).toBe(false);
  });

  it('toggles the menu from the trigger and keeps aria-expanded in step', () => {
    const el = mount(markup());
    control(el).click();
    expect(menuOf(el).hidden).toBe(false);
    expect(control(el).getAttribute('aria-expanded')).toBe('true');
    control(el).click();
    expect(menuOf(el).hidden).toBe(true);
    expect(control(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('reports the item index through e-select and closes afterwards', () => {
    const el = mount(markup());
    const selected = record<{ index: number }>(el, 'e-select');
    control(el).click();
    itemsOf(el)[2]!.click();
    expect(selected).toEqual([{ index: 2 }]);
    expect(menuOf(el).hidden).toBe(true);
    expect(document.activeElement).toBe(control(el));
  });

  it('ignores a disabled item and a click that misses an item', () => {
    const el = mount(markup());
    const selected = record<{ index: number }>(el, 'e-select');
    control(el).click();
    mouse(itemsOf(el)[1]!, 'click');
    mouse(menuOf(el).querySelector('.ink-dropdown__header')!, 'click');
    expect(selected).toEqual([]);
    expect(menuOf(el).hidden).toBe(false);
  });

  it('opens onto the first enabled item with ArrowDown and the last with ArrowUp', () => {
    const el = mount(markup());
    const items = itemsOf(el);
    const down = press(control(el), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(menuOf(el).hidden).toBe(false);
    expect(document.activeElement).toBe(items[0]!);

    control(el).click();
    press(control(el), 'ArrowUp');
    // The disabled entry is skipped, so "last" is Rename.
    expect(document.activeElement).toBe(items[2]!);
  });

  it('ignores other keys on the trigger', () => {
    const el = mount(markup());
    const other = press(control(el), 'Enter');
    expect(other.defaultPrevented).toBe(false);
    expect(menuOf(el).hidden).toBe(true);
  });

  it('cycles the enabled items with the arrow, Home and End keys', () => {
    const el = mount(markup());
    const items = itemsOf(el);
    control(el).click();

    // Nothing focused yet: ArrowDown starts at the top, ArrowUp at the bottom.
    const down = press(menuOf(el), 'ArrowDown');
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[0]!);

    press(items[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[2]!);
    press(items[2]!, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]!);
    press(items[0]!, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]!);
    press(items[2]!, 'End');
    expect(document.activeElement).toBe(items[2]!);
    press(items[2]!, 'Home');
    expect(document.activeElement).toBe(items[0]!);

    const other = press(items[0]!, 'Enter');
    expect(other.defaultPrevented).toBe(false);
  });

  it('starts from the bottom when ArrowUp is pressed with nothing focused', () => {
    const el = mount(markup());
    const items = itemsOf(el);
    control(el).click();
    control(el).blur();
    press(menuOf(el), 'ArrowUp');
    expect(document.activeElement).toBe(items[2]!);
  });

  it('ignores menu keys while the menu is hidden', () => {
    const el = mount(markup());
    const before = document.activeElement;
    const event = press(menuOf(el), 'ArrowDown');
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(before);
  });

  it('closes on an outside mousedown but not on one inside', () => {
    const el = mount(markup());
    control(el).click();
    mouse(menuOf(el), 'mousedown');
    expect(menuOf(el).hidden).toBe(false);
    mouse(document.body, 'mousedown');
    expect(menuOf(el).hidden).toBe(true);
    expect(control(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const el = mount(markup());
    control(el).click();
    press(document, 'Escape');
    expect(menuOf(el).hidden).toBe(true);
    expect(document.activeElement).toBe(control(el));

    // Escape while closed is a no-op.
    document.body.focus();
    press(document, 'Escape');
    expect(menuOf(el).hidden).toBe(true);
  });

  it('falls back to a generated trigger and survives an empty menu', () => {
    const el = mount(`<e-dropdown></e-dropdown>`);
    expect(control(el).textContent).toBe('Open');
    press(control(el), 'ArrowDown');
    expect(menuOf(el).hidden).toBe(false);
    expect(itemsOf(el)).toHaveLength(0);
    press(menuOf(el), 'ArrowDown');
    press(menuOf(el), 'End');
    expect(menuOf(el).hidden).toBe(false);
  });

  it('does nothing when every item is disabled', () => {
    const el = mount(`<e-dropdown>
        <e-dropdown-item label="One" disabled></e-dropdown-item>
      </e-dropdown>`);
    press(control(el), 'ArrowDown');
    expect(menuOf(el).hidden).toBe(false);
    expect(document.activeElement).not.toBe(itemsOf(el)[0]);
  });

  it('drops its listeners on disconnect and re-wires them on reconnect', () => {
    const el = mount(markup());
    const parent = el.parentElement!;
    const selected = record<{ index: number }>(el, 'e-select');
    control(el).click();

    el.remove();
    mouse(document.body, 'mousedown');
    expect(menuOf(el).hidden).toBe(false);
    itemsOf(el)[0]!.click();
    expect(selected).toEqual([]);

    parent.appendChild(el);
    itemsOf(el)[0]!.click();
    expect(selected).toEqual([{ index: 0 }]);
    mouse(document.body, 'mousedown');
    expect(menuOf(el).hidden).toBe(true);
  });

  it('ignores an align change made before connection', () => {
    const el = document.createElement('e-dropdown');
    el.setAttribute('align', 'right');
    expect(el.querySelector('.ink-dropdown__menu')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * e-collapse
 * ------------------------------------------------------------------ */

describe('e-collapse', () => {
  interface Collapse extends HTMLElement {
    value: string[];
  }

  const markup = (attrs = '', panelAttrs = ''): string => `<e-collapse ${attrs}>
      <e-collapse-panel key="a" heading="A" ${panelAttrs}>Body A</e-collapse-panel>
      <e-collapse-panel key="b" heading="B">Body B</e-collapse-panel>
      <e-collapse-panel key="c" heading="C">Body C</e-collapse-panel>
    </e-collapse>`;

  const panels = (el: HTMLElement): HTMLDetailsElement[] => [
    ...el.querySelectorAll<HTMLDetailsElement>('details'),
  ];

  it('renders a details/summary per panel with markers and keys', () => {
    const el = mount(markup());
    const list = panels(el);
    expect(list).toHaveLength(3);
    expect(list[0]!.className).toBe('ink-collapse__panel');
    expect(list[0]!.dataset['key']).toBe('a');
    expect(list[0]!.querySelector('.ink-collapse__marker')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(list[0]!.querySelector('.ink-collapse__heading')!.textContent).toBe('A');
    expect(list[0]!.querySelector('.ink-collapse__body')!.textContent).toBe('Body A');
  });

  it('falls back to a positional key and an empty heading', () => {
    const el = mount<Collapse>(`<e-collapse>
        <e-collapse-panel>Body</e-collapse-panel>
      </e-collapse>`);
    const details = panels(el)[0]!;
    expect(details.dataset['key']).toBe('panel-1');
    expect(details.querySelector('.ink-collapse__heading')!.textContent).toBe('');
    el.value = ['panel-1'];
    expect(el.value).toEqual(['panel-1']);
  });

  it('opens the panels declared through default-open and the panel open attribute', () => {
    const byDefault = mount<Collapse>(markup('default-open="b,c"'));
    expect(panels(byDefault).map((d) => d.open)).toEqual([false, true, true]);
    expect(byDefault.value).toEqual(['b', 'c']);

    const byPanel = mount<Collapse>(markup('', 'open'));
    expect(panels(byPanel).map((d) => d.open)).toEqual([true, false, false]);
  });

  it('ignores an empty default-open list', () => {
    const el = mount<Collapse>(markup('default-open=""'));
    expect(el.value).toEqual([]);
  });

  it('refuses to open a disabled panel and cancels its summary click', () => {
    const el = mount<Collapse>(markup('', 'open disabled'));
    const details = panels(el)[0]!;
    expect(details.open).toBe(false);
    expect(details.dataset['disabled']).toBe('');
    const summary = details.querySelector<HTMLElement>('.ink-collapse__summary')!;
    expect(summary.getAttribute('aria-disabled')).toBe('true');
    const event = mouse(summary, 'click');
    expect(event.defaultPrevented).toBe(true);
    expect(details.open).toBe(false);
  });

  it('leaves an enabled summary click alone', () => {
    const el = mount(markup());
    const summary = panels(el)[0]!.querySelector<HTMLElement>('.ink-collapse__summary')!;
    const event = mouse(summary, 'click');
    expect(event.defaultPrevented).toBe(false);
  });

  it('reports every open key on toggle', async () => {
    const el = mount<Collapse>(markup());
    const changes = record<{ value: string[] }>(el, 'e-change');
    panels(el)[1]!.open = true;
    await settle();
    expect(changes).toEqual([{ value: ['b'] }]);
    panels(el)[0]!.open = true;
    await settle();
    expect(changes[1]).toEqual({ value: ['a', 'b'] });
    panels(el)[1]!.open = false;
    await settle();
    expect(changes[2]).toEqual({ value: ['a'] });
  });

  it('collapses everything but the first open panel when accordion is turned on', async () => {
    const el = mount<Collapse>(markup('default-open="a,b,c"'));
    const changes = record<{ value: string[] }>(el, 'e-change');
    expect(panels(el).map((d) => d.open)).toEqual([true, true, true]);

    el.setAttribute('accordion', '');
    expect(panels(el).map((d) => d.open)).toEqual([true, false, false]);
    await settle();
    // The closes the mode change performed are not user changes.
    expect(changes).toEqual([]);
    expect(el.value).toEqual(['a']);
  });

  it('does nothing when accordion is removed or set to false', async () => {
    const el = mount<Collapse>(markup('accordion default-open="a"'));
    const changes = record<{ value: string[] }>(el, 'e-change');
    el.removeAttribute('accordion');
    expect(panels(el).map((d) => d.open)).toEqual([true, false, false]);

    panels(el)[1]!.open = true;
    await settle();
    expect(el.value).toEqual(['a', 'b']);

    el.setAttribute('accordion', 'false');
    expect(el.value).toEqual(['a', 'b']);
    expect(changes).toEqual([{ value: ['a', 'b'] }]);
  });

  it('ignores an accordion attribute set to the value it already has', () => {
    const el = mount<Collapse>(markup('accordion default-open="a"'));
    panels(el)[1]!.open = true;
    el.setAttribute('accordion', '');
    // old === val, so the collapse pass never runs.
    expect(panels(el)[1]!.open).toBe(true);
  });

  it('drives the panels through the value property without emitting', async () => {
    const el = mount<Collapse>(markup());
    const changes = record<{ value: string[] }>(el, 'e-change');
    el.value = ['b', 'c'];
    await settle();
    expect(el.value).toEqual(['b', 'c']);
    el.value = [];
    await settle();
    expect(el.value).toEqual([]);
    el.value = ['nope'];
    await settle();
    expect(el.value).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('keeps accordion exclusivity for the value property and for user toggles', async () => {
    const el = mount<Collapse>(markup('accordion'));
    const changes = record<{ value: string[] }>(el, 'e-change');
    el.value = ['b', 'c'];
    await settle();
    expect(el.value).toEqual(['b']);

    panels(el)[2]!.open = true;
    await settle();
    expect(el.value).toEqual(['c']);
    expect(changes).toEqual([{ value: ['c'] }]);
  });

  it('drops its toggle listeners on disconnect and re-wires them on reconnect', async () => {
    const el = mount<Collapse>(markup());
    const parent = el.parentElement!;
    const changes = record<{ value: string[] }>(el, 'e-change');

    el.remove();
    panels(el)[0]!.open = true;
    await settle();
    expect(changes).toEqual([]);

    parent.appendChild(el);
    panels(el)[1]!.open = true;
    await settle();
    expect(changes).toEqual([{ value: ['a', 'b'] }]);
  });
});

/* ------------------------------------------------------------------ *
 * e-back-top
 * ------------------------------------------------------------------ */

describe('e-back-top', () => {
  const buttonOf = (el: HTMLElement): HTMLButtonElement =>
    el.querySelector<HTMLButtonElement>('.ink-back-top')!;

  it('renders a hidden labelled button with the arrow glyph', () => {
    const el = mount(`<e-back-top></e-back-top>`);
    const btn = buttonOf(el);
    expect(btn.hidden).toBe(true);
    expect(btn.getAttribute('aria-label')).toBe('Back to top');
    expect(btn.querySelector('path')!.getAttribute('d')).toBe('M12 19V5M6 11l6-6 6 6');
  });

  it('shows itself when the threshold is already met', () => {
    const el = mount(`<e-back-top visibility-height="0"></e-back-top>`);
    expect(buttonOf(el).hidden).toBe(false);
  });

  it('re-evaluates visibility when visibility-height changes', () => {
    const el = mount(`<e-back-top visibility-height="9999"></e-back-top>`);
    const btn = buttonOf(el);
    expect(btn.hidden).toBe(true);
    el.setAttribute('visibility-height', '0');
    expect(btn.hidden).toBe(false);
    el.setAttribute('visibility-height', '9999');
    expect(btn.hidden).toBe(true);
    // A negative threshold clamps to zero, which is always met.
    el.setAttribute('visibility-height', '-50');
    expect(btn.hidden).toBe(false);
    // An unparseable value falls back to the 400px default.
    el.setAttribute('visibility-height', 'soon');
    expect(btn.hidden).toBe(true);
  });

  it('patches the accessible label and restores the default when cleared', () => {
    const el = mount(`<e-back-top label="Top"></e-back-top>`);
    const btn = buttonOf(el);
    expect(btn.getAttribute('aria-label')).toBe('Top');
    el.setAttribute('label', 'Up');
    expect(btn.getAttribute('aria-label')).toBe('Up');
    el.setAttribute('label', '');
    expect(btn.getAttribute('aria-label')).toBe('Back to top');
    el.setAttribute('label', 'Up');
    el.removeAttribute('label');
    expect(btn.getAttribute('aria-label')).toBe('Back to top');
  });

  it('follows a scroll container named by target', () => {
    const box = mount(`<div id="bt-box" style="height:60px;overflow:auto">
        <div style="height:2000px"></div>
      </div>`);
    const el = mount(`<e-back-top target="#bt-box" visibility-height="200"></e-back-top>`);
    const btn = buttonOf(el);
    expect(btn.hidden).toBe(true);

    box.scrollTop = 500;
    box.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false);

    const clicks = record<{ value: number }>(el, 'e-click');
    btn.click();
    expect(clicks).toEqual([{ value: 500 }]);
    expect(box.scrollTop).toBe(0);

    box.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(true);
  });

  it('falls back to the window for a missing or invalid target selector', () => {
    const el = mount(`<e-back-top target="#does-not-exist" visibility-height="0"></e-back-top>`);
    expect(buttonOf(el).hidden).toBe(false);
    // An invalid selector throws inside querySelector and is caught.
    el.setAttribute('target', '###');
    expect(buttonOf(el).hidden).toBe(false);
    const clicks = record<{ value: number }>(el, 'e-click');
    buttonOf(el).click();
    expect(clicks).toEqual([{ value: window.scrollY }]);
  });

  it('rebinds when the target moves from a container back to the window', () => {
    const box = mount(`<div id="bt-box2" style="height:60px;overflow:auto">
        <div style="height:2000px"></div>
      </div>`);
    const el = mount(`<e-back-top target="#bt-box2" visibility-height="200"></e-back-top>`);
    const btn = buttonOf(el);
    box.scrollTop = 500;
    box.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false);

    el.removeAttribute('target');
    // Reading the window's scroll position instead, the button hides again.
    expect(btn.hidden).toBe(true);
    box.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(true);
  });

  it('responds to a window scroll event and stops after disconnect', () => {
    const el = mount(`<e-back-top visibility-height="9999"></e-back-top>`);
    const parent = el.parentElement!;
    const btn = buttonOf(el);
    expect(btn.hidden).toBe(true);

    el.setAttribute('visibility-height', '0');
    btn.hidden = true;
    window.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false);

    el.remove();
    btn.hidden = true;
    window.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(true);

    parent.appendChild(el);
    expect(btn.hidden).toBe(false);
    btn.hidden = true;
    window.dispatchEvent(new Event('scroll'));
    expect(btn.hidden).toBe(false);
  });

  it('stops responding to clicks after disconnect', () => {
    const el = mount(`<e-back-top visibility-height="0"></e-back-top>`);
    const parent = el.parentElement!;
    const clicks = record<{ value: number }>(el, 'e-click');
    el.remove();
    buttonOf(el).click();
    expect(clicks).toEqual([]);
    parent.appendChild(el);
    buttonOf(el).click();
    expect(clicks).toHaveLength(1);
  });

  it('ignores attribute changes made before connection', () => {
    const el = document.createElement('e-back-top');
    el.setAttribute('label', 'Top');
    el.setAttribute('target', '#nope');
    el.setAttribute('visibility-height', '10');
    expect(el.querySelector('.ink-back-top')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * e-splitter
 * ------------------------------------------------------------------ */

describe('e-splitter', () => {
  const markup = (attrs = ''): string => `<e-splitter ${attrs}>
      <div slot="a">Left</div>
      <div slot="b">Right</div>
    </e-splitter>`;

  const parts = (
    el: HTMLElement,
  ): { wrap: HTMLElement; a: HTMLElement; b: HTMLElement; handle: HTMLElement } => ({
    wrap: el.querySelector<HTMLElement>('.ink-splitter')!,
    a: el.querySelector<HTMLElement>('[data-pane="a"]')!,
    b: el.querySelector<HTMLElement>('[data-pane="b"]')!,
    handle: el.querySelector<HTMLElement>('.ink-splitter__handle')!,
  });

  it('renders two panes around a separator handle', () => {
    const el = mount(markup('initial="60"'));
    const { wrap, a, b, handle } = parts(el);
    expect(wrap.children).toHaveLength(3);
    expect(a.textContent).toBe('Left');
    expect(b.textContent).toBe('Right');
    expect(a.style.width).toBe('60%');
    expect(b.style.width).toBe('40%');
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.tabIndex).toBe(0);
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('60');
    expect(handle.getAttribute('aria-valuemin')).toBe('15');
    expect(handle.getAttribute('aria-valuemax')).toBe('85');
  });

  it('clamps the initial size into the declared bounds', () => {
    const el = mount(markup('initial="95" min="20" max="70"'));
    const { a, handle } = parts(el);
    expect(a.style.width).toBe('70%');
    expect(handle.getAttribute('aria-valuemin')).toBe('20');
    expect(handle.getAttribute('aria-valuemax')).toBe('70');
  });

  it('swaps inverted bounds and falls back for unparseable ones', () => {
    const inverted = mount(markup('min="80" max="20"'));
    expect(parts(inverted).handle.getAttribute('aria-valuemin')).toBe('20');
    expect(parts(inverted).handle.getAttribute('aria-valuemax')).toBe('80');

    const invalid = mount(markup('min="wide" max="wider" initial="oops"'));
    const { a, handle } = parts(invalid);
    expect(handle.getAttribute('aria-valuemin')).toBe('15');
    expect(handle.getAttribute('aria-valuemax')).toBe('85');
    expect(a.style.width).toBe('50%');
  });

  it('renders vertically and switches orientation after mount', () => {
    const el = mount(markup('orientation="vertical" initial="40"'));
    const { wrap, a, b, handle } = parts(el);
    expect(wrap.classList.contains('ink-splitter--vertical')).toBe(true);
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal');
    expect(a.style.height).toBe('40%');
    expect(a.style.width).toBe('');

    el.setAttribute('orientation', 'horizontal');
    expect(wrap.classList.contains('ink-splitter--vertical')).toBe(false);
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(a.style.height).toBe('');
    expect(a.style.width).toBe('40%');
    expect(b.style.width).toBe('60%');
  });

  it('re-clamps and re-announces when initial, min or max change', () => {
    const el = mount(markup('initial="50"'));
    const { a, handle } = parts(el);

    el.setAttribute('initial', '70');
    expect(a.style.width).toBe('70%');
    expect(handle.getAttribute('aria-valuenow')).toBe('70');

    el.setAttribute('max', '60');
    expect(handle.getAttribute('aria-valuemax')).toBe('60');
    expect(a.style.width).toBe('60%');

    el.setAttribute('min', '55');
    expect(handle.getAttribute('aria-valuemin')).toBe('55');
    expect(a.style.width).toBe('60%');

    el.setAttribute('initial', '0');
    expect(a.style.width).toBe('55%');
  });

  it('nudges the split with the arrow keys along the active axis', () => {
    const el = mount(markup('initial="50"'));
    const { a, b, handle } = parts(el);

    const right = press(handle, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(a.style.width).toBe('52%');
    expect(b.style.width).toBe('48%');
    press(handle, 'ArrowLeft');
    press(handle, 'ArrowLeft');
    expect(a.style.width).toBe('48%');

    // The cross-axis keys do nothing while horizontal.
    const down = press(handle, 'ArrowDown');
    expect(down.defaultPrevented).toBe(false);
    expect(a.style.width).toBe('48%');

    el.setAttribute('orientation', 'vertical');
    press(handle, 'ArrowDown');
    expect(a.style.height).toBe('50%');
    press(handle, 'ArrowUp');
    expect(a.style.height).toBe('48%');
    expect(press(handle, 'ArrowRight').defaultPrevented).toBe(false);
  });

  it('stops nudging at the declared bounds', () => {
    const el = mount(markup('initial="84" min="20" max="85"'));
    const { a, handle } = parts(el);
    press(handle, 'ArrowRight');
    expect(a.style.width).toBe('85%');
    press(handle, 'ArrowRight');
    expect(a.style.width).toBe('85%');
  });

  it('resizes on a mouse drag and stops on mouseup', async () => {
    const el = mount(markup('initial="50" min="10" max="90"'));
    const { wrap, a, b, handle } = parts(el);
    wrap.style.width = '400px';
    const rect = wrap.getBoundingClientRect();

    mouse(handle, 'mousedown', { button: 0 });
    mouse(window, 'mousemove', { clientX: rect.left + rect.width * 0.25, clientY: rect.top + 5 });
    // Two moves inside one frame collapse into a single write.
    mouse(window, 'mousemove', { clientX: rect.left + rect.width * 0.3, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('30%');
    expect(b.style.width).toBe('70%');
    expect(handle.getAttribute('aria-valuenow')).toBe('30');

    mouse(window, 'mouseup');
    mouse(window, 'mousemove', { clientX: rect.left + rect.width * 0.8, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('30%');
  });

  it('clamps a drag past the bounds', async () => {
    const el = mount(markup('initial="50" min="25" max="75"'));
    const { wrap, a, handle } = parts(el);
    wrap.style.width = '400px';
    const rect = wrap.getBoundingClientRect();

    mouse(handle, 'mousedown', { button: 0 });
    mouse(window, 'mousemove', { clientX: rect.right + 200, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('75%');

    mouse(window, 'mousemove', { clientX: rect.left - 200, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('25%');
  });

  it('ignores a non-primary mouse button and moves without a drag', async () => {
    const el = mount(markup('initial="50"'));
    const { wrap, a, handle } = parts(el);
    wrap.style.width = '400px';
    const rect = wrap.getBoundingClientRect();

    mouse(window, 'mousemove', { clientX: rect.left + 40, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('50%');

    mouse(handle, 'mousedown', { button: 1 });
    mouse(window, 'mousemove', { clientX: rect.left + 40, clientY: rect.top + 5 });
    await nextFrame();
    expect(a.style.width).toBe('50%');
  });

  it('ignores a drag while the measured axis has no size', async () => {
    const el = mount(markup('orientation="vertical" initial="50"'));
    const { wrap, a, handle } = parts(el);
    // A collapsed splitter cannot map a pointer position onto a percentage.
    wrap.style.height = '0px';
    expect(wrap.getBoundingClientRect().height).toBe(0);
    mouse(handle, 'mousedown', { button: 0 });
    mouse(window, 'mousemove', { clientY: 100, clientX: 10 });
    await nextFrame();
    expect(a.style.height).toBe('50%');

    wrap.style.height = '200px';
    const rect = wrap.getBoundingClientRect();
    mouse(window, 'mousemove', { clientY: rect.top + rect.height * 0.75, clientX: 10 });
    await nextFrame();
    expect(a.style.height).toBe('75%');
  });

  it('cancels a pending frame on disconnect and drags again after reconnect', async () => {
    const el = mount(markup('initial="50" min="10" max="90"'));
    const parent = el.parentElement!;
    const { wrap, a, handle } = parts(el);
    wrap.style.width = '400px';
    const rect = wrap.getBoundingClientRect();

    mouse(handle, 'mousedown', { button: 0 });
    mouse(window, 'mousemove', { clientX: rect.left + rect.width * 0.25, clientY: rect.top + 5 });
    el.remove();
    await nextFrame();
    expect(a.style.width).toBe('50%');

    parent.appendChild(el);
    const rect2 = wrap.getBoundingClientRect();
    mouse(window, 'mousemove', {
      clientX: rect2.left + rect2.width * 0.25,
      clientY: rect2.top + 5,
    });
    await nextFrame();
    // The drag flag was cleared on disconnect, so this move is inert.
    expect(a.style.width).toBe('50%');

    mouse(handle, 'mousedown', { button: 0 });
    mouse(window, 'mousemove', {
      clientX: rect2.left + rect2.width * 0.25,
      clientY: rect2.top + 5,
    });
    await nextFrame();
    expect(a.style.width).toBe('25%');
  });

  it('renders empty panes when no slotted content is given', () => {
    const el = mount(`<e-splitter></e-splitter>`);
    const { a, b } = parts(el);
    expect(a.children).toHaveLength(0);
    expect(b.children).toHaveLength(0);
    expect(a.style.width).toBe('50%');
  });

  it('ignores attribute changes made before connection', () => {
    const el = document.createElement('e-splitter');
    el.setAttribute('initial', '70');
    el.setAttribute('orientation', 'vertical');
    el.setAttribute('min', '10');
    expect(el.querySelector('.ink-splitter')).toBeNull();
  });
});

/* ------------------------------------------------------------------ *
 * e-affix
 * ------------------------------------------------------------------ */

describe('e-affix', () => {
  it('wraps its children and applies the offset', () => {
    const el = mount(`<e-affix offset-top="24"><nav id="affix-child">Nav</nav></e-affix>`);
    const wrap = el.querySelector<HTMLElement>('.ink-affix')!;
    expect(wrap.style.top).toBe('24px');
    expect(wrap.querySelector('#affix-child')).not.toBeNull();
    expect(el.children).toHaveLength(1);
  });

  it('defaults to a zero offset', () => {
    const el = mount(`<e-affix><div>Pin</div></e-affix>`);
    expect(el.querySelector<HTMLElement>('.ink-affix')!.style.top).toBe('0px');
  });

  it('re-applies the offset when the attribute changes', () => {
    const el = mount(`<e-affix offset-top="8"><div>Pin</div></e-affix>`);
    const wrap = el.querySelector<HTMLElement>('.ink-affix')!;
    el.setAttribute('offset-top', '48');
    expect(wrap.style.top).toBe('48px');
    el.setAttribute('offset-top', 'sticky');
    expect(wrap.style.top).toBe('0px');
    el.setAttribute('offset-top', '-12');
    expect(wrap.style.top).toBe('-12px');
    el.removeAttribute('offset-top');
    expect(wrap.style.top).toBe('0px');
  });

  it('ignores an offset set before connection and wraps only once', () => {
    const el = document.createElement('e-affix');
    el.setAttribute('offset-top', '16');
    expect(el.querySelector('.ink-affix')).toBeNull();

    const wrapper = document.createElement('div');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    mounted.push(wrapper);
    const wrap = el.querySelector<HTMLElement>('.ink-affix')!;
    expect(wrap.style.top).toBe('16px');

    el.remove();
    wrapper.appendChild(el);
    expect(el.querySelectorAll('.ink-affix')).toHaveLength(1);
    expect(el.querySelector('.ink-affix')).toBe(wrap);
  });
});

/* ------------------------------------------------------------------ *
 * e-anchor
 * ------------------------------------------------------------------ */

describe('e-anchor', () => {
  const sections = (): { a: HTMLElement; b: HTMLElement } => {
    const host = mount(`<div>
        <div id="anc-a" style="position:absolute;top:0;left:0;width:1px;height:1px"></div>
        <div id="anc-b" style="position:absolute;top:4000px;left:0;width:1px;height:1px"></div>
      </div>`);
    return {
      a: host.querySelector<HTMLElement>('#anc-a')!,
      b: host.querySelector<HTMLElement>('#anc-b')!,
    };
  };

  const markup = (attrs = ''): string => `<e-anchor ${attrs}>
      <e-anchor-item href="#anc-a" title="Intro"></e-anchor-item>
      <e-anchor-item href="#anc-b" title="API" depth="1"></e-anchor-item>
    </e-anchor>`;

  const links = (el: HTMLElement): HTMLAnchorElement[] => [
    ...el.querySelectorAll<HTMLAnchorElement>('.ink-anchor__link'),
  ];

  it('renders a labelled nav with one indented link per item', () => {
    sections();
    const el = mount(markup());
    const nav = el.querySelector('nav.ink-anchor')!;
    expect(nav.getAttribute('aria-label')).toBe('In-page navigation');
    expect(el.querySelector('.ink-anchor__title')!.textContent).toBe('ON THIS PAGE');
    const list = links(el);
    expect(list).toHaveLength(2);
    expect(list[0]!.getAttribute('href')).toBe('#anc-a');
    expect(list[0]!.dataset['anchor']).toBe('0');
    expect(list[0]!.style.paddingLeft).toBe('14px');
    expect(list[1]!.style.paddingLeft).toBe('28px');
    expect(list[1]!.textContent).toContain('API');
  });

  it('marks the section above the offset as current', () => {
    sections();
    const el = mount(markup('offset-top="80"'));
    const list = links(el);
    expect(list[0]!.getAttribute('aria-current')).toBe('true');
    expect(list[0]!.querySelector('.ink-anchor__marker')!.textContent).toBe('▸ ');
    expect(list[1]!.hasAttribute('aria-current')).toBe(false);
    expect(list[1]!.querySelector('.ink-anchor__marker')!.textContent).toBe('  ');
  });

  it('moves the marker when a scroll event changes which section is above the fold', async () => {
    const { b } = sections();
    const el = mount(markup('offset-top="80"'));
    const list = links(el);

    b.style.top = '0px';
    window.dispatchEvent(new Event('scroll'));
    // A second scroll inside the same frame must not schedule a second update.
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();

    expect(list[1]!.getAttribute('aria-current')).toBe('true');
    expect(list[1]!.querySelector('.ink-anchor__marker')!.textContent).toBe('▸ ');
    expect(list[0]!.hasAttribute('aria-current')).toBe(false);
    expect(list[0]!.querySelector('.ink-anchor__marker')!.textContent).toBe('  ');
  });

  it('re-evaluates immediately when offset-top changes', () => {
    sections();
    const el = mount(markup('offset-top="80"'));
    const list = links(el);
    expect(list[0]!.getAttribute('aria-current')).toBe('true');

    // A 5000px offset puts the 4000px section above the line as well.
    el.setAttribute('offset-top', '5000');
    expect(list[1]!.getAttribute('aria-current')).toBe('true');
    expect(list[0]!.hasAttribute('aria-current')).toBe(false);

    // A negative offset clamps to zero and hands the lead back.
    el.setAttribute('offset-top', '-10');
    expect(list[0]!.getAttribute('aria-current')).toBe('true');
    el.removeAttribute('offset-top');
    expect(list[0]!.getAttribute('aria-current')).toBe('true');
  });

  it('skips items without a hash href and items pointing at nothing', () => {
    const el = mount(`<e-anchor>
        <e-anchor-item title="Plain"></e-anchor-item>
        <e-anchor-item href="https://example.com" title="External"></e-anchor-item>
        <e-anchor-item href="#anc-missing" title="Missing"></e-anchor-item>
      </e-anchor>`);
    const list = links(el);
    expect(list[0]!.getAttribute('href')).toBe('');
    expect(list.every((link) => !link.hasAttribute('aria-current'))).toBe(true);
  });

  it('renders an empty list when there are no items', () => {
    const el = mount(`<e-anchor></e-anchor>`);
    expect(el.querySelector('.ink-anchor__list')!.children).toHaveLength(0);
    el.setAttribute('offset-top', '10');
    expect(links(el)).toHaveLength(0);
  });

  it('ignores an offset set before connection', () => {
    const el = document.createElement('e-anchor');
    el.setAttribute('offset-top', '40');
    expect(el.querySelector('.ink-anchor')).toBeNull();
  });

  it('drops its scroll listener on disconnect and re-wires it on reconnect', async () => {
    const { b } = sections();
    const el = mount(markup('offset-top="80"'));
    const parent = el.parentElement!;
    const list = links(el);

    el.remove();
    b.style.top = '0px';
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    expect(list[0]!.getAttribute('aria-current')).toBe('true');

    b.style.top = '4000px';
    parent.appendChild(el);
    expect(list[0]!.getAttribute('aria-current')).toBe('true');

    b.style.top = '0px';
    window.dispatchEvent(new Event('scroll'));
    await nextFrame();
    expect(list[1]!.getAttribute('aria-current')).toBe('true');
  });
});
