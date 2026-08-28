// Tiny date helpers shared by date-picker, time-picker, calendar.

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function parseYMD(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    return null;
  }
  return parsed;
}

/** Parse `HH:MM` (24-hour) into minutes since midnight; `null` when malformed. */
export function parseHM(s: string | null | undefined): number | null {
  if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return null;
  const [h, m] = s.split(':').map(Number) as [number, number];
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Inverse of {@link parseHM}: minutes since midnight back to `HH:MM`. */
export const hm = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  return `${pad2(Math.floor(clamped / 60))}:${pad2(clamped % 60)}`;
};
