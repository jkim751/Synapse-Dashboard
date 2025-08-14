
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { lessonSchema, LessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";
import { RRule, Weekday } from "rrule"; // <-- Import RRule and Weekday

const LessonForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any; // Note: Updating recurring lessons is complex and not fully implemented here
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  // --- NEW: State to control the UI for recurrence ---
  const [repeats, setRepeats] = useState<"never" | "weekly">("never");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<LessonSchema>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      repeats: "never",
      // ... pre-populate other fields if updating
    }
  });

  // Watch the repeats field to update the UI
  const repeatsValue = watch("repeats");

  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(createLesson, { success: false, error: false, message: "" });
  const router = useRouter();

  useEffect(() => { /* ... your existing useEffect ... */ }, [state, router, type, setOpen]);

  const { subjects, classes, teachers } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    let rruleString: string | null = null;
    
    // --- NEW: Build the rrule string before submitting ---
    if (formData.repeats === "weekly" && formData.day && formData.endDate) {
      // Map day strings to weekday numbers (0=Monday, 6=Sunday)
      const dayMap: { [key: string]: number } = {
        'MO': 0, 'TU': 1, 'WE': 2, 'TH': 3, 'FR': 4, 'SA': 5, 'SU': 6
      };
      
      const weekday = new Weekday(dayMap[formData.day]);
      
      const rule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [weekday],
        dtstart: new Date(formData.startTime), // The first occurrence
        until: new Date(formData.endDate),    // The last possible day
      });
      rruleString = rule.toString();
    }
    
    // Combine the rruleString with the rest of the form data
    const dataToSubmit = { ...formData, rrule: rruleString };

    startTransition(() => {
      formAction(dataToSubmit);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">Create a new lesson</h1>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Lesson name" name="name" register={register} error={errors?.name} />
        <InputField label="Subject" name="subjectId" type="select" options={subjects?.map((subject: any) => ({ value: subject.id, label: subject.name })) || []} register={register} error={errors?.subjectId} />
        <InputField label="Class" name="classId" type="select" options={classes?.map((cls: any) => ({ value: cls.id, label: cls.name })) || []} register={register} error={errors?.classId} />
        <InputField label="Teacher" name="teacherId" type="select" options={teachers?.map((teacher: any) => ({ value: teacher.id, label: teacher.name })) || []} register={register} error={errors?.teacherId} />
        <InputField label="Start Time" name="startTime" type="datetime-local" register={register} error={errors?.startTime} />
        <InputField label="End Time" name="endTime" type="datetime-local" register={register} error={errors?.endTime} />

        {/* --- NEW: Recurrence UI --- */}
        <InputField label="Repeats" name="repeats" type="select" register={register} error={errors?.repeats} options={[
          { value: "never", label: "Never" },
          { value: "weekly", label: "Weekly" },
        ]} />
        
        {/* Conditionally show fields for weekly recurrence */}
        {repeatsValue === "weekly" && (
          <>
            <InputField label="On Day" name="day" type="select" register={register} error={errors?.day} options={[
              { value: "MO", label: "Monday" },
              { value: "TU", label: "Tuesday" },
              { value: "WE", label: "Wednesday" },
              { value: "TH", label: "Thursday" },
              { value: "FR", label: "Friday" },
              { value: "SA", label: "Saturday" },
              { value: "SU", label: "Sunday" },
            ]} />
            <InputField label="Until" name="endDate" type="date" register={register} error={errors?.endDate} />
          </>
        )}
      </div>

      {state.error && <span className="text-red-500">{state.message || "Something went wrong!"}</span>}
      <button className="bg-orange-400 text-white p-4 rounded-xl" disabled={isPending}>
        {isPending ? "Loading..." : "Create"}
      </button>
    </form>
  );
};

export default LessonForm;