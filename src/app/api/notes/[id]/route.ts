import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.note.deleteMany({
      where: {
        id,
        userId // Ensure user can only delete their own notes
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
