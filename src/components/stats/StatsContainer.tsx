import { getStudentStats, getPaymentTypeStats, getEnrollmentStats, getStudentCountTrends, getTrialConversionTrend, getRecentConversions } from "@/lib/stats";
import StatsFilters from "./StatsFilters";
import CombinedChartCarousel from "./CombinedChartCarousel";
import StatsCards from "./StatsCards";
import RecentConversions from "./RecentConversions";
import prisma from "@/lib/prisma";

interface StatsContainerProps {
  searchParams: { [key: string]: string | undefined };
}

const StatsContainer = async ({ searchParams }: StatsContainerProps) => {
  const { startDate, endDate, gradeId, subjectId } = searchParams;

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
  };

  // Fetch all stats data and filter options
  const [studentStats, paymentStats, enrollmentStats, studentCountStats, conversionTrend, recentConversions, grades, subjects] = await Promise.all([
    getStudentStats(filters),
    getPaymentTypeStats(filters),
    getEnrollmentStats(filters),
    getStudentCountTrends(studentCountFilters),
    getTrialConversionTrend(filters),
    getRecentConversions(),
    prisma.grade.findMany({
      orderBy: { level: 'asc' },
      select: { id: true, level: true }
    }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  return (
    <div className="mt-4 space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-md">
        <StatsFilters searchParams={searchParams} />
      </div>

      {/* Summary Cards */}
      <StatsCards stats={studentStats} />

      {/* Combined Chart Carousel */}
      <CombinedChartCarousel
        paymentData={paymentStats}
        enrollmentData={enrollmentStats}
        studentCountData={studentCountStats}
        conversionTrendData={conversionTrend}
        grades={grades}
        subjects={subjects}
      />

      {/* Trial Conversion Detail */}
      <div className="bg-white p-4 rounded-md border border-gray-200">
        <h3 className="text-base font-semibold mb-1">Trial → Current Conversions</h3>
        <p className="text-xs text-gray-500 mb-4">Students who converted from trial to a current enrolment</p>
        <RecentConversions conversions={recentConversions.map(c => ({ ...c, changedAt: c.changedAt.toISOString() }))} />
      </div>
    </div>
  );
};

export default StatsContainer;
