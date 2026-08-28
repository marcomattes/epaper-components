import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import '../../styles/tokens.css';
import '../../styles/base.css';
import '../../styles/components.css';

interface RefreshMeasurement {
  mutationCount: number;
  elementChurn: number;
  rootReplacements: number;
  retainedNodeRatio: number;
  dirtyAreaRatio: number;
}

interface RefreshBudget {
  mutations: number;
  elementChurn: number;
  dirtyAreaRatio: number;
  retainedNodeRatio?: number;
}

interface RefreshScenario {
  name: string;
  html: string;
  selector: string;
  action: (host: HTMLElement) => void;
  budget: RefreshBudget;
}

beforeAll(async () => {
  await Promise.all([
    import('../progress/progress'),
    import('../time-picker/time-picker'),
    import('../table/table'),
    import('../select/select'),
    import('../tabs/tabs'),
    import('../meter/meter'),
    import('../sparkline/sparkline'),
    import('../status-board/status-board'),
    import('../change-marker/change-marker'),
    import('../last-updated/last-updated'),
    import('../diff/diff'),
  ]);
});

afterEach(() => {
  document.querySelectorAll('[data-refresh-fixture]').forEach((node) => node.remove());
});

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

async function mount(html: string, selector: string): Promise<HTMLElement> {
  const fixture = document.createElement('div');
  fixture.dataset['refreshFixture'] = '';
  fixture.className = 'ink-page';
  fixture.style.cssText = 'display:block;width:640px;padding:16px;';
  fixture.innerHTML = html;
  document.body.appendChild(fixture);
  await nextFrame();
  return fixture.querySelector<HTMLElement>(selector)!;
}

function clippedRect(element: Element, bounds: DOMRect): DOMRect | null {
  const rect = element.getBoundingClientRect();
  const left = Math.max(bounds.left, rect.left);
  const top = Math.max(bounds.top, rect.top);
  const right = Math.min(bounds.right, rect.right);
  const bottom = Math.min(bounds.bottom, rect.bottom);
  if (right <= left || bottom <= top) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

async function measureRefresh(host: HTMLElement, action: () => void): Promise<RefreshMeasurement> {
  const before = new Set(host.querySelectorAll('*'));
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((batch) => records.push(...batch));
  observer.observe(host, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  action();
  await Promise.resolve();
  await nextFrame();
  records.push(...observer.takeRecords());
  observer.disconnect();

  let elementChurn = 0;
  let rootReplacements = 0;
  const dirtyElements = new Set<Element>();
  for (const record of records) {
    const addedElements = [...record.addedNodes].filter((node) => node instanceof Element).length;
    const removedElements = [...record.removedNodes].filter(
      (node) => node instanceof Element,
    ).length;
    elementChurn += addedElements + removedElements;
    if (
      record.type === 'childList' &&
      record.target === host &&
      (addedElements || removedElements)
    ) {
      rootReplacements++;
    }
    if (record.target instanceof Element && record.target !== host) {
      dirtyElements.add(record.target);
    } else if (
      !(record.target instanceof Element) &&
      record.target.parentElement &&
      record.target.parentElement !== host
    ) {
      dirtyElements.add(record.target.parentElement);
    }
  }

  const retained = [...before].filter((node) => host.contains(node)).length;
  const retainedNodeRatio = before.size === 0 ? 1 : retained / before.size;
  const hostRect = host.getBoundingClientRect();
  const rects = [...dirtyElements]
    .map((element) => clippedRect(element, hostRect))
    .filter((rect): rect is DOMRect => rect !== null);

  let dirtyAreaRatio = 0;
  if (rects.length > 0 && hostRect.width > 0 && hostRect.height > 0) {
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    dirtyAreaRatio = ((right - left) * (bottom - top)) / (hostRect.width * hostRect.height);
  }

  return {
    mutationCount: records.length,
    elementChurn,
    rootReplacements,
    retainedNodeRatio,
    dirtyAreaRatio,
  };
}

const scenarios: RefreshScenario[] = [
  {
    name: 'progress value update',
    html: '<e-progress value="20" label="Sync"></e-progress>',
    selector: 'e-progress',
    action: (host) => host.setAttribute('value', '45'),
    // The bar and visible percentage caption both change, spanning almost the
    // whole (small) component even though each update is surgical.
    budget: { mutations: 5, elementChurn: 0, dirtyAreaRatio: 0.95 },
  },
  {
    name: 'time-picker value update',
    html: '<e-time-picker value="09:30"></e-time-picker>',
    selector: 'e-time-picker',
    action: (host) => host.setAttribute('value', '10:45'),
    budget: { mutations: 7, elementChurn: 0, dirtyAreaRatio: 0.75 },
  },
  {
    name: 'table row selection',
    html: '<e-table selectable columns=\'[{"key":"title","title":"Title"}]\' data=\'[{"title":"A"},{"title":"B"},{"title":"C"}]\'></e-table>',
    selector: 'e-table',
    action: (host) => host.setAttribute('selected', '0'),
    budget: { mutations: 4, elementChurn: 0, dirtyAreaRatio: 0.5 },
  },
  {
    // The polling path: a table re-reads `data` on every tick. Only the one
    // cell that actually changed may be touched — a rebuilt <tbody> would
    // cost a full-panel GC16 flash instead of a single dirty rectangle.
    name: 'table keyed data update',
    html: `<e-table row-key="id" columns='[{"key":"id","title":"ID"},{"key":"title","title":"Title"}]' data='[{"id":"a","title":"A"},{"id":"b","title":"B"},{"id":"c","title":"C"}]'></e-table>`,
    selector: 'e-table',
    action: (host) =>
      host.setAttribute(
        'data',
        '[{"id":"a","title":"A"},{"id":"b","title":"B2"},{"id":"c","title":"C"}]',
      ),
    // Measured: 2 mutations, 0 churn, 15 % dirty area (the one <td>). Before
    // keyed diffing this was a `replaceChildren` on the host — churn 2,
    // rootReplacements 1 and a retained-node ratio of 0.
    budget: { mutations: 3, elementChurn: 0, dirtyAreaRatio: 0.2, retainedNodeRatio: 1 },
  },
  {
    // Same guarantee when rows are re-ordered: one `insertBefore` move of an
    // existing <tr>. That is recorded as a remove + an add of the *same* node
    // (churn 2), which is why `retainedNodeRatio` is the assertion that
    // matters here — no row is rebuilt, and no cell text is touched at all.
    name: 'table keyed row reorder',
    html: `<e-table row-key="id" columns='[{"key":"id","title":"ID"},{"key":"title","title":"Title"}]' data='[{"id":"a","title":"A"},{"id":"b","title":"B"},{"id":"c","title":"C"}]'></e-table>`,
    selector: 'e-table',
    action: (host) =>
      host.setAttribute(
        'data',
        '[{"id":"c","title":"C"},{"id":"a","title":"A"},{"id":"b","title":"B"}]',
      ),
    // The dirty target of a move is the <tbody>, so the approximated rectangle
    // covers the body — but no cell text is repainted and no node is rebuilt.
    budget: { mutations: 4, elementChurn: 2, dirtyAreaRatio: 0.8, retainedNodeRatio: 1 },
  },
  {
    name: 'select option update',
    html: '<e-select value="a"><e-option value="a" label="A"></e-option><e-option value="b" label="B"></e-option></e-select>',
    selector: 'e-select',
    action: (host) => host.setAttribute('value', 'b'),
    budget: {
      mutations: 10,
      elementChurn: 2,
      dirtyAreaRatio: 0.6,
      retainedNodeRatio: 0.8,
    },
  },
  {
    name: 'tab activation',
    html: '<e-tabs default-value="a"><e-tab key="a" label="A">Alpha</e-tab><e-tab key="b" label="B">Beta</e-tab></e-tabs>',
    selector: 'e-tabs',
    action: (host) => host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1]?.click(),
    budget: { mutations: 10, elementChurn: 0, dirtyAreaRatio: 1 },
  },
  {
    name: 'meter value update',
    html: '<e-meter value="40" segments="10" label="Battery" unit="%"></e-meter>',
    selector: 'e-meter',
    action: (host) => host.setAttribute('value', '50'),
    budget: { mutations: 8, elementChurn: 0, dirtyAreaRatio: 1 },
  },
  {
    name: 'sparkline series update',
    html: '<e-sparkline values="[1,2,3,4]" label="Requests"></e-sparkline>',
    selector: 'e-sparkline',
    action: (host) => host.setAttribute('values', '[2,3,4,5]'),
    budget: { mutations: 8, elementChurn: 0, dirtyAreaRatio: 1 },
  },
  {
    name: 'status-board keyed value update',
    html: `<e-status-board data='[{"key":"queue","label":"Queue","value":12,"status":"warning"},{"key":"workers","label":"Workers","value":8,"status":"ok"}]'></e-status-board>`,
    selector: 'e-status-board',
    action: (host) =>
      host.setAttribute(
        'data',
        '[{"key":"queue","label":"Queue","value":9,"status":"ok"},{"key":"workers","label":"Workers","value":8,"status":"ok"}]',
      ),
    budget: { mutations: 8, elementChurn: 0, dirtyAreaRatio: 0.6 },
  },
  {
    name: 'change-marker value update',
    html: '<e-change-marker previous="10" value="10" label="Readers"></e-change-marker>',
    selector: 'e-change-marker',
    action: (host) => host.setAttribute('value', '12'),
    budget: { mutations: 7, elementChurn: 0, dirtyAreaRatio: 1 },
  },
  {
    name: 'last-updated clock update',
    html: '<e-last-updated datetime="2026-08-17T14:00:00Z" now="2026-08-17T14:03:00Z"></e-last-updated>',
    selector: 'e-last-updated',
    action: (host) => host.setAttribute('now', '2026-08-17T14:06:00Z'),
    budget: { mutations: 7, elementChurn: 0, dirtyAreaRatio: 1 },
  },
  {
    name: 'diff current-value update',
    html: '<e-diff before="Partial" after="Full"></e-diff>',
    selector: 'e-diff',
    action: (host) => host.setAttribute('after', 'Partial'),
    budget: { mutations: 6, elementChurn: 0, dirtyAreaRatio: 1 },
  },
];

describe('e-paper refresh budgets', () => {
  for (const scenario of scenarios) {
    it(`${scenario.name} stays within its mutation and dirty-area budget`, async () => {
      const host = await mount(scenario.html, scenario.selector);
      const result = await measureRefresh(host, () => scenario.action(host));

      expect(result.rootReplacements, 'host subtree replacements').toBe(0);
      expect(result.mutationCount, 'DOM mutation count').toBeLessThanOrEqual(
        scenario.budget.mutations,
      );
      expect(result.elementChurn, 'added + removed element nodes').toBeLessThanOrEqual(
        scenario.budget.elementChurn,
      );
      expect(result.retainedNodeRatio, 'retained descendant identity').toBeGreaterThanOrEqual(
        scenario.budget.retainedNodeRatio ?? 0.9,
      );
      expect(result.dirtyAreaRatio, 'approximated dirty rectangle / host area').toBeLessThanOrEqual(
        scenario.budget.dirtyAreaRatio,
      );
    });
  }
});
