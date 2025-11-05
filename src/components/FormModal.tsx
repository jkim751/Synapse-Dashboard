"use client";

import {
  deleteClass,
  deleteExam,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteAnnouncement,
  deleteAssignment,
  deleteEvent,
  deleteLesson,
  deleteRecurringLesson,
  deleteParent,
  deleteResult,
  deleteAdmin,
} from "@/lib/actions";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useActionState } from "react";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import { updateStudentStatus } from "@/lib/studentActions";
import { StudentStatus } from "@prisma/client";

type DeleteAction = (
  currentState: any,
  data: FormData
) => Promise<{ success: boolean; error: boolean; message: string }>;

const deleteActionMap: { [key: string]: DeleteAction } = {
  subject: deleteSubject,
  subjects: deleteSubject,
  class: deleteClass,
  classes: deleteClass,
  teacher: deleteTeacher,
  teachers: deleteTeacher,
  student: deleteStudent,
  students: deleteStudent,
  exam: deleteExam,
  exams: deleteExam,
  parent: deleteParent,
  parents: deleteParent,
  lesson: deleteLesson,
  lessons: deleteLesson,
  recurringLesson: deleteRecurringLesson,
  recurringLessons: deleteRecurringLesson,
  assignment: deleteAssignment,
  assignments: deleteAssignment,
  result: deleteResult,
  results: deleteResult,
  event: deleteEvent,
  events: deleteEvent,
  announcement: deleteAnnouncement,
  announcements: deleteAnnouncement,
  admin: deleteAdmin,
  admins: deleteAdmin,
};

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AssignmentForm = dynamic(() => import("./forms/AssignmentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AdminForm = dynamic(() => import("./forms/AdminForm"), {
  loading: () => <h1>Loading...</h1>,
});

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  classes: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  teachers: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  students: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  exams: (setOpen, type, data, relatedData) => (
    <ExamForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      key={data?.id || 'new-lesson'}
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  lessons: (setOpen, type, data, relatedData) => (
    <LessonForm
      key={data?.id || 'new-lesson'}
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  recurringLesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      key={data?.id || 'new-recurring-lesson'}
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData} />
  ),
  recurringLessons: (setOpen, type, data, relatedData) => (
    <LessonForm
      key={data?.id || 'new-recurring-lesson'}
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData} />
  ),
  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  parents: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  assignments: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  result: (setOpen, type, data, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  results: (setOpen, type, data, relatedData) => (
    <ResultForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  events: (setOpen, type, data, relatedData) => (
    <EventForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  announcements: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  subjects: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  admin: (setOpen, type, data, relatedData) => (
    <AdminForm
      type={type}
      data={data}
      setOpen={setOpen}
    />
  ),
  admins: (setOpen, type, data, relatedData) => (
    <AdminForm
      type={type}
      data={data}
      setOpen={setOpen}
    />
  ),
};


const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-orange-400"
      : type === "update"
        ? "bg-orange-200"
        : "bg-orange-300";

  console.log("[FormModal] Received Related Data Prop:", relatedData);

  const [open, setOpen] = useState(false);

  const Form = () => {
    const deleteAction = deleteActionMap[table];
    const [state, formAction] = useActionState(
      async (prevState: any, formData: FormData) => {
        return await deleteAction(prevState, formData);
      },
      {
        success: false,
        error: false,
        message: "",
      }
    );

    const router = useRouter();

    useEffect(() => {
      if (state.success) {
        toast.success(state.message || `${table} has been deleted successfully!`);
        setOpen(false);
        router.refresh();
      }
      if (state.error && !state.success) {
        toast.error("Unable to delete");
      }
      // --- FIX: Follow linter advice for this specific hook ---
    }, [state, router]);

    const handleStudentUpdate = async (formData: FormData) => {
      const studentId = formData.get("id") as string;
      const newStatus = formData.get("status") as StudentStatus;
      
      if (newStatus) {
        // TODO: Get userId from authentication context or props
        const userId = ""; // Replace with actual userId
        await updateStudentStatus(studentId, newStatus, userId, "Manual update");
      }
      
      // ...rest of update logic...
    };

    return type === "delete" && id ? (
      <form action={formAction} className="p-4 flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />        <span className="text-center font-medium">
          All data will be lost. Are you sure you want to delete this {table}?
        </span>
        <button className="bg-red-700 text-white py-2 px-4 rounded-xl border-none w-max self-center">
          Delete
        </button>
      </form>
    ) : type === "create" || type === "update" ? (
      forms[table] ? forms[table](setOpen, type, data, relatedData) : (
        <div className="p-4 text-center text-red-500">
          Form not found for table: {table}
        </div>
      )
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        <Image src={`/${type}.png`} alt="" width={16} height={16} />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-xl relative w-[90%] md:w-[70%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <Image src="/close.png" alt="" width={14} height={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;