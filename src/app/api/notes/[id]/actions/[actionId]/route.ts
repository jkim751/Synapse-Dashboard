import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actionId } = await params
    const { completed } = await request.json()

    const actionItem = await prisma.actionItem.update({
      where: {
        id: actionId,
        userId
      },
      data: {
        completed,
        completedAt: completed ? new Date() : null
      }
    })

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error('Failed to update action item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { actionId } = await params

    await prisma.actionItem.delete({
      where: {
        id: actionId,
        userId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete action item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
