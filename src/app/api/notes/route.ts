import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = parseInt(searchParams.get('skip') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter - default to last 90 days if no dates provided
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else {
      // Default to last 90 days to reduce data size
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      dateFilter.date = {
        gte: ninetyDaysAgo
      }
    }

    // Fetch notes with pagination and date filtering
    const notes = await prisma.note.findMany({
      where: dateFilter,
      take: limit,
      skip: skip,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit comments per note
        },
        actionItems: {
          orderBy: { createdAt: 'desc' },
          take: 50 // Limit action items per note
        },
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
          },
          take: 20 // Limit student tags per note
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