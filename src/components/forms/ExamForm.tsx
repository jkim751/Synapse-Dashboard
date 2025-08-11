
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { examSchema, ExamSchema } from "@/lib/formValidationSchemas";
import { createExam, updateExam } from "@/lib/actions";
import { useActionState, useState } from "react";
import { Dispatch, SetStateAction, useEffect, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import FileUpload from "../FileUpload";

const ExamForm = ({
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
  const [documents, setDocuments] = useState<string[]>(data?.documents || []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExamSchema>({
    resolver: zodResolver(examSchema),
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createExam : updateExam,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Exam has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { lessons } = relatedData || {};

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction({ ...data, documents });
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new exam" : "Update the exam"}
      </h1>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Exam title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
        <InputField
          label="Start Time"
          name="startTime"
          defaultValue={data?.startTime ? data.startTime.toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />
        <InputField
          label="End Time"
          name="endTime"
          defaultValue={data?.endTime ? data.endTime.toISOString().slice(0, 16) : ""}
          register={register}
          error={errors?.endTime}
          type="datetime-local"
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Lesson</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
            {...register("lessonId")}
            defaultValue={data?.lessonId}
          >
            {lessons.map((lesson: { id: number; name: string }) => (
              <option value={lesson.id} key={lesson.id}>
                {lesson.name}
              </option>
            ))}
          </select>
          {errors.lessonId?.message && (
            <p className="text-xs text-red-400">
              {errors.lessonId.message.toString()}
            </p>
          )}
        </div>
        <FileUpload
          label="Exam Documents"
          name="exams"
          existingFiles={documents}
          onFilesChange={setDocuments}
        />
      </div>
      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button 
        type="submit" 
        className="bg-orange-400 text-white p-2 rounded-xl"
        disabled={isPending}
      >
        {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ExamForm;
