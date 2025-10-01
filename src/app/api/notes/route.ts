import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { date: 'desc' }
    })

    const formattedNotes = notes.map(note => ({
      id: note.id,
      title: note.title || '',
      content: note.content,
      author: note.author,
      createdAt: note.date
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

    // Delete existing notes for this date
    const noteDate = new Date(date)
    const startOfDay = new Date(noteDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(noteDate)
    endOfDay.setHours(23, 59, 59, 999)

    await prisma.note.deleteMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    // Create new note
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
