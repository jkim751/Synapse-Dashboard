/*
  Warnings:

  - You are about to drop the column `lessonInstanceId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the `LessonInstance` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `lessonId` on table `Attendance` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `startTime` on the `Lesson` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `Lesson` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lessonInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "LessonInstance" DROP CONSTRAINT "LessonInstance_lessonId_fkey";

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "lessonInstanceId",
ALTER COLUMN "lessonId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "LessonInstance";

-- DropEnum
DROP TYPE "LessonStatus";

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
