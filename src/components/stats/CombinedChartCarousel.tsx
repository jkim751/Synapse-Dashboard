"use client";

import { useState } from "react";
import PaymentTypeChart from "./PaymentTypeChart";
import EnrollmentChart from "./EnrollmentChart";
import StudentCountChart from "./StudentCountChart";

interface PaymentTypeData {
  paymentType: string;
  count: number;
  percentage: number;
}

interface EnrollmentData {
  month: string;
  enrolled: number;
  disenrolled: number;
  net: number;
}

interface StudentCountData {
  month: string;
  total: number;
  current: number;
  trial: number;
}

interface Grade {
  id: number;
  level: number;
}

interface Subject {
  id: number;
  name: string;
}

interface CombinedChartCarouselProps {
  paymentData: PaymentTypeData[];
  enrollmentData: EnrollmentData[];
  studentCountData: StudentCountData[];
  grades: Grade[];
  subjects: Subject[];
}

const CombinedChartCarousel = ({ 
  paymentData, 
  enrollmentData,
  studentCountData,
  grades,
  subjects
}: CombinedChartCarouselProps) => {
  const [activeChart, setActiveChart] = useState(0);

  const charts = [
    {
      title: "Payment Type Distribution",
      subtitle: `${paymentData.length} types`,
      component: <PaymentTypeChart data={paymentData} />
    },
    {
      title: "Enrollment Trends",
      subtitle: "Monthly enrollments",
      component: <EnrollmentChart data={enrollmentData} />
    },
    {
      title: "Student Count Trends",
      subtitle: "Active students over time",
      component: <StudentCountChart data={studentCountData} grades={grades} subjects={subjects} />
    }
  ];

  const goToPrevious = () => {
    setActiveChart((prev) => (prev === 0 ? charts.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveChart((prev) => (prev === charts.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{charts[activeChart].title}</h3>
          <span className="text-xs text-gray-500">{charts[activeChart].subtitle}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Previous chart"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex gap-1">
            {charts.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveChart(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === activeChart ? 'bg-orange-300' : 'bg-gray-300'
                }`}
                aria-label={`Go to chart ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={goToNext}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Next chart"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chart content */}
      <div className="transition-opacity duration-300">
        {charts[activeChart].component}
      </div>
    </div>
  );
};

export default CombinedChartCarousel;
