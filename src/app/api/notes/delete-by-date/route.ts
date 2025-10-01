import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await request.json()

    // Delete notes for the specified date
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete notes by date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
