// app/api/students-by-class/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Fetch students that are enrolled in the specified class
    const students = await prisma.student.findMany({
      where: {
        classes: {
          some: {
            classId: parseInt(classId)
          }
        }
      },
      select: {
        id: true,
        name: true,
        surname: true,
        username: true,
      },
      orderBy: [
        { surname: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students by class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}