import prisma from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export type FormContainerProps = {
  table:
  | "teacher"
  | "student"
  | "parent"
  | "subject"
  | "class"
  | "lesson"
  | "recurringLesson"
  | "exam"
  | "assignment"
  | "result"
  | "event"
  | "announcement"
  | "admin";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
};

const FormContainer = ({ table, type, data, id }: FormContainerProps) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-lamaYellow"
      : type === "update"
      ? "bg-lamaSky"
      : "bg-lamaPurple";

  const [relatedData, setRelatedData] = useState<any>({});
  const { userId, sessionClaims } = useAuth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  useEffect(() => {
    const fetchRelatedData = async () => {
      try {
        if (table === "subject") {
          const [teachersRes] = await Promise.all([
            fetch("/api/teachers"),
          ]);
          const [teachers] = await Promise.all([
            teachersRes.json(),
          ]);
          setRelatedData({ teachers });
        } else if (table === "class") {
          const [teachersRes, gradesRes] = await Promise.all([
            fetch("/api/teachers"),
            fetch("/api/grades"),
          ]);
          const [teachers, grades] = await Promise.all([
            teachersRes.json(),
            gradesRes.json(),
          ]);
          setRelatedData({ teachers, grades });
        } else if (table === "teacher") {
          const [subjectsRes] = await Promise.all([
            fetch("/api/subjects"),
          ]);
          const [subjects] = await Promise.all([
            subjectsRes.json(),
          ]);
          setRelatedData({ subjects });
        } else if (table === "student") {
          const [gradesRes, classesRes, parentsRes] = await Promise.all([
            fetch("/api/grades"),
            fetch("/api/classes"),
            fetch("/api/parents"),
          ]);
          const [grades, classes, parents] = await Promise.all([
            gradesRes.json(),
            classesRes.json(),
            parentsRes.json(),
          ]);
          setRelatedData({ grades, classes, parents });
        } else if (table === "exam") {
          const [singleLessonsRes, recurringLessonsRes] = await Promise.all([
            fetch("/api/lessons"),
            fetch("/api/recurringLessons"),
          ]);
          const [singleLessons, recurringLessons] = await Promise.all([
            singleLessonsRes.json(),
            recurringLessonsRes.json(),
          ]);
          setRelatedData({ singleLessons, recurringLessons });
        } else if (table === "assignment") {
          const [singleLessonsRes, recurringLessonsRes] = await Promise.all([
            fetch("/api/lessons"),
            fetch("/api/recurringLessons"),
          ]);
          const [singleLessons, recurringLessons] = await Promise.all([
            singleLessonsRes.json(),
            recurringLessonsRes.json(),
          ]);
          setRelatedData({ singleLessons, recurringLessons });
        } else if (table === "result") {
          const [examsRes, assignmentsRes, studentsRes] = await Promise.all([
            fetch("/api/exams"),
            fetch("/api/assignments"),
            fetch("/api/students"),
          ]);
          const [exams, assignments, students] = await Promise.all([
            examsRes.json(),
            assignmentsRes.json(),
            studentsRes.json(),
          ]);
          setRelatedData({ exams, assignments, students });
        } else if (table === "lesson") {
          const [subjectsRes, classesRes, teachersRes] = await Promise.all([
            fetch("/api/subjects"),
            fetch("/api/classes"),
            fetch("/api/teachers"),
          ]);
          const [subjects, classes, teachers] = await Promise.all([
            subjectsRes.json(),
            classesRes.json(),
            teachersRes.json(),
          ]);
          setRelatedData({ subjects, classes, teachers });
        } else if (table === "recurringLesson") {
          const [subjectsRes, classesRes, teachersRes] = await Promise.all([
            fetch("/api/subjects"),
            fetch("/api/classes"),
            fetch("/api/teachers"),
          ]);
          const [subjects, classes, teachers] = await Promise.all([
            subjectsRes.json(),
            classesRes.json(),
            teachersRes.json(),
          ]);
          setRelatedData({ subjects, classes, teachers });
        } else if (table === "event") {
          const [classesRes] = await Promise.all([
            fetch("/api/classes"),
          ]);
          const [classes] = await Promise.all([
            classesRes.json(),
          ]);
          setRelatedData({ classes });
        } else if (table === "announcement") {
          const [classesRes] = await Promise.all([
            fetch("/api/classes"),
          ]);
          const [classes] = await Promise.all([
            classesRes.json(),
          ]);
          setRelatedData({ classes });
        }
      } catch (error) {
        console.error("Error fetching related data:", error);
      }
    };

    fetchRelatedData();
  }, [table]);

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;
