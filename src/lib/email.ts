import { Resend } from "resend";
import prisma from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMAIL_SIGNATURE = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 16px" />
  <table style="border-collapse:collapse;font-size:13px;color:#333;line-height:1.7">
    <tr>
      <td style="padding-right:20px;vertical-align:middle">
        <img src="https://synapseeducation.com.au/email.png" alt="Synapse Education" width="110" style="display:block" />
      </td>
      <td style="vertical-align:middle;border-left:2px solid #e5e7eb;padding-left:20px">
        <div style="font-size:15px;font-weight:700;color:#111">Synapse Education Administration</div>
        <div style="color:#555">HSC Specialists | Holistic Education</div>
        <div>w: <a href="https://synapseeducation.com.au/" style="color:#f97316;text-decoration:none">https://synapseeducation.com.au/</a> &nbsp;|&nbsp; e: Synapse Education</div>
        <div style="color:#555;margin-top:6px">Suite 305 | 160 Rowe St | Eastwood 2122 NSW</div>
      </td>
    </tr>
  </table>
`;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Send reschedule emails to all students + parents in the affected class
export async function sendLessonRescheduleEmails(params: {
  lessonId?: number;
  recurringLessonId?: number;
  lessonTitle: string;
  newStart: string;
  newEnd: string;
  scope: "instance" | "series";
}) {
  const { lessonId, recurringLessonId, lessonTitle, newStart, newEnd, scope } = params;

  // Gather recipients from the relevant class
  let recipients: { name: string; email: string }[] = [];

  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { select: { name: true, surname: true, email: true } },
        class: {
          include: {
            students: {
              include: {
                student: {
                  include: { parent: { select: { name: true, surname: true, email: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (lesson?.teacher?.email) {
      recipients.push({ name: `${lesson.teacher.name} ${lesson.teacher.surname}`, email: lesson.teacher.email });
    }
    if (lesson?.class) {
      for (const sc of lesson.class.students) {
        const s = sc.student;
        if (s.email) recipients.push({ name: `${s.name} ${s.surname}`, email: s.email });
        if (s.parent?.email) recipients.push({ name: `${s.parent.name} ${s.parent.surname}`, email: s.parent.email });
      }
    }
  } else if (recurringLessonId) {
    const rl = await prisma.recurringLesson.findUnique({
      where: { id: recurringLessonId },
      include: {
        teacher: { select: { name: true, surname: true, email: true } },
        class: {
          include: {
            students: {
              include: {
                student: {
                  include: { parent: { select: { name: true, surname: true, email: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (rl?.teacher?.email) {
      recipients.push({ name: `${rl.teacher.name} ${rl.teacher.surname}`, email: rl.teacher.email });
    }
    if (rl?.class) {
      for (const sc of rl.class.students) {
        const s = sc.student;
        if (s.email) recipients.push({ name: `${s.name} ${s.surname}`, email: s.email });
        if (s.parent?.email) recipients.push({ name: `${s.parent.name} ${s.parent.surname}`, email: s.parent.email });
      }
    }
  }

  // Deduplicate by email
  const seen = new Set<string>();
  recipients = recipients.filter(r => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  console.log(`[email] Reschedule recipients: ${recipients.length}`, recipients.map(r => r.email));
  if (recipients.length === 0) return { sent: 0 };

  const scopeNote =
    scope === "series"
      ? "This change applies to <strong>all future occurrences</strong> of this recurring lesson."
      : "This change applies to <strong>this occurrence only</strong>.";

  const html = `
    <p>Hi,</p>
    <p>This is a notification that the following lesson has been rescheduled:</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Lesson</td><td><strong>${lessonTitle}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">New date</td><td><strong>${formatDateTime(newStart)}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">New time</td><td><strong>${formatTime(newStart)} – ${formatTime(newEnd)}</strong></td></tr>
    </table>
    <p style="font-size:13px;color:#555">${scopeNote}</p>
    ${EMAIL_SIGNATURE}
  `;

  const results = await Promise.allSettled(
    recipients.map(r =>
      resend.emails.send({
        from: FROM,
        to: r.email,
        subject: `Lesson rescheduled: ${lessonTitle}`,
        html,
      })
    )
  );

  let sent = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.error) {
        console.error("[email] Resend error:", result.value.error);
      } else {
        sent++;
      }
    } else {
      console.error("[email] Send rejected:", result.reason);
    }
  }

  console.log(`[email] Reschedule: ${sent}/${recipients.length} sent from ${FROM}`);
  return { sent };
}

// Send makeup lesson emails to the selected students + their parents
export async function sendMakeupLessonEmails(lessonId: number) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: { select: { name: true, surname: true, email: true } },
      makeupStudents: {
        include: {
          student: {
            include: { parent: { select: { name: true, surname: true, email: true } } },
          },
        },
      },
    },
  });

  if (!lesson) return { sent: 0 };

  let recipients: { name: string; email: string }[] = [];

  if (lesson.teacher?.email) {
    recipients.push({ name: `${lesson.teacher.name} ${lesson.teacher.surname}`, email: lesson.teacher.email });
  }

  for (const ms of lesson.makeupStudents) {
    const s = ms.student;
    if (s.email) recipients.push({ name: `${s.name} ${s.surname}`, email: s.email });
    if (s.parent?.email) recipients.push({ name: `${s.parent.name} ${s.parent.surname}`, email: s.parent.email });
  }

  // Deduplicate by email
  const seen = new Set<string>();
  recipients = recipients.filter(r => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });

  console.log(`[email] Makeup recipients: ${recipients.length}`, recipients.map(r => r.email));
  if (recipients.length === 0) return { sent: 0 };

  const startStr = formatDateTime(lesson.startTime.toISOString());
  const endTimeStr = formatTime(lesson.endTime.toISOString());

  const html = `
    <p>Hi,</p>
    <p>A makeup class has been scheduled:</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Lesson</td><td><strong>${lesson.name}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Date &amp; time</td><td><strong>${startStr} – ${endTimeStr}</strong></td></tr>
    </table>
    ${EMAIL_SIGNATURE}
  `;

  const results = await Promise.allSettled(
    recipients.map(r =>
      resend.emails.send({
        from: FROM,
        to: r.email,
        subject: `Makeup class scheduled: ${lesson.name}`,
        html,
      })
    )
  );

  let sent = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      if (result.value.error) {
        console.error("[email] Resend error:", result.value.error);
      } else {
        sent++;
      }
    } else {
      console.error("[email] Send rejected:", result.reason);
    }
  }

  console.log(`[email] Makeup: ${sent}/${recipients.length} sent from ${FROM}`);
  return { sent };
}
