import prisma from "./prisma";
import { Prisma } from "@prisma/client";

interface DateFilter {
  startDate: Date;
  endDate: Date;
  gradeId?: number;
}

export async function getStudentStats(filters: DateFilter) {
  const { startDate, endDate, gradeId } = filters;

  const where: Prisma.StudentWhereInput = {
    updatedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (gradeId) {
    where.gradeId = gradeId;
  }

  // Get total students in time period
  const totalStudents = await prisma.student.count({ where });

  // Get students by status
  const [currentStudents, trialStudents, disenrolledStudents] = await Promise.all([
    prisma.student.count({ where: { ...where, status: "CURRENT" } }),
    prisma.student.count({ where: { ...where, status: "TRIAL" } }),
    prisma.student.count({ where: { ...where, status: "DISENROLLED" } }),
  ]);

  // Calculate disenrollment rate
  const disenrollmentRate = totalStudents > 0 ? (disenrolledStudents / totalStudents) * 100 : 0;

  // Get average grade
  const gradeAvg = await prisma.student.aggregate({
    where,
    _avg: {
      gradeId: true,
    },
  });

  return {
    totalStudents,
    currentStudents,
    trialStudents,
    disenrolledStudents,
    disenrollmentRate,
    averageGrade: gradeAvg._avg.gradeId || 0,
  };
}

export async function getPaymentTypeStats(filters: DateFilter) {
  const { startDate, endDate, gradeId } = filters;

  const where: Prisma.StudentWhereInput = {
    updatedAt: {
      gte: startDate,
      lte: endDate,
    },
    parent: {
      isNot: null,
    },
  };

  if (gradeId) {
    where.gradeId = gradeId;
  }

  const paymentTypes = await prisma.student.groupBy({
    by: ["parentId"],
    where,
    _count: true,
  });

  // Get actual payment type data by joining with parent
  const paymentTypeData = await prisma.parent.groupBy({
    by: ["paymentType"],
    where: {
      students: {
        some: where,
      },
    },
    _count: true,
  });

  const total = paymentTypeData.reduce((sum, item) => sum + item._count, 0);

  return paymentTypeData.map(item => ({
    paymentType: item.paymentType,
    count: item._count,
    percentage: total > 0 ? (item._count / total) * 100 : 0,
  }));
}

export async function getEnrollmentStats(filters: DateFilter) {
  const { startDate, endDate } = filters;

  // Generate monthly data between start and end dates
  const months: EnrollmentData[] = [];
  const current = new Date(startDate);
  current.setDate(1); // Start of month

  while (current <= endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    // Count students created (enrolled) in this month
    const enrolled = await prisma.student.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Count students that were disenrolled in this month
    const disenrolled = await prisma.student.count({
      where: {
        status: "DISENROLLED",
        updatedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    months.push({
      month: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      enrolled,
      disenrolled: -disenrolled, // Negative for chart display
      net: enrolled - disenrolled,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

interface EnrollmentData {
  month: string;
  enrolled: number;
  disenrolled: number;
  net: number;
}
