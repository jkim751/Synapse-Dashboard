import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { userId: currentUserId } = await auth();
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, userData, role } = await req.json();

    // Only allow users to sync their own profile or admins to sync any profile
    if (currentUserId !== userId) {
      // Check if current user is admin
      const currentUserRole = await prisma.admin.findUnique({
        where: { id: currentUserId }
      });
      
      if (!currentUserRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const updateData = {
      name: userData.name || '',
      surname: userData.surname || '',
      email: userData.email || '',
      phone: userData.phone || '',
      img: userData.img || null,
    };

    let updatedUser;

    switch (role) {
      case 'admin':
        updatedUser = await prisma.admin.update({
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
