"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { resultSchema, ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/lib/actions";
import FileUpload from "../FileUpload";


const ResultForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [allTeacherStudents, setAllTeacherStudents] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedTitle, setSelectedTitle] = useState<string>("Result");
  const [documents, setDocuments] = useState<string[]>(data?.documents || []);
  const form = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch, setValue } = form;


  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createResult : updateResult,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Result has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Failed to ${type} result.`);
    }
  }, [state, router, type, setOpen]);

  const { exams, assignments, students } = relatedData;
  
  // Add debug logging
  useEffect(() => {
    console.log("ResultForm relatedData:", relatedData);
    console.log("Exams:", exams);
    console.log("Assignments:", assignments);
  }, [relatedData, exams, assignments]);

  const watchedExamId = watch("examId");

  // Fetch all students that the teacher teaches
  useEffect(() => {
    fetch('/api/students-by-teacher')
      .then(res => res.json())
      .then(teacherStudents => {
        console.log("Fetched teacher's students:", teacherStudents);
        setAllTeacherStudents(teacherStudents || []);
        // If no exam is selected, show all teacher's students
        if (!watchedExamId && !watch("assignmentId")) {
          setFilteredStudents(teacherStudents || []);
        }
      })
      .catch(err => {
        console.error("Error fetching teacher's students:", err);
        setAllTeacherStudents([]);
      });
  }, [watch, watchedExamId]);

  // Filter students based on selected exam
  useEffect(() => {
    if (watchedExamId && exams) {
      const selectedExam = exams.find((exam: any) => exam.id == watchedExamId);
      if (selectedExam) {
        setSelectedExamId(watchedExamId.toString());
        setSelectedTitle("Exam Result");
        
        // Get class ID from either lesson or recurringLesson
        const lessonData = selectedExam.lesson || selectedExam.recurringLesson;
        if (lessonData && lessonData.class) {
          const classId = lessonData.class.id;
          fetch(`/api/students-by-class?classId=${classId}`)
            .then(res => res.json())
            .then(studentsData => {
              console.log("Fetched students:", studentsData);
              setFilteredStudents(studentsData || []);
            })
            .catch(err => {
              console.error("Error fetching students:", err);
              setFilteredStudents(allTeacherStudents);
            });
        } else {
          console.warn("No lesson data found for exam:", selectedExam);
          setFilteredStudents(allTeacherStudents);
        }
      }
    } else if (!watch("assignmentId")) {
      // If no exam is selected and no assignment is selected, show all teacher's students
      setFilteredStudents(allTeacherStudents);
      setValue("studentId", "");
    }
  }, [watchedExamId, exams, setValue, allTeacherStudents]);

  // Handle assignment selection
  const watchedAssignmentId = watch("assignmentId");
  useEffect(() => {
    if (watchedAssignmentId && assignments) {
      const selectedAssignment = assignments.find((assignment: any) => assignment.id == watchedAssignmentId);
      if (selectedAssignment) {
        setSelectedTitle("Assignment");
        setValue("examId", undefined);
        
        // Get class ID from either lesson or recurringLesson
        const lessonData = selectedAssignment.lesson || selectedAssignment.recurringLesson;
        if (lessonData && lessonData.class) {
          const classId = lessonData.class.id;
          fetch(`/api/students-by-class?classId=${classId}`)
            .then(res => res.json())
            .then(studentsData => {
              console.log("Fetched students for assignment:", studentsData);
              setFilteredStudents(studentsData || []);
            })
            .catch(err => {
              console.error("Error fetching students:", err);
              setFilteredStudents(allTeacherStudents);
            });
        } else {
          console.warn("No lesson data found for assignment:", selectedAssignment);
          setFilteredStudents(allTeacherStudents);
        }
      }
    } else if (!watchedExamId) {
      // If no assignment is selected and no exam is selected, show all teacher's students
      setFilteredStudents(allTeacherStudents);
    }
  }, [watchedAssignmentId, assignments, setValue, allTeacherStudents, watchedExamId, watch]);

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction({ ...data, documents });
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-8 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? `Create a new ${selectedTitle.toLowerCase()} result` : `Update the ${selectedTitle.toLowerCase()} result`}
        </h1>

        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Title"
            name="title"
            defaultValue={data?.title}
            register={register}
            error={errors?.title}
          />
          <InputField
            label="Score"
            name="score"
            defaultValue={data?.score}
            register={register}
            error={errors?.score}
            type="number"
          />
          <InputField
            label="Student"
            name="studentId"
            defaultValue={data?.studentId}
            register={register}
            error={errors?.studentId}
            type="select"
            options={filteredStudents && filteredStudents.length > 0 ? filteredStudents.map((student: { id: string; name: string; surname: string }) => ({
              value: student.id,
              label: `${student.name} ${student.surname}`,
            })) : []}
          />
          <InputField
            label="Exam"
            name="examId"
            defaultValue={data?.examId}
            register={register}
            error={errors?.examId}
            type="select"
            options={exams && exams.length > 0 ? exams.map((exam: { id: number; title: string }) => ({
              value: exam.id,
              label: exam.title,
            })) : []}
          />
          <InputField
            label="Assignment"
            name="assignmentId"
            defaultValue={data?.assignmentId}
            register={register}
            error={errors?.assignmentId}
            type="select"
            options={assignments && assignments.length > 0 ? assignments.map((assignment: { id: number; title: string }) => ({
              value: assignment.id,
              label: assignment.title,
            })) : []}
          />
          <FileUpload
            label="Result Documents"
            name="results"
            existingFiles={documents}
            onFilesChange={setDocuments}
          />
          {data && (
            <InputField
              label="Id"
              name="id"
              defaultValue={data?.id}
              register={register}
              error={errors?.id}
              hidden
            />
          )}
        </div>

        {state.error && (
          <span className="text-red-500">Something went wrong!</span>
        )}
        <button
          className="bg-orange-400 text-white p-3 rounded-xl"
          disabled={isPending}
        >
          {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default ResultForm;
