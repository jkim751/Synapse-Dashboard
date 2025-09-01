"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson, updateRecurringLesson } from "@/lib/actions";
import { RRule, Weekday } from "rrule";
import { handleLessonFormSubmission } from "@/lib/lessonActions";

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any; // includes subjects/classes/teachers and variant ("single"|"recurring")
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const isRecurring = relatedData?.variant === "recurring";
  // --- THIS IS THE FIX ---
  // Correctly choose the server action based on the variant.
  const baseActionFn =
    type === "update"
      ? (isRecurring ? updateRecurringLesson : updateLesson)
      : createLesson;

  // Wrapper function to match useActionState signature
  const actionFn = async (state: any, payload: FormData) => {
    // Convert FormData back to object for the server action
    const formObject: any = {};
    for (const [key, value] of payload.entries()) {
      formObject[key] = value;
    }
    return await baseActionFn(formObject);
  };

  // IMPORTANT: use the right action state hook
  const [state, formAction] = useActionState(actionFn, { success: false, error: false, message: "" });

  // Default values: prefill from `data` if present
  const defaults: Partial<LessonSchema> = data
    ? {
        name: data.name ?? "",
        subjectId: data.subjectId ?? data.subject?.id,
        classId: data.classId ?? data.class?.id,
        teacherId: data.teacherId ?? data.teacher?.id,
        startTime: data.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : undefined,
        endTime:   data.endTime   ? new Date(data.endTime).toISOString().slice(0, 16)   : undefined,
        repeats: "never", // you can infer weekly if data has rrule; keep "never" by default
        // --- FIX: Add default values for recurring updates ---
        updateScope: isRecurring ? "instance" : undefined,
        originalDate: isRecurring && data.startTime ? new Date(data.startTime).toISOString() : undefined,
      }
    : { repeats: "never" };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: defaults as any,
  });

  useEffect(() => {
    if (data) {
      const defaults = {
        name: data.name ?? "",
        subjectId: data.subjectId ?? data.subject?.id,
        classId: data.classId ?? data.class?.id,
        teacherId: data.teacherId ?? data.teacher?.id,
        startTime: data.startTime ? new Date(data.startTime).toISOString().slice(0, 16) : undefined,
        endTime: data.endTime ? new Date(data.endTime).toISOString().slice(0, 16) : undefined,
        repeats: "never" as const,
        updateScope: isRecurring ? ("instance" as const) : undefined,
        originalDate: isRecurring && data.startTime ? new Date(data.startTime).toISOString() : undefined,
      };
      reset(defaults as any);
    }
    // --- FIX: Add missing dependency 'isRecurring' ---
  }, [data, reset, isRecurring]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || (type === "update" ? "Lesson updated!" : "Lesson created!"));
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      toast.error(state.message || "Something went wrong!");
    }
    // --- FIX: Add missing dependency 'type' ---
  }, [state, router, setOpen, type]);

  const repeatsValue = watch("repeats");
  const { subjects, classes, teachers, variant } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    // build rrule if weekly
    let rruleString: string | null = null;
    if (formData.repeats === "weekly" && formData.day && formData.endDate) {
      const dayMap: Record<string, number> = { 
        MO: RRule.MO.weekday, 
        TU: RRule.TU.weekday, 
        WE: RRule.WE.weekday, 
        TH: RRule.TH.weekday, 
        FR: RRule.FR.weekday, 
        SA: RRule.SA.weekday, 
        SU: RRule.SU.weekday 
      };
      
      const startDate = new Date(formData.startTime);
      const endDate = new Date(formData.endDate);
      
      // Create RRule with proper weekday
      const rule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [dayMap[formData.day]],
        dtstart: startDate,
        until: endDate,
      });
      
      rruleString = rule.toString();
      console.log("Generated RRule:", rruleString);
    }

    // Prepare payload for the server action
    const payload = {
      name: formData.name,
      subjectId: Number(formData.subjectId),
      classId: Number(formData.classId),
      teacherId: formData.teacherId,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      repeats: formData.repeats,
      rrule: rruleString,
      variant: relatedData?.variant || (formData.repeats === "weekly" ? "recurring" : "single"),
      ...(type === "update" && data?.id ? { 
        id: data.id,
        updateScope: formData.updateScope,
        originalDate: formData.originalDate,
      } : {}),
    };

    console.log("Submitting lesson with payload:", payload);

    startTransition(async () => {
      try {
        const result = await handleLessonFormSubmission(type, payload);
        
        if (result.success) {
          toast.success(result.message);
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (error: any) {
        console.error("Form submission error:", error);
        toast.error("Something went wrong!");
      }
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{type === "update" ? "Update lesson" : "Create a new lesson"}</h1>

      {/* ensure id is present on update */}
      {type === "update" && data?.id && <input type="hidden" name="id" value={data.id} />}

      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Lesson name" name="name" register={register} error={errors?.name} />
        <InputField label="Subject" name="subjectId" type="select"
          options={subjects?.map((s: any) => ({ value: s.id, label: s.name })) || []}
          register={register} error={errors?.subjectId} />
        <InputField label="Class" name="classId" type="select"
          options={classes?.map((c: any) => ({ value: c.id, label: c.name })) || []}
          register={register} error={errors?.classId} />
        <InputField label="Teacher" name="teacherId" type="select"
          options={teachers?.map((t: any) => ({ value: t.id, label: t.name })) || []}
          register={register} error={errors?.teacherId} />
        <InputField label="Start Time" name="startTime" type="datetime-local" register={register} error={errors?.startTime} />
        <InputField label="End Time"   name="endTime"   type="datetime-local" register={register} error={errors?.endTime} />

        {/* unified repeats UI */}
        <InputField label="Repeats" name="repeats" type="select" register={register} error={errors?.repeats}
          options={[{ value: "never", label: "Never" }, { value: "weekly", label: "Weekly" }]} />

        {repeatsValue === "weekly" && (
          <>
            <InputField label="On Day" name="day" type="select" register={register} error={errors?.day}
              options={[
                { value: "MO", label: "Monday" }, { value: "TU", label: "Tuesday" },
                { value: "WE", label: "Wednesday" }, { value: "TH", label: "Thursday" },
                { value: "FR", label: "Friday" }, { value: "SA", label: "Saturday" }, { value: "SU", label: "Sunday" },
              ]} />
            <InputField label="Until" name="endDate" type="date" register={register} error={errors?.endDate} />
          </>
        )}
      </div>

      {/* --- FIX: Add UI for selecting update scope --- */}
      {type === 'update' && isRecurring && (
        <div className="border-t pt-4">
            <h3 className="font-semibold">Update recurring event</h3>
            <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2">
                    <input type="radio" value="instance" {...register("updateScope")} />
                    <span>Only this event</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="radio" value="series" {...register("updateScope")} />
                    <span>This and all events</span>
                </label>
            </div>
        </div>
      )}

      {state.error && <span className="text-red-500">{state.message || "Something went wrong!"}</span>}
      <button className="bg-orange-400 text-white p-4 rounded-xl" disabled={isPending}>
        {isPending ? "Loading..." : type === "update" ? "Update" : "Create"}
      </button>
    </form>
  );
};

export default LessonForm;
function actionFn(state: { success: boolean; error: boolean; message: string; }): { success: boolean; error: boolean; message: string; } | Promise<{ success: boolean; error: boolean; message: string; }> {
  throw new Error("Function not implemented.");
}

