/*
  Warnings:

  - You are about to drop the column `bloodType` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `bloodType` on the `Teacher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "bloodType";

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "bloodType";
