import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Fetch notes for the specific date range
    const notes = await prisma.note.findMany({
      where: dateFilter,
      select: {
        id: true,
        title: true,
        content: true,
        author: true,
        date: true,
        comments: {
          select: {
            id: true,
            content: true,
            author: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        actionItems: {
          select: {
            id: true,
            title: true,
            description: true,
            completed: true,
            author: true,
            createdAt: true,
            completedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        StudentTag: {
          select: {
            id: true,
            studentId: true,
            noteId: true,
            createdAt: true,
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                img: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    const formattedNotes = notes.map((note: { id: any; title: any; content: any; author: any; date: any; comments: any; actionItems: any; StudentTag: any }) => ({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date,
      comments: note.comments,
      actionItems: note.actionItems,
      taggedStudents: note.StudentTag
    }))

    return NextResponse.json(formattedNotes)
  } catch (error) {
    console.error('Failed to fetch notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, title, content, author, date, studentIds } = await request.json()

    // Create note with student tags
    const note = await prisma.note.create({
      data: {
        id,
        title: title || null,
        content,
        author,
        date: new Date(date),
        userId,
        StudentTag: studentIds && studentIds.length > 0 ? {
          create: studentIds.map((studentId: string) => ({
            studentId
          }))
        } : undefined
      },
      include: {
        StudentTag: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                img: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date,
      taggedStudents: note.StudentTag
    })
  } catch (error) {
    console.error('Failed to create note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, content, studentIds } = await request.json()

    // Delete existing tags
    await prisma.studentTag.deleteMany({
      where: { noteId: id }
    })

    // Update note and create new tags
    const note = await prisma.note.update({
      where: { id },
      data: {
        content,
        updatedAt: new Date(),
        StudentTag: studentIds && studentIds.length > 0 ? {
          create: studentIds.map((studentId: string) => ({
            studentId
          }))
        } : undefined
      },
      include: {
        StudentTag: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                surname: true,
                img: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date,
      taggedStudents: note.StudentTag
    })
  } catch (error) {
    console.error('Failed to update note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}