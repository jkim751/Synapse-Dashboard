"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { createParent, updateParent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import PhotoUploadWidget from "../PhotoUploadWidget";

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
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [img, setImg] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createParent : updateParent,
    {
      success: false,
      error: false,
      message: "Successfully processed the request.",
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || `Parent has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(type === "create" ? "Unable to create" : "Unable to update");
    }
  }, [state, router, type, setOpen]);

  const { students } = relatedData;

  const onSubmit = handleSubmit((formData) => {
    const selectedStudents = Array.from(
      document.querySelectorAll('input[name="students"]:checked')
    ).map((checkbox: any) => checkbox.value);

    const formattedData = {
      ...formData,
      img: img || undefined,
      students: selectedStudents || [],
      email: formData.email || undefined,
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
          {type === "create" ? "Create a new parent" : "Update the parent"}
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
          <div className="flex flex-col gap-2 w-full md:w-[48%]">
            <label className="text-xs text-gray-500">Payment Type</label>
            <select
              className="ring-[1.5px] ring-gray-300 rounded-md text-sm p-2"
              {...register("paymentType")}
              defaultValue={data?.paymentType || "CASH"}
            >
              <option value="NO_PAYMENT">No Payment</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CASH">Cash</option>
            </select>
            {errors.paymentType?.message && (
              <p className="text-xs text-red-400">{errors.paymentType.message.toString()}</p>
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
          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs text-gray-500">Students</label>
            <div className="border rounded-xl p-3 max-h-40 overflow-y-auto">
              {students?.map((student: { id: string; name: string; surname: string }) => (
                <div key={student.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="students"
                    value={student.id}
                    id={`student-${student.id}`}
                    defaultChecked={data?.students?.some((s: any) => s.id === student.id)}
                    className="w-4 h-4"
                  />
                  <label htmlFor={`student-${student.id}`} className="text-sm cursor-pointer">
                    {student.name} {student.surname}
                  </label>
                </div>
              ))}
            </div>
            {errors.students?.message && (
              <p className="text-xs text-red-400">
                {errors.students.message.toString()}
              </p>
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
          {isPending ? "Loading..." : type === "create" ? "Create" : "Update"}
        </button>
      </form>
    </div>
  );
};

export default ParentForm;