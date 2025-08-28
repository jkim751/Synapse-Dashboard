"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
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
  // --- NEW: State to manage the target audience ---
  const [sendTo, setSendTo] = useState<'everyone' | 'class'>(
    // If updating an existing item that has a classId, default to 'class'
    data?.classId ? 'class' : 'everyone'
  );

  const {
    register,
    handleSubmit,
    setValue,
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
      toast.error(state.message || `Failed to ${type} announcement.`);
    }
  }, [state, router, type, setOpen]);

  const { classes } = relatedData || {};

  const onSubmit = handleSubmit((formData) => {
    // --- NEW: Adjust data before submitting ---
    const dataToSubmit = { ...formData };
    
    // If 'everyone' is selected, ensure classId is null
    if (sendTo === 'everyone') {
      dataToSubmit.classId = null;
    }
    
    startTransition(() => {
      formAction(dataToSubmit);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new announcement" : "Update the announcement"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField label="Title" name="title" register={register} error={errors?.title} />
        <InputField label="Description" name="description" register={register} error={errors?.description} />
        <InputField label="Date" name="date" register={register} error={errors?.date} type="date" />
        
        {/* --- NEW: Radio buttons for audience selection --- */}
        <div className="w-full">
          <label className="text-sm font-medium">Send To</label>
          <div className="flex gap-4 mt-2">
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
          </div>
        </div>

        {/* --- NEW: Conditionally render the class dropdown --- */}
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

export default AnnouncementForm;