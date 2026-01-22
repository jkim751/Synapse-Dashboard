"use client";

interface PaymentTypeData {
  paymentType: string;
  count: number;
  percentage: number;
}

interface PaymentTypeChartProps {
  data: PaymentTypeData[];
}

const PaymentTypeChart = ({ data }: PaymentTypeChartProps) => {
  const colors = [
    "bg-lamaSky",
    "bg-lamaYellow", 
    "bg-lamaPurple",
    "bg-pink-200",
    "bg-green-200",
  ];

  const total = data.reduce((sum, item) => sum + item.count, 0);

  const formatPaymentType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'BANK_TRANSFER': 'Bank Transfer',
      'CASH': 'Cash',
      'NO_PAYMENT': 'No Payment',
    };
    return typeMap[type] || type.toLowerCase().replace('_', ' ');
  };

  return (
    <div className="h-[300px] flex flex-col">
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">No payment data available</p>
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="flex-1 space-y-3">
            {data.map((item, index) => (
              <div key={item.paymentType} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-gray-700">
                  {formatPaymentType(item.paymentType)}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                  <div
                    className={`${colors[index % colors.length]} h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-300`}
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                  >
                    {item.percentage > 15 && (
                      <span className="text-white text-xs font-medium">
                        {item.percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-8 text-xs text-gray-600 text-right font-medium">
                  {item.count}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-3 mt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Total families tracked</span>
              <span className="font-semibold text-gray-700">{total}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentTypeChart;
