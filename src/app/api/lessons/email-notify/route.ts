import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sendLessonRescheduleEmails, sendMakeupLessonEmails } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "admin" && role !== "director" && role !== "teacher-admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type } = body;

  try {
    if (type === "reschedule") {
      const { lessonId, recurringLessonId, lessonTitle, newStart, newEnd, scope } = body;
      if (!lessonTitle || !newStart || !newEnd || !scope) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const result = await sendLessonRescheduleEmails({
        lessonId: lessonId ? Number(lessonId) : undefined,
        recurringLessonId: recurringLessonId ? Number(recurringLessonId) : undefined,
        lessonTitle,
        newStart,
        newEnd,
        scope,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (type === "makeup") {
      const { lessonId } = body;
      if (!lessonId) {
        return NextResponse.json({ error: "lessonId required" }, { status: 400 });
      }
      const result = await sendMakeupLessonEmails(Number(lessonId));
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("Email notify error:", err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
