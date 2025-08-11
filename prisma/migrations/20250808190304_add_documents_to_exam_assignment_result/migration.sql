-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "documents" TEXT[] DEFAULT ARRAY[]::TEXT[];
