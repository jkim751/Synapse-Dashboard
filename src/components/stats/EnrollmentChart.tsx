"use client";

interface EnrollmentData {
  month: string;
  enrolled: number;
  disenrolled: number;
  net: number;
}

interface EnrollmentChartProps {
  data: EnrollmentData[];
}

const EnrollmentChart = ({ data }: EnrollmentChartProps) => {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-gray-500 text-sm">No enrollment data available</p>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.flatMap(item => [item.enrolled, Math.abs(item.disenrolled), Math.abs(item.net)])
  );

  return (
    <div className="h-[300px] flex flex-col">
      {/* Chart */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">{item.month}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                item.net >= 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {item.net >= 0 ? '+' : ''}{item.net}
              </span>
            </div>
            
            <div className="flex gap-1 h-6">
              {/* Enrolled */}
              <div className="flex-1 bg-gray-100 rounded">
                {item.enrolled > 0 && (
                  <div
                    className="bg-lamaYellow h-6 rounded flex items-center justify-center text-white text-xs font-medium transition-all duration-300"
                    style={{ width: `${Math.max((item.enrolled / maxValue) * 100, 10)}%` }}
                  >
                    {item.enrolled > 0 && `+${item.enrolled}`}
                  </div>
                )}
              </div>
              
              {/* Disenrolled */}
              <div className="flex-1 bg-gray-100 rounded flex justify-end">
                {item.disenrolled < 0 && (
                  <div
                    className="bg-pink-300 h-6 rounded flex items-center justify-center text-white text-xs font-medium transition-all duration-300"
                    style={{ width: `${Math.max((Math.abs(item.disenrolled) / maxValue) * 100, 10)}%` }}
                  >
                    {item.disenrolled}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 pt-3 mt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-lamaYellow rounded"></div>
          <span className="text-xs text-gray-600">Enrolled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-pink-300 rounded"></div>
          <span className="text-xs text-gray-600">Disenrolled</span>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentChart;
