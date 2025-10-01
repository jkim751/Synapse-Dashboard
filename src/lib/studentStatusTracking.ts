import prisma from "./prisma";
import { StudentStatus } from "@prisma/client";

interface UpdateStudentStatusParams {
  studentId: string;
  newStatus: StudentStatus;
  changedBy?: string;
  reason?: string;
}

/**
 * Updates a student's status and automatically tracks the change in history
 */
export async function updateStudentStatus({
  studentId,
  newStatus,
  changedBy,
  reason
}: UpdateStudentStatusParams) {
  // Get current student data
  const currentStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true }
  });

  if (!currentStudent) {
    throw new Error("Student not found");
  }

  const oldStatus = currentStudent.status;

  // If status hasn't changed, no need to update
  if (oldStatus === newStatus) {
    return currentStudent;
  }

  // Update student status and create history entry in a transaction
  const [updatedStudent] = await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: { status: newStatus }
    }),
    prisma.studentStatusHistory.create({
      data: {
        studentId,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedBy,
        reason,
        changedAt: new Date()
      }
    })
  ]);

  return updatedStudent;
}

/**
 * Get status change history for a student
 */
export async function getStudentStatusHistory(studentId: string) {
  return prisma.studentStatusHistory.findMany({
    where: { studentId },
    orderBy: { changedAt: 'desc' },
    include: {
      student: {
        select: {
          name: true,
          surname: true
        }
      }
    }
  });
}
