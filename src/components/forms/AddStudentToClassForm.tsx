"use client";

import { addStudentToClass } from "@/lib/actions";
import { Student } from "@prisma/client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const AddStudentToClassForm = ({
  classId,
  availableStudents,
}: {
  classId: number;
  availableStudents: Student[];
}) => {
  const [state, formAction] = useActionState(addStudentToClass, {
    success: false,
    error: false,
  });
  
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="classId" value={classId} />
      <select
        name="studentId"
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamaPurple"
        required
      >
        <option value="">Select a student</option>
        {availableStudents.map((student) => (
          <option key={student.id} value={student.id}>
            {student.name} {student.surname}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-orange-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-lamaYellowLight transition-colors"
      >
        Add Student
      </button>
      {state.error && (
        <span className="text-red-500 text-xs">Something went wrong!</span>
      )}
    </form>
  );
};

export default AddStudentToClassForm;
