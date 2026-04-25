import prisma from "@/lib/prisma";

export async function getSenderName(userId: string, role: string): Promise<string> {
  try {
    if (role === "teacher") {
      const t = await prisma.teacher.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
      return t ? `${t.name} ${t.surname}` : "Unknown";
    }
    if (role === "admin" || role === "teacher-admin") {
      const a = await prisma.admin.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
      return a ? `${a.name} ${a.surname}` : "Unknown";
    }
    if (role === "director") {
      const d = await prisma.director.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
      return d ? `${d.name} ${d.surname}` : "Unknown";
    }
    if (role === "student") {
      const s = await prisma.student.findUnique({ where: { id: userId }, select: { name: true, surname: true } });
      return s ? `${s.name} ${s.surname}` : "Unknown";
    }
  } catch {}
  return "Unknown";
}

export async function canAccessThread(
  threadId: number,
  userId: string,
  role: string | undefined
): Promise<boolean> {
  if (role === "admin" || role === "director") return true;

  const thread = await prisma.chatThread.findUnique({ where: { id: threadId } });
  if (!thread) return false;

  if (thread.type === "CLASS" && thread.classId) {
    if (role === "teacher" || role === "teacher-admin") {
      const lesson = await prisma.lesson.findFirst({
        where: { classId: thread.classId, teacherId: userId },
      });
      if (lesson) return true;
      const rLesson = await prisma.recurringLesson.findFirst({
        where: { classId: thread.classId, teacherId: userId },
      });
      return !!rLesson;
    }
    if (role === "student") {
      const sc = await prisma.studentClass.findFirst({
        where: { studentId: userId, classId: thread.classId },
      });
      return !!sc;
    }
  }

  if (thread.type === "DIRECT") {
    const p = await prisma.chatThreadParticipant.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    return !!p;
  }

  return false;
}
