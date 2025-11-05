"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { createAdmin, updateAdmin } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { adminSchema, AdminSchema } from "@/lib/formValidationSchemas";
import { useUser } from "@clerk/nextjs";
import PhotoUploadWidget from "../PhotoUploadWidget";

const AdminForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminSchema>({
    resolver: zodResolver(adminSchema),
  });

  const [img, setImg] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    type === "create" ? createAdmin : updateAdmin,
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
      toast.success(state.message || `Admin has been ${type === "create" ? "created" : "updated"} successfully!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error && !state.success) {
      toast.error(type === "create" ? "Unable to create" : "Unable to update");
    }
  }, [state, router, type, setOpen]);

  const onSubmit = handleSubmit((formData) => {
    const formattedData = {
      ...formData,
      img: img || undefined,
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
          {type === "create" ? "Create a new admin" : "Update the admin"}
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
          {/* Empty div to maintain alignment */}
          <div className="w-full md:w-1/4"></div>
          <PhotoUploadWidget
            currentUserId={user?.id === data?.id ? user?.id : undefined}
            userRole={user?.id === data?.id ? (user?.publicMetadata?.role as string) : undefined}
            onPhotoUploaded={(url) => setImg(url || undefined)}
          />
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

export default AdminForm;
