// ...existing code...

import { StudentStatus } from "@prisma/client";
import prisma from "./prisma";

export async function updateStudentStatus(
  studentId: string,
  newStatus: StudentStatus,
  changedBy?: string,
  reason?: string
) {
  // Get current student data
  const currentStudent = await prisma.student.findUnique({
    where: { id: studentId },
    select: { status: true },
  });

  if (!currentStudent) {
    throw new Error("Student not found");
  }

  // Update student status and create history record in a transaction
  await prisma.$transaction([
    // Update the student status
    prisma.student.update({
      where: { id: studentId },
      data: { status: newStatus },
    }),
    
    // Create status history record
    prisma.studentStatusHistory.create({
      data: {
        studentId,
        fromStatus: currentStudent.status,
        toStatus: newStatus,
        changedBy,
        reason,
      },
    }),
  ]);
}

// ...existing code...
