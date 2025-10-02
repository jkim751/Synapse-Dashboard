import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin record exists before fetching notes
    const admin = await prisma.admin.findUnique({
      where: { id: userId }
    })

    if (!admin) {
      // Return empty array if admin not found, don't throw error
      return NextResponse.json([])
    }

    const notes = await prisma.note.findMany({
      where: { userId },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' }
        },
        actionItems: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { date: 'desc' }
    })

    const formattedNotes = notes.map((note: { id: any; title: any; content: any; author: any; date: any; comments: any; actionItems: any }) => ({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date,
      comments: note.comments,
      actionItems: note.actionItems
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

    const { id, title, content, author, date } = await request.json()

    // Create new note (don't delete existing notes for this date anymore)
    const note = await prisma.note.create({
      data: {
        id,
        title: title || null,
        content,
        author,
        date: new Date(date),
        userId
      }
    })

    return NextResponse.json({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date
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

    const { id, content } = await request.json()

    const note = await prisma.note.update({
      where: {
        id,
        userId
      },
      data: {
        content,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date
    })
  } catch (error) {
    console.error('Failed to update note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
