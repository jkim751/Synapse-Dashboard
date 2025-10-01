import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const actionItems = await prisma.actionItem.findMany({
      where: {
        noteId: id,
        userId
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(actionItems)
  } catch (error) {
    console.error('Failed to fetch action items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { title, description } = await request.json()

    const actionItem = await prisma.actionItem.create({
      data: {
        title,
        description,
        noteId: id,
        userId
      }
    })

    return NextResponse.json(actionItem)
  } catch (error) {
    console.error('Failed to create action item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
