// The Display Lab.
//
// A customer-facing settings page for the panel the shop is being read on.
// Everything here changes how *this page* is drawn — nothing reaches the
// display controller, and the page says so rather than implying otherwise.

import { div, h, onDetail, setAttr, setText, t } from '../dom';
import { announce } from '../announce';
import {
  onStateChange,
  recordRefresh,
  setDisplaySetting,
  state,
  type Density,
  type DisplayMode,
  type TextSize,
} from '../state';
import type { Page } from '../page';

/**
 * Waveform families, as described in the shop's own bestseller on the subject.
 *
 * The numbers are the typical figures a controller quotes for a 1024 × 758
 * panel at room temperature; they are printed here as documentation, not
 * measured by this page.
 */
const WAVEFORMS = {
  partial: { name: 'DU · direct update', milliseconds: 90 },
  full: { name: 'GC16 · greyscale clear', milliseconds: 450 },
};

let applyMode: ((mode: DisplayMode) => void) | null = null;
let runPartial: (() => void) | null = null;
let runFull: (() => void) | null = null;

/** Switch the shop between the monochrome and Kaleido token sets. */
export function setDisplayMode(mode: DisplayMode): void {
  applyMode?.(mode);
}

/** Repaint one small region and report what a controller would have done. */
export function simulatePartialRefresh(): void {
  runPartial?.();
}

/** Repaint the whole preview, after confirmation. */
export function simulateFullRefresh(): void {
  runFull?.();
}

export function createDisplayLabPage(): Page {
  let repaints = 0;

  /* ---------------- mode and typography ---------------- */

  const modeToggle = h('e-segmented', { value: state.display.mode }, [
    h('e-segment', { value: 'mono', label: 'Monochrome' }),
    h('e-segment', { value: 'kaleido', label: 'Kaleido colour' }),
  ]);

  const textSizeGroup = h(
    'e-radio-group',
    { layout: 'horizontal', value: state.display.textSize },
    [
      h('e-radio', { value: 'small', label: 'Small' }),
      h('e-radio', { value: 'regular', label: 'Regular' }),
      h('e-radio', { value: 'large', label: 'Large' }),
    ],
  );

  const densityToggle = h('e-toggle', {
    label: 'Dense layout — tighter spacing, more on a screenful',
    checked: state.display.density === 'dense',
  });

  const watermarkToggle = h('e-toggle', {
    label: 'Watermark the preview',
    checked: state.display.watermark,
  });
  const watermarkInput = h('e-input', {
    label: 'Watermark text',
    value: state.display.watermarkText,
    maxlength: 40,
    hint: 'Printed diagonally behind the preview. Up to 40 characters.',
  });

  /* ---------------- preview ---------------- */

  const previewStamp = t('span', { class: 'shop-lab__stamp' }, '');
  const previewBody = div('shop-lab__receipt-body');
  const previewFrame = div('shop-lab__receipt', [
    t('span', { class: 'shop-lab__receipt-head' }, 'INKBOUND BOOKS · HAMBURG'),
    previewBody,
    previewStamp,
  ]);
  const watermark = h('e-watermark', { content: '', 'font-size': 15, 'gap-x': 190, 'gap-y': 110 }, [
    previewFrame,
  ]);

  const contrastSample = (title: string): HTMLElement =>
    h('e-card', { eyebrow: title, title: 'Quiet Buildings' }, [
      t('e-text', { kind: 'small', as: 'p' }, 'Hana Yoshimura · Paper Lantern · €40,00'),
      h('e-meter', { label: 'Rating', value: 4.5, min: 0, max: 5, segments: 10, unit: ' / 5' }),
      h('e-space', { size: 8, wrap: true }, [
        t('e-badge', {}, 'Hardcover'),
        t('e-badge', { inverted: true }, 'In stock'),
        t('e-tag', {}, 'acoustics'),
      ]),
      t('e-button', { variant: 'primary' }, 'Add to basket'),
    ]);

  const contrastSplit = h(
    'e-splitter',
    { orientation: 'horizontal', initial: 50, min: 25, max: 75 },
    [
      h('div', { class: 'shop-lab__pane', slot: 'a' }, [contrastSample('Default tokens')]),
      // The theme pack is scoped by class exactly as THEMING.md documents, so
      // only this pane changes token values.
      h('div', { class: 'shop-lab__pane ink-theme--mono-high-contrast', slot: 'b' }, [
        contrastSample('High contrast'),
      ]),
    ],
  );

  /* ---------------- refresh diagnostics ---------------- */

  const partialButton = t('e-button', { variant: 'primary' }, 'Simulate a partial refresh');
  const fullButton = t('e-button', { variant: 'destructive' }, 'Simulate a full refresh');
  const fullDialog = h(
    'e-dialog',
    { heading: 'Run a full refresh?', size: 'small', static: true },
    [
      t(
        'e-text',
        { kind: 'prose', as: 'p' },
        'A full refresh clears the whole panel before redrawing it. On real hardware that is a ' +
          'visible black-and-white flash of roughly half a second. It is the only way to clear ' +
          'accumulated ghosting, and it is why nothing in this shop triggers one on its own.',
      ),
      t('e-button', { slot: 'footer', 'data-close': '' }, 'Cancel'),
      t(
        'e-button',
        { slot: 'footer', variant: 'destructive', id: 'full-refresh-confirm' },
        'Run it',
      ),
    ],
  );
  const fullConfirm = fullDialog.querySelector<HTMLElement>('#full-refresh-confirm')!;

  const dirtyArea = h('e-progress', {
    value: 0,
    max: 100,
    label: 'Dirty area of the panel',
  });
  const refreshBoard = h('e-status-board', {
    label: 'Last simulated refresh',
    columns: 4,
    data: '[]',
    'empty-text': 'Nothing simulated yet',
  });
  const waveformDiff = h('e-diff', {
    label: 'Waveform',
    'before-label': 'Previous',
    'after-label': 'Last used',
    before: '—',
    after: '—',
  });

  /* ---------------- page ---------------- */

  const el = div('shop-page shop-page--lab', [
    h('header', { class: 'shop-masthead' }, [
      t('e-title', { level: 1 }, 'Display Lab'),
      t(
        'e-text',
        { kind: 'prose', as: 'p', class: 'shop-lede' },
        'Set up the shop for the panel in front of you. Every choice here is remembered in this ' +
          'browser and applies to every page.',
      ),
    ]),
    h('e-alert', { variant: 'warning', heading: 'What this page cannot do' }, [
      'This is a web page. It cannot select a waveform, change the refresh mode or talk to a ' +
        'display controller — those live in the device firmware, below anything a browser can ' +
        'reach. What the buttons below do is repaint a region of this page and report what a ' +
        'controller would typically have done for a repaint that size. The figures are ' +
        'documentation, not measurements.',
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Panel mode'),
      h('e-form-item', { label: 'Colour mode' }, [modeToggle]),
      t(
        'e-text',
        { kind: 'small', as: 'p' },
        'Monochrome is the default and the only mode every panel can render. Kaleido adds the ' +
          'five-colour filter array as a secondary cue — status still reads without it, because ' +
          'every state in this shop also carries an icon, a border weight or a word.',
      ),
      t('e-text', { kind: 'label', class: 'shop-eyebrow' }, 'Kaleido palette diagnostic'),
      t(
        'e-text',
        { kind: 'small', as: 'p' },
        'Left half of each swatch: the ideal colour. Right half: the same colour Bayer-dithered ' +
          'the way a Kaleido filter array actually renders it.',
      ),
      h('e-kaleido', { cell: 3 }),
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Contrast preview'),
      t(
        'e-text',
        { kind: 'small', as: 'p' },
        'Drag the divider, or focus it and use the arrow keys, to compare the default token set ' +
          'with the high-contrast pack. The high-contrast side thickens borders, focus rings and ' +
          'control heights without adding a single colour.',
      ),
      contrastSplit,
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Type and spacing'),
      h('e-grid', { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }, [
        h('e-card', { eyebrow: 'Reading', title: 'Text size' }, [
          h('fieldset', { class: 'shop-fieldset' }, [
            t('legend', { class: 'shop-fieldset__legend' }, 'Text size'),
            textSizeGroup,
          ]),
          t(
            'e-text',
            { kind: 'small', as: 'p' },
            'Scales body copy, headings and control text together, so the layout keeps its ' +
              'proportions instead of reflowing into a different design.',
          ),
        ]),
        h('e-card', { eyebrow: 'Layout', title: 'Density' }, [
          densityToggle,
          t(
            'e-text',
            { kind: 'small', as: 'p' },
            'Dense trims the spacing scale by a quarter. On a 1024 × 758 panel that is about two ' +
              'extra rows of the catalogue per screenful.',
          ),
        ]),
      ]),
    ]),
    h('e-divider', {}),
    h('section', { class: 'shop-section' }, [
      t('e-title', { level: 2 }, 'Refresh simulation'),
      h('e-grid', { cols: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18 }, [
        h('e-card', { eyebrow: 'Preview', title: 'Repaint target' }, [
          watermarkToggle,
          watermarkInput,
          watermark,
        ]),
        h('e-card', { eyebrow: 'Controller', title: 'What a panel would do' }, [
          h('e-space', { size: 12, wrap: true }, [partialButton, fullButton]),
          dirtyArea,
          refreshBoard,
          waveformDiff,
        ]),
      ]),
    ]),
    fullDialog,
  ]);

  /* ---------------- behaviour ---------------- */

  function renderPreview(lines: readonly string[]): void {
    previewBody.replaceChildren(
      ...lines.map((line) => t('span', { class: 'shop-lab__receipt-line' }, line)),
    );
  }

  const RECEIPT_LINES = [
    '1 × One Bit at a Time .......... 42,00',
    '1 × Legible .................... 23,00',
    '2 × The Owl Who Forgot ......... 32,00',
    'Delivery ....................... free',
    'TOTAL .......................... 97,00',
  ];

  function stamp(): string {
    return `Repaint #${repaints} · ${new Date().toLocaleTimeString('en-GB')}`;
  }

  function report(kind: 'partial' | 'full', dirtyPercent: number): void {
    const waveform = WAVEFORMS[kind];
    const previous = state.lastRefresh?.waveform ?? '—';
    recordRefresh({
      kind,
      waveform: waveform.name,
      milliseconds: waveform.milliseconds,
      dirtyPercent,
      at: new Date().toISOString(),
    });
    setAttr(waveformDiff, 'before', previous);
    setAttr(waveformDiff, 'after', waveform.name);
  }

  function renderReport(): void {
    const last = state.lastRefresh;
    if (!last) {
      setAttr(refreshBoard, 'data', '[]');
      setAttr(dirtyArea, 'value', '0');
      return;
    }
    setAttr(dirtyArea, 'value', String(last.dirtyPercent));
    setAttr(
      refreshBoard,
      'data',
      JSON.stringify([
        {
          key: 'kind',
          label: 'Refresh',
          value: last.kind === 'partial' ? 'Partial' : 'Full',
          status: last.kind === 'partial' ? 'ok' : 'warning',
        },
        { key: 'waveform', label: 'Waveform', value: last.waveform, status: 'neutral' },
        {
          key: 'time',
          label: 'Typical time',
          value: `${last.milliseconds} ms`,
          status: last.milliseconds > 200 ? 'warning' : 'ok',
        },
        {
          key: 'area',
          label: 'Dirty area',
          value: `${last.dirtyPercent} %`,
          status: last.dirtyPercent > 50 ? 'warning' : 'ok',
          detail: last.kind === 'partial' ? 'One line changed' : 'Whole preview redrawn',
        },
      ]),
    );
  }

  function partial(): void {
    repaints += 1;
    // One line changes. That is the whole point of a partial refresh: the
    // controller only has to resolve the rectangle that differs.
    setText(previewStamp, stamp());
    report('partial', 4);
    renderReport();
    announce(
      `Partial refresh: one line repainted, ${WAVEFORMS.partial.name}, about ` +
        `${WAVEFORMS.partial.milliseconds} milliseconds on a real panel.`,
    );
  }

  function full(): void {
    repaints += 1;
    renderPreview(RECEIPT_LINES);
    setText(previewStamp, stamp());
    report('full', 100);
    renderReport();
    announce(
      `Full refresh: the whole preview redrawn, ${WAVEFORMS.full.name}, about ` +
        `${WAVEFORMS.full.milliseconds} milliseconds and a visible flash on real hardware.`,
    );
  }

  applyMode = (mode: DisplayMode) => {
    setDisplaySetting('mode', mode);
    setAttr(modeToggle, 'value', mode);
    announce(mode === 'kaleido' ? 'Kaleido colour mode.' : 'Monochrome mode.');
  };
  runPartial = partial;
  runFull = full;

  onDetail<{ value: string }>(modeToggle, 'e-change', ({ value }) => {
    setDisplayMode(value as DisplayMode);
  });

  onDetail<{ value: string }>(textSizeGroup, 'e-change', ({ value }) => {
    setDisplaySetting('textSize', value as TextSize);
    announce(`Text size: ${value}.`);
  });

  onDetail<{ checked: boolean }>(densityToggle, 'e-change', ({ checked }) => {
    setDisplaySetting('density', (checked ? 'dense' : 'comfortable') as Density);
    announce(checked ? 'Dense layout.' : 'Comfortable layout.');
  });

  onDetail<{ checked: boolean }>(watermarkToggle, 'e-change', ({ checked }) => {
    setDisplaySetting('watermark', checked);
    announce(checked ? 'Watermark on.' : 'Watermark off.');
  });

  onDetail<{ value: string }>(watermarkInput, 'e-input', ({ value }) => {
    setDisplaySetting('watermarkText', value || 'INKBOUND DEMO');
  });

  partialButton.addEventListener('e-click', partial);
  fullButton.addEventListener('e-click', () => fullDialog.setAttribute('open', ''));
  fullConfirm.addEventListener('e-click', () => {
    fullDialog.removeAttribute('open');
    full();
    fullButton.focus();
  });

  function syncFromState(): void {
    setAttr(modeToggle, 'value', state.display.mode);
    setAttr(textSizeGroup, 'value', state.display.textSize);
    setAttr(densityToggle, 'checked', state.display.density === 'dense' ? '' : null);
    setAttr(watermarkToggle, 'checked', state.display.watermark ? '' : null);
    setAttr(watermark, 'content', state.display.watermark ? state.display.watermarkText : '');
    renderReport();
  }

  onStateChange(syncFromState);

  renderPreview(RECEIPT_LINES);
  setText(previewStamp, 'Not repainted yet');
  syncFromState();

  return {
    el,
    sider: null,
    enter() {
      syncFromState();
      return {
        title: 'Display Lab',
        trail: [{ label: 'Shop', href: '#/' }, { label: 'Display Lab' }],
      };
    },
  };
}
