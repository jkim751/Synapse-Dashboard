"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { assessmentSchema, AssessmentSchema } from "@/lib/formValidationSchemas";
import { createAssessment, updateAssessment } from "@/lib/actions";
import { useActionState, useState, useTransition, useEffect } from "react";
import { Dispatch, SetStateAction } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import FileUpload from "../FileUpload";

const AssessmentForm = ({
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
    setValue,
    formState: { errors },
  } = useForm<AssessmentSchema>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      ...data,
      type: data?.type || "EXAM",
      lessonId: data?.lessonId || data?.recurringLessonId
        ? `${data.lessonId ? "single" : "recurring"}-${data.lessonId || data.recurringLessonId}`
        : "",
    },
  });

  const { singleLessons, recurringLessons } = relatedData || {};

  const handleLessonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [kind, id] = value.split("-");
    if (kind === "single") {
      setValue("lessonId", parseInt(id));
      setValue("recurringLessonId", null);
    } else if (kind === "recurring") {
      setValue("recurringLessonId", parseInt(id));
      setValue("lessonId", null);
    }
  };

  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    type === "create" ? createAssessment : updateAssessment,
    { success: false, error: false, message: "" }
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Assessment ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Unable to ${type} assessment`);
    }
  }, [state, router, type, setOpen]);

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction({ ...formData, documents });
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new assessment" : "Update the assessment"}
        </h1>
        <div className="flex justify-between flex-wrap gap-4">
          {/* Type selector */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Type</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
              {...register("type")}
              defaultValue={data?.type || "EXAM"}
            >
              <option value="EXAM">Exam</option>
              <option value="ASSIGNMENT">Assignment</option>
            </select>
            {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
          </div>

          <InputField
            label="Title"
            name="title"
            defaultValue={data?.title}
            register={register}
            error={errors?.title}
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

          {/* Lesson selector */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Link To Lesson</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
              onChange={handleLessonChange}
              defaultValue={
                data?.lessonId ? `single-${data.lessonId}` :
                data?.recurringLessonId ? `recurring-${data.recurringLessonId}` : ""
              }
            >
              <option value="">Select a Lesson</option>
              {singleLessons?.length > 0 && (
                <optgroup label="Single Lessons">
                  {singleLessons.map((lesson: { id: number; name: string }) => (
                    <option value={`single-${lesson.id}`} key={`single-${lesson.id}`}>
                      {lesson.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {recurringLessons?.length > 0 && (
                <optgroup label="Recurring Lessons">
                  {recurringLessons.map((lesson: { id: number; name: string }) => (
                    <option value={`recurring-${lesson.id}`} key={`recurring-${lesson.id}`}>
                      {lesson.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {errors.lessonId?.message && (
              <p className="text-xs text-red-400">{errors.lessonId.message.toString()}</p>
            )}
          </div>

          <FileUpload
            label="Documents"
            name="assessments"
            existingFiles={documents}
            onFilesChange={setDocuments}
          />
        </div>

        {state.error && (
          <span className="text-red-500">{state.message || `Unable to ${type} assessment`}</span>
        )}
        <button
          type="submit"
          className="bg-orange-400 text-white p-2 rounded-xl"
          disabled={isPending}
        >
          {isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default AssessmentForm;
