import type { CalendarEvent, CascaderOption, EventLogEntry, TreeNode } from './types';

type TreeLike = CascaderOption | TreeNode;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** An optional field is valid when it is absent or a string. */
const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

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

/**
 * Validate calendar event data before it reaches the rendering loop.
 *
 * The optional `start`/`end`/`status` fields are only type-checked here, not
 * range-checked: a malformed time or an unfamiliar status downgrades that one
 * event to an all-day, status-less entry in the renderer instead of throwing
 * the whole array away.
 */
export function isCalendarEvents(value: unknown): value is CalendarEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (event) =>
        isRecord(event) &&
        typeof event['date'] === 'string' &&
        typeof event['title'] === 'string' &&
        isOptionalString(event['start']) &&
        isOptionalString(event['end']) &&
        isOptionalString(event['status']),
    )
  );
}

/** Validate event-log rows before they reach the keyed patch loop. */
export function isEventLogEntries(value: unknown): value is EventLogEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry['id'] === 'string' &&
        typeof entry['ts'] === 'string' &&
        typeof entry['message'] === 'string' &&
        isOptionalString(entry['severity']) &&
        isOptionalString(entry['source']) &&
        (entry['acknowledged'] === undefined || typeof entry['acknowledged'] === 'boolean'),
    )
  );
}
