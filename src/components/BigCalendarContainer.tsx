import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";

// Helper function to adjust schedule dates to current week with proper timezone handling
const adjustScheduleToCurrentWeek = (data: any[]) => {
  const currentDate = new Date();
  
  // Get the start of the current week (Sunday = 0, Monday = 1, etc.)
  // Adjust this based on your locale preference
  const currentWeekStart = new Date(currentDate);
  const dayOfWeek = currentDate.getDay();
  currentWeekStart.setDate(currentDate.getDate() - dayOfWeek);
  currentWeekStart.setHours(0, 0, 0, 0);

  return data.map((item) => {
    // Ensure we're working with proper Date objects
    const itemStartDate = new Date(item.start);
    const itemEndDate = new Date(item.end);
    
    // Get the day of week from the original date
    const originalDayOfWeek = itemStartDate.getDay();
    
    // Create new date for the current week
    const newStartDate = new Date(currentWeekStart);
    newStartDate.setDate(currentWeekStart.getDate() + originalDayOfWeek);
    newStartDate.setHours(
      itemStartDate.getHours(), 
      itemStartDate.getMinutes(), 
      itemStartDate.getSeconds(), 
      itemStartDate.getMilliseconds()
    );

    const newEndDate = new Date(currentWeekStart);
    newEndDate.setDate(currentWeekStart.getDate() + originalDayOfWeek);
    newEndDate.setHours(
      itemEndDate.getHours(), 
      itemEndDate.getMinutes(), 
      itemEndDate.getSeconds(), 
      itemEndDate.getMilliseconds()
    );

    return {
      ...item,
      start: newStartDate,
      end: newEndDate,
    };
  });
};

const BigCalendarContainer = async ({
  type,
  id,
  showNotifications = false,
}: {
  type?: "teacherId" | "classId";
  id?: string | number;
  showNotifications?: boolean;
} = {}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Validate the id parameter
  if (id && type === "classId" && (typeof id === 'string' && (id === '' || isNaN(parseInt(id))))) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Invalid or missing ID</p>
      </div>
    );
  }

  // Build the where clause for lessons based on the parameters
  let lessonsWhereClause = {};

  if (type && id) {
    // Specific teacher or class view
    lessonsWhereClause = type === "teacherId"
      ? { teacherId: id as string }
      : { classId: id as number };
  } else {
    // Default to show all lessons if no type/id is provided or for admin role
    lessonsWhereClause = {};
  }

  // Fetch lessons
  const lessonsRes = await prisma.lesson.findMany({
    where: lessonsWhereClause,
    include: {
      subject: true,
      teacher: true,
      class: true,
    },
  });

  // Build the where clause for events based on role
  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { studentId: userId! } } },
    parent: { students: { some: {student: { parentId: userId! } } }},
  };

  let eventsWhereClause = {};
  if (role !== "admin") {
    eventsWhereClause = {
      OR: [
        { classId: null }, // School-wide events
        { class: roleConditions[role as keyof typeof roleConditions] || {} },
      ],
    };
  }

  // Fetch events
  const eventsRes = await prisma.event.findMany({
    where: eventsWhereClause,
    include: {
      class: true,
    },
  });

  // Transform lessons data with proper date handling
  const lessonsData = lessonsRes.map((lesson) => ({
    title: `${lesson.subject.name} - ${lesson.name}`,
    start: new Date(lesson.startTime), // Ensure proper Date object
    end: new Date(lesson.endTime),     // Ensure proper Date object
    subject: lesson.subject.name,
    teacher: `${lesson.teacher.name} ${lesson.teacher.surname}`,
    classroom: lesson.class.name,
    description: `${lesson.subject.name} lesson with ${lesson.teacher.name} ${lesson.teacher.surname}`,
    lessonId: lesson.id,
    type: 'lesson' as const,
  }));

  // Transform events data with proper date handling
  const eventsData = eventsRes.map((event) => ({
    title: event.title,
    start: new Date(event.startTime), // Ensure proper Date object
    end: new Date(event.endTime),     // Ensure proper Date object
    subject: undefined,
    teacher: undefined,
    classroom: event.class?.name || 'School Wide',
    description: event.description || `${event.title} event`,
    eventId: event.id,
    type: 'event' as const,
  }));

  // Adjust both lessons and events to current week
  const adjustedLessons = adjustScheduleToCurrentWeek(lessonsData);
  const adjustedEvents = adjustScheduleToCurrentWeek(eventsData);

  return (
    <div className="h-full overflow-hidden">
      <BigCalendar 
        data={adjustedLessons} 
        events={adjustedEvents}
        showNotifications={showNotifications} 
      />
    </div>
  );
};

export default BigCalendarContainer;