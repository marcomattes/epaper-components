// Shared types for component events and detail payloads.

export type EChangeDetail<T = string> = { value: T };

export type EChangeEvent<T = string> = CustomEvent<EChangeDetail<T>>;

export interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
}

export interface TreeNode {
  value: string;
  label: string;
  children?: TreeNode[];
}

/** Lifecycle state of a calendar entry, rendered as a shape/label cue. */
export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

/**
 * A dated entry shared by `<e-calendar>` and `<e-agenda>`.
 *
 * `date` and `title` are the V1.0 contract and stay required. The time and
 * status fields are additive: an event without `start` is an all-day entry,
 * one without `end` is treated as a point in time by `<e-agenda>`, and both
 * are ignored by `<e-calendar>`, which only ever renders the title chip.
 */
export interface CalendarEvent {
  date: string;
  title: string;
  /** Start time as `HH:MM` (24-hour). Omit for an all-day entry. */
  start?: string;
  /** End time as `HH:MM` (24-hour). Omit for a zero-length entry. */
  end?: string;
  /** Optional lifecycle state. Unknown values render without a status cue. */
  status?: CalendarEventStatus;
}

/** Severity ranking used by `<e-event-log>` rows. */
export type EventLogSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * One row of an `<e-event-log>`. `id` is the identity used for keyed
 * patching: a row whose `id` is already rendered is updated in place instead
 * of being torn down and rebuilt.
 */
export interface EventLogEntry {
  id: string;
  /** ISO 8601 timestamp of the event. */
  ts: string;
  message: string;
  /** Defaults to `info` when omitted or unknown. */
  severity?: EventLogSeverity;
  /** Originating machine, sensor or subsystem. */
  source?: string;
  /** Whether an operator has acknowledged the event. */
  acknowledged?: boolean;
}
