import prisma from "./prisma";
import { Prisma, PaymentType } from "@prisma/client";

interface DateFilter {
  startDate: Date;
  endDate: Date;
  gradeId?: number;
}

interface StudentCountFilter extends DateFilter {
  subjectId?: number;
}

export async function getTrialConversionRate(filters: DateFilter) {
  const { startDate, endDate, gradeId } = filters;

  try {
    // Check if StudentStatusHistory table exists and has data
    const historyExists = await prisma.studentStatusHistory.findFirst();
    
    if (!historyExists) {
      // If no history data exists, return zero conversion rate
      return {
        trialCount: 0,
        convertedCount: 0,
        conversionRate: 0,
      };
    }

    // Get students who converted from TRIAL to CURRENT in the period
    const conversions = await prisma.studentStatusHistory.count({
      where: {
        fromStatus: "TRIAL",
        toStatus: "CURRENT",
        changedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(gradeId && {
          student: {
            gradeId: gradeId,
          },
        }),
      },
    });

    // Get total number of students who were TRIAL at some point in the period
    const totalTrialStudents = await prisma.studentStatusHistory.groupBy({
      by: ['studentId'],
      where: {
        toStatus: "TRIAL",
        changedAt: {
          lte: endDate, // Started as trial before or during period
        },
        ...(gradeId && {
          student: {
            gradeId: gradeId,
          },
        }),
      },
      _count: {
        studentId: true,
      },
    });

    const trialCount = totalTrialStudents.length;
    const conversionRate = trialCount > 0 ? (conversions / trialCount) * 100 : 0;

    return {
      trialCount,
      convertedCount: conversions,
      conversionRate,
    };
  } catch (error) {
    console.error('Error getting trial conversion rate:', error);
    // Return fallback values if there's an error
    return {
      trialCount: 0,
      convertedCount: 0,
      conversionRate: 0,
    };
  }
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

  // Get trial conversion rate
  const trialConversion = await getTrialConversionRate(filters);

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
    trialConversionRate: trialConversion.conversionRate,
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

  // Get actual payment type data by joining with parent
  const paymentTypeData = await prisma.parent.groupBy({
    by: ["paymentType"],
    where: {
      students: {
        some: where,
      },
    },
    _count: {
      _all: true,
    },
  }) as Array<{
    paymentType: PaymentType;
    _count: { _all: number };
  }>;

  console.log('Payment type data from DB:', paymentTypeData);

  const total = paymentTypeData.reduce((sum, item) => sum + item._count._all, 0);

  const result = paymentTypeData
    .map(item => ({
      paymentType: item.paymentType,
      count: item._count._all,
      percentage: total > 0 ? (item._count._all / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  console.log('Formatted payment stats:', result);

  return result;
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

export async function getStudentCountTrends(filters: StudentCountFilter) {
  const { startDate, endDate, gradeId, subjectId } = filters;

  // Generate monthly data between start and end dates
  const months: StudentCountData[] = [];
  const current = new Date(startDate);
  current.setDate(1); // Start of month

  while (current <= endDate) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    // Build where clause with optional filters
    const baseWhere: Prisma.StudentWhereInput = {
      createdAt: {
        lte: monthEnd,
      },
    };

    if (gradeId) {
      baseWhere.gradeId = gradeId;
    }

    if (subjectId) {
      baseWhere.classes = {
        some: {
          class: {
            OR: [
              {
                lessons: {
                  some: {
                    subjectId: subjectId,
                  },
                },
              },
              {
                RecurringLesson: {
                  some: {
                    subjectId: subjectId,
                  },
                },
              },
            ],
          },
        },
      };
    }

    // Count students by status at the end of each month
    const [totalCount, currentCount, trialCount, disenrolledCount] = await Promise.all([
      prisma.student.count({
        where: baseWhere,
      }),
      prisma.student.count({
        where: {
          ...baseWhere,
          status: "CURRENT",
          OR: [
            { updatedAt: { gte: monthStart } },
            { updatedAt: { lte: monthEnd } },
          ],
        },
      }),
      prisma.student.count({
        where: {
          ...baseWhere,
          status: "TRIAL",
        },
      }),
      prisma.student.count({
        where: {
          ...baseWhere,
          status: "DISENROLLED",
          updatedAt: {
            lte: monthEnd,
          },
        },
      }),
    ]);

    months.push({
      month: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      total: totalCount - disenrolledCount,
      current: currentCount,
      trial: trialCount,
    });

    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

interface StudentCountData {
  month: string;
  total: number;
  current: number;
  trial: number;
}

interface EnrollmentData {
  month: string;
  enrolled: number;
  disenrolled: number;
  net: number;
}
