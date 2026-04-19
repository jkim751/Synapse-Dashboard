import prisma from "@/lib/prisma";

const UserCard = async ({
  type,
}: {
  type: "admin" | "teacher" | "student" | "parent" | "enrollment";
}) => {
  let data: number;
  let label: string;

  if (type === "enrollment") {
    data = await prisma.studentClass.count();
    label = "Enrollments";
  } else {
    const modelMap: Record<Exclude<typeof type, "enrollment">, any> = {
      admin: prisma.admin,
      teacher: prisma.teacher,
      student: prisma.student,
      parent: prisma.parent,
    };
    data = await modelMap[type].count(
      type === "student"
        ? { where: { status: { not: "DISENROLLED" } } }
        : type === "parent"
        ? { where: { students: { some: { status: { not: "DISENROLLED" } } } } }
        : undefined
    );
    label = `${type.charAt(0).toUpperCase() + type.slice(1)}s`;
  }

  return (
    <div className="bg-white border-2 border-lamaYellow/75 rounded-2xl p-4 flex-1 min-w-[130px]">
      <div className="flex justify-between items-center">
        <span className="text-[12px] bg-lamaYellow/75 px-2 py-1 rounded-full text-black">
        {new Date().getFullYear()}
        </span>
      </div>
      <h1 className="text-2xl font-semibold my-4">{data}</h1>
      <h2 className="text-sm font-medium text-black">{label}</h2>
    </div>
  );
};

export default UserCard;
