// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

export const adjustScheduleToCurrentWeek = (
  lessons: {
    title: string;
    start: Date;
    end: Date;
    subject?: string;
    teacher?: string;
    classroom?: string;
    description?: string;
    lessonId?: number;
  }[]
): {
  title: string;
  start: Date;
  end: Date;
  subject?: string;
  teacher?: string;
  classroom?: string;
  description?: string;
  lessonId?: number;
}[] => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get the first day of current month
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

  // Get the last day of current month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  // Generate events for the entire current month
  const adjustedLessons: typeof lessons = [];

  lessons.forEach((lesson) => {
    const lessonDayOfWeek = lesson.start.getDay();

    // Find all occurrences of this day of week in the current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const currentDate = new Date(currentYear, currentMonth, day);
      
      if (currentDate.getDay() === lessonDayOfWeek) {
        const startTime = new Date(lesson.start);
        const endTime = new Date(lesson.end);

        const newStart = new Date(
          currentYear,
          currentMonth,
          day,
          startTime.getHours(),
          startTime.getMinutes(),
          startTime.getSeconds()
        );

        const newEnd = new Date(
          currentYear,
          currentMonth,
          day,
          endTime.getHours(),
          endTime.getMinutes(),
          endTime.getSeconds()
        );

        adjustedLessons.push({
          ...lesson,
          start: newStart,
          end: newEnd,
        });
      }
    }
  });

  return adjustedLessons;
};