import type { CalendarEvent, CascaderOption, TreeNode } from './types';

type TreeLike = CascaderOption | TreeNode;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Validate recursively nested `{ value, label, children? }` data. */
export function isTreeData(value: unknown): value is TreeLike[] {
  if (!Array.isArray(value)) return false;
  return value.every((node) => {
    if (!isRecord(node) || typeof node['value'] !== 'string' || typeof node['label'] !== 'string') {
      return false;
    }
    const children = node['children'];
    return children === undefined || isTreeData(children);
  });
}

/** Validate calendar event data before it reaches the rendering loop. */
export function isCalendarEvents(value: unknown): value is CalendarEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (event) =>
        isRecord(event) && typeof event['date'] === 'string' && typeof event['title'] === 'string',
    )
  );
}
