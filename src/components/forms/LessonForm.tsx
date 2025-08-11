
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";

const LessonForm = ({
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createLesson : updateLesson,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",

    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Lesson has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { subjects, classes, teachers } = relatedData || {};

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new lesson" : "Update the lesson"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Lesson name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Day"
          name="day"
          defaultValue={data?.day}
          register={register}
          error={errors?.day}
          type="select"
          options={[
            { value: "MONDAY", label: "Monday" },
            { value: "TUESDAY", label: "Tuesday" },
            { value: "WEDNESDAY", label: "Wednesday" },
            { value: "THURSDAY", label: "Thursday" },
            { value: "FRIDAY", label: "Friday" },
            { value: "SATURDAY", label: "Saturday" },
            { value: "SUNDAY", label: "Sunday" },
          ]}
        />
        <InputField
          label="Start Time"
          name="startTime"
          defaultValue={data?.startTime}
          register={register}
          error={errors?.startTime}
          type="datetime-local"
        />
        <InputField
          label="End Time"
          name="endTime"
          defaultValue={data?.endTime}
          register={register}
          error={errors?.endTime}
          type="datetime-local"
        />
        <InputField
          label="Subject"
          name="subjectId"
          defaultValue={data?.subjectId}
          register={register}
          error={errors?.subjectId}
          type="select"
          options={subjects?.map((subject: { id: number; name: string }) => ({
            value: subject.id,
            label: subject.name,
          }))}
        />
        <InputField
          label="Class"
          name="classId"
          defaultValue={data?.classId}
          register={register}
          error={errors?.classId}
          type="select"
          options={classes?.map((classItem: { id: number; name: string }) => ({
            value: classItem.id,
            label: classItem.name,
          }))}
        />
        <InputField
          label="Teacher"
          name="teacherId"
          defaultValue={data?.teacherId}
          register={register}
          error={errors?.teacherId}
          type="select"
          options={teachers?.map((teacher: { id: string; name: string; surname: string }) => ({
            value: teacher.id,
            label: `${teacher.name} ${teacher.surname}`,
          }))}
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

export default LessonForm;
