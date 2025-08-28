import prisma from './prisma';

export async function checkAndNotifyLateStudents() {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find lessons that started in the last 15 minutes and haven't ended yet
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    
    const ongoingLessons = await prisma.lesson.findMany({
      where: {
        startTime: {
          gte: fifteenMinutesAgo,
          lte: now,
        },
        endTime: {
          gt: now,
        },
        isCancelled: false,
      },
      include: {
        class: {
          include: {
            students: {
              include: {
                student: true,
              },
            },
          },
        },
        teacher: true,
        subject: true,
        attendances: {
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
        },
      },
    });

    console.log(`Found ${ongoingLessons.length} ongoing lessons`);

    for (const lesson of ongoingLessons) {
      if (!lesson.class || !lesson.teacher) continue;

      const studentsInClass = lesson.class.students.map(sc => sc.student);
      const attendedStudents = lesson.attendances.map(att => att.studentId);
      
      const unattendedStudents = studentsInClass.filter(
        student => !attendedStudents.includes(student.id)
      );

      console.log(`Lesson ${lesson.id}: ${studentsInClass.length} students, ${attendedStudents.length} attended, ${unattendedStudents.length} unattended`);

      if (unattendedStudents.length > 0) {
        // Check if we already sent a notification for this lesson
        const existingNotification = await prisma.notification.findFirst({
          where: {
            recipientId: lesson.teacher.id,
            lessonId: lesson.id,
            type: 'late_student',
            createdAt: {
              gte: today,
            },
          },
        });

        if (!existingNotification) {
          // Create notification for the teacher
          const unattendedStudentNames = unattendedStudents
            .map(s => `${s.name} ${s.surname}`)
            .join(', ');

          await prisma.notification.create({
            data: {
              title: 'Students Not Yet Present',
              message: `The following students have not been marked present for ${lesson.subject?.name || 'the lesson'} in ${lesson.class.name}: ${unattendedStudentNames}`,
              recipientId: lesson.teacher.id,
              type: 'late_student',
              lessonId: lesson.id,
            },
          });

          console.log(`Created late notification for lesson ${lesson.id} with ${unattendedStudents.length} unattended students`);
        } else {
          console.log(`Notification already exists for lesson ${lesson.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for late students:', error);
  }
}
