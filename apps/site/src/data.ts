// Static data for the EPaper marketing site.
// Lives outside the npm package — keep it dependency-free.

import type { CalendarEvent } from '../../../packages/epaper-components/src/index';

export type ComponentCategory =
  | 'primitives'
  | 'typography'
  | 'display'
  | 'inputs'
  | 'layout'
  | 'navigation'
  | 'feedback'
  | 'composite';

export interface ComponentEntry {
  name: string;
  tag: string;
  category: ComponentCategory;
}

export const CATEGORIES: Array<{ value: ComponentCategory | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'primitives', label: 'Primitives' },
  { value: 'typography', label: 'Typography' },
  { value: 'display', label: 'Display' },
  { value: 'inputs', label: 'Inputs' },
  { value: 'layout', label: 'Layout' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'composite', label: 'Composite' },
];

/**
 * Base URL of the deployed Storybook — the target of every component tile
 * link on Page 3. Set `VITE_STORYBOOK_BASE` at build time to retarget it;
 * the fallback is the local Storybook dev server.
 *
 * Local dev:   http://localhost:6006 (default)
 * Production:  https://epaper-components.dev/storybook
 */
// Optional chaining because this module is also imported by
// vite.site.config.ts (Node, no import.meta.env) to read COMPONENTS.length.
export const STORYBOOK_BASE = import.meta.env?.['VITE_STORYBOOK_BASE'] ?? 'http://localhost:6006';

/**
 * Build a Storybook docs deep-link for a component entry.
 * Mirrors Storybook's slug rule: lowercase, slashes → hyphens.
 */
export function storybookUrl(entry: ComponentEntry): string {
  const slug = `${entry.category}-${entry.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return `${STORYBOOK_BASE}/?path=/docs/${slug}--docs`;
}

export const COMPONENTS: ComponentEntry[] = [
  // Primitives
  { name: 'Button', tag: 'e-button', category: 'primitives' },
  { name: 'Icon', tag: 'e-icon', category: 'primitives' },
  { name: 'Badge', tag: 'e-badge', category: 'primitives' },
  { name: 'BadgeCount', tag: 'e-badge-count', category: 'primitives' },
  { name: 'Ribbon', tag: 'e-ribbon', category: 'primitives' },
  // Typography
  { name: 'Title', tag: 'e-title', category: 'typography' },
  { name: 'Text', tag: 'e-text', category: 'typography' },
  { name: 'Link', tag: 'e-link', category: 'typography' },
  // Display
  { name: 'Card', tag: 'e-card', category: 'display' },
  { name: 'Collapse', tag: 'e-collapse', category: 'display' },
  { name: 'CardImage', tag: 'e-card-image', category: 'display' },
  { name: 'Avatar', tag: 'e-avatar', category: 'display' },
  { name: 'Calendar', tag: 'e-calendar', category: 'display' },
  { name: 'DescriptionList', tag: 'e-description-list', category: 'display' },
  { name: 'Empty', tag: 'e-empty', category: 'display' },
  { name: 'Image', tag: 'e-image', category: 'display' },
  { name: 'Kaleido', tag: 'e-kaleido', category: 'display' },
  { name: 'List', tag: 'e-list', category: 'display' },
  { name: 'Progress', tag: 'e-progress', category: 'display' },
  { name: 'Meter', tag: 'e-meter', category: 'display' },
  { name: 'Sparkline', tag: 'e-sparkline', category: 'display' },
  { name: 'QRCode', tag: 'e-qrcode', category: 'display' },
  { name: 'Result', tag: 'e-result', category: 'display' },
  { name: 'Segmented', tag: 'e-segmented', category: 'display' },
  { name: 'Skeleton', tag: 'e-skeleton', category: 'display' },
  { name: 'Statistic', tag: 'e-statistic', category: 'display' },
  { name: 'StatusBoard', tag: 'e-status-board', category: 'display' },
  { name: 'ChangeMarker', tag: 'e-change-marker', category: 'display' },
  { name: 'LastUpdated', tag: 'e-last-updated', category: 'display' },
  { name: 'Diff', tag: 'e-diff', category: 'display' },
  { name: 'Table', tag: 'e-table', category: 'display' },
  { name: 'Tag', tag: 'e-tag', category: 'display' },
  { name: 'Timeline', tag: 'e-timeline', category: 'display' },
  { name: 'Popover', tag: 'e-popover', category: 'display' },
  { name: 'Tree', tag: 'e-tree', category: 'display' },
  // Inputs
  { name: 'Input', tag: 'e-input', category: 'inputs' },
  { name: 'InputNumber', tag: 'e-input-number', category: 'inputs' },
  { name: 'Textarea', tag: 'e-textarea', category: 'inputs' },
  { name: 'Checkbox', tag: 'e-checkbox', category: 'inputs' },
  { name: 'CheckboxGroup', tag: 'e-checkbox-group', category: 'inputs' },
  { name: 'RadioGroup', tag: 'e-radio-group', category: 'inputs' },
  { name: 'Select', tag: 'e-select', category: 'inputs' },
  { name: 'Cascader', tag: 'e-cascader', category: 'inputs' },
  { name: 'TreeSelect', tag: 'e-tree-select', category: 'inputs' },
  { name: 'DatePicker', tag: 'e-date-picker', category: 'inputs' },
  { name: 'TimePicker', tag: 'e-time-picker', category: 'inputs' },
  { name: 'Toggle', tag: 'e-toggle', category: 'inputs' },
  { name: 'Chip', tag: 'e-chip', category: 'inputs' },
  // Layout
  { name: 'Layout', tag: 'e-layout', category: 'layout' },
  { name: 'Flex', tag: 'e-flex', category: 'layout' },
  { name: 'Grid', tag: 'e-grid', category: 'layout' },
  { name: 'Space', tag: 'e-space', category: 'layout' },
  { name: 'Divider', tag: 'e-divider', category: 'layout' },
  { name: 'Splitter', tag: 'e-splitter', category: 'layout' },
  { name: 'Masonry', tag: 'e-masonry', category: 'layout' },
  { name: 'Affix', tag: 'e-affix', category: 'layout' },
  { name: 'Watermark', tag: 'e-watermark', category: 'layout' },
  // Navigation
  { name: 'Anchor', tag: 'e-anchor', category: 'navigation' },
  { name: 'BackTop', tag: 'e-back-top', category: 'navigation' },
  { name: 'Breadcrumb', tag: 'e-breadcrumb', category: 'navigation' },
  { name: 'Dropdown', tag: 'e-dropdown', category: 'navigation' },
  { name: 'Menu', tag: 'e-menu', category: 'navigation' },
  { name: 'Pagination', tag: 'e-pagination', category: 'navigation' },
  { name: 'Steps', tag: 'e-steps', category: 'navigation' },
  { name: 'Tabs', tag: 'e-tabs', category: 'navigation' },
  // Feedback
  { name: 'Dialog', tag: 'e-dialog', category: 'feedback' },
  { name: 'Alert', tag: 'e-alert', category: 'feedback' },
  { name: 'Popconfirm', tag: 'e-popconfirm', category: 'feedback' },
  // Composite
  { name: 'Form', tag: 'e-form', category: 'composite' },
  { name: 'FloatButton', tag: 'e-float-button', category: 'composite' },
  { name: 'Upload', tag: 'e-upload', category: 'composite' },
];

export interface FeatureCard {
  icon: string;
  title: string;
  body: string;
}

export const FEATURES: FeatureCard[] = [
  {
    icon: 'doc',
    title: 'E-Paper First',
    body: 'Surgical DOM patches keep dirty rectangles small so the EPDC chooses fast partial-refresh waveforms instead of GC16 flashes.',
  },
  {
    icon: 'cog',
    title: 'Vanilla Custom Elements',
    body: 'No framework, no Shadow DOM, no virtual DOM. Each component extends HTMLElement directly — load only what you use.',
  },
  {
    icon: 'check',
    title: 'Form-Associated',
    body: 'Inputs, selects and pickers participate in <form> submission, FormData and ElementInternals validity out of the box.',
  },
  {
    icon: 'eye',
    title: 'A11y by Default',
    body: 'ARIA roles, keyboard navigation and visible focus rings are part of every component. Zero :hover-only affordances.',
  },
  {
    icon: 'sun',
    title: 'Theming via Tokens',
    body: 'A single CSS-custom-property layer drives colors, spacing and typography. Theme without touching JavaScript.',
  },
  {
    icon: 'lock',
    title: 'Zero Hover, Zero Anim',
    body: 'Designed for ink-on-paper. No transitions, no animations, no hover states — every state change is observable and deterministic.',
  },
];

export interface RoadmapItem {
  time: string;
  title: string;
  body: string;
}

/** Lede above the roadmap. Real prose, because AI crawlers quote prose. */
export const ROADMAP_INTRO =
  'EPaper follows an outcome-based roadmap. The next release strengthens native form behaviour, ships panel-specific themes, makes refresh cost measurable in CI and adds stable data-display primitives for e-paper dashboards.';

export const ROADMAP: RoadmapItem[] = [
  {
    time: 'V1.0',
    title: 'Public release',
    // Count is interpolated: it was hard-coded at 43 and had drifted.
    body: `Initial ${COMPONENTS.length}-component public API, custom-elements manifest shipping IDE autocomplete, MIT license.`,
  },
  {
    time: 'V1.1',
    title: 'Reliability & data display',
    body: 'Unified native constraint validation, panel theme packs, automated refresh-budget checks and six persistent dashboard components.',
  },
  {
    time: 'Later',
    title: 'Hardware integrations',
    body: 'Driver adapters and SSR helpers will follow real deployment demand instead of being committed to a version prematurely.',
  },
];

export const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'author', title: 'Author', sortable: true },
  { key: 'pages', title: 'Pages', sortable: true, align: 'right' as const },
  { key: 'year', title: 'Year', sortable: true, align: 'right' as const },
];

export const TABLE_ROWS: Array<Record<string, string | number>> = [
  {
    title: 'The Pragmatic Programmer',
    author: 'Hunt & Thomas',
    pages: 352,
    year: 1999,
  },
  { title: 'Domain-Driven Design', author: 'Eric Evans', pages: 560, year: 2003 },
  { title: 'Refactoring', author: 'Martin Fowler', pages: 448, year: 1999 },
  { title: 'Design Patterns', author: 'Gang of Four', pages: 395, year: 1994 },
  { title: 'Clean Code', author: 'Robert C. Martin', pages: 464, year: 2008 },
  {
    title: 'Working Effectively with Legacy Code',
    author: 'Michael Feathers',
    pages: 456,
    year: 2004,
  },
  { title: 'Code Complete', author: 'Steve McConnell', pages: 960, year: 2004 },
  {
    title: 'The Mythical Man-Month',
    author: 'Frederick Brooks',
    pages: 322,
    year: 1975,
  },
];

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { date: '2026-04-29', title: 'Panel field test' },
  { date: '2026-05-12', title: 'Accessibility review' },
  { date: '2026-05-22', title: 'Office hours' },
  { date: '2026-04-30', title: 'Design review' },
];

/* --------------------------------------------------------------------- *
 * Showcase — office-climate dashboard
 * --------------------------------------------------------------------- */

export interface DashSensor {
  key: string;
  label: string;
  value: string;
  status: 'ok' | 'warning' | 'critical' | 'offline' | 'neutral';
  detail?: string;
}

export interface DashReading {
  /** ISO timestamp of the reading — drives `<e-last-updated>`. */
  at: string;
  temperature: number;
  temperatureDelta: number;
  temperatureTrend: 'up' | 'down' | 'flat';
  co2: number;
  humidity: number;
  battery: number;
  /** CO₂ series for the sparkline, oldest first. */
  co2Series: number[];
  sensors: DashSensor[];
}

/**
 * The "Simulate reading" button cycles through these. Three fixed frames
 * rather than random numbers, so every visitor sees the same story: morning
 * calm, a full meeting room, then the ventilation catching up.
 */
export const DASH_READINGS: DashReading[] = [
  {
    at: '2026-08-28T06:55:00Z',
    temperature: 21.4,
    temperatureDelta: 0.6,
    temperatureTrend: 'up',
    co2: 618,
    humidity: 44,
    battery: 72,
    co2Series: [430, 465, 510, 575, 640, 660, 605, 590, 618],
    sensors: [
      { key: 'lobby', label: 'Lobby', value: 'OK', status: 'ok', detail: '21.4 °C' },
      {
        key: 'meeting',
        label: 'Meeting room',
        value: '780 ppm',
        status: 'warning',
        detail: 'Ventilate soon',
      },
      { key: 'server', label: 'Server room', value: 'OK', status: 'ok', detail: '19.8 °C' },
      {
        key: 'roof',
        label: 'Roof node',
        value: 'Offline',
        status: 'offline',
        detail: 'Last seen 06:12',
      },
    ],
  },
  {
    at: '2026-08-28T07:10:00Z',
    temperature: 22.1,
    temperatureDelta: 0.7,
    temperatureTrend: 'up',
    co2: 905,
    humidity: 47,
    battery: 71,
    co2Series: [465, 510, 575, 640, 660, 605, 590, 618, 905],
    sensors: [
      { key: 'lobby', label: 'Lobby', value: 'OK', status: 'ok', detail: '22.1 °C' },
      {
        key: 'meeting',
        label: 'Meeting room',
        value: '1180 ppm',
        status: 'critical',
        detail: 'Open a window',
      },
      { key: 'server', label: 'Server room', value: 'OK', status: 'ok', detail: '19.9 °C' },
      {
        key: 'roof',
        label: 'Roof node',
        value: 'Offline',
        status: 'offline',
        detail: 'Last seen 06:12',
      },
    ],
  },
  {
    at: '2026-08-28T07:25:00Z',
    temperature: 21.8,
    temperatureDelta: 0.3,
    temperatureTrend: 'down',
    co2: 640,
    humidity: 45,
    battery: 71,
    co2Series: [510, 575, 640, 660, 605, 590, 618, 905, 640],
    sensors: [
      { key: 'lobby', label: 'Lobby', value: 'OK', status: 'ok', detail: '21.8 °C' },
      {
        key: 'meeting',
        label: 'Meeting room',
        value: '690 ppm',
        status: 'ok',
        detail: 'Back in range',
      },
      { key: 'server', label: 'Server room', value: 'OK', status: 'ok', detail: '19.9 °C' },
      { key: 'roof', label: 'Roof node', value: 'OK', status: 'ok', detail: 'Reconnected 07:18' },
    ],
  },
];

/* --------------------------------------------------------------------- *
 * Showcase — electronic shelf label
 * --------------------------------------------------------------------- */

export interface ShelfProduct {
  /** Segment value in the product picker. */
  id: string;
  name: string;
  /** Pack size line under the name. */
  detail: string;
  /** Current price in euros. */
  price: number;
  /** Previous price — the change marker turns a price drop into a cue. */
  prevPrice: number;
  /** Reference price line, e.g. "€ 12.90 / kg". */
  perUnit: string;
  /** Exactly two label tags, patched in place on product switch. */
  tags: [string, string];
  sku: string;
  /** Encoded in the QR code. */
  url: string;
}

export const SHELF_PRODUCTS: ShelfProduct[] = [
  {
    id: 'espresso',
    name: 'Espresso Beans',
    detail: 'Whole beans · 1 kg',
    price: 12.9,
    prevPrice: 14.5,
    perUnit: '€ 12.90 / kg',
    tags: ['Arabica', 'Fair trade'],
    sku: 'EP-1041',
    url: 'https://epaper-components.dev/showcase/?sku=EP-1041',
  },
  {
    id: 'oat-milk',
    name: 'Oat Milk Barista',
    detail: 'UHT · 1 L',
    price: 2.19,
    prevPrice: 1.99,
    perUnit: '€ 2.19 / L',
    tags: ['Vegan', 'Organic'],
    sku: 'EP-2087',
    url: 'https://epaper-components.dev/showcase/?sku=EP-2087',
  },
  {
    id: 'chocolate',
    name: 'Dark Chocolate 85%',
    detail: 'Bar · 100 g',
    price: 2.49,
    prevPrice: 2.49,
    perUnit: '€ 24.90 / kg',
    tags: ['Single origin', 'Bio'],
    sku: 'EP-3123',
    url: 'https://epaper-components.dev/showcase/?sku=EP-3123',
  },
];

/* --------------------------------------------------------------------- *
 * Showcase — meeting-room door sign
 * --------------------------------------------------------------------- */

export interface RoomAgendaEntry {
  time: string;
  title: string;
  detail: string;
}

/** The day's agenda — rendered once; only the item variants get patched. */
export const ROOM_AGENDA: RoomAgendaEntry[] = [
  { time: '09:00', title: 'Stand-up', detail: 'Core team · 15 min' },
  { time: '11:00', title: 'Design review', detail: 'EPaper V1.3 tokens' },
  { time: '13:00', title: 'Customer call', detail: 'Kaleido rollout' },
  { time: '16:00', title: 'Retro', detail: 'Sprint 42' },
];

export interface RoomSlot {
  /** Segment value: the simulated wall-clock time. */
  id: string;
  status: 'free' | 'occupied';
  /** Second line under the room name. */
  sub: string;
  /** Timeline marker variant per agenda entry, same order as ROOM_AGENDA. */
  agenda: Array<'done' | 'default' | 'pending'>;
}

export const ROOM_SLOTS: RoomSlot[] = [
  {
    id: '08:30',
    status: 'free',
    sub: 'Next: Stand-up at 09:00',
    agenda: ['pending', 'pending', 'pending', 'pending'],
  },
  {
    id: '09:05',
    status: 'occupied',
    sub: 'Stand-up · until 09:15',
    agenda: ['default', 'pending', 'pending', 'pending'],
  },
  {
    id: '12:00',
    status: 'free',
    sub: 'Next: Customer call at 13:00',
    agenda: ['done', 'done', 'pending', 'pending'],
  },
  {
    id: '16:10',
    status: 'occupied',
    sub: 'Retro · until 17:00',
    agenda: ['done', 'done', 'done', 'default'],
  },
];

/* --------------------------------------------------------------------- *
 * Showcase — parcel tracking
 * --------------------------------------------------------------------- */

/** The four steps of the shipment, rendered once into `<e-steps>`. */
export const TRACKING_STEPS: Array<{ title: string; desc: string }> = [
  { title: 'Ordered', desc: '28 Aug, 09:12' },
  { title: 'Packed', desc: 'Fulfillment Leipzig' },
  { title: 'In transit', desc: 'DHL · 00340 4344 71' },
  { title: 'Delivered', desc: 'Against signature' },
];

export interface TrackingStage {
  /** 0-based index into TRACKING_STEPS — the `current` of `<e-steps>`. */
  step: number;
  location: string;
  /** Estimated delivery date; `etaPrev` drives the change cue when it moves. */
  eta: string;
  etaPrev?: string;
  /** Route progress 0..100. */
  progress: number;
  delivered?: boolean;
}

/** "Advance shipment" cycles through these frames. */
export const TRACKING_STAGES: TrackingStage[] = [
  { step: 0, location: 'Web shop checkout', eta: '3 Sep', progress: 5 },
  { step: 1, location: 'Fulfillment center Leipzig', eta: '3 Sep', progress: 25 },
  { step: 2, location: 'Parcel hub Hannover', eta: '2 Sep', etaPrev: '3 Sep', progress: 70 },
  {
    step: 3,
    location: 'Delivered · front desk',
    eta: '2 Sep',
    etaPrev: '3 Sep',
    progress: 100,
    delivered: true,
  },
];

/* --------------------------------------------------------------------- *
 * Showcase — e-reader page
 * --------------------------------------------------------------------- */

export interface ReaderPage {
  chapter: string;
  /** Public-domain excerpt (Lewis Carroll, Alice's Adventures in Wonderland, 1865). */
  text: string;
}

export const READER_PAGES: ReaderPage[] = [
  {
    chapter: 'Chapter I · Down the Rabbit-Hole',
    text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice, “without pictures or conversations?”',
  },
  {
    chapter: 'Chapter I · Down the Rabbit-Hole',
    text: 'Down, down, down. Would the fall never come to an end? “I wonder how many miles I’ve fallen by this time?” she said aloud. “I must be getting somewhere near the centre of the earth.”',
  },
  {
    chapter: 'Chapter II · The Pool of Tears',
    text: '“Curiouser and curiouser!” cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); “now I’m opening out like the largest telescope that ever was! Good-bye, feet!”',
  },
  {
    chapter: 'Chapter VI · Pig and Pepper',
    text: '“But I don’t want to go among mad people,” Alice remarked. “Oh, you can’t help that,” said the Cat: “we’re all mad here. I’m mad. You’re mad.” “How do you know I’m mad?” said Alice. “You must be,” said the Cat, “or you wouldn’t have come here.”',
  },
  {
    chapter: 'Chapter XII · Alice’s Evidence',
    text: '“Sentence first — verdict afterwards,” said the Queen. “Stuff and nonsense!” said Alice loudly. “The idea of having the sentence first!” At this the whole pack rose up into the air, and came flying down upon her.',
  },
];

export const INSTALL_SNIPPETS = {
  npm: 'npm install @marcomattes/epaper-components',
  pnpm: 'pnpm add @marcomattes/epaper-components',
  yarn: 'yarn add @marcomattes/epaper-components',
};

export const IMPORT_SNIPPET = `// Side-effect import registers all custom elements.
import '@marcomattes/epaper-components';
import '@marcomattes/epaper-components/styles/tokens.css';
import '@marcomattes/epaper-components/styles/base.css';
import '@marcomattes/epaper-components/styles/components.css';`;

export const USE_SNIPPET = `<div class="ink-page">
  <e-title level="1">Hello, e-paper.</e-title>
  <e-button variant="primary">Get started</e-button>
</div>`;
