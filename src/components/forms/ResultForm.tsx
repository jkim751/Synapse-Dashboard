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
  const [documents, setDocuments] = useState<string[]>(data?.documents || []);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    type === "create" ? createResult : updateResult,
    { success: false, error: false, message: "" }
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Result ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Unable to ${type} result`);
    }
  }, [state, router, type, setOpen]);

  const { assessments } = relatedData;

  // Load teacher's students on mount
  useEffect(() => {
    fetch("/api/students-by-teacher")
      .then(res => res.json())
      .then(students => {
        setAllTeacherStudents(students || []);
        setFilteredStudents(students || []);
      })
      .catch(() => setAllTeacherStudents([]));
  }, []);

  const watchedAssessmentId = watch("assessmentId");

  // Filter students by the class linked to the selected assessment
  useEffect(() => {
    if (watchedAssessmentId && assessments) {
      const selected = assessments.find((a: any) => a.id == watchedAssessmentId);
      const lessonData = selected?.lesson || selected?.recurringLesson;
      if (lessonData?.class?.id) {
        fetch(`/api/students-by-class?classId=${lessonData.class.id}`)
          .then(res => res.json())
          .then(students => setFilteredStudents(students || []))
          .catch(() => setFilteredStudents(allTeacherStudents));
      } else {
        setFilteredStudents(allTeacherStudents);
      }
    } else {
      setFilteredStudents(allTeacherStudents);
      setValue("studentId", "");
    }
  }, [watchedAssessmentId, assessments, allTeacherStudents, setValue]);

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction({ ...formData, documents });
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-8 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new result" : "Update the result"}
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
            label="Assessment"
            name="assessmentId"
            defaultValue={data?.assessmentId}
            register={register}
            error={errors?.assessmentId}
            type="select"
            options={assessments?.map((a: { id: number; title: string; type: string }) => ({
              value: a.id,
              label: `${a.title} (${a.type === "EXAM" ? "Exam" : "Assignment"})`,
            })) || []}
          />
          <InputField
            label="Student"
            name="studentId"
            defaultValue={data?.studentId}
            register={register}
            error={errors?.studentId}
            type="select"
            options={filteredStudents.map((s: { id: string; name: string; surname: string }) => ({
              value: s.id,
              label: `${s.name} ${s.surname}`,
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
          <span className="text-red-500">{state.message || `Unable to ${type} result`}</span>
        )}
        <button className="bg-orange-400 text-white p-3 rounded-xl" disabled={isPending}>
          {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default ResultForm;
