/**
 * Parses a datetime-local string (YYYY-MM-DDTHH:mm) as local time
 * and returns a Date object adjusted to represent that exact local time in UTC
 */
export function parseLocalDateTimeToUTC(dateTimeString: string): Date {
  const [datePart, timePart] = dateTimeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a date in local timezone
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  // Get the timezone offset in minutes
  const offsetMinutes = localDate.getTimezoneOffset();
  
  // Adjust by adding the offset to get UTC representation of local time
  const utcDate = new Date(localDate.getTime() - (offsetMinutes * 60 * 1000));
  
  return utcDate;
}

/**
 * Converts a UTC Date from database back to local time representation
 */
export function utcToLocalDate(utcDate: Date): Date {
  const offsetMinutes = utcDate.getTimezoneOffset();
  return new Date(utcDate.getTime() + (offsetMinutes * 60 * 1000));
}

/**
 * Formats a Date object to datetime-local input format (YYYY-MM-DDTHH:mm)
 */
export function formatDateTimeLocal(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
