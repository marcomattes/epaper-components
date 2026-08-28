// Reactivity smoke tests: components must reflect attribute changes after
// connection. Regression coverage for the `_wired` early-return guard.
import { describe, it, expect, afterEach, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../button/button');
  await import('../input/input');
  await import('../select/select');
  await import('../checkbox/checkbox');
  await import('../toggle/toggle');
  await import('../checkbox-group/checkbox-group');
  await import('../segmented/segmented');
  await import('../alert/alert');
  await import('../dialog/dialog');
  await import('../tree/tree');
  await import('../popover/popover');
  await import('../card/card');
  await import('../card-image/card-image');
  await import('../avatar/avatar');
  await import('../calendar/calendar');
  await import('../cascader/cascader');
  await import('../date-picker/date-picker');
  await import('../timeline/timeline');
  await import('../description-list/description-list');
  await import('../breadcrumb/breadcrumb');
  await import('../anchor/anchor');
});

// A modal <dialog> makes the rest of the document inert and holds a share of
// the shared scroll lock, so one left open leaks into every later test in the
// file. Removing it runs the element's own teardown, which releases both.
afterEach(() => {
  for (const dialog of document.querySelectorAll('e-dialog')) dialog.remove();
});

const mount = <T extends HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

describe('attribute reactivity', () => {
  it('e-button reflects variant change after mount', () => {
    const el = mount<HTMLElement>(`<e-button variant="secondary">x</e-button>`);
    const btn = () => el.querySelector('button')!;
    expect(btn().className).toContain('ink-btn--secondary');
    el.setAttribute('variant', 'primary');
    expect(btn().className).toContain('ink-btn--primary');
    expect(btn().className).not.toContain('ink-btn--secondary');
  });

  it('e-button reflects disabled change after mount', () => {
    const el = mount<HTMLElement>(`<e-button>x</e-button>`);
    const btn = () => el.querySelector('button')!;
    expect(btn().disabled).toBe(false);
    el.setAttribute('disabled', '');
    expect(btn().disabled).toBe(true);
    el.removeAttribute('disabled');
    expect(btn().disabled).toBe(false);
  });

  it('e-input reflects programmatic value attribute', () => {
    const el = mount<HTMLElement>(`<e-input value="hello"></e-input>`);
    expect(el.querySelector('input')!.value).toBe('hello');
    el.setAttribute('value', 'world');
    expect(el.querySelector('input')!.value).toBe('world');
  });

  it('e-select reflects programmatic value attribute', () => {
    const el = mount<HTMLElement>(
      `<e-select value="a">
        <e-option value="a" label="Apples"></e-option>
        <e-option value="b" label="Bananas"></e-option>
       </e-select>`,
    );
    const current = () => el.querySelector('[data-current]')!.textContent;
    const selected = () =>
      el.querySelector<HTMLElement>('.ink-select__option[aria-selected="true"]')!.dataset['value'];
    expect(current()).toBe('Apples');
    expect(selected()).toBe('a');
    el.setAttribute('value', 'b');
    expect(current()).toBe('Bananas');
    expect(selected()).toBe('b');
  });

  it('e-checkbox reflects programmatic checked attribute', () => {
    const el = mount<HTMLElement>(`<e-checkbox></e-checkbox>`);
    const cb = el.querySelector('input')!;
    expect(cb.checked).toBe(false);
    el.setAttribute('checked', '');
    expect(cb.checked).toBe(true);
    el.removeAttribute('checked');
    expect(cb.checked).toBe(false);
  });
  it('e-checkbox-group preserves DOM identity on value change (no rebuild)', () => {
    const el = mount<HTMLElement>(
      `<e-checkbox-group value="a">
        <e-cbox-option value="a" label="A"></e-cbox-option>
        <e-cbox-option value="b" label="B"></e-cbox-option>
        <e-cbox-option value="c" label="C"></e-cbox-option>
      </e-checkbox-group>`,
    );
    const inputsBefore = [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputsBefore).toHaveLength(3);
    expect(inputsBefore[0].checked).toBe(true);
    expect(inputsBefore[1].checked).toBe(false);

    el.setAttribute('value', 'a,b');
    const inputsAfter = [...el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
    expect(inputsAfter).toHaveLength(3);
    // Same DOM nodes — no rebuild
    expect(inputsAfter[0]).toBe(inputsBefore[0]);
    expect(inputsAfter[1]).toBe(inputsBefore[1]);
    expect(inputsAfter[0].checked).toBe(true);
    expect(inputsAfter[1].checked).toBe(true);
    expect(inputsAfter[2].checked).toBe(false);
  });

  it('e-checkbox-group container has role="group"', () => {
    const el = mount<HTMLElement>(
      `<e-checkbox-group value="a">
        <e-cbox-option value="a" label="A"></e-cbox-option>
      </e-checkbox-group>`,
    );
    expect(el.querySelector('[role="group"]')).not.toBeNull();
  });

  it('e-segmented preserves button DOM identity on value change', () => {
    const el = mount<HTMLElement>(
      `<e-segmented value="a">
        <e-segment value="a" label="A"></e-segment>
        <e-segment value="b" label="B"></e-segment>
      </e-segmented>`,
    );
    const btnBefore = el.querySelector<HTMLElement>('[data-value="b"]')!;
    expect(btnBefore.getAttribute('aria-checked')).toBe('false');
    el.setAttribute('value', 'b');
    const btnAfter = el.querySelector<HTMLElement>('[data-value="b"]')!;
    expect(btnAfter).toBe(btnBefore);
    expect(btnAfter.getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector<HTMLElement>('[data-value="a"]')!.getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('e-segmented uses aria-checked (not aria-pressed) with role="radio"', () => {
    const el = mount<HTMLElement>(
      `<e-segmented value="x">
        <e-segment value="x" label="X"></e-segment>
        <e-segment value="y" label="Y"></e-segment>
      </e-segmented>`,
    );
    const btn = el.querySelector<HTMLElement>('[data-value="x"]')!;
    expect(btn.getAttribute('aria-checked')).toBe('true');
    expect(btn.getAttribute('aria-pressed')).toBeNull();
    expect(btn.getAttribute('role')).toBe('radio');
  });
});

describe('events', () => {
  it('e-input fires e-input on user typing', () => {
    const el = mount<HTMLElement>(`<e-input></e-input>`);
    const inp = el.querySelector('input')!;
    let detail: { value: string } | null = null;
    el.addEventListener('e-input', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    inp.value = 'hi';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    expect(detail).toEqual({ value: 'hi' });
  });

  it('e-button suppresses click when disabled is set after mount', () => {
    const el = mount<HTMLElement>(`<e-button>x</e-button>`);
    let fired = 0;
    el.addEventListener('e-click', () => {
      fired++;
    });
    (el.querySelector('button') as HTMLButtonElement).click();
    expect(fired).toBe(1);
    el.setAttribute('disabled', '');
    (el.querySelector('button') as HTMLButtonElement).click();
    expect(fired).toBe(1); // still 1 because button is disabled
  });

  it('e-alert reflects variant change after mount', () => {
    const el = mount<HTMLElement>(`<e-alert variant="info" heading="H"></e-alert>`);
    const root = () => el.querySelector('.ink-alert')!;
    expect(root().getAttribute('data-variant')).toBe('info');
    el.setAttribute('variant', 'error');
    expect(root().getAttribute('data-variant')).toBe('error');
  });

  it('e-alert reflects heading change after mount', () => {
    const el = mount<HTMLElement>(`<e-alert></e-alert>`);
    const heading = () => el.querySelector<HTMLElement>('.ink-alert__heading')!;
    expect(heading().hidden).toBe(true);
    el.setAttribute('heading', 'Sync paused');
    expect(heading().hidden).toBe(false);
    expect(heading().textContent).toBe('Sync paused');
  });

  it('e-dialog opens and closes from the open attribute', () => {
    const el = mount<HTMLElement>(`<e-dialog heading="H"></e-dialog>`);
    const native = el.querySelector('dialog')!;
    expect(native.open).toBe(false);
    el.setAttribute('open', '');
    expect(native.open).toBe(true);
    el.removeAttribute('open');
    expect(native.open).toBe(false);
  });

  it('e-dialog reports a close reason exactly once', () => {
    const el = mount<HTMLElement>(`<e-dialog heading="H"></e-dialog>`);
    let fired = 0;
    let detail: { value: boolean; reason: string } | null = null;
    el.addEventListener('e-close', (e) => {
      fired++;
      detail = (e as CustomEvent<{ value: boolean; reason: string }>).detail;
    });
    el.setAttribute('open', '');
    el.querySelector<HTMLButtonElement>('.ink-dialog__close')!.click();
    expect(fired).toBe(1);
    expect(detail).toEqual({ value: false, reason: 'close-button' });
  });

  it('e-dialog mirrors a native Escape close onto the attribute', async () => {
    const el = mount<HTMLElement>(`<e-dialog heading="H"></e-dialog>`);
    const native = el.querySelector('dialog')!;
    let fired = 0;
    el.addEventListener('e-close', () => {
      fired++;
    });
    el.setAttribute('open', '');
    // `cancel` is what Escape dispatches before the element closes itself.
    native.dispatchEvent(new Event('cancel', { cancelable: true }));
    native.close();
    // `close` is queued as a task rather than dispatched synchronously.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(el.hasAttribute('open')).toBe(false);
    expect(fired).toBe(1);
  });

  it('e-dialog with static vetoes the native cancel', () => {
    const el = mount<HTMLElement>(`<e-dialog heading="H" static></e-dialog>`);
    const native = el.querySelector('dialog')!;
    el.setAttribute('open', '');
    const event = new Event('cancel', { cancelable: true });
    native.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(native.open).toBe(true);
  });

  it('e-popover toggles the panel from the open attribute', () => {
    const el = mount<HTMLElement>(`<e-popover heading="H"></e-popover>`);
    const panel = el.querySelector<HTMLElement>('.ink-popover__panel')!;
    const trigger = el.querySelector<HTMLElement>('[data-trigger] button')!;
    expect(panel.hidden).toBe(true);
    el.setAttribute('open', '');
    expect(panel.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    el.removeAttribute('open');
    expect(panel.hidden).toBe(true);
  });

  it('e-tree rebuilds when the data attribute changes', () => {
    const el = mount<HTMLElement>(`<e-tree data='[{"value":"a","label":"A"}]'></e-tree>`);
    expect(el.querySelector('[data-value="a"]')).not.toBeNull();
    el.setAttribute('data', '[{"value":"b","label":"B"}]');
    expect(el.querySelector('[data-value="a"]')).toBeNull();
    expect(el.querySelector('[data-value="b"]')).not.toBeNull();
  });

  it('e-alert moves its live-region role with the variant', () => {
    const el = mount<HTMLElement>(`<e-alert variant="info" heading="H"></e-alert>`);
    const root = () => el.querySelector('.ink-alert')!;
    expect(root().getAttribute('role')).toBe('status');
    el.setAttribute('variant', 'error');
    expect(root().getAttribute('role')).toBe('alert');
    el.setAttribute('variant', 'info');
    expect(root().getAttribute('role')).toBe('status');
  });

  it('e-dialog names itself only when it has something to be named by', () => {
    const bare = mount<HTMLElement>(`<e-dialog></e-dialog>`);
    const bareNative = bare.querySelector('dialog')!;
    // An aria-labelledby pointing at an empty <h2> would be an unnamed modal.
    expect(bareNative.hasAttribute('aria-labelledby')).toBe(false);
    expect(bareNative.hasAttribute('aria-label')).toBe(false);

    const labelled = mount<HTMLElement>(`<e-dialog aria-label="Session expired"></e-dialog>`);
    expect(labelled.querySelector('dialog')!.getAttribute('aria-label')).toBe('Session expired');

    // A heading wins over the host label and switches to the id reference.
    bare.setAttribute('heading', 'Remove?');
    expect(bareNative.getAttribute('aria-labelledby')).toBe(
      bare.querySelector('.ink-dialog__title')!.id,
    );
    bare.removeAttribute('heading');
    expect(bareNative.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('e-dialog re-enters the top layer after a detach while open', () => {
    const el = mount<HTMLElement>(`<e-dialog heading="H"></e-dialog>`);
    const native = el.querySelector('dialog')!;
    let opens = 0;
    let closes = 0;
    el.addEventListener('e-open', () => {
      opens++;
    });
    el.addEventListener('e-close', () => {
      closes++;
    });

    el.setAttribute('open', '');
    expect(opens).toBe(1);

    // Detaching runs the browser's dialog cleanup: it leaves the top layer but
    // keeps its `open` attribute, so a naive equality check would skip
    // showModal() and hand back a non-modal dialog.
    const parent = el.parentElement!;
    el.remove();
    parent.appendChild(el);

    expect(native.open).toBe(true);
    expect(el.hasAttribute('open')).toBe(true);
    // Restoring modality is not a state change anyone outside observed.
    expect(opens).toBe(1);
    expect(closes).toBe(0);
  });

  it('e-dialog keeps the page locked until the last dialog closes', () => {
    const a = mount<HTMLElement>(`<e-dialog heading="A"></e-dialog>`);
    const b = mount<HTMLElement>(`<e-dialog heading="B"></e-dialog>`);

    a.setAttribute('open', '');
    b.setAttribute('open', '');
    expect(document.documentElement.style.overflow).toBe('hidden');

    // Closing the first must not restore scrolling underneath the second.
    a.removeAttribute('open');
    expect(document.documentElement.style.overflow).toBe('hidden');

    b.removeAttribute('open');
    expect(document.documentElement.style.overflow).not.toBe('hidden');
  });

  it('e-popover clears a stale accessible name when the heading goes away', () => {
    const el = mount<HTMLElement>(`<e-popover heading="Sync status"></e-popover>`);
    const panel = el.querySelector('.ink-popover__panel')!;
    expect(panel.getAttribute('aria-label')).toBe('Sync status');
    el.setAttribute('heading', 'Battery');
    expect(panel.getAttribute('aria-label')).toBe('Battery');
    // Falls back to the trigger's own name rather than keeping the old one.
    el.setAttribute('heading', '');
    expect(panel.getAttribute('aria-label')).not.toBe('Battery');
  });

  it('e-popconfirm returns focus to the trigger when a button resolves it', () => {
    const el = mount<HTMLElement>(`<e-popconfirm message="Delete?"></e-popconfirm>`);
    const trigger = el.querySelector<HTMLElement>('[data-trigger] button')!;

    el.setAttribute('open', '');
    expect(el.querySelector('.ink-popconfirm__panel')!.contains(document.activeElement)).toBe(true);

    el.querySelector<HTMLElement>('[data-action="confirm"] button')!.click();
    expect(document.activeElement).toBe(trigger);
  });
});

// The card family shares `syncEyebrowTitle` in core/dom.ts, and the interesting
// direction is the shrinking one: an attribute going away has to take its
// element with it instead of leaving a stale heading behind.
describe('card header teardown', () => {
  it('e-card drops the title, then the whole header, as the attributes go away', () => {
    const el = mount<HTMLElement>(`<e-card eyebrow="PROJECT" title="Atlas">Body</e-card>`);
    expect(el.querySelector('.ink-card__eyebrow')!.textContent).toBe('PROJECT');
    expect(el.querySelector('.ink-card__title')!.textContent).toBe('Atlas');

    // The eyebrow still needs a header, so only the <h3> goes.
    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__title')).toBeNull();
    expect(el.querySelector('.ink-card__header')).not.toBeNull();

    // Nothing left to head the card with — the header itself goes.
    el.removeAttribute('eyebrow');
    expect(el.querySelector('.ink-card__eyebrow')).toBeNull();
    expect(el.querySelector('.ink-card__header')).toBeNull();
    expect(el.querySelector('.ink-card__body')!.textContent).toBe('Body');

    // And a later attribute rebuilds it from scratch.
    el.setAttribute('title', 'Atlas II');
    expect(el.querySelector('.ink-card__title')!.textContent).toBe('Atlas II');
  });

  it('e-card keeps an action header after both headings are gone', () => {
    const el = mount<HTMLElement>(
      `<e-card eyebrow="PROJECT" title="Atlas"><e-button slot="action">Open</e-button>Body</e-card>`,
    );
    const header = el.querySelector<HTMLElement>('.ink-card__header')!;

    // The action slot alone keeps the header alive, so this exercises the
    // eyebrow and title removals rather than the header teardown.
    el.removeAttribute('eyebrow');
    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__header')).toBe(header);
    expect(el.querySelector('.ink-card__eyebrow')).toBeNull();
    expect(el.querySelector('.ink-card__title')).toBeNull();
    expect(header.querySelector('e-button')).not.toBeNull();
  });

  it('e-card renders no header at all without headings or an action', () => {
    const el = mount<HTMLElement>(`<e-card>Body</e-card>`);
    expect(el.querySelector('.ink-card__header')).toBeNull();
    expect(el.querySelector('.ink-card__body')!.textContent).toBe('Body');

    // Repeated renders must not conjure one either.
    el.setAttribute('eyebrow', '');
    expect(el.querySelector('.ink-card__header')).toBeNull();
  });

  it('e-card-image drops cover and header without losing the footer', () => {
    const el = mount<HTMLElement>(
      `<e-card-image cover="hatch" eyebrow="GUIDE" title="Setup">
         Body
         <div slot="footer">Updated today</div>
       </e-card-image>`,
    );
    const footer = el.querySelector<HTMLElement>('.ink-card__footer')!;
    const cover = el.querySelector<HTMLElement>('.ink-card__cover')!;
    expect(cover.className).toContain('ink-card__cover--hatch');

    // A plain value keeps the same cover node and renders as its text.
    el.setAttribute('cover', 'Sunset');
    expect(el.querySelector('.ink-card__cover')).toBe(cover);
    expect(cover.className).not.toContain('ink-card__cover--hatch');
    expect(cover.textContent).toBe('Sunset');

    el.removeAttribute('cover');
    expect(el.querySelector('.ink-card__cover')).toBeNull();

    el.removeAttribute('title');
    expect(el.querySelector('.ink-card__title')).toBeNull();
    el.removeAttribute('eyebrow');
    expect(el.querySelector('.ink-card__header')).toBeNull();

    // A detached footer is re-attached on the next render rather than rebuilt,
    // so the slotted content keeps its identity.
    footer.remove();
    el.setAttribute('title', 'Setup');
    expect(el.querySelector('.ink-card__footer')).toBe(footer);
    expect(footer.textContent).toContain('Updated today');
  });
});

describe('grid keyboard navigation', () => {
  const openGrid = (el: HTMLElement) => {
    el.querySelector<HTMLButtonElement>('[data-trigger]')!.click();
    return () => [...el.querySelectorAll<HTMLButtonElement>('.ink-datepicker__cell')];
  };
  const press = (key: string) =>
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

  it('e-date-picker Home and End move to the ends of the week row', () => {
    const el = mount<HTMLElement>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const cells = openGrid(el);
    const column = () => cells().indexOf(document.activeElement as HTMLButtonElement) % 7;
    expect(document.activeElement!.getAttribute('data-day')).toBe('15');

    press('Home');
    expect(column()).toBe(0);
    const weekStart = document.activeElement!.getAttribute('data-day');

    press('End');
    expect(column()).toBe(6);
    expect(document.activeElement!.getAttribute('data-day')).not.toBe(weekStart);
  });

  it('e-date-picker PageUp and PageDown wrap across the year boundary', () => {
    const el = mount<HTMLElement>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    openGrid(el);
    const navTitle = el.querySelector<HTMLElement>('.ink-datepicker__nav-title')!;
    const locale = el.lang || document.documentElement.lang || undefined;
    const month = (y: number, m: number) =>
      `${new Date(y, m, 1).toLocaleString(locale, { month: 'long' })} ${y}`;
    expect(navTitle.textContent).toBe(month(2026, 0));

    // January - 1 month is December of the previous year.
    press('PageUp');
    expect(navTitle.textContent).toBe(month(2025, 11));

    // ...and December + 1 month is January of the next.
    press('PageDown');
    expect(navTitle.textContent).toBe(month(2026, 0));
  });

  it('e-date-picker ignores keys with nothing to do', () => {
    const el = mount<HTMLElement>(`<e-date-picker value="2026-01-15"></e-date-picker>`);
    const cells = openGrid(el);
    const navTitle = el.querySelector<HTMLElement>('.ink-datepicker__nav-title')!;
    const before = navTitle.textContent;

    // A key the grid does not handle leaves focus and the view alone.
    press('Tab');
    expect(document.activeElement!.getAttribute('data-day')).toBe('15');

    // Padding cells outside the month are disabled and not part of the grid
    // ring, so a keydown on one is a no-op rather than a focus move.
    const padding = cells().find((c) => c.disabled)!;
    padding.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement!.getAttribute('data-day')).toBe('15');
    expect(navTitle.textContent).toBe(before);

    // The trigger itself only opens on ArrowDown/Enter/Space.
    const trigger = el.querySelector<HTMLButtonElement>('[data-trigger]')!;
    trigger.focus();
    press('ArrowUp');
    expect(el.querySelector<HTMLElement>('.ink-datepicker__pop')!.hidden).toBe(false);
  });

  it('e-cascader Home and End jump to the ends of a column', () => {
    const el = mount<HTMLElement>(
      `<e-cascader data='[{"value":"a","label":"A"},{"value":"b","label":"B"},{"value":"c","label":"C"}]'></e-cascader>`,
    );
    el.querySelector<HTMLButtonElement>('[data-trigger]')!.click();
    const items = [...el.querySelectorAll<HTMLElement>('.ink-cascader__item')];
    items[0].focus();

    press('End');
    expect(document.activeElement).toBe(items.at(-1));

    press('Home');
    expect(document.activeElement).toBe(items[0]);
  });
});

describe('collection patching', () => {
  it('e-avatar-group adds, removes and re-counts avatars as max changes', () => {
    const el = mount<HTMLElement>(
      `<e-avatar-group max="4">
         ${['A', 'B', 'C', 'D', 'E'].map((n) => `<e-avatar-item name="${n}"></e-avatar-item>`).join('')}
       </e-avatar-group>`,
    );
    const avatars = () => el.querySelectorAll('.ink-avatar-group > e-avatar');
    const overflow = () => el.querySelector<HTMLElement>('.ink-avatar-group__overflow');
    expect(avatars()).toHaveLength(4);
    expect(overflow()!.textContent).toBe('+1');

    // Room for everyone: the fifth avatar appears and the chip goes away.
    el.setAttribute('max', '5');
    expect(avatars()).toHaveLength(5);
    expect(overflow()).toBeNull();

    // Shrinking pops the excess from the end and brings the chip back.
    el.setAttribute('max', '2');
    expect(avatars()).toHaveLength(2);
    expect(overflow()!.textContent).toBe('+3');
  });

  it('e-calendar repaints a day when event titles or the overflow count change', () => {
    const events = (...titles: string[]) =>
      JSON.stringify(titles.map((title) => ({ date: '2026-04-10', title })));
    const el = mount<HTMLElement>(
      `<e-calendar value="2026-04-10" events='${events('Release')}'></e-calendar>`,
    );
    const chips = () => [
      ...el.querySelectorAll<HTMLElement>('[data-day="10"] .ink-calendar__events > *'),
    ];
    expect(chips().map((c) => c.textContent)).toEqual(['Release']);

    // Same chip count, different text: the container still has to be repainted.
    el.setAttribute('events', events('Freeze'));
    expect(chips().map((c) => c.textContent)).toEqual(['Freeze']);

    // Two shown plus a "+N" chip, then the same three slots with a higher N.
    el.setAttribute('events', events('Freeze', 'Review', 'Ship'));
    expect(chips().map((c) => c.textContent)).toEqual(['Freeze', 'Review', '+1']);
    el.setAttribute('events', events('Freeze', 'Review', 'Ship', 'Retro'));
    expect(chips().map((c) => c.textContent)).toEqual(['Freeze', 'Review', '+2']);
  });

  it('e-calendar leaves an untouched day alone when a neighbour changes', () => {
    const el = mount<HTMLElement>(
      `<e-calendar value="2026-04-10" events='[{"date":"2026-04-10","title":"Release"}]'></e-calendar>`,
    );
    const chip = el.querySelector<HTMLElement>('[data-day="10"] .ink-calendar__event')!;

    el.setAttribute(
      'events',
      JSON.stringify([
        { date: '2026-04-10', title: 'Release' },
        { date: '2026-04-11', title: 'Retro' },
      ]),
    );
    // Same title, same count — the chip is not rebuilt, so the node survives.
    expect(el.querySelector('[data-day="10"] .ink-calendar__event')).toBe(chip);
    expect(el.querySelector('[data-day="11"] .ink-calendar__event')!.textContent).toBe('Retro');
  });
});

// Components that read their entries from data-carrier children keep those
// children in the light DOM and re-sync through `observeItems`. The observer
// coalesces onto a microtask, so every assertion after a DOM edit has to wait
// a turn first.
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('data-carrier children stay reactive', () => {
  it('e-timeline adds, patches and drops rows as its items change', async () => {
    const el = mount<HTMLElement>(
      `<e-timeline><e-timeline-item time="08:00" title="A"></e-timeline-item></e-timeline>`,
    );
    const rows = (): HTMLElement[] => [
      ...el.querySelectorAll<HTMLElement>('li.ink-timeline__item'),
    ];
    expect(rows()).toHaveLength(1);
    const first = rows()[0];

    // (a) appended after mount
    const late = document.createElement('e-timeline-item');
    late.setAttribute('time', '09:00');
    late.setAttribute('title', 'B');
    late.textContent = 'Body';
    el.appendChild(late);
    await flush();
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toBe(first); // the existing row keeps its identity
    expect(rows()[1].querySelector('.ink-timeline__time')!.textContent).toBe('09:00');
    expect(rows()[1].querySelector('.ink-timeline__title')!.textContent).toBe('B');
    expect(rows()[1].querySelector('.ink-timeline__body')!.textContent).toBe('Body');
    // The authored item stays put but must not paint twice.
    expect(late.style.display).toBe('none');

    // (b) attributes and body content patched in place
    const secondRow = rows()[1];
    late.setAttribute('title', 'B2');
    late.setAttribute('variant', 'done');
    late.textContent = 'Body 2';
    await flush();
    expect(rows()[1]).toBe(secondRow);
    expect(secondRow.querySelector('.ink-timeline__title')!.textContent).toBe('B2');
    expect(secondRow.getAttribute('data-variant')).toBe('done');
    expect(secondRow.querySelector('.ink-timeline__body')!.textContent).toBe('Body 2');

    // (c) removed again
    late.remove();
    await flush();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toBe(first);
  });

  it('e-description-list adds, patches and drops pairs as its items change', async () => {
    const el = mount<HTMLElement>(
      `<e-description-list><e-desc-item term="Status">Shipped</e-desc-item></e-description-list>`,
    );
    const pairs = (): HTMLElement[] => [
      ...el.querySelectorAll<HTMLElement>('.ink-desc-list__pair'),
    ];
    expect(pairs()).toHaveLength(1);
    const first = pairs()[0];

    const late = document.createElement('e-desc-item');
    late.setAttribute('term', 'Tracking');
    late.textContent = 'EP-2048';
    el.appendChild(late);
    await flush();
    expect(pairs()).toHaveLength(2);
    expect(pairs()[0]).toBe(first);
    expect(pairs()[1].querySelector('dt')!.textContent).toBe('Tracking');
    expect(pairs()[1].querySelector('dd')!.textContent).toBe('EP-2048');
    expect(late.style.display).toBe('none');

    late.setAttribute('term', 'Parcel');
    late.textContent = 'EP-4096';
    await flush();
    expect(pairs()[1].querySelector('dt')!.textContent).toBe('Parcel');
    expect(pairs()[1].querySelector('dd')!.textContent).toBe('EP-4096');

    late.remove();
    await flush();
    expect(pairs()).toHaveLength(1);
    expect(pairs()[0]).toBe(first);
  });

  it('e-breadcrumb re-roles the trail as items are added and removed', async () => {
    const el = mount<HTMLElement>(
      `<e-breadcrumb><e-breadcrumb-item href="/a" title="A"></e-breadcrumb-item>` +
        `<e-breadcrumb-item title="B"></e-breadcrumb-item></e-breadcrumb>`,
    );
    const nav = el.querySelector('nav')!;
    const kinds = (): string[] => [...nav.children].map((c) => c.tagName);
    const current = (): string | null =>
      el.querySelector('.ink-breadcrumb__current')?.textContent ?? null;
    expect(kinds()).toEqual(['A', 'SPAN', 'SPAN']);
    expect(current()).toBe('B');

    const late = document.createElement('e-breadcrumb-item');
    late.setAttribute('title', 'C');
    el.appendChild(late);
    await flush();
    // B stops being the current page and C takes over.
    expect(kinds()).toEqual(['A', 'SPAN', 'SPAN', 'SPAN', 'SPAN']);
    expect(current()).toBe('C');
    expect(el.querySelector('nav')).toBe(nav); // patched, not rebuilt
    expect(late.style.display).toBe('none');

    late.setAttribute('title', 'C2');
    await flush();
    expect(current()).toBe('C2');

    late.remove();
    await flush();
    expect(kinds()).toEqual(['A', 'SPAN', 'SPAN']);
    expect(current()).toBe('B');
  });

  it('e-avatar-group tracks avatar items added, renamed and removed', async () => {
    const el = mount<HTMLElement>(
      `<e-avatar-group max="4"><e-avatar-item name="Ada"></e-avatar-item></e-avatar-group>`,
    );
    const avatars = (): HTMLElement[] => [
      ...el.querySelectorAll<HTMLElement>('.ink-avatar-group > e-avatar'),
    ];
    expect(avatars()).toHaveLength(1);
    const first = avatars()[0];

    const late = document.createElement('e-avatar-item');
    late.setAttribute('name', 'Linus');
    el.appendChild(late);
    await flush();
    expect(avatars()).toHaveLength(2);
    expect(avatars()[0]).toBe(first);
    expect(avatars()[1].getAttribute('name')).toBe('Linus');
    expect(late.style.display).toBe('none');

    late.setAttribute('name', 'Grace');
    await flush();
    expect(avatars()[1].getAttribute('name')).toBe('Grace');

    // A sixth item overflows the max of 4 and brings the chip in.
    for (const name of ['Alan', 'Edsger', 'Barbara']) {
      const extra = document.createElement('e-avatar-item');
      extra.setAttribute('name', name);
      el.appendChild(extra);
    }
    await flush();
    expect(avatars()).toHaveLength(4);
    expect(el.querySelector('.ink-avatar-group__overflow')!.textContent).toBe('+1');

    late.remove();
    await flush();
    expect(avatars()).toHaveLength(4);
    expect(avatars().map((a) => a.getAttribute('name'))).toEqual([
      'Ada',
      'Alan',
      'Edsger',
      'Barbara',
    ]);
    expect(el.querySelector('.ink-avatar-group__overflow')).toBeNull();
  });

  it('e-segmented tracks segments added, relabelled and removed', async () => {
    const el = mount<HTMLElement>(
      `<e-segmented value="a"><e-segment value="a" label="A"></e-segment></e-segmented>`,
    );
    const btns = (): HTMLButtonElement[] => [
      ...el.querySelectorAll<HTMLButtonElement>('.ink-segmented__btn'),
    ];
    expect(btns()).toHaveLength(1);
    const first = btns()[0];

    const late = document.createElement('e-segment');
    late.setAttribute('value', 'b');
    late.setAttribute('label', 'B');
    el.appendChild(late);
    await flush();
    expect(btns()).toHaveLength(2);
    expect(btns()[0]).toBe(first);
    expect(btns()[1].textContent).toBe('B');
    expect(btns()[1].dataset['value']).toBe('b');
    expect(btns()[1].getAttribute('aria-checked')).toBe('false');
    expect(late.style.display).toBe('none');

    // A late segment is fully wired: clicking it selects and reports.
    let detail: { value: string } | null = null;
    el.addEventListener('e-change', (e) => {
      detail = (e as CustomEvent<{ value: string }>).detail;
    });
    btns()[1].click();
    expect(detail).toEqual({ value: 'b' });
    expect(btns()[1].getAttribute('aria-checked')).toBe('true');

    late.setAttribute('label', 'Beta');
    await flush();
    expect(btns()[1].textContent).toBe('Beta');

    late.remove();
    await flush();
    expect(btns()).toHaveLength(1);
    expect(btns()[0]).toBe(first);
  });

  it('e-anchor tracks items added, retitled and removed', async () => {
    const el = mount<HTMLElement>(
      `<e-anchor><e-anchor-item href="#rx-a" title="Intro"></e-anchor-item></e-anchor>`,
    );
    const links = (): HTMLAnchorElement[] => [
      ...el.querySelectorAll<HTMLAnchorElement>('.ink-anchor__link'),
    ];
    expect(links()).toHaveLength(1);
    const first = links()[0];

    const late = document.createElement('e-anchor-item');
    late.setAttribute('href', '#rx-b');
    late.setAttribute('title', 'API');
    late.setAttribute('depth', '1');
    el.appendChild(late);
    await flush();
    expect(links()).toHaveLength(2);
    expect(links()[0]).toBe(first);
    expect(links()[1].getAttribute('href')).toBe('#rx-b');
    expect(links()[1].textContent).toContain('API');
    expect(links()[1].style.paddingLeft).toBe('28px');
    expect(late.style.display).toBe('none');

    late.setAttribute('title', 'Reference');
    late.setAttribute('depth', '0');
    await flush();
    expect(links()[1].textContent).toContain('Reference');
    expect(links()[1].style.paddingLeft).toBe('14px');

    late.remove();
    await flush();
    expect(links()).toHaveLength(1);
    expect(links()[0]).toBe(first);
    el.remove();
  });

  it('e-anchor reports a moved highlight with e-change', () => {
    // Fixed rather than absolute: the sections then sit at a known viewport
    // offset no matter how far an earlier test scrolled the page.
    const targets = mount<HTMLElement>(
      `<div>
         <div id="rx-sec-a" style="position:fixed;top:0;left:0;width:1px;height:1px"></div>
         <div id="rx-sec-b" style="position:fixed;top:4000px;left:0;width:1px;height:1px"></div>
       </div>`,
    );
    const el = mount<HTMLElement>(
      `<e-anchor offset-top="80">
         <e-anchor-item href="#rx-sec-a" title="Intro"></e-anchor-item>
         <e-anchor-item href="#rx-sec-b" title="API"></e-anchor-item>
       </e-anchor>`,
    );
    const details: Array<{ value: string }> = [];
    el.addEventListener('e-change', (e) => {
      details.push((e as CustomEvent<{ value: string }>).detail);
    });
    expect(
      el.querySelector('.ink-anchor__link[href="#rx-sec-a"]')!.getAttribute('aria-current'),
    ).toBe('true');

    // A 5000px offset puts the second section above the line as well.
    el.setAttribute('offset-top', '5000');
    expect(details).toEqual([{ value: '#rx-sec-b' }]);
    expect(
      el.querySelector('.ink-anchor__link[href="#rx-sec-b"]')!.getAttribute('aria-current'),
    ).toBe('true');

    // Re-applying the same active target must not re-announce it.
    el.setAttribute('offset-top', '6000');
    expect(details).toEqual([{ value: '#rx-sec-b' }]);

    el.setAttribute('offset-top', '80');
    expect(details).toEqual([{ value: '#rx-sec-b' }, { value: '#rx-sec-a' }]);

    el.remove();
    targets.remove();
  });
});
