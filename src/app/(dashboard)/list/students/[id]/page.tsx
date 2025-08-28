import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const SingleStudentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      classes: {
        include: {
          class: {
            include: {
              _count: {
                select: { lessons: true }
              }
            }
          }
        },
        orderBy: {
          isPrimary: 'desc' // Primary class first
        }
      },
      grade: true,
      parent: true,
    },
  });

  if (!student) {
    return notFound();
  }

  // Get primary class or first class for display
  const primaryClass = student.classes.find(sc => sc.isPrimary)?.class || student.classes[0]?.class;
  const allClasses = student.classes.map(sc => sc.class);
  
  // Calculate total lessons across all classes
  const totalLessons = student.classes.reduce((sum, sc) => sum + sc.class._count.lessons, 0);

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-white py-6 px-4 rounded-xl flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {student.name + " " + student.surname}
                </h1>
                {role === "admin" && (
                  <FormContainer table="student" type="update" data={student} />
                )}
              </div>
            
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>
                    {new Intl.DateTimeFormat("en-GB").format(student.birthday)}
                  </span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{student.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{student.phone || "-"}</span>
                </div>
                {student.schoolId && (
                  <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                    <Image src="/school.png" alt="" width={14} height={14} />
                    <span>{student.schoolId}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-xl flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/attendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <Suspense fallback="loading...">
                <StudentAttendanceCard id={student.id} />
              </Suspense>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-xl flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/home.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {student.grade.level}
                </h1>
                <span className="text-sm text-gray-400">Year</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-xl flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {totalLessons}
                </h1>
                <span className="text-sm text-gray-400">Total Lessons</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-xl flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/class.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {allClasses.length > 0 ? (
                    <>
                      {primaryClass?.name || allClasses[0]?.name}
                      {allClasses.length > 1 && (
                        <span className="text-xs text-gray-500 block">
                          +{allClasses.length - 1} more
                        </span>
                      )}
                    </>
                  ) : (
                    "No Class"
                  )}
                </h1>
                <span className="text-sm text-gray-400">
                  {allClasses.length > 1 ? "Classes" : "Class"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-xl p-4 h-[850px]">
          <h1>Student&apos;s Schedule</h1>
          {primaryClass ? (
            <BigCalendarContainer type="classId" id={primaryClass.id} />
          ) : (
            <p className="text-gray-500 mt-4">No class assigned</p>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-black">
            {primaryClass ? (
              <>
                <Link
                  className="p-3 rounded-xl bg-lamaSky/15"
                  href={`/list/lessons?classId=${primaryClass.id}`}
                >
                  Student&apos;s Lessons
                </Link>
                <Link
                  className="p-3 rounded-xl bg-lamaSky/15"
                  href={`/list/teachers?classId=${primaryClass.id}`}
                >
                  Student&apos;s Teachers
                </Link>
                <Link
                  className="p-3 rounded-xl bg-lamaSky/15"
                  href={`/list/exams?classId=${primaryClass.id}`}
                >
                  Student&apos;s Exams
                </Link>
                <Link
                  className="p-3 rounded-xl bg-lamaSky/15"
                  href={`/list/assignments?classId=${primaryClass.id}`}
                >
                  Student&apos;s Assignments
                </Link>
              </>
            ) : (
              <p className="text-gray-500">No class assigned</p>
            )}
            <Link
              className="p-3 rounded-xl bg-lamaSky/15"
              href={`/list/results?studentId=${student.id}`}
            >
              Student&apos;s Results
            </Link>
          </div>
        </div>
        
        {/* Classes Card */}
        {allClasses.length > 0 && (
          <div className="bg-white p-4 rounded-xl">
            <h1 className="text-xl font-semibold mb-4">Enrolled Classes</h1>
            <div className="space-y-2">
              {student.classes.map((sc) => (
                <div 
                  key={sc.class.id} 
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sc.class.name}</span>
                    {sc.isPrimary && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {sc.class._count.lessons} lessons
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Announcements />
      </div>
    </div>
  );
};

export default SingleStudentPage;