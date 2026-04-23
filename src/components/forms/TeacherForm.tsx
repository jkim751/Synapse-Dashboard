"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { useUser } from "@clerk/nextjs";
import PhotoUploadWidget from "../PhotoUploadWidget";

const TeacherForm = ({
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
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      subjects: data?.subjects?.map((s: any) => s.id.toString()) || [],
    },
  });

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    data?.subjects?.map((s: any) => s.id.toString()) || []
  );
  const [subjectSearch, setSubjectSearch] = useState("");

  const [img, setImg] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createTeacher : updateTeacher,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Teacher has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Failed to ${type} teacher. Please check all required fields and try again.`);
    }
  }, [state, router, type, setOpen]);

  const { subjects } = relatedData;

  const handleSubjectToggle = (id: string) => {
    const next = selectedSubjects.includes(id)
      ? selectedSubjects.filter((s) => s !== id)
      : [...selectedSubjects, id];
    setSelectedSubjects(next);
    setValue("subjects", next);
  };

  const filteredSubjects = subjects?.filter((s: { name: string }) =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const onSubmit = handleSubmit((formData) => {
    const formattedData = {
      ...formData,
      img: img || undefined,
      subjects: selectedSubjects,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      password: type === "update" && formData.password === "" ? undefined : formData.password,
    };
    startTransition(() => {
      formAction(formattedData);
    });
  });

  return (
    <div className="max-h-[90vh] overflow-y-auto bg-white p-6 rounded-lg">
      <form className="flex flex-col gap-6" onSubmit={onSubmit}>
        <h1 className="text-xl font-semibold">
          {type === "create" ? "Create a new teacher" : "Update the teacher"}
        </h1>
        <span className="text-xs text-gray-400 font-medium">
          Authentication Information
        </span>
        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Username"
            name="username"
            defaultValue={data?.username}
            register={register}
            error={errors?.username}
          />
          <InputField
            label="Email"
            name="email"
            defaultValue={data?.email}
            register={register}
            error={errors?.email}
          />
          {type === "create" && (
            <InputField
              label="Password"
              name="password"
              type="password"
              register={register}
              error={errors?.password}
            />
          )}
          {type === "update" && (
            <InputField
              label="Password (leave blank to keep current)"
              name="password"
              type="password"
              register={register}
              error={errors?.password}
            />
          )}
        </div>
        <span className="text-xs text-gray-400 font-medium">
          Personal Information
        </span>
        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="First Name"
            name="name"
            defaultValue={data?.name}
            register={register}
            error={errors.name}
          />
          <InputField
            label="Last Name"
            name="surname"
            defaultValue={data?.surname}
            register={register}
            error={errors.surname}
          />
          <InputField
            label="Phone"
            name="phone"
            defaultValue={data?.phone}
            register={register}
            error={errors.phone}
          />
          <InputField
            label="Branch"
            name="address"
            defaultValue={data?.address}
            register={register}
            error={errors.address}
          />
          <InputField
            label="Birthday"
            name="birthday"
            defaultValue={data?.birthday ? data.birthday.toISOString().split("T")[0] : ""}
            register={register}
            error={errors.birthday}
            type="date"
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
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">Sex</label>
            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
              {...register("sex")}
              defaultValue={data?.sex}
            >
              <option value="">Select Sex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.sex?.message && (
              <p className="text-xs text-red-400">
                {errors.sex.message.toString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs text-gray-500">Subjects</label>
            <input
              type="text"
              placeholder="Search subjects..."
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-xl text-sm w-full"
            />
            <div className="border rounded-xl p-3 max-h-40 overflow-y-auto">
              {filteredSubjects?.length > 0 ? (
                filteredSubjects.map((subject: { id: number; name: string }) => (
                  <div key={subject.id} className="flex items-center gap-2 mb-2 last:mb-0">
                    <input
                      type="checkbox"
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.id.toString())}
                      onChange={() => handleSubjectToggle(subject.id.toString())}
                      className="w-4 h-4 accent-orange-400"
                    />
                    <label htmlFor={`subject-${subject.id}`} className="text-sm cursor-pointer flex-1">
                      {subject.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No subjects found</p>
              )}
            </div>
            {selectedSubjects.length > 0 && (
              <p className="text-xs text-gray-500">{selectedSubjects.length} subject(s) selected</p>
            )}
            {errors.subjects?.message && (
              <p className="text-xs text-red-400">{errors.subjects.message.toString()}</p>
            )}
          </div>
          <PhotoUploadWidget
            currentUserId={user?.id === data?.id ? user?.id : undefined}
            userRole={user?.id === data?.id ? (user?.publicMetadata?.role as string) : undefined}
            onPhotoUploaded={(url) => setImg(url || undefined)}
          />
        </div>
        {state.error && (
          <span className="text-red-500">Something went wrong! Please check all required fields.</span>
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

export default TeacherForm;