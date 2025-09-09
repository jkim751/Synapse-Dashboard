"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import UserMultiSelect from "./UserMultiSelect";
import GradeMultiSelect from "./GradeMultiSelect";
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
  // --- UPDATED: Extended state to include grades option ---
  const [targetAudience, setTargetAudience] = useState<'everyone' | 'class' | 'teachers-admins' | 'grades'>(
    // Determine initial value based on existing data
    data?.gradeIds?.length > 0 ? 'grades' :
    data?.userIds?.length > 0 ? 'teachers-admins' :
    data?.classId ? 'class' : 'everyone'
  );

  // --- EXISTING: State for selected user IDs ---
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    data?.userIds || []
  );

  // --- NEW: State for selected grade IDs ---
  const [selectedGradeIds, setSelectedGradeIds] = useState<number[]>(
    data?.gradeIds || []
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
      toast.success(state.message || `Event has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Failed to ${type} event.`);
    }
  }, [state, router, type, setOpen]);

  const { classes, teachers, admins, grades } = relatedData;

  // --- EXISTING: Combine teachers and admins for the multi-select ---
  const teachersAndAdmins = [
    ...(teachers || []).map((teacher: any) => ({ ...teacher, role: 'TEACHER' })),
    ...(admins || []).map((admin: any) => ({ ...admin, role: 'ADMIN' }))
  ];

  const onSubmit = handleSubmit((formData) => {
    // --- UPDATED: Handle all four audience types ---
    const dataToSubmit: EventSchema & { userIds?: string[] | null; gradeIds?: number[] | null } = { ...formData };
    
    if (targetAudience === 'everyone') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
    } else if (targetAudience === 'class') {
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
    } else if (targetAudience === 'teachers-admins') {
      dataToSubmit.classId = null;
      dataToSubmit.gradeIds = null;
      dataToSubmit.userIds = selectedUserIds;
    } else if (targetAudience === 'grades') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = selectedGradeIds;
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
        
        {/* --- UPDATED: Added grades option --- */}
        <div className="w-full">
          <label className="text-sm font-medium">Event For</label>
          <div className="flex gap-4 mt-2 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetAudience"
                value="everyone"
                checked={targetAudience === 'everyone'}
                onChange={() => setTargetAudience('everyone')}
                className="form-radio"
              />
              Everyone 
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
              Class
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetAudience"
                value="grades"
                checked={targetAudience === 'grades'}
                onChange={() => setTargetAudience('grades')}
                className="form-radio"
              />
              Grade
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="targetAudience"
                value="teachers-admins"
                checked={targetAudience === 'teachers-admins'}
                onChange={() => setTargetAudience('teachers-admins')}
                className="form-radio"
              />
              Teachers & Admins
            </label>
          </div>
        </div>

        {/* --- EXISTING: Conditionally render the class dropdown --- */}
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

        {/* --- NEW: Conditionally render the grade multi-select --- */}
        {targetAudience === 'grades' && (
          <GradeMultiSelect
            grades={grades || []}
            selectedGradeIds={selectedGradeIds}
            onChange={setSelectedGradeIds}
            error={selectedGradeIds.length === 0 ? { message: "Please select at least one grade" } : undefined}
          />
        )}

        {/* --- EXISTING: Conditionally render the user multi-select --- */}
        {targetAudience === 'teachers-admins' && (
          <UserMultiSelect
            users={teachersAndAdmins}
            selectedUserIds={selectedUserIds}
            onChange={setSelectedUserIds}
            error={selectedUserIds.length === 0 ? { message: "Please select at least one user" } : undefined}
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