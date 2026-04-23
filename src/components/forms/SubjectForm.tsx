"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { subjectSchema, SubjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";
import { useActionState } from "react";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const SubjectForm = ({
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
    setValue,
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      teachers: data?.teachers?.map((t: any) => (typeof t === "string" ? t : t.id)) || [],
    },
  });

  const [selectedTeachers, setSelectedTeachers] = useState<string[]>(
    data?.teachers?.map((t: any) => (typeof t === "string" ? t : t.id)) || []
  );
  const [teacherSearch, setTeacherSearch] = useState("");

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createSubject : updateSubject,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Subject has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(type === "create" ? "Unable to create" : "Unable to update");
    }
  }, [state, router, type, setOpen]);

  const { teachers } = relatedData;

  const handleTeacherToggle = (id: string) => {
    const next = selectedTeachers.includes(id)
      ? selectedTeachers.filter((t) => t !== id)
      : [...selectedTeachers, id];
    setSelectedTeachers(next);
    setValue("teachers", next);
  };

  const filteredTeachers = teachers.filter((t: { name: string; surname: string }) =>
    `${t.name} ${t.surname}`.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction({ ...data, teachers: selectedTeachers });
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new subject" : "Update the subject"}
        </h1>
        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Subject name"
            name="name"
            defaultValue={data?.name}
            register={register}
            error={errors?.name}
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
          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs text-gray-500">Teachers</label>
            <input
              type="text"
              placeholder="Search teachers..."
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
            />
            <div className="border rounded-xl p-3 max-h-40 overflow-y-auto">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher: { id: string; name: string; surname: string }) => (
                  <div key={teacher.id} className="flex items-center gap-2 mb-2 last:mb-0">
                    <input
                      type="checkbox"
                      id={`teacher-${teacher.id}`}
                      checked={selectedTeachers.includes(teacher.id)}
                      onChange={() => handleTeacherToggle(teacher.id)}
                      className="w-4 h-4 accent-orange-400"
                    />
                    <label htmlFor={`teacher-${teacher.id}`} className="text-sm cursor-pointer flex-1">
                      {teacher.name} {teacher.surname}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No teachers found</p>
              )}
            </div>
            {selectedTeachers.length > 0 && (
              <p className="text-xs text-gray-500">{selectedTeachers.length} teacher(s) selected</p>
            )}
            {errors.teachers?.message && (
              <p className="text-xs text-red-400">{errors.teachers.message.toString()}</p>
            )}
          </div>
        </div>
        {state.error && (
          <span className="text-red-500">{type === "create" ? "Unable to create" : "Unable to update"}</span>
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

export default SubjectForm;
