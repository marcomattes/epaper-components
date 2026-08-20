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

export interface CalendarEvent {
  date: string;
  title: string;
}
