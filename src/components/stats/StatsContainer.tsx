import { getStudentStats, getPaymentTypeStats, getEnrollmentStats, getStudentCountTrends, getTrialConversionTrend } from "@/lib/stats";
import StatsFilters from "./StatsFilters";
import CombinedChartCarousel from "./CombinedChartCarousel";
import StatsCards from "./StatsCards";
import UserCard from "@/components/UserCard";
import prisma from "@/lib/prisma";

interface StatsContainerProps {
  searchParams: { [key: string]: string | undefined };
}

const StatsContainer = async ({ searchParams }: StatsContainerProps) => {
  const { startDate, endDate, gradeId, subjectId, teacherId } = searchParams;

  const dateFilter = {
    startDate: startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
    endDate: endDate ? new Date(endDate) : new Date(),
  };

  const filters = {
    ...dateFilter,
    gradeId: gradeId ? parseInt(gradeId) : undefined,
  };

  const studentCountFilters = {
    ...filters,
    subjectId: subjectId ? parseInt(subjectId) : undefined,
    teacherId: teacherId || undefined,
  };

  // Fetch all stats data and filter options
  const [studentStats, paymentStats, enrollmentStats, studentCountStats, conversionTrend, grades, subjects, teachers] = await Promise.all([
    getStudentStats(filters),
    getPaymentTypeStats(filters),
    getEnrollmentStats(filters),
    getStudentCountTrends(studentCountFilters),
    getTrialConversionTrend(filters),
    prisma.grade.findMany({
      orderBy: { level: 'asc' },
      select: { id: true, level: true }
    }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    }),
    prisma.teacher.findMany({
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      select: { id: true, name: true, surname: true }
    }),
  ]);

  return (
    <div className="mt-4 space-y-4">
      {/* User Cards */}
      <div className="flex gap-4 justify-between flex-wrap">
        <UserCard type="admin" />
        <UserCard type="teacher" />
        <UserCard type="student" />
        <UserCard type="parent" />
        <UserCard type="enrollment" />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-md">
        <StatsFilters searchParams={searchParams} />
      </div>

      {/* Combined Chart Carousel */}
      <CombinedChartCarousel
        paymentData={paymentStats}
        enrollmentData={enrollmentStats}
        studentCountData={studentCountStats}
        conversionTrendData={conversionTrend}
        grades={grades}
        subjects={subjects}
        teachers={teachers}
      />

       {/* Summary Cards */}
       <StatsCards stats={studentStats} />
       
    </div>

  );
};

export default StatsContainer;
