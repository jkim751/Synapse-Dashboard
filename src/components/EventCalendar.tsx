"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import dynamic from "next/dynamic";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

const EventCalendarComponent = () => {
  const [value, onChange] = useState<Value>(null);
  const router = useRouter();

  useEffect(() => {
    onChange(new Date());
  }, []);

  useEffect(() => {
    if (value instanceof Date) {
      router.push(`?date=${value.toISOString()}`);
    }
  }, [value, router]);

  return <Calendar onChange={onChange} value={value} />;
};

const EventCalendar = dynamic(() => import("./EventCalendar"), { ssr: false });

export default function Page() {
  return (
    <div>
      <EventCalendar />
    </div>
  );
}
