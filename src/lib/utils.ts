import prisma from "./prisma";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { currentUser } from "@clerk/nextjs/server"

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

// Helper function to get events for a specific user
export const getEventsForUser = async (userId: string, role: string) => {
  const currentDate = new Date();
  
  let baseWhere: any = {
    startTime: {
      gte: currentDate,
    },
  };

  // Build the where clause based on user role
  if (role === "teacher" || role === "admin") {
    baseWhere.OR = [
      // Events for everyone (no specific class, users, or grades)
      {
        AND: [
          { classId: null },
          { eventUsers: { none: {} } },
          { eventGrades: { none: {} } }
        ]
      },
      // Events specifically assigned to this user
      {
        eventUsers: {
          some: {
            userId: userId
          }
        }
      }
    ];

    // For teachers, also include events for classes they teach
    if (role === "teacher") {
      baseWhere.OR.push({
        class: {
          lessons: {
            some: {
              teacherId: userId
            }
          }
        }
      });
    }
  } else if (role === "student") {
    // Get student's grade and classes
    const student = await prisma.student.findUnique({
      where: { id: userId },
      include: {
        grade: true,
        classes: {
          select: { classId: true }
        }
      }
    });

    if (!student) return [];

    baseWhere.OR = [
      // Events for everyone
      {
        AND: [
          { classId: null },
          { eventUsers: { none: {} } },
          { eventGrades: { none: {} } }
        ]
      },
      // Events for student's grade
      {
        eventGrades: {
          some: {
            gradeId: student.gradeId
          }
        }
      },
      // Events for student's classes
      {
        classId: {
          in: student.classes.map((sc: { classId: any; }) => sc.classId)
        }
      }
    ];
  } else if (role === "parent") {
    // Get children's grades and classes
    const children = await prisma.student.findMany({
      where: { parentId: userId },
      include: {
        grade: true,
        classes: {
          select: { classId: true }
        }
      }
    });

    if (children.length === 0) return [];

    const childGradeIds = [...new Set(children.map((child: { gradeId: any; }) => child.gradeId))];
    const childClassIds = [...new Set(children.flatMap((child: { classes: any[]; }) => child.classes.map((sc: { classId: any; }) => sc.classId)))];

    baseWhere.OR = [
      // Events for everyone
      {
        AND: [
          { classId: null },
          { eventUsers: { none: {} } },
          { eventGrades: { none: {} } }
        ]
      },
      // Events for children's grades
      {
        eventGrades: {
          some: {
            gradeId: {
              in: childGradeIds
            }
          }
        }
      },
      // Events for children's classes
      {
        classId: {
          in: childClassIds
        }
      }
    ];
  }

  return await prisma.event.findMany({
    where: baseWhere,
    include: {
      class: true,
      eventUsers: true,
      eventGrades: {
        include: {
          grade: true
        }
      }
    },
    orderBy: {
      startTime: 'asc'
    }
  });
};

// Utility function to merge class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to get user's photo from database or Clerk
export async function getUserPhoto(userId: string, userRole: string): Promise<string | null> {
  try {
    let dbPhoto = null;
    
    // Get photo from database based on role
    switch (userRole) {
      case "admin":
        const admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { img: true }
        });
        dbPhoto = admin?.img;
        break;
      case "teacher":
        const teacher = await prisma.teacher.findUnique({
          where: { id: userId },
          select: { img: true }
        });
        dbPhoto = teacher?.img;
        break;
      case "student":
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { img: true }
        });
        dbPhoto = student?.img;
        break;
    }
    
    // Return database photo if it exists
    if (dbPhoto) {
      return dbPhoto;
    }
    
    // Fall back to Clerk photo
    const user = await currentUser();
    return user?.imageUrl || null;
  } catch (error) {
    console.error("Error getting user photo:", error);
    return null;
  }
}

// Function to sync Clerk photo to database
export async function syncClerkPhotoToDatabase(userId: string, userRole: string, clerkPhotoUrl: string) {
  try {
    switch (userRole) {
      case "admin":
        await prisma.admin.update({
          where: { id: userId },
          data: { img: clerkPhotoUrl }
        });
        break;
      case "teacher":
        await prisma.teacher.update({
          where: { id: userId },
          data: { img: clerkPhotoUrl }
        });
        break;
      case "student":
        await prisma.student.update({
          where: { id: userId },
          data: { img: clerkPhotoUrl }
        });
        break;
    }
  } catch (error) {
    console.error("Error syncing Clerk photo to database:", error);
  }
}