import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId: currentUserId, sessionClaims } = await auth();
    const currentUserRole = (sessionClaims?.metadata as { role?: string })?.role;

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, userData, role } = await req.json();

    // Only allow users to sync their own profile or admins to sync any profile
    if (currentUserId !== userId && currentUserRole !== 'admin' && currentUserRole !== 'director' && currentUserRole !== 'teacher-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only include fields that have actual values
    const updateData: any = {}
    
    if (userData.name) updateData.name = userData.name
    if (userData.surname) updateData.surname = userData.surname
    if (userData.email) updateData.email = userData.email
    if (userData.phone) updateData.phone = userData.phone
    if (userData.img !== undefined) updateData.img = userData.img // Allow null to clear image

    // Only update if there's something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    let updatedUser;

    switch (role) {
      case 'admin':
      case 'teacher-admin':
        updatedUser = await prisma.admin.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'director':
        updatedUser = await prisma.director.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'teacher':
        updatedUser = await prisma.teacher.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'student':
        updatedUser = await prisma.student.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'parent':
        updatedUser = await prisma.parent.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error syncing profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
