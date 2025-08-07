/*
  Warnings:

  - You are about to drop the column `checkedInAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `checkedOutAt` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the `SessionAttendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionEnrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TutoringSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Day" ADD VALUE 'SATURDAY';
ALTER TYPE "Day" ADD VALUE 'SUNDAY';

-- DropForeignKey
ALTER TABLE "SessionAttendance" DROP CONSTRAINT "SessionAttendance_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionAttendance" DROP CONSTRAINT "SessionAttendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "SessionEnrollment" DROP CONSTRAINT "SessionEnrollment_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "SessionEnrollment" DROP CONSTRAINT "SessionEnrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TutoringSession" DROP CONSTRAINT "TutoringSession_tutorId_fkey";

-- DropIndex
DROP INDEX "Attendance_studentId_lessonId_date_key";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "checkedInAt",
DROP COLUMN "checkedOutAt",
DROP COLUMN "notes",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "xeroContactId" TEXT;

-- DropTable
DROP TABLE "SessionAttendance";

-- DropTable
DROP TABLE "SessionEnrollment";

-- DropTable
DROP TABLE "TutoringSession";

-- DropEnum
DROP TYPE "AttendanceStatus";
