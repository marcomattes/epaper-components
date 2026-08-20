// The recipes — complete builds for the situations people actually put an
// e-paper panel in.
//
// Where the guides explain a mechanism, these start from a job: a wall
// dashboard, a shelf label, a room sign, a weather display. Someone searching
// for "e-ink dashboard" has a problem, not a library preference, and this is
// the content that meets them there.
//
// Every snippet is real markup against the shipped attribute API, and every
// recipe states its update rhythm, because on e-paper the refresh schedule is
// as much a part of the design as the layout.
import type { Article } from './articles';

/* --------------------------------------------------------------------- *
 * Recipe 1 — status dashboard
 * --------------------------------------------------------------------- */
const STATUS_DASHBOARD: Article = {
  slug: 'status-dashboard',
  kind: 'recipe',
  nav: 'Status dashboard',
  title: 'Build an E-Ink Status Dashboard — Wall-Mounted Ops Display',
  heading: 'An e-ink status dashboard',
  description:
    'A wall-mounted operations dashboard on an e-paper panel: layout that keeps the dirty rectangle small, a polling rhythm the display can keep up with, and staleness that is visible when the feed dies.',
  lede: 'A dashboard is the most common reason to put an e-paper panel on a wall, and the most common way to get it wrong. The failure mode is never the layout — it is a refresh loop that asks the panel for more than it can deliver, so the display spends its life mid-flash.',
  published: '2026-06-30',
  updated: '2026-08-10',
  topics: ['dashboard', 'e-ink', 'eink', 'monitoring', 'ops', 'kiosk'],
  blocks: [
    { kind: 'h2', text: 'The shape of the problem' },
    {
      kind: 'p',
      text: 'A wall dashboard is read from three metres away, glanced at rather than studied, and never interacted with. That is a gift: no hover states to lose, no touch targets to size, no scrolling. What it does demand is that the display be **trustworthy** — a frozen dashboard showing four-hour-old numbers is worse than a blank one, because nobody can tell.',
    },
    {
      kind: 'p',
      text: 'So the build has three requirements: readable at distance, cheap to update, and obviously stale when the data stops arriving.',
    },

    { kind: 'h2', text: 'Layout' },
    {
      kind: 'p',
      text: 'Put every volatile number in one band. Update cost on e-paper is the bounding box of what changed, so metrics scattered across the page turn each refresh into a full-panel update. A single row of figures at the top and a static frame below is the cheapest arrangement that still looks deliberate.',
    },
    {
      kind: 'code',
      lang: 'html',
      code: `<div class="ink-page">
  <e-flex justify="space-between" align="baseline">
    <e-title level="1">Platform</e-title>
    <!-- Ages itself from the timestamp and flips to a stale state
         after 90 s without a refresh. -->
    <e-last-updated id="stamp"
                    datetime="2026-08-18T09:14:00Z"
                    stale-after="90"></e-last-updated>
  </e-flex>

  <e-divider></e-divider>

  <!-- The whole volatile band. Keyed items, so a value change patches
       one cell instead of rebuilding the grid. -->
  <e-status-board id="board" columns="4" label="Service health"
    data='[
      {"key":"api",    "label":"API",       "value":"OK",  "status":"ok"},
      {"key":"queue",  "label":"Queue",     "value":12,    "status":"warning", "detail":"depth"},
      {"key":"errors", "label":"Errors/5m", "value":3,     "status":"ok"},
      {"key":"deploys","label":"Deploys",   "value":"idle","status":"ok"}
    ]'></e-status-board>

  <e-grid cols="2" gap="24">
    <e-sparkline label="Requests/min"
                 values="[820,910,880,1040,1180,1120,1260]"></e-sparkline>
    <e-meter label="Disk" value="68" unit="%" low="50" high="85"></e-meter>
  </e-grid>
</div>`,
    },
    {
      kind: 'note',
      label: 'Why e-status-board and not a grid of cards',
      text: '`<e-status-board>` keys its items. Feeding it a new `data` attribute reconciles by key and patches only the cells whose values moved, keeping each dirty rectangle to one figure. A hand-rolled grid rebuilt from a template re-renders every cell on every poll, which is the same picture at many times the panel cost.',
    },

    { kind: 'h2', text: 'The refresh loop' },
    {
      kind: 'p',
      text: 'One timer, one paint. Fetch everything, wait for all of it, then write once — never a write per response.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `const board = document.getElementById('board');
const stamp = document.getElementById('stamp');

async function refresh() {
  try {
    const [health, metrics] = await Promise.all([
      fetch('/api/health').then((r) => r.json()),
      fetch('/api/metrics').then((r) => r.json()),
    ]);

    // One attribute write. The component diffs by key from here.
    board.setAttribute('data', JSON.stringify([
      { key: 'api',     label: 'API',       value: health.api ? 'OK' : 'DOWN',
        status: health.api ? 'ok' : 'error' },
      { key: 'queue',   label: 'Queue',     value: metrics.queueDepth,
        status: metrics.queueDepth > 50 ? 'warning' : 'ok', detail: 'depth' },
      { key: 'errors',  label: 'Errors/5m', value: metrics.errors5m,
        status: metrics.errors5m > 10 ? 'error' : 'ok' },
      { key: 'deploys', label: 'Deploys',   value: health.deploying ? 'running' : 'idle',
        status: 'ok' },
    ]));

    // Only advanced on success — this is what makes staleness honest.
    stamp.setAttribute('datetime', new Date().toISOString());
  } catch {
    // Deliberately nothing. The timestamp stays where it was and
    // <e-last-updated> crosses into its stale state on its own.
  }
}

refresh();
setInterval(refresh, 60_000);`,
    },
    {
      kind: 'p',
      text: 'The `catch` block doing nothing is the most important line in the recipe. Because the timestamp is only advanced on a successful fetch, a backend outage makes the display visibly stale without any error-handling UI at all. The failure state is the absence of an update, which is exactly what it is.',
    },

    { kind: 'h2', text: 'Choosing the interval' },
    {
      kind: 'table',
      head: ['Interval', 'Suits', 'Panel cost'],
      rows: [
        [
          '10 s',
          'Trading, live incident war room',
          'High — plan a clearing refresh every few minutes',
        ],
        ['60 s', 'Most ops dashboards', 'Comfortable'],
        ['5 min', 'Business metrics, battery-powered', 'Negligible'],
      ],
    },
    {
      kind: 'p',
      text: 'A minute is the sweet spot for a mains-powered wall panel. Below about 10 seconds the panel is refreshing more often than anyone reads it, and the accumulated ghosting from back-to-back fast updates starts to need clearing refreshes that flash the whole display.',
    },

    { kind: 'h2', text: 'Clearing ghosting' },
    {
      kind: 'p',
      text: 'Fast partial updates leave residue. On a long-running kiosk this accumulates over hours until the panel looks grubby. The fix is a periodic full repaint, scheduled at a moment nobody is watching.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `// A full-page repaint gives the controller a whole-panel damaged
// region, which selects a clearing waveform and resets the residue.
// Hourly at :00 is usually invisible in practice.
setInterval(() => {
  document.body.style.visibility = 'hidden';
  void document.body.offsetHeight;      // force the reflow
  document.body.style.visibility = '';
}, 60 * 60_000);`,
    },

    { kind: 'h2', text: 'Pitfalls' },
    {
      kind: 'ul',
      items: [
        '**Do not rebuild the DOM per poll.** Setting `innerHTML` on the container produces a full-panel update for a two-digit change.',
        '**Do not stagger writes.** Four endpoints answering at different moments become four separate panel updates, each with its own bounding box.',
        '**Give numbers a fixed-width slot.** `font-variant-numeric: tabular-nums` stops a value going from 9 to 10 reflowing the row and widening the rectangle.',
        '**Do not use colour as the only status cue.** `<e-status-board>` carries status as text and pattern for exactly this reason.',
        '**Watch memory on a kiosk.** A display running for months needs its listeners torn down on navigation — EPaper components do this through their own cleanup contract.',
      ],
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Recipe 2 — electronic shelf label
 * --------------------------------------------------------------------- */
const SHELF_LABEL: Article = {
  slug: 'electronic-shelf-label',
  kind: 'recipe',
  nav: 'Shelf label',
  title: 'Build an Electronic Shelf Label (ESL) with Web Components',
  heading: 'An electronic shelf label',
  description:
    'A price label on e-paper: dense typography at small physical size, a QR code that survives a 1-bit render, price-change cues that do not rely on colour, and an update budget measured in updates per year.',
  lede: 'A shelf label is the purest expression of what e-paper is for. It changes a handful of times a week, must stay legible for years on a coin cell, and is read from half a metre away in bad supermarket lighting.',
  published: '2026-07-08',
  updated: '2026-08-11',
  topics: ['ESL', 'electronic shelf label', 'retail', 'e-paper', 'QR code'],
  blocks: [
    { kind: 'h2', text: 'Constraints that invert the usual ones' },
    {
      kind: 'p',
      text: 'On a shelf label the update budget is not a performance concern, it is the product specification. A label powered by a CR2450 is expected to run for years, and every refresh is a measurable fraction of that budget. Designs are counted in updates per year, not frames per second.',
    },
    {
      kind: 'p',
      text: 'That flips the usual optimisation target. You are not trying to make updates fast — you are trying to make them **rare**, and to make each one carry as much change as possible, because the fixed cost of waking the radio and driving the panel dwarfs the cost of the pixels themselves.',
    },

    { kind: 'h2', text: 'Layout' },
    {
      kind: 'p',
      text: 'Small panels — 2.9" at 296×128 is a common size — mean the price is the design and everything else is subordinate. Typographic hierarchy has to be aggressive: the price wants to be four or five times the size of the product name.',
    },
    {
      kind: 'code',
      lang: 'html',
      code: `<div class="ink-page esl">
  <e-text kind="label" as="div">Aisle 4 · Organic</e-text>
  <e-title level="2">Rye Sourdough 800 g</e-title>

  <!-- The price. Marked against the previous value so a change is
       visible as text and shape, never as colour alone. -->
  <e-change-marker id="price"
                   label="Price"
                   value="3.49"
                   previous="3.99"
                   prefix="€"
                   precision="2"
                   show-previous></e-change-marker>

  <e-flex justify="space-between" align="flex-end">
    <e-description-list columns="1" layout="horizontal">
      <e-desc-item term="Unit">€4.36 / kg</e-desc-item>
      <e-desc-item term="SKU">RYE-800</e-desc-item>
    </e-description-list>

    <!-- Level Q survives a scuffed or partly obscured label;
         scale 3 keeps it scannable at ~25 mm. -->
    <e-qrcode value="https://shop.example.com/p/RYE-800"
              level="Q" scale="3" border="2"></e-qrcode>
  </e-flex>
</div>`,
    },
    {
      kind: 'code',
      lang: 'css',
      code: `/* The price has to dominate at half a metre in poor light. */
.esl {
  --ink-text-body: 13px;
  padding: 8px 10px;
}
.esl .ink-change-marker__value {
  font-size: 44px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.esl .ink-title { font-size: 15px; margin: 2px 0 6px; }`,
    },
    {
      kind: 'note',
      label: 'Why the QR code is inline SVG',
      text: '`<e-qrcode>` renders two shapes — a white background and one dark path — with no runtime dependency and no raster step. Every module lands on a whole pixel, which is what keeps it scannable at 1-bit; a rasterised or anti-aliased QR code at this size produces grey edge modules that scanners read inconsistently.',
    },

    { kind: 'h2', text: 'Marking a price change without colour' },
    {
      kind: 'p',
      text: 'Retail convention marks reductions in red. A monochrome label cannot, and the regulations in most markets require the previous price to remain visible anyway. `<e-change-marker>` handles both: it renders the current value, the previous value, and a direction cue that is a glyph rather than a hue.',
    },
    {
      kind: 'p',
      text: 'The `tolerance` attribute is what stops noise from producing a change cue — useful when prices arrive from a system that recalculates unit costs with floating-point drift.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `// One update per price change, and nothing at all when it did not move.
function applyPrice(next, previous) {
  const el = document.getElementById('price');
  if (el.getAttribute('value') === String(next)) return;  // no-op, no refresh
  el.setAttribute('previous', String(previous));
  el.setAttribute('value', String(next));
}`,
    },

    { kind: 'h2', text: 'The update budget' },
    {
      kind: 'p',
      text: 'Panel vendors quote refresh counts in the hundreds of thousands for the display itself, so the real constraint is the battery, and the dominant cost is usually the radio rather than the pixels. Two rules follow.',
    },
    {
      kind: 'ol',
      items: [
        '**Coalesce.** A price change, a promotion flag and a stock note arriving within the same hour should be one wake-up and one refresh, not three.',
        '**Compare before writing.** The guard in the snippet above — bail out when the value is unchanged — is worth more here than any rendering optimisation. A label that receives an identical payload should cost nothing.',
      ],
    },
    {
      kind: 'p',
      text: 'This is the same discipline as [surgical DOM updates](/guides/partial-refresh/), taken to its conclusion: the cheapest update is the one that never happens.',
    },

    { kind: 'h2', text: 'Pitfalls' },
    {
      kind: 'ul',
      items: [
        "**Do not shrink the price to fit a long product name.** Truncate the name instead — the price is the label's job.",
        '**Avoid grey.** At this size a grey rule disappears entirely under fluorescent light. Use a solid 2 px border.',
        '**Test the QR code on the real panel**, printed size and all. Module size in physical millimetres is what matters, not pixels.',
        '**Keep the previous price for as long as the local rules require** — this is a legal constraint in several markets, not a design choice.',
        '**Do not animate anything.** Nothing here should ever have needed saying, but promotional "flashing" price labels are a real request and the answer is no.',
      ],
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Recipe 3 — meeting room display
 * --------------------------------------------------------------------- */
const ROOM_DISPLAY: Article = {
  slug: 'meeting-room-display',
  kind: 'recipe',
  nav: 'Room display',
  title: 'Build a Meeting Room Display on E-Paper',
  heading: 'A meeting room display',
  description:
    'A door-mounted room booking sign: current status legible from down the corridor, the day’s schedule underneath, and an update rhythm driven by the calendar rather than by a timer.',
  lede: 'A room sign answers one question from ten metres away — is this room free right now? — and a second question from one metre: what else is booked today. Getting the hierarchy between those two right is the whole design.',
  published: '2026-07-20',
  updated: '2026-08-13',
  topics: ['meeting room', 'room booking', 'calendar', 'e-paper', 'signage'],
  blocks: [
    { kind: 'h2', text: 'Two reading distances' },
    {
      kind: 'p',
      text: "The mistake is treating this as one screen. It is two: a status band that must be readable at ten metres, and a schedule that only needs to work at arm's length. Sizing them the same wastes the panel; sizing the status band timidly makes the sign useless for its main purpose.",
    },
    {
      kind: 'p',
      text: 'A useful rule of thumb for signage is roughly 1 cm of cap height per 3 m of viewing distance. At ten metres the status word wants to be genuinely large — on a 7.5" panel that means it dominates the top third.',
    },

    { kind: 'h2', text: 'Layout' },
    {
      kind: 'code',
      lang: 'html',
      code: `<div class="ink-page room">
  <e-flex justify="space-between" align="baseline">
    <e-title level="1">Faraday</e-title>
    <e-text kind="label">Floor 2 · 8 seats</e-text>
  </e-flex>

  <!-- The ten-metre band. One word, inverted when occupied so the
       state reads as a shape before it reads as text. -->
  <div class="room__status" id="status" data-state="free">
    <span class="room__word">FREE</span>
    <span class="room__until">until 14:00</span>
  </div>

  <e-divider label="Today"></e-divider>

  <e-list id="agenda" split>
    <e-list-item title="09:30 – 10:00" description="Standup · Platform"></e-list-item>
    <e-list-item title="11:00 – 12:00" description="Design review · Ink"></e-list-item>
    <e-list-item title="14:00 – 15:30" description="Interview · Reserved"></e-list-item>
  </e-list>

  <e-flex justify="space-between" align="center">
    <e-qrcode value="https://rooms.example.com/faraday" level="M" scale="3"></e-qrcode>
    <e-last-updated id="stamp" datetime="2026-08-18T09:14:00Z"
                    stale-after="600"></e-last-updated>
  </e-flex>
</div>`,
    },
    {
      kind: 'code',
      lang: 'css',
      code: `/* Inversion carries the state. No colour involved, and the whole
   band is one clean rectangle for the controller to drive. */
.room__status {
  border: var(--ink-border-strong);
  padding: var(--ink-space-5);
  text-align: center;
}
.room__word { display: block; font-size: 76px; font-weight: 700; line-height: 1; }
.room__until { display: block; font-size: 18px; margin-top: 8px; }

.room__status[data-state='busy'] {
  background: var(--ink-fg);
  color: var(--ink-bg);
}`,
    },
    {
      kind: 'note',
      label: 'Inversion is the right cue here',
      text: 'A solid black band is unmistakable at distance, needs no colour, and — because it is a single rectangle changing wholesale — is a clean, well-shaped update for the panel. It is also the one moment where a large refresh is worth its cost, since it happens a handful of times a day.',
    },

    { kind: 'h2', text: 'Scheduling updates against the calendar' },
    {
      kind: 'p',
      text: "A polling timer is the wrong instrument. The room's state changes at *known future moments* — the start and end of each booking — so schedule the repaint for those moments and poll only to discover new bookings.",
    },
    {
      kind: 'code',
      lang: 'js',
      code: `let timer;

function render(bookings, now = new Date()) {
  const current = bookings.find((b) => b.start <= now && now < b.end);
  const next = bookings.find((b) => b.start > now);

  const status = document.getElementById('status');
  status.dataset.state = current ? 'busy' : 'free';
  status.querySelector('.room__word').textContent = current ? 'BUSY' : 'FREE';
  status.querySelector('.room__until').textContent = current
    ? \`until \${time(current.end)}\`
    : next ? \`until \${time(next.start)}\` : 'all day';

  // Wake exactly when the state next changes, not every minute.
  const edge = current ? current.end : next?.start;
  clearTimeout(timer);
  if (edge) {
    timer = setTimeout(() => render(bookings), Math.max(1000, edge - now));
  }
}

// Poll only for schedule changes — someone booking the room.
async function sync() {
  const bookings = await fetch('/api/rooms/faraday/today')
    .then((r) => r.json())
    .then((rows) => rows.map((b) => ({
      ...b, start: new Date(b.start), end: new Date(b.end),
    })));
  render(bookings);
  document.getElementById('stamp')
    .setAttribute('datetime', new Date().toISOString());
}

sync();
setInterval(sync, 5 * 60_000);`,
    },
    {
      kind: 'p',
      text: 'This gives an idle room a completely static panel between bookings — no updates at all for hours — while still flipping to `BUSY` precisely on the hour. A one-minute polling loop would have produced 60 needless refreshes for the same result.',
    },

    { kind: 'h2', text: 'Pitfalls' },
    {
      kind: 'ul',
      items: [
        '**Do not put a live clock on it.** A ticking minute display is 1,440 panel updates a day for information every phone already has. Show the boundary time instead — "until 14:00".',
        '**Handle the empty day.** A room with no bookings should say so plainly; an empty list reads as a broken feed.',
        '**Make the QR code do the booking.** The sign cannot take input, so the code is the entire interaction path.',
        '**Set `stale-after` generously.** Ten minutes suits a five-minute poll; a tighter threshold will flap on one slow request.',
        '**Mind the clock source.** A panel with drifting time will flip state at the wrong moment. Trust a server timestamp over the device clock.',
      ],
    },
  ],
};

/* --------------------------------------------------------------------- *
 * Recipe 4 — weather station
 * --------------------------------------------------------------------- */
const WEATHER_STATION: Article = {
  slug: 'weather-station',
  kind: 'recipe',
  nav: 'Weather station',
  title: 'Build an E-Paper Weather Station Display',
  heading: 'An e-paper weather station',
  description:
    'A desk or wall weather display: current conditions, a readable forecast strip, trend sparklines that work in one bit, and a refresh schedule matched to how often the data genuinely changes.',
  lede: 'Weather is the classic first e-paper project, and it is a good one — the data changes slowly, the display suits glanceable reading, and the whole thing can run for months on a battery if the refresh schedule is honest about how often forecasts actually update.',
  published: '2026-08-04',
  updated: '2026-08-17',
  topics: ['weather station', 'e-ink', 'eink', 'raspberry pi', 'sparkline', 'forecast'],
  blocks: [
    { kind: 'h2', text: 'Match the refresh rate to the data' },
    {
      kind: 'p',
      text: 'Most weather APIs update their forecast every 10 to 60 minutes, and observations every 5 to 15. Refreshing a panel every minute against a source that changes hourly is pure waste — it burns battery and accumulates ghosting to display the same numbers.',
    },
    {
      kind: 'p',
      text: 'Pick the interval from the upstream cadence, not from a sense of liveness. Fifteen minutes is generous for observations; thirty is plenty for a forecast.',
    },

    { kind: 'h2', text: 'Layout' },
    {
      kind: 'p',
      text: 'One large current temperature, a compact strip of upcoming hours, and trend lines underneath. The temperature is the only thing read at a glance, so it gets the same dominance the price gets on [a shelf label](/guides/electronic-shelf-label/).',
    },
    {
      kind: 'code',
      lang: 'html',
      code: `<div class="ink-page weather">
  <e-flex justify="space-between" align="baseline">
    <e-title level="1">Hamburg</e-title>
    <e-last-updated id="stamp" datetime="2026-08-18T09:00:00Z"
                    stale-after="2700"></e-last-updated>
  </e-flex>

  <e-grid cols="2" gap="24">
    <e-statistic id="temp" label="Now" value="18.4" suffix="°C"
                 precision="1" trend="up" delta="1.2°"></e-statistic>
    <e-statistic id="feels" label="Feels like" value="17.1" suffix="°C"
                 precision="1"></e-statistic>
  </e-grid>

  <e-divider label="Next 12 hours"></e-divider>

  <e-table id="forecast"
    columns='[
      {"key":"hour","title":"Hour"},
      {"key":"temp","title":"°C","align":"right"},
      {"key":"rain","title":"Rain","align":"right"},
      {"key":"wind","title":"Wind","align":"right"}
    ]'
    data='[
      {"hour":"10:00","temp":"19","rain":"0 %","wind":"12 km/h"},
      {"hour":"13:00","temp":"22","rain":"10 %","wind":"14 km/h"},
      {"hour":"16:00","temp":"21","rain":"40 %","wind":"18 km/h"},
      {"hour":"19:00","temp":"17","rain":"60 %","wind":"15 km/h"}
    ]'></e-table>

  <e-grid cols="2" gap="24">
    <e-sparkline id="trend-temp" label="Temperature, 24 h"
                 values="[14,13,13,15,18,21,22,21,19,17,16,15]"></e-sparkline>
    <e-meter id="humidity" label="Humidity" value="72" unit="%"
             low="30" high="80"></e-meter>
  </e-grid>
</div>`,
    },
    {
      kind: 'note',
      label: 'Why a table and not weather icons',
      text: 'Pictographic weather icons are the first thing that breaks in one bit — a cloud behind a sun and a cloud behind a moon are near-identical silhouettes without shading. A four-column table of numbers is unambiguous, denser, and readable by a screen reader. If you want icons, add them beside the text, never instead of it.',
    },

    { kind: 'h2', text: 'Rendering the trend in one bit' },
    {
      kind: 'p',
      text: '`<e-sparkline>` draws a static line with an explicit caption rather than a shaded area chart. That is deliberate: gradient fills and anti-aliased curves are grey, and grey in a region forces the panel into its slow grey-capable waveform. A hard one-pixel line stays in the fast mode.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `async function refresh() {
  const w = await fetch('/api/weather').then((r) => r.json());

  const temp = document.getElementById('temp');
  temp.setAttribute('value', w.now.temp.toFixed(1));
  temp.setAttribute('trend', w.now.temp >= w.previous.temp ? 'up' : 'down');
  temp.setAttribute('delta',
    \`\${Math.abs(w.now.temp - w.previous.temp).toFixed(1)}°\`);

  document.getElementById('feels')
    .setAttribute('value', w.now.feelsLike.toFixed(1));

  // Attribute writes are diffed by the components; identical values
  // produce no DOM mutation and therefore no panel update at all.
  document.getElementById('forecast')
    .setAttribute('data', JSON.stringify(w.hourly));
  document.getElementById('trend-temp')
    .setAttribute('values', JSON.stringify(w.history24h));
  document.getElementById('humidity')
    .setAttribute('value', String(w.now.humidity));

  document.getElementById('stamp')
    .setAttribute('datetime', new Date().toISOString());
}

refresh();
setInterval(refresh, 15 * 60_000);   // matched to the upstream cadence`,
    },

    { kind: 'h2', text: 'Running it on a battery' },
    {
      kind: 'p',
      text: 'For a mains-powered display a browser left open is fine. For a battery build the browser is the wrong shape: keeping a rendering engine resident to change four numbers every quarter hour dominates the power budget.',
    },
    {
      kind: 'p',
      text: 'The usual arrangement is to render off-device and treat the panel as a dumb sink — a server renders the page headlessly to a PNG, the device wakes on a timer, fetches the image, drives the panel and goes back to deep sleep. The layout work above is unchanged; only who runs the browser moves.',
    },
    {
      kind: 'code',
      lang: 'js',
      code: `// Server side: render the same page to a 1-bit PNG on a schedule.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 800, height: 480 },     // the panel's native size
  deviceScaleFactor: 1,
});
await page.goto('http://localhost:8080/weather', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'panel.png' });
await browser.close();`,
    },
    {
      kind: 'p',
      text: 'Because the components render without animation and without hover states, the screenshot is deterministic — the same data produces byte-identical output, so the device can skip the panel write entirely when the image has not changed.',
    },

    { kind: 'h2', text: 'Pitfalls' },
    {
      kind: 'ul',
      items: [
        '**Do not show more precision than the forecast has.** A temperature to one decimal is defensible for an observation, absurd for a forecast three days out.',
        '**Give the temperature a fixed-width slot.** Going from 9.8 to 10.1 must not reflow the row.',
        '**Handle the failed fetch by leaving the numbers alone** and letting the timestamp go stale. Wrong weather is worse than old weather.',
        "**Render at the panel's native resolution.** Scaling a screenshot reintroduces the grey anti-aliased edges the design was avoiding.",
        '**Watch the timezone.** Forecast hours arriving in UTC and rendered as local time is the single most common bug in these builds.',
      ],
    },
  ],
};

export const RECIPES: Article[] = [STATUS_DASHBOARD, SHELF_LABEL, ROOM_DISPLAY, WEATHER_STATION];
