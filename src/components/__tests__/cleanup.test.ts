// Memory-leak regression tests for components that attach document/window
// listeners. After disconnection, the host must remove its global listeners.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../dropdown');
  await import('../select');
  await import('../cascader');
  await import('../date-picker');
  await import('../menu');
  await import('../badge');
  await import('../pagination');
  await import('../tree-select');
  await import('../tabs');
  await import('../time-picker');
  await import('../anchor');
  await import('../splitter');
  await import('../calendar');
  await import('../segmented');
  await import('../input-number');
  await import('../tag');
  await import('../chip');
  await import('../table');
  await import('../checkbox-group');
});

describe('disconnect/reconnect behaviour', () => {
  const reconnect = <T extends HTMLElement>(element: T): T => {
    document.body.appendChild(element);
    element.remove();
    document.body.appendChild(element);
    return element;
  };

  it('restores delegated interaction listeners', () => {
    const pagination = document.createElement('e-pagination');
    pagination.setAttribute('total', '3');
    reconnect(pagination);
    pagination.querySelector<HTMLButtonElement>('[data-page="2"]')!.click();
    expect(pagination.getAttribute('current')).toBe('2');

    const segmented = document.createElement('e-segmented');
    segmented.innerHTML =
      '<e-segment value="a" label="A"></e-segment><e-segment value="b" label="B"></e-segment>';
    reconnect(segmented);
    segmented.querySelector<HTMLButtonElement>('[data-value="b"]')!.click();
    expect(segmented.getAttribute('value')).toBe('b');

    const menu = document.createElement('e-menu');
    menu.innerHTML = '<e-menu-item value="a" label="A"></e-menu-item>';
    reconnect(menu);
    menu.querySelector<HTMLButtonElement>('[data-value="a"]')!.click();
    expect(menu.getAttribute('value')).toBe('a');

    pagination.remove();
    segmented.remove();
    menu.remove();
  });

  it('restores popover listeners', () => {
    const select = document.createElement('e-select');
    select.innerHTML = '<e-option value="a" label="A"></e-option>';
    reconnect(select);
    select.querySelector<HTMLButtonElement>('.ink-select__trigger')!.click();
    expect(select.querySelector<HTMLElement>('.ink-select__menu')!.hidden).toBe(false);

    const datePicker = document.createElement('e-date-picker');
    reconnect(datePicker);
    datePicker.querySelector<HTMLButtonElement>('[data-trigger]')!.click();
    expect(datePicker.querySelector<HTMLElement>('.ink-datepicker__pop')!.hidden).toBe(false);

    const cascader = document.createElement('e-cascader');
    cascader.setAttribute('data', '[{"value":"a","label":"A"}]');
    reconnect(cascader);
    cascader.querySelector<HTMLButtonElement>('[data-trigger]')!.click();
    expect(cascader.querySelector<HTMLElement>('.ink-cascader__menu')!.hidden).toBe(false);

    const dropdown = document.createElement('e-dropdown');
    dropdown.innerHTML = '<e-dropdown-item label="A"></e-dropdown-item>';
    reconnect(dropdown);
    dropdown.querySelector<HTMLElement>('[data-trigger]')!.click();
    expect(dropdown.querySelector<HTMLElement>('.ink-dropdown__menu')!.hidden).toBe(false);

    select.remove();
    datePicker.remove();
    cascader.remove();
    dropdown.remove();
  });

  it('restores control and data-view listeners', () => {
    const time = document.createElement('e-time-picker');
    time.setAttribute('value', '09:30');
    reconnect(time);
    time.querySelector<HTMLButtonElement>('[data-axis="h"][data-dir="1"]')!.click();
    expect(time.getAttribute('value')).toBe('10:30');

    const number = document.createElement('e-input-number');
    number.setAttribute('value', '1');
    reconnect(number);
    number.querySelector<HTMLButtonElement>('[data-step="1"]')!.click();
    expect(number.getAttribute('value')).toBe('2');

    const table = document.createElement('e-table');
    table.setAttribute('columns', '[{"key":"a","title":"A","sortable":true}]');
    table.setAttribute('data', '[{"a":"x"}]');
    reconnect(table);
    table.querySelector<HTMLButtonElement>('[data-sort-key="a"]')!.click();
    expect(table.getAttribute('sort')).toBe('a:asc');

    const chip = document.createElement('e-chip');
    chip.textContent = 'A';
    reconnect(chip);
    chip.querySelector<HTMLButtonElement>('button')!.click();
    expect(chip.hasAttribute('selected')).toBe(true);

    const tag = document.createElement('e-tag');
    tag.setAttribute('closable', '');
    tag.textContent = 'A';
    let closed = 0;
    tag.addEventListener('e-close', () => closed++);
    reconnect(tag);
    tag.querySelector<HTMLButtonElement>('button')!.click();
    expect(closed).toBe(1);

    time.remove();
    number.remove();
    table.remove();
    chip.remove();
    tag.remove();
  });
});

const countDocListeners = (): number => {
  return 0;
};

describe('global listener cleanup', () => {
  it('e-dropdown removes document listeners on disconnect', () => {
    let added = 0;
    let removed = 0;
    const origAdd = document.addEventListener;
    const origRemove = document.removeEventListener;
    document.addEventListener = function (...args: Parameters<typeof origAdd>) {
      added++;
      return origAdd.apply(this, args);
    };
    document.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-dropdown');
      el.innerHTML = `<e-button slot="trigger">Open</e-button>`;
      document.body.appendChild(el);
      const addedAfterMount = added;
      el.remove();
      // At least the same number of listeners removed as added during mount.
      expect(added - removed).toBe(0);
      expect(addedAfterMount).toBeGreaterThan(0);
    } finally {
      document.addEventListener = origAdd;
      document.removeEventListener = origRemove;
    }
    void countDocListeners();
  });

  it('e-select removes document listeners on disconnect', () => {
    let added = 0;
    let removed = 0;
    const origAdd = document.addEventListener;
    const origRemove = document.removeEventListener;
    document.addEventListener = function (...args: Parameters<typeof origAdd>) {
      added++;
      return origAdd.apply(this, args);
    };
    document.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-select');
      el.innerHTML = `<e-option value="a" label="A"></e-option>`;
      document.body.appendChild(el);
      el.remove();
      expect(added - removed).toBe(0);
    } finally {
      document.addEventListener = origAdd;
      document.removeEventListener = origRemove;
    }
  });

  it('e-menu removes its listeners on disconnect and uses string aria-current', () => {
    let added = 0;
    let removed = 0;
    const origAdd = document.addEventListener;
    const origRemove = document.removeEventListener;
    document.addEventListener = function (...args: Parameters<typeof origAdd>) {
      added++;
      return origAdd.apply(this, args);
    };
    document.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-menu');
      el.setAttribute('value', 'home');
      el.innerHTML = `
        <e-menu-item value="home" label="Home"></e-menu-item>
        <e-menu-item value="docs" label="Docs">
          <e-menu-item value="docs/api" label="API"></e-menu-item>
        </e-menu-item>
      `;
      document.body.appendChild(el);

      // aria-current is a string ("page"/"false"), never the boolean literal.
      const buttons = el.querySelectorAll<HTMLElement>('.ink-menu__btn');
      for (const b of buttons) {
        const v = b.getAttribute('aria-current');
        expect(v === 'page' || v === 'false').toBe(true);
      }
      expect(
        el.querySelector<HTMLElement>('[data-value="home"]')!.getAttribute('aria-current'),
      ).toBe('page');

      // Switching value updates aria-current via patchAttr without re-creating buttons.
      const homeBtn = el.querySelector<HTMLElement>('[data-value="home"]')!;
      el.setAttribute('value', 'docs/api');
      expect(el.querySelector<HTMLElement>('[data-value="home"]')).toBe(homeBtn);
      expect(homeBtn.getAttribute('aria-current')).toBe('false');
      expect(
        el.querySelector<HTMLElement>('[data-value="docs/api"]')!.getAttribute('aria-current'),
      ).toBe('page');

      el.remove();
      expect(added - removed).toBe(0);
    } finally {
      document.addEventListener = origAdd;
      document.removeEventListener = origRemove;
    }
  });

  it('e-pagination registers exactly one click listener and cleans up on disconnect', () => {
    const el = document.createElement('e-pagination');
    el.setAttribute('current', '1');
    el.setAttribute('total', '10');
    document.body.appendChild(el);

    // Spy on addEventListener to count registrations from now on.
    let clickAdds = 0;
    const origAdd = el.addEventListener;
    el.addEventListener = function (...args: Parameters<typeof origAdd>) {
      if (args[0] === 'click') clickAdds++;
      return origAdd.apply(this, args);
    };

    // Multiple re-renders via attribute changes must NOT add more listeners.
    for (let i = 2; i <= 6; i++) {
      el.setAttribute('current', String(i));
    }
    // No additional click listeners were registered during attribute changes.
    expect(clickAdds).toBe(0);

    // Restore
    el.addEventListener = origAdd;

    // Verify DOM identity: page buttons survive when page structure is unchanged.
    // Use a small total so all pages are always visible (no structure change).
    el.setAttribute('total', '5');
    el.setAttribute('current', '2');
    const btnBefore = el.querySelector('button[data-page="3"]')!;
    el.setAttribute('current', '3');
    const btnAfter = el.querySelector('button[data-page="3"]')!;
    expect(btnAfter).toBe(btnBefore);
    expect(btnAfter.getAttribute('aria-current')).toBe('page');

    el.remove();
  });

  it('e-tabs cleans up its click listener on disconnect', () => {
    const el = document.createElement('e-tabs');
    el.innerHTML = `
      <e-tab key="a" label="A">A panel</e-tab>
      <e-tab key="b" label="B">B panel</e-tab>
    `;
    document.body.appendChild(el);

    let clickAdds = 0;
    let clickRemoves = 0;
    const origAdd = el.addEventListener;
    const origRemove = el.removeEventListener;
    el.addEventListener = function (...args: Parameters<typeof origAdd>) {
      if (args[0] === 'click') clickAdds++;
      return origAdd.apply(this, args);
    };
    el.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'click') clickRemoves++;
      return origRemove.apply(this, args);
    };

    el.remove();
    el.addEventListener = origAdd;
    el.removeEventListener = origRemove;
    // Listener was registered in connectedCallback (before our spy), so we can
    // only assert that the cleanup path called removeEventListener.
    expect(clickRemoves).toBeGreaterThanOrEqual(1);
    expect(clickAdds).toBe(0);
  });

  it('e-time-picker cleans up its click listener on disconnect', () => {
    const el = document.createElement('e-time-picker');
    el.setAttribute('value', '09:30');
    document.body.appendChild(el);

    let removed = 0;
    const origRemove = el.removeEventListener;
    el.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'click') removed++;
      return origRemove.apply(this, args);
    };

    el.remove();
    el.removeEventListener = origRemove;
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it('e-anchor removes its window scroll listener on disconnect', () => {
    let added = 0;
    let removed = 0;
    const origAdd = window.addEventListener;
    const origRemove = window.removeEventListener;
    window.addEventListener = function (...args: Parameters<typeof origAdd>) {
      if (args[0] === 'scroll') added++;
      return origAdd.apply(this, args);
    };
    window.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'scroll') removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-anchor');
      el.innerHTML = `<e-anchor-item href="#a" title="A"></e-anchor-item>`;
      document.body.appendChild(el);
      expect(added).toBeGreaterThanOrEqual(1);
      el.remove();
      expect(added - removed).toBe(0);
    } finally {
      window.addEventListener = origAdd;
      window.removeEventListener = origRemove;
    }
  });

  it('e-splitter removes its window mouse listeners on disconnect', () => {
    let mmAdded = 0;
    let mmRemoved = 0;
    let muAdded = 0;
    let muRemoved = 0;
    const origAdd = window.addEventListener;
    const origRemove = window.removeEventListener;
    window.addEventListener = function (...args: Parameters<typeof origAdd>) {
      if (args[0] === 'mousemove') mmAdded++;
      if (args[0] === 'mouseup') muAdded++;
      return origAdd.apply(this, args);
    };
    window.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'mousemove') mmRemoved++;
      if (args[0] === 'mouseup') muRemoved++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-splitter');
      el.innerHTML = `<div slot="a">A</div><div slot="b">B</div>`;
      document.body.appendChild(el);
      expect(mmAdded).toBeGreaterThanOrEqual(1);
      expect(muAdded).toBeGreaterThanOrEqual(1);
      el.remove();
      expect(mmAdded - mmRemoved).toBe(0);
      expect(muAdded - muRemoved).toBe(0);
    } finally {
      window.addEventListener = origAdd;
      window.removeEventListener = origRemove;
    }
  });

  it('e-cascader removes its document listener on disconnect', () => {
    let added = 0;
    let removed = 0;
    const origAdd = document.addEventListener;
    const origRemove = document.removeEventListener;
    document.addEventListener = function (...args: Parameters<typeof origAdd>) {
      added++;
      return origAdd.apply(this, args);
    };
    document.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-cascader');
      el.setAttribute('options', '[{"value":"a","label":"A"}]');
      document.body.appendChild(el);
      el.remove();
      expect(added - removed).toBe(0);
    } finally {
      document.addEventListener = origAdd;
      document.removeEventListener = origRemove;
    }
  });

  it('e-date-picker removes its document listener on disconnect', () => {
    let added = 0;
    let removed = 0;
    const origAdd = document.addEventListener;
    const origRemove = document.removeEventListener;
    document.addEventListener = function (...args: Parameters<typeof origAdd>) {
      added++;
      return origAdd.apply(this, args);
    };
    document.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      removed++;
      return origRemove.apply(this, args);
    };

    try {
      const el = document.createElement('e-date-picker');
      el.setAttribute('value', '2026-04-26');
      document.body.appendChild(el);
      el.remove();
      expect(added - removed).toBe(0);
    } finally {
      document.addEventListener = origAdd;
      document.removeEventListener = origRemove;
    }
  });

  it('e-tree-select cleans up its click listener on disconnect', () => {
    const el = document.createElement('e-tree-select');
    el.setAttribute('data', '[{"value":"a","label":"A"}]');
    document.body.appendChild(el);

    let removed = 0;
    const origRemove = el.removeEventListener;
    el.removeEventListener = function (...args: Parameters<typeof origRemove>) {
      if (args[0] === 'click') removed++;
      return origRemove.apply(this, args);
    };

    el.remove();
    el.removeEventListener = origRemove;
    expect(removed).toBeGreaterThanOrEqual(1);
  });
});
