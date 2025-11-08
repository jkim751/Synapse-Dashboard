import { z } from "zod";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Subject name is required!" }),
  teachers: z.array(z.string()), //teacher ids
});
export type SubjectSchema = z.infer<typeof subjectSchema>;


export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  supervisorId: z.coerce.string().optional(),
});
export type ClassSchema = z.infer<typeof classSchema>;


export const teacherSchema = z.object({  
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters long!"
    }),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email address!"
    }),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required!" }),
  img: z.string().optional(),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  subjects: z.array(z.string()).optional(),
});
export type TeacherSchema = z.infer<typeof teacherSchema>;


export const adminSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters long!"
    }),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email address!"
    }),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required!" }),
  img: z.string().optional(),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
});
export type AdminSchema = z.infer<typeof adminSchema>;


export const studentSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long!" })
    .max(20, { message: "Username must be at most 20 characters long!" }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters long!"
    }),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email address!"
    }),
  phone: z.string().optional(),
  address: z.string().min(1, { message: "Address is required!" }),
  img: z.string().optional(),
  birthday: z.coerce.date({ message: "Birthday is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "Sex is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade is required!" }),
  classIds: z.array(z.coerce.number()).min(1, { message: "At least one class is required!" }), // Changed from classId to classIds array
  parentId: z.string().optional(),
  school: z.string().optional(),
  status: z.enum(["CURRENT","TRIAL","DISENROLLED"], { message: "Status is required!" }), // NEW
});
export type StudentSchema = z.infer<typeof studentSchema>;


export const examSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  lessonId: z.coerce.number().optional().nullable(),
  recurringLessonId: z.coerce.number().optional().nullable(),
  documents: z.array(z.string()).optional(),
}).refine(data => {
  // Ensure that either lessonId or recurringLessonId is provided, but not both.
  return (data.lessonId != null && data.recurringLessonId == null) || (data.lessonId == null && data.recurringLessonId != null);
}, {
  message: "An exam must be linked to either a single lesson or a recurring series, but not both.",
  path: ["lessonId"], // Where to display the error
});
export type ExamSchema = z.infer<typeof examSchema>;


export const lessonSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().min(1, "Name is required"),
  subjectId: z.coerce.number().int().positive(),
  classId: z.coerce.number().int().positive(),
  teacherId: z.string().min(1, "Teacher is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),

  // creation controls
  repeats: z.enum(["never", "weekly"]).default("never"),
  day: z.enum(["MO","TU","WE","TH","FR","SA","SU"]).optional(),
  endDate: z.string().optional(), // until

  // recurring update controls
  updateScope: z.enum(["series", "instance"]).optional(),
  originalDate: z.string().optional(),

  // routing hint
  variant: z.enum(["single", "recurring"]).optional(),
});

export type LessonSchema = z.infer<typeof lessonSchema>;


export const parentSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, { message: "Username must be at least 3 characters long!" }),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters long!"
    }),
  name: z.string().min(1, { message: "First name is required!" }),
  surname: z.string().min(1, { message: "Last name is required!" }),
  email: z
    .string()
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, {
      message: "Invalid email address!"
    }),
  phone: z.string().min(1, { message: "Phone is required!" }),
  address: z.string().min(1, { message: "Address is required!" }),
  paymentType: z.enum(["NO_PAYMENT", "BANK_TRANSFER", "CASH"]),
  students: z.array(z.string()).optional(),
});
export type ParentSchema = z.infer<typeof parentSchema>;


export const assignmentSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  startDate: z.coerce.date({ message: "Start date is required!" }),
  dueDate: z.coerce.date({ message: "Due date is required!" }),
  lessonId: z.coerce.number().optional().nullable(),
  recurringLessonId: z.coerce.number().optional().nullable(),
  documents: z.array(z.string()).optional(),
}).refine(data => {
  // Ensure that either lessonId or recurringLessonId is provided, but not both.
  return (data.lessonId != null && data.recurringLessonId == null) || (data.lessonId == null && data.recurringLessonId != null);
}, {
  message: "An assignment must be linked to either a single lesson or a recurring series, but not both.",
  path: ["lessonId"], // Where to display the error
});
export type AssignmentSchema = z.infer<typeof assignmentSchema>;


export const resultSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  score: z.coerce.number().min(0, { message: "Score must be at least 0!" }).max(100, { message: "Score must be at most 100!" }),
  examId: z.coerce.number().optional().nullable(),
  assignmentId: z.coerce.number().optional().nullable(),
  studentId: z.string().min(1, { message: "Student is required!" }),
  documents: z.array(z.string()).optional(),
});
export type ResultSchema = z.infer<typeof resultSchema>;


export const eventSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  startTime: z.coerce.date({ message: "Start time is required!" }),
  endTime: z.coerce.date({ message: "End time is required!" }),
  classId: z.coerce.number().optional().nullable(),
  userIds: z.array(z.string()).optional().nullable(),
  gradeIds: z.array(z.coerce.number()).optional().nullable(),
});
export type EventSchema = z.infer<typeof eventSchema>;


export const announcementSchema = z.object({
  id: z.coerce.number().optional(),
  title: z.string().min(1, { message: "Title is required!" }),
  description: z.string().min(1, { message: "Description is required!" }),
  date: z.coerce.date({ message: "Date is required!" }),
  classId: z.coerce.number().optional().nullable(), // This allows a number, null, or undefined. Perfect!
  userIds: z.array(z.string()).optional().nullable(),
  gradeIds: z.array(z.coerce.number()).optional().nullable(),
});
export type AnnouncementSchema = z.infer<typeof announcementSchema>;