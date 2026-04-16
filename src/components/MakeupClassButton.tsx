"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateMakeupModal from "./CreateMakeupModal";

interface Props {
  classId: number;
  students: { id: string; name: string; surname: string }[];
  subjects: { id: number; name: string }[];
  teachers: { id: string; name: string; surname: string }[];
  defaultDate: string;
}

export default function MakeupClassButton({ classId, students, subjects, teachers, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium rounded-xl transition-colors"
      >
        + Makeup Class
      </button>

      {open && (
        <CreateMakeupModal
          classId={classId}
          students={students}
          subjects={subjects}
          teachers={teachers}
          defaultDate={defaultDate}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
