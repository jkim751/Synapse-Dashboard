"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";

const StudentForm = ({
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
    watch,
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      classIds: data?.classes?.map((c: any) => c.classId) || [],
    }
  });

  const [img, setImg] = useState<any>();
  const [isPending, startTransition] = useTransition();
  const [selectedClasses, setSelectedClasses] = useState<number[]>(
    data?.classes?.map((c: any) => c.classId) || []
  );

  const [state, formAction] = useActionState(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Student has been ${type}d successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(state.message || `Failed to ${type} student!`);
    }
  }, [state, router, type, setOpen]);

  const { classes, parents, grades } = relatedData;

  // Filter classes based on selected grade
  const selectedGrade = watch("gradeId");
  const filteredClasses = classes?.filter((c: any) => 
    !selectedGrade || c.gradeId === Number(selectedGrade)
  );

  const handleClassToggle = (classId: number) => {
    const newClasses = selectedClasses.includes(classId)
      ? selectedClasses.filter(id => id !== classId)
      : [...selectedClasses, classId];
    
    setSelectedClasses(newClasses);
    setValue("classIds", newClasses);
  };

  const onSubmit = handleSubmit((data) => {
    console.log("Form data before submission:", data);
    
    const formattedData = {
      ...data,
      img: img?.secure_url || undefined,
      classIds: selectedClasses, // Array of class IDs
      gradeId: Number(data.gradeId),
      parentId: data.parentId || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };
    
    console.log("Formatted data:", formattedData);
    
    startTransition(() => {
      formAction(formattedData);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new student" : "Update the student"}
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
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={data?.birthday?.toISOString().split("T")[0]}          
          register={register}
          error={errors.birthday}
          type="date"
        />
        <InputField
          label="Grade"
          name="gradeId"
          defaultValue={data?.gradeId}
          register={register}
          error={errors?.gradeId}
          type="select"
          options={grades?.map((grade: { id: number; level: number }) => ({
            value: grade.id,
            label: grade.level.toString(),
          })) || []}
        />
        
        {/* Multiple Class Selection */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-xs text-gray-500">
            Classes (Select multiple)
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
            {filteredClasses?.length > 0 ? (
              filteredClasses.map((classItem: any) => (
                <div key={classItem.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id={`class-${classItem.id}`}
                    checked={selectedClasses.includes(classItem.id)}
                    onChange={() => handleClassToggle(classItem.id)}
                    className="w-4 h-4"
                  />
                  <label 
                    htmlFor={`class-${classItem.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {classItem.name} 
                    <span className="text-xs text-gray-500 ml-2">
                      ({classItem._count.students}/{classItem.capacity} students)
                    </span>
                  </label>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">
                {selectedGrade ? "No classes available for this grade" : "Select a grade first"}
              </p>
            )}
          </div>
          {errors.classIds && (
            <p className="text-xs text-red-400">
              {errors.classIds.message}
            </p>
          )}
          {selectedClasses.length > 0 && (
            <p className="text-xs text-gray-600">
              Selected: {selectedClasses.length} class(es)
            </p>
          )}
        </div>

        <InputField
          label="Parent (Optional)"
          name="parentId"
          defaultValue={data?.parentId}
          register={register}
          error={errors?.parentId}
          type="select"
          options={[
            { value: "", label: "No parent assigned" },
            ...parents?.map((parent: { id: string; name: string; surname: string }) => ({
              value: parent.id,
              label: `${parent.name} ${parent.surname}`,
            })) || []
          ]}
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
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
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
        <CldUploadWidget
          uploadPreset="school"
          onSuccess={(result, { widget }) => {
            setImg(result.info);
            widget.close();
          }}
        >
          {({ open }) => {
            return (
              <div
                className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                onClick={() => open()}
              >
                <Image src="/upload.png" alt="" width={28} height={28} />
                <span>Upload a photo</span>
              </div>
            );
          }}
        </CldUploadWidget>
      </div>
      {state.error && (
        <span className="text-red-500">Something went wrong! Please check all required fields.</span>
      )}
      <button 
        type="submit" 
        className="bg-orange-400 text-white p-2 rounded-md"
        disabled={isPending}
      >
        {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default StudentForm;