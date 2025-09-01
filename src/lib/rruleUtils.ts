import { RRule } from 'rrule';

/**
 * Check if a recurring lesson occurs on a specific date based on its RRule
 */
export function doesRecurringLessonOccurOnDate(
  rruleString: string,
  lessonStartTime: Date,
  targetDate: Date
): boolean {
  try {
    // Parse the RRule
    const rrule = RRule.fromString(rruleString);
    
    // Normalize target date to start of day
    const normalizedTargetDate = new Date(targetDate);
    normalizedTargetDate.setHours(0, 0, 0, 0);
    
    // Get the start and end of the target date
    const startOfTargetDate = new Date(normalizedTargetDate);
    const endOfTargetDate = new Date(normalizedTargetDate);
    endOfTargetDate.setHours(23, 59, 59, 999);
    
    // Get all occurrences between start and end of target date
    const occurrences = rrule.between(startOfTargetDate, endOfTargetDate, true);
    
    // Check if any occurrence falls on the target date
    return occurrences.some(occurrence => {
      const occurrenceDate = new Date(occurrence);
      occurrenceDate.setHours(0, 0, 0, 0);
      return occurrenceDate.getTime() === normalizedTargetDate.getTime();
    });
  } catch (error) {
    console.error('Error parsing RRule:', error, 'RRule string:', rruleString);
    
    // Fallback: check day of week manually
    return fallbackDayCheck(lessonStartTime, targetDate);
  }
}

/**
 * Fallback method to check day of week when RRule parsing fails
 */
function fallbackDayCheck(lessonStartTime: Date, targetDate: Date): boolean {
  const lessonDay = lessonStartTime.getDay();
  const targetDay = targetDate.getDay();
  return lessonDay === targetDay;
}

/**
 * Get the day of week as a Prisma Day enum value
 */
export function getDayFromDate(date: Date): "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" {
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const dayName = days[date.getDay()];
  return dayName as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
}

/**
 * Check if a date is within the lesson's active period
 */
export function isDateWithinLessonPeriod(
  lessonStartTime: Date,
  targetDate: Date,
  rruleString?: string
): boolean {
  // The lesson must start before or on the target date
  const lessonStart = new Date(lessonStartTime);
  lessonStart.setHours(0, 0, 0, 0);
  
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  if (lessonStart > target) {
    return false;
  }
  
  // If there's an RRule with an UNTIL date, check if target is before the end
  if (rruleString) {
    try {
      const rrule = RRule.fromString(rruleString);
      if (rrule.options.until && target > rrule.options.until) {
        return false;
      }
    } catch (error) {
      console.error('Error checking RRule until date:', error);
    }
  }
  
  return true;
}
