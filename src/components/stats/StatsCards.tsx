interface StatsCardsProps {
  stats: {
    totalStudents: number;
    currentStudents: number;
    trialStudents: number;
    disenrolledStudents: number;
    disenrollmentRate: number;
    averageGrade: number;
    trialConversionRate: number;
  };
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      title: "Trial Students",
      value: stats.trialStudents,
    },
    {
      title: "Trial Conversion Rate",
      value: `${stats.trialConversionRate.toFixed(1)}%`,
    },
    {
      title: "Disenrolled",
      value: stats.disenrolledStudents,
    },
    {
      title: "Disenrollment Rate",
      value: `${stats.disenrollmentRate.toFixed(1)}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white border-2 border-lamaYellow/75 p-4 rounded-md min-h-[130px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] bg-lamaYellow/75 px-2 py-1 rounded-full text-black font-medium">
              {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <h3 className="text-2xl font-semibold text-black">
              {card.value}
            </h3>
            <span className="text-sm text-black opacity-80">
              {card.title}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
