
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
      toast(`Result has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { exams, assignments, students } = relatedData;
  const watchedExamId = watch("examId");

  // Filter students based on selected exam
  useEffect(() => {
    if (watchedExamId && exams) {
      const selectedExam = exams.find((exam: any) => exam.id == watchedExamId);      if (selectedExam) {
        setSelectedExamId(watchedExamId.toString());
        setSelectedTitle("Exam Result");
        
        // Fetch students for the selected exam's class
        const classId = selectedExam.lesson.class.id;
        fetch(`/api/students-by-class?classId=${classId}`)
          .then(res => res.json())
          .then(studentsData => {
            console.log("Fetched students:", studentsData);
            setFilteredStudents(studentsData || []);
          })
          .catch(err => {
            console.error("Error fetching students:", err);
            setFilteredStudents([]);
          });
      }
    } else {
      setFilteredStudents([]);
      setValue("studentId", "");
    }
  }, [watchedExamId, exams, setValue]);

  // Handle assignment selection
  const watchedAssignmentId = watch("assignmentId");
  useEffect(() => {
    if (watchedAssignmentId && assignments) {
      const selectedAssignment = assignments.find((assignment: any) => assignment.id == watchedAssignmentId);
      if (selectedAssignment) {
        setSelectedTitle("Assignment");
        setValue("examId", undefined);
        
        // For assignments, we would need to fetch students based on the assignment's lesson class
        // For now, we'll use all students from relatedData
        setFilteredStudents(students || []);
      }
    }
  }, [watchedAssignmentId, assignments, setValue, students]);

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction({ ...data, documents });
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
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
          options={exams?.map((exam: { id: number; title: string }) => ({
            value: exam.id,
            label: exam.title,
          }))}
        />
        <InputField
          label="Assignment"
          name="assignmentId"
          defaultValue={data?.assignmentId}
          register={register}
          error={errors?.assignmentId}
          type="select"
          options={assignments?.map((assignment: { id: number; title: string }) => ({
            value: assignment.id,
            label: assignment.title,
          }))}
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
        className="bg-orange-400 text-white p-4 rounded-xl"
        disabled={isPending}
      >
        {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ResultForm;
