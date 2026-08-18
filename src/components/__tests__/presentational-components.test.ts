import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await Promise.all([
    import('../badge'),
    import('../badge-count'),
    import('../breadcrumb'),
    import('../divider'),
    import('../empty'),
    import('../form'),
    import('../flex'),
    import('../float-button'),
    import('../grid'),
    import('../icon'),
    import('../layout'),
    import('../link'),
    import('../masonry'),
    import('../result'),
    import('../ribbon'),
    import('../skeleton'),
    import('../space'),
    import('../steps'),
    import('../tag'),
    import('../text'),
    import('../title'),
  ]);
});

afterEach(() => document.body.replaceChildren());

const mount = <T extends HTMLElement>(html: string): T => {
  const template = document.createElement('template');
  template.innerHTML = html;
  const element = template.content.firstElementChild as T;
  document.body.appendChild(element);
  return element;
};

describe('e-badge-count', () => {
  it('hides zero, caps large counts, and reuses the numeric badge', () => {
    const element = mount('<e-badge-count><span>Inbox</span></e-badge-count>');
    expect(element.querySelector('.ink-badge-count__num')).toBeNull();

    element.setAttribute('count', '120');
    element.setAttribute('max', '99');
    const badge = element.querySelector('.ink-badge-count__num')!;
    expect(badge.textContent).toBe('99+');

    element.setAttribute('count', '4');
    expect(element.querySelector('.ink-badge-count__num')).toBe(badge);
    expect(badge.textContent).toBe('4');
  });

  it('switches to an accessible dot and removes it again', () => {
    const element = mount('<e-badge-count dot></e-badge-count>');
    const dot = element.querySelector('.ink-badge-count__dot')!;
    expect(dot.getAttribute('role')).toBe('status');
    expect(dot.getAttribute('aria-label')).toBe('Notification');

    element.setAttribute('count', '3');
    expect(dot.getAttribute('aria-label')).toBe('3');
    element.removeAttribute('dot');
    element.setAttribute('count', '0');
    expect(element.querySelector('.ink-badge-count__dot')).toBeNull();
  });
});

describe('e-breadcrumb', () => {
  it('renders links, text fallback, and the current-page contract', () => {
    const element = mount(`<e-breadcrumb>
      <e-breadcrumb-item href="/library" title="Library"></e-breadcrumb-item>
      <e-breadcrumb-item>Current</e-breadcrumb-item>
    </e-breadcrumb>`);
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/library');
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Current');
  });

  it('patches separators without replacing the navigation', () => {
    const element = mount(`<e-breadcrumb><e-breadcrumb-item title="A"></e-breadcrumb-item>
      <e-breadcrumb-item title="B"></e-breadcrumb-item></e-breadcrumb>`);
    const nav = element.querySelector('nav')!;
    element.setAttribute('separator', '→');
    expect(element.querySelector('nav')).toBe(nav);
    expect(element.querySelector('[aria-hidden]')?.textContent).toBe('→');
  });
});

describe('e-divider', () => {
  it('changes element type when its semantic mode changes', () => {
    const element = mount('<e-divider></e-divider>');
    expect(element.firstElementChild?.tagName).toBe('HR');
    element.setAttribute('label', 'OR');
    expect(element.firstElementChild?.getAttribute('role')).toBe('separator');
    expect(element.firstElementChild?.getAttribute('aria-label')).toBe('OR');
    element.setAttribute('orientation', 'vertical');
    expect(element.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('patches label and dashed styling in place', () => {
    const element = mount('<e-divider label="Old"></e-divider>');
    const divider = element.firstElementChild!;
    element.setAttribute('label', 'New');
    expect(element.firstElementChild).toBe(divider);
    expect(divider.textContent).toBe('New');
    element.removeAttribute('label');
    element.setAttribute('variant', 'dashed');
    expect(element.firstElementChild?.classList).toContain('ink-divider--dashed');
  });
});

describe('layout primitives', () => {
  it('updates flex styles and supports CSS and numeric gaps', () => {
    const element = mount<HTMLElement>('<e-flex gap="8"></e-flex>');
    expect(element.style.gap).toBe('8px');
    element.setAttribute('gap', 'var(--space)');
    element.setAttribute('direction', 'column');
    element.setAttribute('inline', '');
    expect(element.style.gap).toBe('var(--space)');
    expect(element.style.flexDirection).toBe('column');
    expect(element.style.display).toBe('inline-flex');
  });

  it('updates grid tracks, gaps, and item placement', () => {
    const grid = mount<HTMLElement>(
      '<e-grid cols="3" gap="4"><e-grid-item></e-grid-item></e-grid>',
    );
    const item = grid.firstElementChild as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    grid.setAttribute('cols', '12rem 1fr');
    item.setAttribute('col', '2 / span 1');
    item.setAttribute('row', '3');
    expect(grid.style.gridTemplateColumns).toBe('12rem 1fr');
    expect(item.style.gridColumn).toBe('2 / span 1');
    expect(item.style.gridRow).toBe('3');
  });

  it('toggles sider layout and clamps sider width', () => {
    const layout = mount('<e-layout><e-layout-sider width="-5">Nav</e-layout-sider></e-layout>');
    const sider = layout.querySelector<HTMLElement>('aside')!;
    expect(sider.style.width).toBe('0px');
    layout.setAttribute('has-sider', '');
    expect(layout.classList).toContain('ink-layout--has-sider');
    layout.querySelector('e-layout-sider')!.setAttribute('width', '50000');
    expect(sider.style.width).toBe('10000px');
  });

  it('clamps masonry settings and exposes its child gap token', () => {
    const element = mount<HTMLElement>('<e-masonry columns="0" gap="-2"></e-masonry>');
    expect(element.style.columnCount).toBe('1');
    expect(element.style.columnGap).toBe('0px');
    element.setAttribute('columns', '99');
    element.setAttribute('gap', '12.5');
    expect(element.style.columnCount).toBe('20');
    expect(element.style.getPropertyValue('--ink-masonry-gap')).toBe('12.5px');
  });

  it('normalizes space direction, wrapping, and negative sizes', () => {
    const element = mount<HTMLElement>('<e-space size="-4" direction="vertical" wrap></e-space>');
    expect(element.style.gap).toBe('0px');
    expect(element.style.flexDirection).toBe('column');
    expect(element.style.flexWrap).toBe('wrap');
    element.removeAttribute('wrap');
    expect(element.style.flexWrap).toBe('nowrap');
  });
});

describe('buttons and icons', () => {
  it('updates a float button label, icon, and visual priority', () => {
    const element = mount('<e-float-button icon="plus" label="Add"></e-float-button>');
    const button = element.querySelector('button')!;
    const firstSvg = button.querySelector('svg');
    element.setAttribute('label', 'Create');
    expect(button.getAttribute('aria-label')).toBe('Create');
    expect(button.querySelector('svg')).toBe(firstSvg);
    element.setAttribute('icon', 'trash');
    expect(button.querySelector('svg')).not.toBe(firstSvg);
    element.setAttribute('primary', 'false');
    expect(button.classList).toContain('ink-fab--secondary');
  });

  it('emits the selected group item and ignores clicks outside buttons', () => {
    const element = mount(`<e-float-button-group><e-fab-item label="Add" value="add"></e-fab-item>
      <e-fab-item label="Remove" value="remove"></e-fab-item></e-float-button-group>`);
    const listener = vi.fn();
    element.addEventListener('e-select', listener);
    element
      .querySelectorAll('button')[1]
      .querySelector('svg')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail).toEqual({ index: 1, value: 'remove' });
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('renders decorative and labelled icons and clears unknown names', () => {
    const element = mount<HTMLElement>('<e-icon name="plus"></e-icon>');
    expect(element.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    element.setAttribute('label', 'Add');
    element.setAttribute('size', '32');
    expect(element.querySelector('svg')?.getAttribute('aria-label')).toBe('Add');
    expect(element.querySelector('svg')?.getAttribute('width')).toBe('32');
    element.setAttribute('name', 'does-not-exist');
    expect(element.childElementCount).toBe(0);
  });
});

describe('text wrappers', () => {
  it('keeps link content while patching href and applying its fallback', () => {
    const element = mount('<e-link href="/docs"><strong>Docs</strong></e-link>');
    const anchor = element.querySelector('a')!;
    element.setAttribute('href', '/help');
    expect(element.querySelector('a')).toBe(anchor);
    expect(anchor.querySelector('strong')?.textContent).toBe('Docs');
    expect(anchor.getAttribute('href')).toBe('/help');
    element.removeAttribute('href');
    expect(anchor.getAttribute('href')).toBe('#');
  });

  it('patches ribbon text without replacing projected content', () => {
    const element = mount('<e-ribbon text="New"><span>Article</span></e-ribbon>');
    const content = element.querySelector('span span')!;
    const tag = element.querySelector('.ink-ribbon__tag')!;
    element.setAttribute('text', 'Updated');
    expect(element.querySelector('span span')).toBe(content);
    expect(element.querySelector('.ink-ribbon__tag')).toBe(tag);
    expect(tag.textContent).toBe('Updated');
  });

  it('rebuilds heading semantics while preserving child identity', () => {
    const element = mount('<e-title level="2"><em>Heading</em></e-title>');
    const content = element.querySelector('em')!;
    element.setAttribute('level', '9');
    expect(element.firstElementChild?.tagName).toBe('H6');
    expect(element.querySelector('em')).toBe(content);
    element.setAttribute('level', '-4');
    expect(element.firstElementChild?.tagName).toBe('H1');
  });
});

describe('e-steps', () => {
  it('patches current progress without replacing step rows', () => {
    const element = mount(`<e-steps current="0"><e-step title="Plan"></e-step>
      <e-step title="Build"></e-step><e-step title="Ship"></e-step></e-steps>`);
    const rows = [...element.querySelectorAll('.ink-steps__item')];
    element.setAttribute('current', '2');
    expect([...element.querySelectorAll('.ink-steps__item')]).toEqual(rows);
    expect(rows.map((row) => row.getAttribute('data-done'))).toEqual(['true', 'true', 'false']);
    expect(rows[2].getAttribute('data-active')).toBe('true');
  });

  it('rebuilds vertical steps with textual statuses', () => {
    const element = mount(`<e-steps current="1"><e-step title="Plan"></e-step>
      <e-step title="Build"></e-step><e-step title="Ship"></e-step></e-steps>`);
    element.setAttribute('orientation', 'vertical');
    expect(
      [...element.querySelectorAll('.ink-steps__status')].map((node) => node.textContent),
    ).toEqual(['DONE', 'IN PROGRESS', 'PENDING']);
  });
});

describe('additional stateful presentational components', () => {
  it('toggles the badge modifier while preserving projected content', () => {
    const element = mount('<e-badge><strong>New</strong></e-badge>');
    const wrapper = element.firstElementChild!;
    const content = element.querySelector('strong')!;
    element.setAttribute('inverted', '');
    expect(wrapper.classList).toContain('ink-badge--inverted');
    element.setAttribute('inverted', 'false');
    expect(wrapper.classList).not.toContain('ink-badge--inverted');
    expect(element.querySelector('strong')).toBe(content);
  });

  it('creates, patches, and removes an empty-state description in place', () => {
    const element = mount(
      '<e-empty title="Nothing"><button slot="action">Create</button></e-empty>',
    );
    const root = element.querySelector('.ink-empty')!;
    const action = element.querySelector('button')!;
    element.setAttribute('description', 'Start here');
    const description = element.querySelector('.ink-empty__desc')!;
    expect(description.textContent).toBe('Start here');
    expect(description.nextElementSibling?.contains(action)).toBe(true);
    element.setAttribute('description', 'Try again');
    expect(element.querySelector('.ink-empty__desc')).toBe(description);
    element.removeAttribute('description');
    expect(element.querySelector('.ink-empty__desc')).toBeNull();
    expect(root.hasAttribute('data-has-desc')).toBe(false);
  });

  it('patches an empty state title and replaces only the requested icon', () => {
    const element = mount('<e-empty title="Old"></e-empty>');
    const root = element.firstElementChild!;
    const title = element.querySelector('.ink-empty__title')!;
    const oldIcon = element.querySelector('.ink-empty__icon svg');
    element.setAttribute('title', 'New');
    expect(element.firstElementChild).toBe(root);
    expect(element.querySelector('.ink-empty__title')).toBe(title);
    expect(title.textContent).toBe('New');
    element.setAttribute('icon', 'search');
    expect(element.querySelector('.ink-empty__icon svg')).not.toBe(oldIcon);
  });

  it('intercepts native form submission and publishes the actual form', () => {
    const element = mount('<e-form><button type="submit">Save</button></e-form>');
    const form = element.querySelector('form')!;
    const listener = vi.fn();
    element.addEventListener('e-submit', listener);
    const event = new SubmitEvent('submit', { bubbles: true, cancelable: true });
    expect(form.dispatchEvent(event)).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.form).toBe(form);
    element.setAttribute('layout', 'inline');
    expect(form.classList).toContain('ink-form--inline');
  });

  it('coordinates form-item label, required, hint, and error semantics', () => {
    const element = mount(`<e-form-item label="Email" hint="We'll contact you" required>
      <e-input></e-input></e-form-item>`);
    const control = element.querySelector('e-input')!;
    const label = element.querySelector('label')!;
    expect(control.id).not.toBe('');
    expect(label.htmlFor).toBe(control.id);
    expect(control.getAttribute('aria-label')).toBe('Email');
    expect(control.hasAttribute('required')).toBe(true);
    expect(element.querySelector('.ink-hint')?.textContent).toBe("We'll contact you");

    element.setAttribute('required-label', 'Pflicht');
    element.setAttribute('error', 'Invalid');
    expect(element.querySelector('.ink-form-item__required')?.textContent).toBe('Pflicht');
    expect(element.querySelector('.ink-hint')).toBeNull();
    expect(element.querySelector('.ink-error')?.textContent).toBe('! Invalid');
    expect(control.getAttribute('error-message')).toBe('Invalid');

    element.removeAttribute('error');
    element.removeAttribute('required');
    expect(element.querySelector('.ink-hint')).not.toBeNull();
    expect(control.hasAttribute('required')).toBe(false);
  });

  it('preserves author-owned control accessibility attributes', () => {
    const element = mount(`<e-form-item label="Generated" required>
      <e-input aria-label="Custom" required></e-input></e-form-item>`);
    const control = element.querySelector('e-input')!;
    element.removeAttribute('label');
    element.removeAttribute('required');
    expect(control.getAttribute('aria-label')).toBe('Custom');
    expect(control.hasAttribute('required')).toBe(true);
  });

  it('reacts to result status and optional description without replacing actions', () => {
    const element = mount(`<e-result status="invalid" title="Wait">
      <button slot="action">Retry</button></e-result>`);
    const root = element.querySelector<HTMLElement>('.ink-result')!;
    const action = element.querySelector('button')!;
    expect(root.dataset.status).toBe('info');
    element.setAttribute('status', 'success');
    element.setAttribute('description', 'Finished');
    const description = element.querySelector('.ink-result__desc')!;
    expect(root.dataset.status).toBe('success');
    expect(description.textContent).toBe('Finished');
    expect(element.querySelector('button')).toBe(action);
    element.removeAttribute('description');
    expect(element.querySelector('.ink-result__desc')).toBeNull();
  });

  it('grows and shrinks skeleton lines while preserving existing rows', () => {
    const element = mount('<e-skeleton shape="text" lines="2" width="80%"></e-skeleton>');
    expect(element.getAttribute('role')).toBe('status');
    expect(element.getAttribute('aria-busy')).toBe('true');
    const first = element.querySelector('.ink-skeleton__line')!;
    element.setAttribute('lines', '4');
    expect(element.querySelectorAll('.ink-skeleton__line')).toHaveLength(4);
    expect(element.querySelector('.ink-skeleton__line')).toBe(first);
    element.setAttribute('lines', '1');
    expect(element.querySelectorAll('.ink-skeleton__line')).toHaveLength(1);
    expect((first as HTMLElement).style.width).toBe('80%');
  });

  it('rebuilds skeleton geometry and patches block dimensions', () => {
    const element = mount('<e-skeleton shape="text"></e-skeleton>');
    element.setAttribute('shape', 'circle');
    const block = element.querySelector<HTMLElement>('.ink-skeleton__block')!;
    element.setAttribute('width', '3rem');
    element.setAttribute('height', '3rem');
    expect(block.style.width).toBe('3rem');
    expect(block.style.height).toBe('3rem');
  });

  it('emits closable tag values once across disconnect and reconnect', () => {
    const element = mount('<e-tag closable>Draft</e-tag>');
    const listener = vi.fn();
    element.addEventListener('e-close', listener);
    element.querySelector('button')!.click();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].detail.value).toContain('Draft');
    element.remove();
    document.body.appendChild(element);
    element.querySelector('button')!.click();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('blocks disabled tags and removes the close control reactively', () => {
    const element = mount('<e-tag closable disabled>Locked</e-tag>');
    const listener = vi.fn();
    element.addEventListener('e-close', listener);
    expect(element.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);
    element.querySelector<HTMLButtonElement>('button')!.click();
    expect(listener).not.toHaveBeenCalled();
    element.removeAttribute('closable');
    expect(element.querySelector('button')).toBeNull();
  });

  it('changes text semantics and kind without losing authored nodes', () => {
    const element = mount('<e-text kind="label"><em>Caption</em></e-text>');
    const content = element.querySelector('em')!;
    element.setAttribute('as', 'p');
    expect(element.firstElementChild?.tagName).toBe('P');
    expect(element.querySelector('em')).toBe(content);
    element.setAttribute('kind', 'mono');
    expect(element.firstElementChild?.classList).toContain('ink-text--mono');
    expect(element.firstElementChild?.classList).not.toContain('ink-text--label');
  });
});

describe('malformed and boundary attributes', () => {
  it('falls back from fractional and non-numeric badge counts', () => {
    const element = mount('<e-badge-count count="2.5" max="invalid"></e-badge-count>');
    expect(element.querySelector('.ink-badge-count__num')).toBeNull();
    element.setAttribute('count', '100');
    expect(element.querySelector('.ink-badge-count__num')?.textContent).toBe('99+');
    element.setAttribute('max', '-10');
    expect(element.querySelector('.ink-badge-count__num')?.textContent).toBe('0+');
  });

  it('restores layout defaults when attributes become empty or invalid', () => {
    const flex = mount<HTMLElement>('<e-flex gap="12" direction="column"></e-flex>');
    flex.setAttribute('gap', '');
    flex.setAttribute('direction', '');
    expect(flex.style.gap).toBe('0px');
    expect(flex.style.flexDirection).toBe('row');

    const masonry = mount<HTMLElement>('<e-masonry columns="2.5" gap="invalid"></e-masonry>');
    expect(masonry.style.columnCount).toBe('3');
    expect(masonry.style.columnGap).toBe('16px');
  });

  it('removes generated form-item semantics when their source attributes disappear', () => {
    const element = mount(`<e-form-item label="Name" hint="Helpful" required>
      <e-input></e-input></e-form-item>`);
    const control = element.querySelector('e-input')!;
    element.removeAttribute('label');
    element.removeAttribute('hint');
    element.removeAttribute('required');
    expect(element.querySelector('label')).toBeNull();
    expect(element.querySelector('.ink-hint')).toBeNull();
    expect(control.hasAttribute('aria-label')).toBe(false);
    expect(control.hasAttribute('required')).toBe(false);
  });

  it('patches result title and repeated descriptions without rebuilding the section', () => {
    const element = mount('<e-result title="Initial" description="First"></e-result>');
    const section = element.firstElementChild!;
    const description = element.querySelector('.ink-result__desc')!;
    element.setAttribute('title', 'Updated');
    element.setAttribute('description', 'Second');
    expect(element.firstElementChild).toBe(section);
    expect(element.querySelector('.ink-result__title')?.textContent).toBe('Updated');
    expect(element.querySelector('.ink-result__desc')).toBe(description);
    expect(description.textContent).toBe('Second');
  });

  it('clamps skeleton line counts and falls back for fractions', () => {
    const element = mount('<e-skeleton shape="text" lines="0"></e-skeleton>');
    expect(element.querySelectorAll('.ink-skeleton__line')).toHaveLength(1);
    element.setAttribute('lines', '101');
    expect(element.querySelectorAll('.ink-skeleton__line')).toHaveLength(100);
    element.setAttribute('lines', '2.5');
    expect(element.querySelectorAll('.ink-skeleton__line')).toHaveLength(1);
  });
});
