-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lessonId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "lessonInstanceId" INTEGER,
ALTER COLUMN "lessonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "LessonInstance" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "LessonInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonInstance_lessonId_idx" ON "LessonInstance"("lessonId");

-- CreateIndex
CREATE INDEX "LessonInstance_date_idx" ON "LessonInstance"("date");

-- AddForeignKey
ALTER TABLE "LessonInstance" ADD CONSTRAINT "LessonInstance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lessonInstanceId_fkey" FOREIGN KEY ("lessonInstanceId") REFERENCES "LessonInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
