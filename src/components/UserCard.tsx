import prisma from "@/lib/prisma";
import Image from "next/image";

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent";
}) => {
  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    teacher: prisma.teacher,
    student: prisma.student,
    parent: prisma.parent,
  };

  const data = await modelMap[type].count();

  return (
    <div className="bg-white border-2 border-lamaYellow/75 rounded-2xl p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[12px] bg-lamaYellow/75 px-2 py-1 rounded-full text-black">
        {new Date().getFullYear()}
        </span>
      </div>
      <h1 className="text-2xl font-semibold my-4">{data}</h1>
      <h2 className="capitalize text-sm font-medium text-black">{type}s</h2>
    </div>
  );
};

export default UserCard;
