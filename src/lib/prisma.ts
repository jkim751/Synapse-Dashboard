import { PrismaClient, type StudentStatus } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be used in the browser');
  }

  // Prisma 7 client engine requires either accelerateUrl (Prisma Accelerate)
  // or an adapter (direct connection). We detect which to use from the URL protocol.
  // Prefer DATABASE_PRISMA_DATABASE_URL (Accelerate format) over DATABASE_URL, because
  // Vercel's Prisma Postgres integration auto-injects DATABASE_URL as a direct postgres://
  // URL which bypasses Accelerate. The explicit Accelerate URL takes priority.
  const dbUrl = process.env.DATABASE_PRISMA_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
  const isAccelerate = dbUrl.startsWith('prisma://') || dbUrl.startsWith('prisma+postgres://');

  const base = isAccelerate
    ? new PrismaClient({ log: ['query'], accelerateUrl: dbUrl })
    : new PrismaClient({ log: ['query'], adapter: new PrismaPg({ connectionString: dbUrl }) });

  const isTransientError = (e: any): boolean => {
    const msg: string = e?.message ?? '';
    const causeCode: string = e?.cause?.code ?? '';
    const code: string = e?.code ?? '';
    return (
      causeCode === 'UND_ERR_SOCKET' ||
      msg.includes('fetch failed') ||
      msg.includes('other side closed') ||
      code === 'P6000' ||
      code === 'P6006'
    );
  };

  const withRetry = base.$extends({
    query: {
      $allOperations: async ({ args, query }) => {
        const MAX_RETRIES = 3;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (e: any) {
            if (attempt < MAX_RETRIES && isTransientError(e)) {
              await new Promise((r) => setTimeout(r, 150 * 2 ** attempt));
              continue;
            }
            throw e;
          }
        }
      },
    },
  });

  const extended = withRetry
    .$extends({
      query: {
        student: {
          // Track status changes on single-record updates
          async update({ args, query }) {
            const newStatus = args.data?.status;

            if (newStatus && args.where?.id) {
              const current = await base.student.findUnique({
                where: { id: args.where.id as string },
                select: { status: true },
              });

              const result = await query(args);

              if (current?.status && current.status !== newStatus) {
                await base.studentStatusHistory.create({
                  data: {
                    studentId: args.where.id as string,
                    fromStatus: current.status,
                    toStatus: newStatus as StudentStatus,
                    changedAt: new Date(),
                  },
                });
              }

              return result;
            }

            return query(args);
          },

          // Track status changes on bulk updates
          async updateMany({ args, query }) {
            const newStatus = args.data?.status;

            if (newStatus) {
              const studentsToUpdate = await base.student.findMany({
                where: args.where,
                select: { id: true, status: true },
              });

              const result = await query(args);

              const historyEntries = studentsToUpdate
                .filter(s => s.status !== newStatus)
                .map(s => ({
                  studentId: s.id,
                  fromStatus: s.status,
                  toStatus: newStatus as StudentStatus,
                  changedAt: new Date(),
                }));

              if (historyEntries.length > 0) {
                await base.studentStatusHistory.createMany({ data: historyEntries });
              }

              return result;
            }

            return query(args);
          },
        },
      },
    });

  // Only apply the Accelerate extension when using an Accelerate URL
  // @ts-ignore - TypeScript can't resolve the deeply-nested extension type chain
  return isAccelerate ? extended.$extends(withAccelerate()) : extended;
};

declare const globalThis: {
  prismaGlobal: any;
} & typeof global;

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

export const prisma =
  typeof window === 'undefined'
    ? (globalForPrisma.prisma ?? prismaClientSingleton())
    : (null as any);

if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
