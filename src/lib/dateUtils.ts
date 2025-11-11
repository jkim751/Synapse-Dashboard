/**
 * Formats a Date object to datetime-local input format (YYYY-MM-DDTHH:mm)
 * This function is still useful for pre-filling forms.
 */
export function formatDateTimeLocal(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  
  // Create a date object from the UTC date from the DB
  const d = new Date(date);

  // Extract UTC components to create a "local" representation
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
