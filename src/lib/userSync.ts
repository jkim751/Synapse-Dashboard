import { clerkClient } from '@clerk/nextjs/server'
import prisma from './prisma'

export async function syncUserProfile(userId: string, role: string) {
  try {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    
    // Only include fields that have actual values
    const updateData: any = {}
    
    if (user.firstName) updateData.name = user.firstName
    if (user.lastName) updateData.surname = user.lastName
    if (user.emailAddresses?.[0]?.emailAddress) updateData.email = user.emailAddresses[0].emailAddress
    if (user.phoneNumbers?.[0]?.phoneNumber) updateData.phone = user.phoneNumbers[0].phoneNumber
    if (user.imageUrl && role !== 'parent') updateData.img = user.imageUrl

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      console.log('No fields to update for user:', userId)
      return null
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
