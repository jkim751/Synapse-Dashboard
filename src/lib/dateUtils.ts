// Pre-fills datetime-local inputs with Singapore time (UTC+8).
// The browser may be in a different timezone, so we convert explicitly
// rather than using local getters.
export function formatDateTimeLocal(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;

  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgt = new Date(new Date(date).getTime() + SGT_OFFSET_MS);

  const year = sgt.getUTCFullYear();
  const month = String(sgt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sgt.getUTCDate()).padStart(2, '0');
  const hours = String(sgt.getUTCHours()).padStart(2, '0');
  const minutes = String(sgt.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ── Sydney (Australia/Sydney) timezone helpers ────────────────────────────────
// Used for admin shifts/events, which operate on Sydney local time (AEST +10 /
// AEDT +11). Unlike lessons (which use a fixed SGT +8 offset), Sydney observes
// daylight saving so we use Intl to get the correct offset at each moment.

/** Convert a UTC Date to a timezone-naive "YYYY-MM-DDTHH:MM:SS" string in Sydney local time. */
export function toSydneyString(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  // Some implementations return '24' for midnight — normalise to '00'
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}`;
}

/** Convert a UTC ISO string to "YYYY-MM-DDTHH:MM" in Sydney local time (for datetime-local inputs). */
export function toSydneyDatetimeLocal(isoString: string): string {
  return toSydneyString(new Date(isoString)).slice(0, 16);
}

/**
 * Interpret a "YYYY-MM-DDTHH:MM" string as Sydney local time and return a UTC ISO string.
 * Handles AEST (+10) and AEDT (+11) automatically.
 */
export function sydneyLocalToUTC(localStr: string): string {
  const [datePart, timePart] = localStr.split('T');
  const [Y, M, D] = datePart.split('-').map(Number);
  const [h, m] = (timePart ?? '00:00').split(':').map(Number);

  // Try AEST (UTC+10) first
  const candidate = new Date(Date.UTC(Y, M - 1, D, h - 10, m));
  // Verify: what does Sydney say this UTC moment is?
  const roundtrip = toSydneyString(candidate).slice(11, 13); // hour digits
  if (parseInt(roundtrip) === h) return candidate.toISOString();

  // Must be AEDT (UTC+11)
  return new Date(Date.UTC(Y, M - 1, D, h - 11, m)).toISOString();
}
