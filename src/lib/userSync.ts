import { clerkClient } from '@clerk/nextjs/server'
import prisma from './prisma'

export async function syncUserProfile(userId: string, role: string) {
  try {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    
    const updateData = {
      name: user.firstName || '',
      surname: user.lastName || '',
      email: user.emailAddresses?.[0]?.emailAddress || '',
      phone: user.phoneNumbers?.[0]?.phoneNumber || '',
      img: user.imageUrl || null,
    }

    switch (role) {
      case 'admin':
        return await prisma.admin.update({
          where: { id: userId },
          data: updateData,
        })
      case 'teacher':
        return await prisma.teacher.update({
          where: { id: userId },
          data: updateData,
        })
      case 'student':
        return await prisma.student.update({
          where: { id: userId },
          data: updateData,
        })
      case 'parent':
        return await prisma.parent.update({
          where: { id: userId },
          data: updateData,
        })
      default:
        throw new Error('Unknown role')
    }
  } catch (error) {
    console.error('Error syncing user profile:', error)
    throw error
  }
}

export async function getUserProfile(userId: string, role: string) {
  try {
    switch (role) {
      case 'admin':
        return await prisma.admin.findUnique({ where: { id: userId } })
      case 'teacher':
        return await prisma.teacher.findUnique({ where: { id: userId } })
      case 'student':
        return await prisma.student.findUnique({ where: { id: userId } })
      case 'parent':
        return await prisma.parent.findUnique({ where: { id: userId } })
      default:
        return null
    }
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}
