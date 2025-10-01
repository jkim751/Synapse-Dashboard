import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate' // 1. IMPORT

const prismaClientSingleton = () => {
  const basePrisma = new PrismaClient({
    log: ['query'],
  });

  // Add middleware to track student status changes
  basePrisma.$use(async (params, next) => {
    // Only track Student updates
    if (params.model === 'Student' && params.action === 'update') {
      const studentId = params.args.where.id;
      
      if (studentId && params.args.data.status) {
        const currentStudent = await basePrisma.student.findUnique({
          where: { id: studentId },
          select: { status: true }
        });

        const oldStatus = currentStudent?.status;
        const newStatus = params.args.data.status;

        // Perform the update
        const result = await next(params);

        // If status changed, create history entry
        if (oldStatus && oldStatus !== newStatus) {
          await basePrisma.studentStatusHistory.create({
            data: {
              studentId,
              fromStatus: oldStatus,
              toStatus: newStatus,
              changedAt: new Date(),
            }
          });
        }

        return result;
      }
    }

    // For updateMany, we need to handle differently
    if (params.model === 'Student' && params.action === 'updateMany' && params.args.data.status) {
      const studentsToUpdate = await basePrisma.student.findMany({
        where: params.args.where,
        select: { id: true, status: true }
      });

      const result = await next(params);

      const newStatus = params.args.data.status;
      const historyEntries = studentsToUpdate
        .filter(student => student.status !== newStatus)
        .map(student => ({
          studentId: student.id,
          fromStatus: student.status,
          toStatus: newStatus,
          changedAt: new Date(),
        }));

      if (historyEntries.length > 0) {
        await basePrisma.studentStatusHistory.createMany({
          data: historyEntries
        });
      }

      return result;
    }

    return next(params);
  });

  // Apply Accelerate extension after middleware
  return basePrisma.$extends(withAccelerate());
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Make sure we export as default as well
export default prisma