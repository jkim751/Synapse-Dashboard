"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { eventSchema, EventSchema } from "@/lib/formValidationSchemas";
import { createEvent, updateEvent } from "@/lib/actions";

const EventForm = ({
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
  // --- NEW: State to manage the target audience ---
  const [targetAudience, setTargetAudience] = useState<'everyone' | 'class'>(
    // Default to 'class' if we are updating an event that already has a classId
    data?.classId ? 'class' : 'everyone'
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    // Pre-populate the form with existing data for updates
    defaultValues: {
      id: data?.id,
      title: data?.title || '',
      description: data?.description || '',
      // Keep dates as Date objects for the schema
      startTime: data?.startTime ? new Date(data.startTime) : undefined,
      endTime: data?.endTime ? new Date(data.endTime) : undefined,
      classId: data?.classId || null,
    },
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createEvent : updateEvent,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Event has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { classes } = relatedData;

  const onSubmit = handleSubmit((formData) => {
    // --- NEW: Adjust data before submitting to the server action ---
    const dataToSubmit = { ...formData };
    
    // If the user selected 'everyone', ensure we send 'null' for the classId
    if (targetAudience === 'everyone') {
      dataToSubmit.classId = null;
    }

    startTransition(() => {
      formAction(dataToSubmit);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new event" : "Update the event"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Title" name="title" register={register} error={errors?.title} />
        <InputField label="Description" name="description" register={register} error={errors?.description} />
        <InputField label="Start Time" name="startTime" register={register} error={errors?.startTime} type="datetime-local" />
        <InputField label="End Time" name="endTime" register={register} error={errors?.endTime} type="datetime-local" />
        
        {/* --- NEW: Radio buttons for audience selection --- */}
        <div className="w-full">
          <label className="text-sm font-medium">Event For</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetAudience"
                value="everyone"
                checked={targetAudience === 'everyone'}
                onChange={() => setTargetAudience('everyone')}
                className="form-radio"
              />
              Everyone (Global Event)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetAudience"
                value="class"
                checked={targetAudience === 'class'}
                onChange={() => setTargetAudience('class')}
                className="form-radio"
              />
              A Specific Class
            </label>
          </div>
        </div>

        {/* --- NEW: Conditionally render the class dropdown --- */}
        {targetAudience === 'class' && (
          <InputField
            label="Class"
            name="classId"
            register={register}
            error={errors?.classId}
            type="select"
            options={classes?.map((classItem: { id: number; name: string }) => ({
              value: classItem.id,
              label: classItem.name,
            }))}
          />
        )}
        
        {data && (
          <InputField label="Id" name="id" register={register} hidden />
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

export default EventForm;