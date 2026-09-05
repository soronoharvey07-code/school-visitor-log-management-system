export const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Safely parse any date value (timestamp number, ISO string, SQLite datetime string, UTC string)
 * into milliseconds epoch time (UTC).
 * Explicitly treats SQLite's 'YYYY-MM-DD HH:MM:SS' format as UTC so local browser time zones
 * do not cause unexpected hour offsets.
 */
export function parseToMs(val: any): number {
  if (val === null || val === undefined || val === '') return Date.now();
  if (typeof val === 'number') return isNaN(val) ? Date.now() : val;
  if (val instanceof Date) return val.getTime();

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return Date.now();

    // Numeric timestamp string (e.g. "1787321640000")
    if (/^\d{10,15}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) return num;
    }

    // SQLite format "YYYY-MM-DD HH:MM:SS" (stored in UTC)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const iso = trimmed.replace(' ', 'T') + 'Z';
      const parsed = new Date(iso).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Format "YYYY-MM-DDTHH:MM:SS" without Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      const parsed = new Date(trimmed + 'Z').getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Standard ISO string with timezone or standard Date string
    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  return Date.now();
}

/**
 * Safely parses an optional date/timestamp value.
 * Returns undefined if the value is null, undefined, or empty.
 */
export function parseOptionalToMs(val: any): number | undefined {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') {
    return undefined;
  }
  if (typeof val === 'string' && !val.trim()) {
    return undefined;
  }
  return parseToMs(val);
}

/**
 * Returns Philippine time formatted with hours, minutes, and seconds (e.g. "02:45:12 PM").
 */
export function formatManilaTime(dateOrMs: Date | number | string = Date.now()): string {
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleTimeString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Returns Philippine time formatted with hours and minutes (e.g. "02:45 PM").
 */
export function formatManilaTimeShort(dateOrMs?: Date | number | string): string {
  if (!dateOrMs && dateOrMs !== 0) return '—';
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleTimeString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Returns Philippine date in full weekday and long month format (e.g. "Thursday, August 20, 2026").
 */
export function formatManilaFullDate(dateOrMs: Date | number | string = Date.now()): string {
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleDateString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Returns Philippine date with month, day, and year (e.g. "August 20, 2026").
 */
export function formatManilaDate(dateOrMs: Date | number | string = Date.now()): string {
  if (typeof dateOrMs === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrMs.trim())) {
    const [y, m, d] = dateOrMs.trim().split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dt.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleDateString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Returns Philippine date and time (e.g. "Aug 20, 2026, 02:45 PM").
 */
export function formatManilaDateTime(dateOrMs?: Date | number | string, fallback: string = '—'): string {
  if (!dateOrMs && dateOrMs !== 0) return fallback;
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Returns Philippine timestamp with seconds for reports and logs (e.g. "Aug 20, 2026, 02:45:12 PM").
 */
export function formatManilaReportTimestamp(dateOrMs: Date | number | string = Date.now()): string {
  const ms = parseToMs(dateOrMs);
  return new Date(ms).toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Returns date string "YYYY-MM-DD" corresponding to the Philippine time zone.
 */
export function getManilaDateString(dateOrMs: Date | number | string = Date.now()): string {
  const ms = parseToMs(dateOrMs);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date(ms)); // en-CA formats as YYYY-MM-DD
}

/**
 * Checks if a given timestamp falls on the same calendar day in the Philippine time zone.
 */
export function isSameManilaDay(
  timestamp1: Date | number | string,
  timestamp2: Date | number | string = Date.now()
): boolean {
  return getManilaDateString(timestamp1) === getManilaDateString(timestamp2);
}

/**
 * Checks if a given timestamp is within the last N calendar days in Manila time.
 */
export function isWithinManilaDays(timestamp: Date | number | string, days: number = 7): boolean {
  const targetMs = parseToMs(timestamp);
  const nowMs = Date.now();
  const diffDays = (nowMs - targetMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Checks if a given timestamp is within the current month in Manila time.
 */
export function isWithinManilaMonth(timestamp: Date | number | string): boolean {
  const targetDateStr = getManilaDateString(timestamp);
  const nowDateStr = getManilaDateString(Date.now());
  return targetDateStr.slice(0, 7) === nowDateStr.slice(0, 7); // Compare "YYYY-MM"
}
