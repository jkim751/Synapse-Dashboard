"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useActionState } from "react";
import InputField from "../InputField";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";

const ParentForm = ({
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
    watch,
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Parent has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { students } = relatedData;

  const onSubmit = handleSubmit((formData) => {
    console.log("Form data before submission:", formData); // Debug log
    
    // Get selected students from the form
    const studentsSelect = document.querySelector('select[multiple]') as HTMLSelectElement;
    const selectedStudents = Array.from(studentsSelect?.selectedOptions || []).map(option => option.value);
    
    const formattedData = {
      ...formData,
      students: selectedStudents || [],
      // Convert empty strings to undefined for optional fields
      email: formData.email || undefined,
      // Ensure password is only included for create operations or when provided
      ...(type === "update" && formData.password === "" ? {} : { password: formData.password }),
    };
    
    console.log("Formatted data:", formattedData); // Debug log
    
    startTransition(() => {
      formAction(formattedData);
    });
  });

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new parent" : "Update the parent"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
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
        <InputField
          label="Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Surname"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors?.surname}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
          type="email"
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors?.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors?.address}
        />
        
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <label className="text-xs text-gray-500">Students (Optional)</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full h-32"
            multiple
            {...register("students")}
            defaultValue={data?.students?.map((student: any) => student.id) || []}
          >
            {students?.map((student: { id: string; name: string; surname: string }) => (
              <option key={student.id} value={student.id}>
                {student.name} {student.surname}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            Hold Ctrl/Cmd to select multiple students
          </p>
          {errors?.students && (
            <p className="text-xs text-red-400">
              {errors.students.message?.toString()}
            </p>
          )}
        </div>
        
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

export default ParentForm;