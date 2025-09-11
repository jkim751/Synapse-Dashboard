import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = global as unknown as {
  prisma: any
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['warn', 'error'],
  }).$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma