import { getStudentStats, getPaymentTypeStats, getEnrollmentStats } from "@/lib/stats";
import StatsFilters from "./StatsFilters";
import PaymentTypeChart from "./PaymentTypeChart";
import EnrollmentChart from "./EnrollmentChart";
import StatsCards from "./StatsCards";

interface StatsContainerProps {
  searchParams: { [key: string]: string | undefined };
}

const StatsContainer = async ({ searchParams }: StatsContainerProps) => {
  const { startDate, endDate, gradeId } = searchParams;

  const dateFilter = {
    startDate: startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1),
    endDate: endDate ? new Date(endDate) : new Date(),
  };

  const filters = {
    ...dateFilter,
    gradeId: gradeId ? parseInt(gradeId) : undefined,
  };

  // Fetch all stats data
  const [studentStats, paymentStats, enrollmentStats] = await Promise.all([
    getStudentStats(filters),
    getPaymentTypeStats(filters),
    getEnrollmentStats(filters),
  ]);   

  return (
    <div className="mt-4 space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-md">
        <StatsFilters searchParams={searchParams} />
      </div>
      
      {/* Summary Cards */}
      <StatsCards stats={studentStats} />
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Type Distribution */}
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Type Distribution</h3>
          </div>
          <PaymentTypeChart data={paymentStats} />
        </div>
        
        {/* Enrollment Trends */}
        <div className="bg-white p-4 rounded-md border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Enrollment Trends</h3>
          </div>
          <EnrollmentChart data={enrollmentStats} />
        </div>
      </div>
    </div>
  );
};

export default StatsContainer;
