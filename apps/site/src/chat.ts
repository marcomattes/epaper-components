// Scripted AI chat for the showcase page.
//
// Shared between content.ts (build time — the opening transcript ships in the
// prerendered HTML) and main.ts (runtime — replies to typed or suggested
// questions). Everything is canned: no network request, no model, no state
// beyond the transcript itself. The only untrusted input is the visitor's
// typed question, and it goes through esc() before it touches the DOM.
//
// This module is imported by the browser bundle *and* by vite.site.config.ts
// in Node, so it must stay free of browser-only APIs at module scope.
import { esc } from '../../../packages/epaper-components/src/core/dom';

export type ChatRole = 'user' | 'assistant';

export interface ChatReply {
  /** Stable id, referenced by the suggestion chips via `data-chat-ask`. */
  key: string;
  /** Canonical question — the chip label, and what the transcript shows. */
  question: string;
  /** Lowercase substrings matched against a typed question. */
  keywords: string[];
  /** Trusted assistant HTML. Never contains visitor input. */
  html: string;
}

/* --------------------------------------------------------------------- *
 * Canned rich replies
 * --------------------------------------------------------------------- */

const PANEL_COLUMNS = [
  { key: 'panel', title: 'Panel', sortable: true },
  { key: 'colors', title: 'Colors', sortable: true },
  { key: 'refresh', title: 'Refresh', sortable: true, align: 'right' as const },
  { key: 'fit', title: 'Best for' },
];

const PANEL_ROWS = [
  { panel: 'Carta 1200', colors: '16 gray', refresh: '~450 ms', fit: 'Readers, signage' },
  { panel: 'Kaleido 3', colors: '4096', refresh: '~500 ms', fit: 'Dashboards, comics' },
  { panel: 'Spectra 6', colors: '6', refresh: '~10 s', fit: 'Shelf labels' },
];

const CODE_SAMPLE = `import '@marcomattes/epaper-components';

<e-card title="Hello, ink">
  <e-statistic label="CO2" value="618" suffix=" ppm"></e-statistic>
  <e-button variant="primary">Refresh</e-button>
</e-card>`;

export const CHAT_REPLIES: ChatReply[] = [
  {
    key: 'stats',
    question: 'Show refresh stats',
    keywords: ['stat', 'refresh', 'waveform', 'metric', 'performance'],
    html: `<p class="site-chat__p">Here is this panel's refresh telemetry. Nearly every update
        ran as a fast partial refresh — that is the point of surgical DOM patching.</p>
      <div class="site-chat__stats">
        <e-statistic label="Partial refreshes" value="1284" trend="up" delta="96"></e-statistic>
        <e-statistic label="Full flashes" value="3" trend="down" delta="2"></e-statistic>
        <e-statistic label="Avg dirty area" value="4.2" suffix=" %" precision="1" trend="down" delta="0.8"></e-statistic>
      </div>
      <e-sparkline label="Dirty rectangles per update" values="[9,7,8,5,6,4,5,3,4,3]"></e-sparkline>`,
  },
  {
    key: 'panels',
    question: 'Compare e-paper panels',
    keywords: ['panel', 'compare', 'display', 'table', 'carta', 'kaleido', 'spectra'],
    html: `<p class="site-chat__p">The three panel families you are most likely to target.
        The table below is a live <code>&lt;e-table&gt;</code> — try sorting it.</p>
      <e-table columns="${esc(JSON.stringify(PANEL_COLUMNS))}" data="${esc(
        JSON.stringify(PANEL_ROWS),
      )}"></e-table>`,
  },
  {
    key: 'battery',
    question: 'How is the battery?',
    keywords: ['battery', 'power', 'energy', 'charge'],
    html: `<p class="site-chat__p">Holding steady. Partial refreshes are what keep this number
        flat — a full GC16 flash costs roughly ten times the energy.</p>
      <e-meter label="Panel battery" value="72" low="20" high="90" unit="%"></e-meter>
      <p class="site-chat__p">At the current refresh budget that is about six weeks
        of wall time.</p>`,
  },
  {
    key: 'code',
    question: 'Show me some code',
    keywords: ['code', 'snippet', 'example', 'install', 'import', 'use'],
    html: `<p class="site-chat__p">A complete page needs one import and plain HTML —
        no framework, no build plugin:</p>
      <pre class="site-code">${esc(CODE_SAMPLE)}</pre>
      <div class="site-chat__tags"><e-tag>vanilla</e-tag><e-tag>no Shadow DOM</e-tag><e-tag>40 KB</e-tag></div>`,
  },
];

/** Chips offering the scripted questions. Rendered at build time and again in the fallback reply. */
export function chatSuggestionsHtml(): string {
  return CHAT_REPLIES.map(
    (r) => `<e-chip data-chat-ask="${esc(r.key)}">${esc(r.question)}</e-chip>`,
  ).join('');
}

/** Reply for a typed question nothing in the script matches. */
export function chatFallbackHtml(): string {
  return `<p class="site-chat__p">Good question — but I am a scripted demo, not a model.
        My whole vocabulary fits in four chips:</p>
      <div class="site-chat__suggest">${chatSuggestionsHtml()}</div>`;
}

/** Find the scripted reply for a chip key or a typed question. */
export function matchChatReply(input: string): ChatReply | undefined {
  const q = input.trim().toLowerCase();
  return CHAT_REPLIES.find(
    (r) => r.key === q || r.question.toLowerCase() === q || r.keywords.some((k) => q.includes(k)),
  );
}

/* --------------------------------------------------------------------- *
 * Message shells
 * --------------------------------------------------------------------- */

const ASSISTANT_NAME = 'EPaper Assistant';

/**
 * One transcript entry. `bodyHtml` is trusted markup from this module —
 * callers escape any visitor text before it gets here.
 */
export function chatMessageHtml(role: ChatRole, time: string, bodyHtml: string): string {
  const who = role === 'assistant' ? ASSISTANT_NAME : 'You';
  return `<article class="site-chat__msg site-chat__msg--${role}">
      <e-avatar name="${esc(who)}" size="32"></e-avatar>
      <div class="site-chat__bubble">
        <p class="site-chat__meta">${esc(who)} · ${esc(time)}</p>
        <div class="site-chat__body">${bodyHtml}</div>
      </div>
    </article>`;
}

/** Placeholder bubble shown while the scripted "model" pretends to think. */
export function chatPendingHtml(time: string): string {
  return `<article class="site-chat__msg site-chat__msg--assistant" data-chat-pending>
      <e-avatar name="${esc(ASSISTANT_NAME)}" size="32"></e-avatar>
      <div class="site-chat__bubble">
        <p class="site-chat__meta">${esc(ASSISTANT_NAME)} · ${esc(time)}</p>
        <div class="site-chat__body"><e-skeleton shape="text" lines="2"></e-skeleton></div>
      </div>
    </article>`;
}

/** `HH:MM` from the visitor's clock, locale-independent. */
export function chatTimeNow(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* --------------------------------------------------------------------- *
 * Opening transcript (build time)
 * --------------------------------------------------------------------- */

/** The transcript every visitor (and crawler) finds already on the page. */
export function chatOpeningHtml(): string {
  return (
    chatMessageHtml('user', '09:41', `<p class="site-chat__p">What can you show me?</p>`) +
    chatMessageHtml(
      'assistant',
      '09:41',
      `<p class="site-chat__p">Quite a lot, for someone with no network connection. I am a
        chat dummy rendered entirely with EPaper components — avatars, tables, sparklines,
        meters and tags as rich chat content, all e-paper safe. Pick a chip below or type
        a question.</p>
      <div class="site-chat__tags"><e-tag>scripted</e-tag><e-tag>offline</e-tag><e-tag>e-paper safe</e-tag></div>`,
    )
  );
}
