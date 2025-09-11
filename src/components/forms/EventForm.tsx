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
  // Fix the initial target audience detection
  const getInitialTargetAudience = () => {
    if (type === "create") return 'everyone'; // Default for new events
    
    // For existing events, check the actual data
    if (data?.gradeIds && data.gradeIds.length > 0) return 'grades';
    if (data?.userIds && data.userIds.length > 0) return 'teachers-admins';
    if (data?.classId) return 'class';
    return 'everyone';
  };

  const [targetAudience, setTargetAudience] = useState<'everyone' | 'class' | 'teachers-admins' | 'grades'>(
    getInitialTargetAudience()
  );

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    data?.userIds || []
  );

  const [selectedGradeIds, setSelectedGradeIds] = useState<number[]>(
    data?.gradeIds || []
  );

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<{
    users?: string;
    grades?: string;
  }>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EventSchema>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title || '',
      description: data?.description || '',
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

  const teachersAndAdmins = [
    ...(teachers || []).map((teacher: any) => ({ ...teacher, role: 'TEACHER' })),
    ...(admins || []).map((admin: any) => ({ ...admin, role: 'ADMIN' }))
  ];

  // Handle target audience change
  const handleTargetAudienceChange = (newTargetAudience: 'everyone' | 'class' | 'teachers-admins' | 'grades') => {
    setTargetAudience(newTargetAudience);
    
    // Clear validation errors when switching
    setValidationErrors({});
    
    // Reset form values based on new target
    if (newTargetAudience === 'everyone') {
      setValue('classId', null);
    } else if (newTargetAudience === 'class') {
      // Don't clear class selection, let user choose
    }
    // Don't clear selectedUserIds or selectedGradeIds - let user maintain their selections
  };

  const validateTargetAudience = () => {
    const errors: { users?: string; grades?: string } = {};
    
    if (targetAudience === 'teachers-admins' && selectedUserIds.length === 0) {
      errors.users = "Please select at least one teacher or admin";
    }
    
    if (targetAudience === 'grades' && selectedGradeIds.length === 0) {
      errors.grades = "Please select at least one grade";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = handleSubmit((formData) => {
    // Validate target audience selections
    if (!validateTargetAudience()) {
      return;
    }

    const dataToSubmit: EventSchema & { userIds?: string[] | null; gradeIds?: number[] | null } = { ...formData };
    
    if (targetAudience === 'everyone') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
    } else if (targetAudience === 'class') {
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
      // classId will be set from form data
    } else if (targetAudience === 'teachers-admins') {
      dataToSubmit.classId = null;
      dataToSubmit.gradeIds = null;
      dataToSubmit.userIds = selectedUserIds;
    } else if (targetAudience === 'grades') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = selectedGradeIds;
    }

    console.log('Submitting data:', dataToSubmit); // Debug log

    startTransition(() => {
      formAction(dataToSubmit);
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new event" : "Update the event"}
        </h1>

        <div className="flex justify-between flex-wrap gap-4">
          <InputField label="Title" name="title" register={register} error={errors?.title} />
          <InputField label="Description" name="description" register={register} error={errors?.description} />
          <InputField label="Start Time" name="startTime" register={register} error={errors?.startTime} type="datetime-local" />
          <InputField label="End Time" name="endTime" register={register} error={errors?.endTime} type="datetime-local" />
          
          <div className="w-full">
            <label className="text-sm font-medium">Event For</label>
            <div className="flex gap-4 mt-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="everyone"
                  checked={targetAudience === 'everyone'}
                  onChange={() => handleTargetAudienceChange('everyone')}
                  className="form-radio"
                />
                Everyone 
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="class"
                  checked={targetAudience === 'class'}
                  onChange={() => handleTargetAudienceChange('class')}
                  className="form-radio"
                />
                Class
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="grades"
                  checked={targetAudience === 'grades'}
                  onChange={() => handleTargetAudienceChange('grades')}
                  className="form-radio"
                />
                Grades
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="teachers-admins"
                  checked={targetAudience === 'teachers-admins'}
                  onChange={() => handleTargetAudienceChange('teachers-admins')}
                  className="form-radio"
                />
                Teachers & Admins
              </label>
            </div>
          </div>

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

          {targetAudience === 'grades' && (
            <div className="w-full">
              <GradeMultiSelect
                grades={grades || []}
                selectedGradeIds={selectedGradeIds}
                onChange={setSelectedGradeIds}
                error={validationErrors.grades ? { message: validationErrors.grades } : undefined}
              />
            </div>
          )}

          {targetAudience === 'teachers-admins' && (
            <div className="w-full">
              <UserMultiSelect
                users={teachersAndAdmins}
                selectedUserIds={selectedUserIds}
                onChange={setSelectedUserIds}
                error={validationErrors.users ? { message: validationErrors.users } : undefined}
              />
            </div>
          )}
          
          {data && (
            <InputField label="Id" name="id" register={register} hidden />
          )}
        </div>

        {state.error && (
          <span className="text-red-500">Something went wrong!</span>
        )}
        
        {/* Show validation errors */}
        {Object.keys(validationErrors).length > 0 && (
          <div className="text-red-500 text-sm">
            {Object.values(validationErrors).map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </div>
        )}

        <button
          type="submit"
          className="bg-orange-400 text-white p-2 rounded-xl hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default EventForm;