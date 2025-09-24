import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate' // 1. IMPORT

const prismaClientSingleton = () => {
  // 2. APPLY THE EXTENSION
  return new PrismaClient().$extends(withAccelerate())
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??     
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Make sure we export as default as well
export default prisma