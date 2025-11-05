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
import { announcementSchema, AnnouncementSchema } from "@/lib/formValidationSchemas";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions";

const AnnouncementForm = ({
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
  // --- UPDATED: Extended state to include grades and teachers-admins options ---
  const [sendTo, setSendTo] = useState<'everyone' | 'class' | 'teachers-admins' | 'grades'>(
    // Determine initial value based on existing data
    data?.gradeIds?.length > 0 ? 'grades' :
    data?.userIds?.length > 0 ? 'teachers-admins' :
    data?.classId ? 'class' : 'everyone'
  );

  // --- NEW: State for selected user IDs ---
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
  } = useForm<AnnouncementSchema>({
    resolver: zodResolver(announcementSchema),
    // Set default values from existing data
    defaultValues: {
      id: data?.id,
      title: data?.title || '',
      description: data?.description || '',
      date: data?.date ? new Date(data.date) : undefined,
      classId: data?.classId || null,
    }
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createAnnouncement : updateAnnouncement,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Announcement has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(type === "create" ? "Unable to create" : "Unable to update");
    }
  }, [state, router, type, setOpen]);

  const { classes, teachers, admins, grades } = relatedData || {};

  // --- NEW: Combine teachers and admins for the multi-select ---
  const teachersAndAdmins = [
    ...(teachers || []).map((teacher: any) => ({ ...teacher, role: 'TEACHER' })),
    ...(admins || []).map((admin: any) => ({ ...admin, role: 'ADMIN' }))
  ];

  const onSubmit = handleSubmit((formData) => {
    // --- UPDATED: Handle all four audience types ---
    const dataToSubmit: AnnouncementSchema & { userIds?: string[] | null; gradeIds?: number[] | null } = { ...formData };
    
    if (sendTo === 'everyone') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
    } else if (sendTo === 'class') {
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = null;
    } else if (sendTo === 'teachers-admins') {
      dataToSubmit.classId = null;
      dataToSubmit.gradeIds = null;
      dataToSubmit.userIds = selectedUserIds;
    } else if (sendTo === 'grades') {
      dataToSubmit.classId = null;
      dataToSubmit.userIds = null;
      dataToSubmit.gradeIds = selectedGradeIds;
    }
    
    startTransition(() => {
      formAction(dataToSubmit);
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new announcement" : "Update the announcement"}
        </h1>

        <div className="flex justify-between flex-wrap gap-4">
          <InputField label="Title" name="title" register={register} error={errors?.title} />
          <InputField label="Description" name="description" register={register} error={errors?.description} />
          <InputField label="Date" name="date" register={register} error={errors?.date} type="date" />
          
          {/* --- UPDATED: Added grades and teachers-admins options --- */}
          <div className="w-full">
            <label className="text-sm font-medium">Send To</label>
            <div className="flex gap-4 mt-2 flex-wrap">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sendTo"
                  value="everyone"
                  checked={sendTo === 'everyone'}
                  onChange={() => setSendTo('everyone')}
                  className="form-radio"
                />
                Everyone
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sendTo"
                  value="class"
                  checked={sendTo === 'class'}
                  onChange={() => setSendTo('class')}
                  className="form-radio"
                />
                Specific Class
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sendTo"
                  value="grades"
                  checked={sendTo === 'grades'}
                  onChange={() => setSendTo('grades')}
                  className="form-radio"
                />
                Grades
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sendTo"
                  value="teachers-admins"
                  checked={sendTo === 'teachers-admins'}
                  onChange={() => setSendTo('teachers-admins')}
                  className="form-radio"
                />
                Teachers & Admins
              </label>
            </div>
          </div>

          {/* --- EXISTING: Conditionally render the class dropdown --- */}
          {sendTo === 'class' && (
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
          {sendTo === 'grades' && (
            <GradeMultiSelect
              grades={grades || []}
              selectedGradeIds={selectedGradeIds}
              onChange={setSelectedGradeIds}
              error={selectedGradeIds.length === 0 ? { message: "Please select at least one grade" } : undefined}
            />
          )}

          {/* --- NEW: Conditionally render the user multi-select --- */}
          {sendTo === 'teachers-admins' && (
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

export default AnnouncementForm;