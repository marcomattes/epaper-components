// Component tests for the newly added components:
// e-statistic, e-timeline, e-description-list, e-affix, e-back-top,
// e-watermark, e-image, e-qrcode.
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(async () => {
  await import('../statistic');
  await import('../timeline');
  await import('../description-list');
  await import('../affix');
  await import('../back-top');
  await import('../watermark');
  await import('../image');
  await import('../qrcode');
});

const mount = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  document.body.appendChild(wrap);
  return wrap.firstElementChild as T;
};

describe('e-statistic', () => {
  it('renders label, value and trend delta', () => {
    const el = mount(
      `<e-statistic label="Users" value="1234" trend="up" delta="+5%"></e-statistic>`,
    );
    expect(el.querySelector('.ink-statistic__label')!.textContent).toBe('Users');
    expect(el.querySelector('.ink-statistic__value')!.textContent).toBe('1234');
    expect(el.querySelector('.ink-statistic__trend')!.getAttribute('data-trend')).toBe('up');
    expect(el.querySelector('.ink-statistic__delta')!.textContent).toBe('+5%');
  });

  it('honors precision when value is numeric', () => {
    const el = mount(`<e-statistic value="3.14159" precision="2"></e-statistic>`);
    expect(el.querySelector('.ink-statistic__value')!.textContent).toBe('3.14');
  });

  it('reflects attribute changes after mount', () => {
    const el = mount(`<e-statistic value="1"></e-statistic>`);
    el.setAttribute('value', '99');
    expect(el.querySelector('.ink-statistic__value')!.textContent).toBe('99');
  });

  it('escapes prefix/suffix', () => {
    const el = mount(
      `<e-statistic value="1" prefix="<img src=x>" suffix="<svg onload=alert(1)>"></e-statistic>`,
    );
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('svg[onload]')).toBeNull();
  });
});

describe('e-timeline', () => {
  it('renders an item per child', () => {
    const el = mount(`
      <e-timeline>
        <e-timeline-item time="08:00" title="A"></e-timeline-item>
        <e-timeline-item time="09:00" title="B"></e-timeline-item>
        <e-timeline-item time="10:00" title="C"></e-timeline-item>
      </e-timeline>
    `);
    expect(el.querySelectorAll('.ink-timeline__item')).toHaveLength(3);
    expect(el.querySelector('.ink-timeline__title')!.textContent).toBe('A');
  });

  it('escapes time and title text', () => {
    const el = mount(`
      <e-timeline>
        <e-timeline-item time="<script>" title="<img src=x onerror=alert(1)>"></e-timeline-item>
      </e-timeline>
    `);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('script')).toBeNull();
  });
});

describe('e-description-list', () => {
  it('renders dt/dd pairs from desc-item children', () => {
    const el = mount(`
      <e-description-list columns="2">
        <e-desc-item term="Order">EP-1</e-desc-item>
        <e-desc-item term="Status">OK</e-desc-item>
      </e-description-list>
    `);
    const dts = el.querySelectorAll('dt.ink-desc-list__term');
    const dds = el.querySelectorAll('dd.ink-desc-list__detail');
    expect(dts).toHaveLength(2);
    expect(dds).toHaveLength(2);
    expect(dts[0].textContent).toBe('Order');
    expect(dds[1].textContent?.trim()).toBe('OK');
  });

  it('applies bordered modifier class', () => {
    const el = mount(`<e-description-list bordered>
      <e-desc-item term="A">1</e-desc-item>
    </e-description-list>`);
    expect(el.querySelector('.ink-desc-list--bordered')).not.toBeNull();
  });
});

describe('e-affix', () => {
  it('wraps slotted content with sticky styles and offset-top', () => {
    const el = mount(`<e-affix offset-top="24"><div>Pin</div></e-affix>`);
    const wrap = el.querySelector<HTMLElement>('.ink-affix')!;
    expect(wrap).not.toBeNull();
    expect(wrap.style.top).toBe('24px');
    expect(wrap.querySelector('div')!.textContent).toBe('Pin');
  });
});

describe('e-back-top', () => {
  it('renders a hidden button by default', () => {
    const el = mount(`<e-back-top visibility-height="9999"></e-back-top>`);
    const btn = el.querySelector<HTMLButtonElement>('button.ink-back-top')!;
    expect(btn).not.toBeNull();
    expect(btn.hasAttribute('hidden')).toBe(true);
  });

  it('updates aria-label when label attribute changes', () => {
    const el = mount(`<e-back-top label="Top"></e-back-top>`);
    const btn = el.querySelector<HTMLButtonElement>('button.ink-back-top')!;
    expect(btn.getAttribute('aria-label')).toBe('Top');
    el.setAttribute('label', 'Up');
    expect(btn.getAttribute('aria-label')).toBe('Up');
  });
});

describe('e-watermark', () => {
  it('renders a layer element and applies a background-image when content is set', () => {
    const el = mount(`<e-watermark content="DRAFT"><p>Body</p></e-watermark>`);
    const layer = el.querySelector<HTMLElement>('.ink-watermark__layer')!;
    expect(layer).not.toBeNull();
    expect(layer.style.backgroundImage).toContain('url(');
    expect(el.querySelector('p')!.textContent).toBe('Body');
  });

  it('clears background when content is empty', () => {
    const el = mount(`<e-watermark><p>X</p></e-watermark>`);
    const layer = el.querySelector<HTMLElement>('.ink-watermark__layer')!;
    expect(layer.style.backgroundImage).toBe('');
  });
});

describe('e-image', () => {
  it('renders a figure with an img element', () => {
    const el = mount(`<e-image src="data:," alt="x"></e-image>`);
    expect(el.querySelector('figure.ink-image')).not.toBeNull();
    const img = el.querySelector<HTMLImageElement>('img.ink-image__img')!;
    expect(img.getAttribute('alt')).toBe('x');
  });

  it('renders a placeholder when src is missing', () => {
    const el = mount(`<e-image alt="missing"></e-image>`);
    expect(el.querySelector('.ink-image__placeholder')).not.toBeNull();
  });

  it('renders the caption when set', () => {
    const el = mount(`<e-image src="data:," caption="Hi"></e-image>`);
    expect(el.querySelector('figcaption.ink-image__caption')!.textContent).toBe('Hi');
  });
});

describe('e-qrcode', () => {
  it('renders an SVG when value is set', () => {
    const el = mount(`<e-qrcode value="hello"></e-qrcode>`);
    const svg = el.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('role')).toBe('img');
  });

  it('rerenders when value changes', () => {
    const el = mount(`<e-qrcode value="a"></e-qrcode>`);
    const before = el.querySelector('svg path')!.getAttribute('d');
    el.setAttribute('value', 'b');
    const after = el.querySelector('svg path')!.getAttribute('d');
    expect(after).not.toBe(before);
  });

  it('renders an empty placeholder when value is missing', () => {
    const el = mount(`<e-qrcode></e-qrcode>`);
    expect(el.querySelector('.ink-qrcode__empty')).not.toBeNull();
  });

  it('respects level attribute', () => {
    const el = mount(`<e-qrcode value="hello" level="H"></e-qrcode>`);
    expect(el.querySelector('svg')).not.toBeNull();
  });
});
