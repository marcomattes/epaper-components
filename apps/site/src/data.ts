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
