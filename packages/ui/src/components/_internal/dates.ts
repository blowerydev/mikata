/**
 * Internal date utilities used by Calendar, DatePicker, MonthPicker,
 * YearPicker, DateInput and TimeInput. Pure functions; no external deps.
 * Month indices are 0-based to match JS `Date`.
 */

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const targetMonth = r.getMonth() + n;
  r.setDate(1);
  r.setMonth(targetMonth);
  // Clamp to the last day of the target month if the original day overflows.
  const lastDay = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), lastDay));
  return r;
}

export function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  if (min && isBefore(d, min)) return min;
  if (max && isAfter(d, max)) return max;
  return d;
}

export function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = startOfDay(d).getTime();
  const lo = Math.min(startOfDay(start).getTime(), startOfDay(end).getTime());
  const hi = Math.max(startOfDay(start).getTime(), startOfDay(end).getTime());
  return t >= lo && t <= hi;
}

/** Locale's first day of week (0 = Sunday … 6 = Saturday). Defaults to 1 (Mon). */
export function getFirstDayOfWeek(locale: string): number {
  try {
    const info = (new Intl.Locale(locale) as unknown as {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    });
    const wi = info.getWeekInfo ? info.getWeekInfo() : info.weekInfo;
    if (wi?.firstDay) return wi.firstDay % 7; // ICU: Mon=1..Sun=7 → 0..6
  } catch { /* noop */ }
  return 1;
}

/**
 * Build a 6×7 grid of dates for the month containing `viewDate`, padded with
 * leading/trailing days from the adjacent months so the first column matches
 * `firstDayOfWeek`.
 */
export function getMonthMatrix(viewDate: Date, firstDayOfWeek = 1): Date[][] {
  const first = startOfMonth(viewDate);
  const offset = (first.getDay() - firstDayOfWeek + 7) % 7;
  const gridStart = addDays(first, -offset);
  const rows: Date[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) row.push(addDays(gridStart, r * 7 + c));
    rows.push(row);
  }
  return rows;
}

/** Short weekday labels ordered from `firstDayOfWeek`. */
export function getWeekdayLabels(locale: string, firstDayOfWeek = 1, format: 'narrow' | 'short' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: 'UTC' });
  // 2024-01-07 UTC is a Sunday — anchor for deterministic output regardless
  // of the host timezone.
  const sunday = new Date(Date.UTC(2024, 0, 7));
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(sunday);
    day.setUTCDate(sunday.getUTCDate() + ((firstDayOfWeek + i) % 7));
    labels.push(fmt.format(day));
  }
  return labels;
}

/** Month labels (Jan..Dec) in the given locale. */
export function getMonthLabels(locale: string, format: 'long' | 'short' = 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: format });
  const out: string[] = [];
  for (let i = 0; i < 12; i++) out.push(fmt.format(new Date(2024, i, 1)));
  return out;
}

/** Parse a strict `YYYY-MM-DD` string. Returns null on any error. */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  const date = new Date(y, mo, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo || date.getDate() !== d) return null;
  return date;
}

/** Format a Date as `YYYY-MM-DD`. */
export function formatISODate(d: Date): string {
  const y = d.getFullYear().toString().padStart(4, '0');
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format using Intl for display (e.g. "Jan 5, 2026"). */
export function formatDisplayDate(d: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

/** Decade range (inclusive) containing `year`, aligned to decades starting at years ending in 0. */
export function getDecadeRange(year: number): [number, number] {
  const start = Math.floor(year / 10) * 10;
  return [start, start + 9];
}
