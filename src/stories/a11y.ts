import { expect } from 'storybook/test';
import axe from 'axe-core';

async function settleStoryDom(element: HTMLElement): Promise<void> {
  const tagNames = new Set<string>();
  for (const node of element.querySelectorAll('*')) {
    const tag = node.tagName.toLowerCase();
    if (tag.includes('-')) tagNames.add(tag);
  }

  await Promise.all([...tagNames].map((tag) => customElements.whenDefined(tag)));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

export async function checkA11y(element: HTMLElement): Promise<void> {
  await settleStoryDom(element);
  const results = await axe.run(element, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'best-practice'] },
  });
  const violations = results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.description} — ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations, 'Accessibility violations').toEqual([]);
}
