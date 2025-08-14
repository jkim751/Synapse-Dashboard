import { PrismaClient, UserSex } from "@prisma/client";
import { RRule } from "rrule";

// Instantiate the client outside the main function
const prisma = new PrismaClient();

// --- Helper function for Production Data ---
async function seedProductionData() {
  console.log("Seeding essential production data...");

  // ADMIN
  await prisma.admin.createMany({
    data: [{ id: "admin1", username: "admin1" }, { id: "admin2", username: "admin2" }],
    skipDuplicates: true,
  });

  // GRADE
  const grades = [];
  for (let i = 9; i <= 12; i++) {
    grades.push({ level: i });
  }
  await prisma.grade.createMany({
    data: grades,
    skipDuplicates: true,
  });

  // SUBJECT
  const subjectData = [
    { name: "Math Prelim" }, { name: "Math Adv" }, { name: "Math Ext 1" },
    { name: "Math Ext 2" }, { name: "Math" }, { name: "English" },
    { name: "English Prelim" }, { name: "English Adv" }, { name: "English Ext 1" },
    { name: "English Ext 2" }, { name: "Physics" }, { name: "Chemistry" },
    { name: "Biology" }, { name: "Economics" },
  ];
  await prisma.subject.createMany({
    data: subjectData,
    skipDuplicates: true,
  });

  console.log("Production data seeded.");
}

// --- Helper function for Development Data ---
async function seedDevelopmentData() {
  console.log("Seeding development-only data...");
  
  // CLASS
  for (let i = 1; i <= 4; i++) {
    await prisma.class.create({
      data: {
        name: `${i}A`,
        gradeId: i,
        capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      },
    });
  }

  // Additional classes for demonstrating multi-class enrollment
  for (let i = 1; i <= 4; i++) {
    await prisma.class.create({
      data: {
        name: `${i}B`,
        gradeId: i,
        capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      },
    });
  }

  // TEACHER 
  for (let i = 1; i <= 15; i++) {
    await prisma.teacher.create({
      data: {
        id: `teacher${i}`, // Unique ID for the teacher
        username: `teacher${i}`,
        name: `TName${i}`,
        surname: `TSurname${i}`,
        email: `teacher${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        subjects: { connect: [{ id: (i % 14) + 1 }] },
        classes: { connect: [{ id: (i % 8) + 1 }] }, // Updated to work with 8 classes
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 30)),
      },
    });
  }

  // --- REPLACED LESSON SEEDING LOGIC ---
  console.log("Seeding single and recurring lessons...");

  // Let's create a few one-off, single lessons (e.g., a special guest lecture)
  await prisma.lesson.create({
    data: {
      name: "Special Guest Lecture: Quantum Physics",
      // A specific date and time
      startTime: new Date("2025-10-15T13:00:00.000Z"),
      endTime: new Date("2025-10-15T14:30:00.000Z"),
      day: "TUESDAY", // Add the required day property
      subjectId: 11, // Physics
      classId: 3,    // 3A
      teacherId: "teacher5",
    },
  });

  // Now, let's create RECURRING lesson rules for a semester
  const today = new Date();
  const semesterStart = new Date(today.getFullYear(), 8, 1); // Start of Sept
  const semesterEnd = new Date(today.getFullYear(), 11, 20); // End of Dec

  // Recurring Lesson 1: Weekly Math for class 1A
  const mathRule = new RRule({
    freq: RRule.WEEKLY,
    byweekday: [RRule.MO], // Every Monday
    dtstart: semesterStart,
    until: semesterEnd,
  });
  await prisma.recurringLesson.create({
    data: {
      name: "Year 9 Advanced Maths",
      rrule: mathRule.toString(),
      startTime: new Date("1970-01-01T09:00:00.000Z"), // 9 AM
      endTime: new Date("1970-01-01T10:00:00.000Z"),   // 10 AM
      subjectId: 2, // Math Adv
      classId: 1,   // 1A
      teacherId: "teacher1",
    },
  });

  // Recurring Lesson 2: Weekly English for class 2A
  const englishRule = new RRule({
    freq: RRule.WEEKLY,
    byweekday: [RRule.TU, RRule.TH], // Every Tuesday and Thursday
    dtstart: semesterStart,
    until: semesterEnd,
  });
  await prisma.recurringLesson.create({
    data: {
      name: "Year 10 English Literature",
      rrule: englishRule.toString(),
      startTime: new Date("1970-01-01T11:00:00.000Z"), // 11 AM
      endTime: new Date("1970-01-01T12:00:00.000Z"),   // 12 PM
      subjectId: 8, // English Adv
      classId: 2,   // 2A
      teacherId: "teacher2",
    },
  });

  // Let's create an EXCEPTION: Cancel one of the recurring math lessons
  const firstMondayInOctober = new Date(today.getFullYear(), 9, 1); // October 1st
  // Find the first Monday in October
  while (firstMondayInOctober.getDay() !== 1) {
    firstMondayInOctober.setDate(firstMondayInOctober.getDate() + 1);
  }

  await prisma.lesson.create({
    data: {
      recurringLessonId: 1, // Link to the first recurring lesson
      isCancelled: true,    // Mark it as cancelled
      name: "Year 9 Advanced Maths (Cancelled)",
      // The start/end time must match the specific occurrence we are cancelling
      startTime: new Date(firstMondayInOctober.setUTCHours(9, 0, 0, 0)),
      endTime: new Date(firstMondayInOctober.setUTCHours(10, 0, 0, 0)),
      day: "MONDAY", // Add the required day property
    }
  });
;

// PARENT
for (let i = 1; i <= 25; i++) {
  await prisma.parent.create({
    data: {
      id: `parentId${i}`,
      username: `parentId${i}`,
      name: `PName ${i}`,
      surname: `PSurname ${i}`,
      email: `parent${i}@example.com`,
      phone: `123-456-789${i}`,
      address: `Address${i}`,
    },
  });
}

// STUDENT - Updated to remove direct classId
for (let i = 1; i <= 50; i++) {
  await prisma.student.create({
    data: {
      id: `student${i}`,
      username: `student${i}`,
      name: `SName${i}`,
      surname: `SSurname ${i}`,
      email: `student${i}@example.com`,
      phone: `987-654-321${i}`,
      address: `Address${i}`,
      sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
      parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`,
      gradeId: (i % 4) + 1,
      // Removed classId from here
      birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
    },
  });
}

// STUDENT-CLASS RELATIONSHIPS - Create many-to-many relationships
for (let i = 1; i <= 50; i++) {
  const gradeId = (i % 4) + 1;

  // Primary class (A class)
  await prisma.studentClass.create({
    data: {
      studentId: `student${i}`,
      classId: gradeId, // A class (1-4)
      isPrimary: true,
    },
  });

  // Some students (30%) are enrolled in multiple classes (B class as well)
  if (i % 3 === 0) {
    await prisma.studentClass.create({
      data: {
        studentId: `student${i}`,
        classId: gradeId + 4, // B class (5-8)
        isPrimary: false,
      },
    });
  }
}

// EXAM
for (let i = 1; i <= 10; i++) {
  await prisma.exam.create({
    data: {
      title: `Exam ${i}`,
      startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
      lessonId: (i % 30) + 1,
    },
  });
}

// ASSIGNMENT
for (let i = 1; i <= 10; i++) {
  await prisma.assignment.create({
    data: {
      title: `Assignment ${i}`,
      startDate: new Date(new Date().setHours(new Date().getHours() + 1)),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      lessonId: (i % 30) + 1,
    },
  });
}

// RESULT
for (let i = 1; i <= 10; i++) {
  await prisma.result.create({
    data: {
      title: i <= 5 ? `Exam ${i} Result` : `Assignment ${i - 5} Result`,
      score: 90,
      studentId: `student${i}`,
      ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }),
    },
  });
}

// ATTENDANCE
for (let i = 1; i <= 10; i++) {
  await prisma.attendance.create({
    data: {
      date: new Date(),
      present: true,
      studentId: `student${i}`,
      lessonId: (i % 30) + 1,
    },
  });
}

// EVENT
for (let i = 1; i <= 5; i++) {
  await prisma.event.create({
    data: {
      title: `Event ${i}`,
      description: `Description for Event ${i}`,
      startTime: new Date(new Date().setHours(new Date().getHours() + 1)),
      endTime: new Date(new Date().setHours(new Date().getHours() + 2)),
      classId: (i % 8) + 1, // Updated to work with 8 classes
    },
  });
}

// ANNOUNCEMENT
for (let i = 1; i <= 5; i++) {
  await prisma.announcement.create({
    data: {
      title: `Announcement ${i}`,
      description: `Description for Announcement ${i}`,
      date: new Date(),
      classId: (i % 8) + 1, // Updated to work with 8 classes
    },
  });
}

// NOTIFICATION
for (let i = 1; i <= 15; i++) {
  await prisma.notification.create({
    data: {
      title: `Notification ${i}`,
      message: i <= 5
        ? `Student student${i} is running late for lesson ${i}`
        : i <= 10
          ? `Assignment ${i - 5} has been submitted by student${i - 5}`
          : `Exam ${i - 10} reminder for tomorrow`,
      type: i <= 5 ? "LATE" : i <= 10 ? "ASSIGNMENT" : "EXAM",
      recipientId: i <= 5
        ? `teacher${(i % 15) + 1}`
        : i <= 10
          ? `teacher${((i - 5) % 15) + 1}`
          : `student${i - 10}`,
      recipientType: i <= 10 ? "TEACHER" : "STUDENT",
      isRead: i % 3 === 0, // Some notifications are read
      lessonId: i <= 5 ? i : null,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
    },
  });
}


console.log("Development data seeded.");

// Create a single async function to contain all logic
async function main() {
  console.log(`Start seeding ...`);

  // --- Part 1: Essential Production Data ---
  await seedProductionData();

  // --- Part 2: Development-Only Fake Data ---
  if (process.env.NODE_ENV !== 'production') {
    await seedDevelopmentData();
  }

  console.log(`Seeding finished.`);

}
// --- Execute the main function ---
main()
  .catch((e) => {
    console.error("An error occurred during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect from the database
    await prisma.$disconnect();
  });
}