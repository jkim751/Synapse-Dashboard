import { getStudentStats, getPaymentTypeStats, getEnrollmentStats, getStudentCountTrends } from "@/lib/stats";
import StatsFilters from "./StatsFilters";
import CombinedChartCarousel from "./CombinedChartCarousel";
import StatsCards from "./StatsCards";
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
  const [studentStats, paymentStats, enrollmentStats, studentCountStats, grades, subjects] = await Promise.all([
    getStudentStats(filters),
    getPaymentTypeStats(filters),
    getEnrollmentStats(filters),
    getStudentCountTrends(studentCountFilters),
    prisma.grade.findMany({
      orderBy: { level: 'asc' },
      select: { id: true, level: true }
    }),
    prisma.subject.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  console.log('Payment stats in container:', paymentStats);

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
        grades={grades}
        subjects={subjects}
      />
    </div>
  );
};

export default StatsContainer;
