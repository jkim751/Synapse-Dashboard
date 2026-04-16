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
