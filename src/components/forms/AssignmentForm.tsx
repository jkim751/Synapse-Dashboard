"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { assignmentSchema, AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import FileUpload from "../FileUpload";

const AssignmentForm = ({
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
  console.log("[AssignmentForm] Received Related Data Prop:", relatedData);
  const [documents, setDocuments] = useState<string[]>(data?.documents || []);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    // --- FIX: Set default values directly here ---
    defaultValues: {
      id: data?.id,
      title: data?.title || '',
      startDate: data?.startDate ? new Date(data.startDate) : undefined,
      dueDate: data?.dueDate ? new Date(data.dueDate) : undefined,
      lessonId: data?.lessonId || null,
      recurringLessonId: data?.recurringLessonId || null,
    },
  });

  // --- FIX: This is the only destructuring you need ---
  const { singleLessons, recurringLessons } = relatedData || {};

  console.log("[AssignmentForm] Destructured Lessons:", { singleLessons, recurringLessons });

  const handleLessonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
        setValue('lessonId', null);
        setValue('recurringLessonId', null);
        return;
    }
    const [type, id] = value.split('-');

    if (type === 'single') {
      setValue('lessonId', parseInt(id));
      setValue('recurringLessonId', null);
    } else if (type === 'recurring') {
      setValue('recurringLessonId', parseInt(id));
      setValue('lessonId', null);
    }
  };

  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(
    type === "create" ? createAssignment : updateAssignment,
    { success: false, error: false, message: "" }
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Assignment has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(type === "create" ? "Unable to create" : "Unable to update");
    }
  }, [state, router, type, setOpen]);
  
  // --- REMOVED the old, incorrect `lessons` variable ---

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction({ ...formData, documents });
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new assignment" : "Update the assignment"}
        </h1>

        <div className="flex justify-between flex-wrap gap-4">
          {/* InputFields now correctly use defaultValues from useForm */}
          <InputField label="Title" name="title" register={register} error={errors?.title} />
          <InputField label="Start Date" name="startDate" type="datetime-local" register={register} error={errors?.startDate} />
          <InputField label="Due Date" name="dueDate" type="datetime-local" register={register} error={errors?.dueDate} />
          
          {data && <InputField label="Id" name="id" register={register} hidden />}
        
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Link To</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
              onChange={handleLessonChange}
              // --- FIX: The defaultValue is now set on the <select> element ---
              defaultValue={
                data?.lessonId ? `single-${data.lessonId}` : 
                data?.recurringLessonId ? `recurring-${data.recurringLessonId}` : ''
              }
            >
              <option value="">Select a Lesson or Series</option>
              {/* The rest of this dropdown is perfect */}
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
                <optgroup label="Recurring Series">
                  {recurringLessons.map((lesson: { id: number; name: string }) => (
                    <option value={`recurring-${lesson.id}`} key={`recurring-${lesson.id}`}>
                      {lesson.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {errors.lessonId?.message && (
              <p className="text-xs text-red-400">
                {errors.lessonId.message.toString()}
              </p>
            )}
          </div>

          <FileUpload
            label="Assignment Documents"
            name="assignments"
            existingFiles={documents}
            onFilesChange={setDocuments}
          />
        </div>

        {state.error && (
          <span className="text-red-500">{type === "create" ? "Unable to create" : "Unable to update"}</span>
        )}
        <button
          className="bg-orange-400 text-white p-2 rounded-xl"
          disabled={isPending}
        >
          {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default AssignmentForm;