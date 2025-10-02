import prisma from './prisma'
import { auth } from '@clerk/nextjs/server'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

export class NotesDB {
  private static instance: NotesDB
  
  static getInstance(): NotesDB {
    if (!NotesDB.instance) {
      NotesDB.instance = new NotesDB()
    }
    return NotesDB.instance
  }

  private async getCurrentUser(): Promise<string> {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('User not authenticated')
    }
    return userId
  }

  async getAllNotes(): Promise<Note[]> {
    try {
      const userId = await this.getCurrentUser()
      
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: { date: 'desc' }
      })

      return notes.map((note: { id: any; title: any; content: any; author: any; date: any }) => ({
        id: note.id,
        title: note.title || '',
        content: note.content,
        author: note.author,
        createdAt: note.date
      }))
    } catch (error) {
      console.error('Failed to load notes:', error)
      // Fallback to localStorage for development
      if (typeof window !== 'undefined') {
        const savedNotes = localStorage.getItem('synapse-notes')
        if (savedNotes) {
          return JSON.parse(savedNotes).map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt)
          }))
        }
      }
      return []
    }
  }

  async saveNotes(notes: Note[]): Promise<void> {
    try {
      const userId = await this.getCurrentUser()
      
      // Delete all existing notes for this user
      await prisma.note.deleteMany({
        where: { userId }
      })

      // Insert new notes
      await prisma.note.createMany({
        data: notes.map(note => ({
          id: note.id,
          title: note.title || null,
          content: note.content,
          author: note.author,
          date: note.createdAt,
          userId
        }))
      })
    } catch (error) {
      console.error('Failed to save notes:', error)
      // Fallback to localStorage for development
      if (typeof window !== 'undefined') {
        localStorage.setItem('synapse-notes', JSON.stringify(notes))
      }
      throw error
    }
  }

  async saveNote(note: Note): Promise<Note> {
    try {
      const userId = await this.getCurrentUser()
      
      const savedNote = await prisma.note.upsert({
        where: { id: note.id },
        update: {
          title: note.title || null,
          content: note.content,
          author: note.author,
          date: note.createdAt
        },
        create: {
          id: note.id,
          title: note.title || null,
          content: note.content,
          author: note.author,
          date: note.createdAt,
          userId
        }
      })

      return {
        id: savedNote.id,
        title: savedNote.title || '',
        content: savedNote.content,
        author: savedNote.author,
        createdAt: savedNote.date
      }
    } catch (error) {
      console.error('Failed to save note:', error)
      throw error
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      await prisma.note.delete({
        where: { id: noteId }
      })
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    }
  }

  async getNotesForDate(date: Date): Promise<Note[]> {
    try {
      const userId = await this.getCurrentUser()
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const notes = await prisma.note.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return notes.map((note: { id: any; title: any; content: any; author: any; date: any }) => ({
        id: note.id,
        title: note.title || '',
        content: note.content,
        author: note.author,
        createdAt: note.date
      }))
    } catch (error) {
      console.error('Failed to load notes for date:', error)
      return []
    }
  }
}
