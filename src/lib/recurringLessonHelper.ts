import { RecurringLesson } from "@prisma/client";

export function doesRecurringLessonOccurOnDate(
  recurringLesson: RecurringLesson,
  date: Date
): boolean {
  try {
    // Parse the RRULE to determine if the lesson occurs on the given date
    const rrule = recurringLesson.rrule;
    
    // For now, we'll implement a simple day-based check
    // You might want to use a proper RRULE parser like 'rrule' package for complex rules
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const currentDay = dayNames[dayOfWeek];
    
    // Simple check - if the RRULE contains the current day
    if (rrule.includes(`BYDAY=${currentDay}`) || rrule.includes(`BYDAY=`)) {
      return rrule.includes(currentDay);
    }
    
    // Fallback: assume weekly recurring lessons match the pattern
    // You should implement proper RRULE parsing here
    return true;
  } catch (error) {
    console.error('Error parsing recurring lesson rule:', error);
    return false;
  }
}

export function getRecurringLessonsForDate(
  recurringLessons: RecurringLesson[],
  date: Date
): RecurringLesson[] {
  return recurringLessons.filter(lesson => 
    doesRecurringLessonOccurOnDate(lesson, date)
  );
}