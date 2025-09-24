'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isLoaded: userLoaded } = useUser()

  useEffect(() => {
    if (userLoaded) {
      loadNotes()
    }
  }, [userLoaded])

  const loadNotes = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notes')
      if (response.ok) {
        const loadedNotes = await response.json()
        setNotes(loadedNotes.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        })))
      } else {
        console.error('Failed to load notes:', response.statusText)
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setIsLoaded(true)
      setIsLoading(false)
    }
  }

  const saveNotesForDate = async (content: string, date: Date) => {
    if (!content.trim() || !user) return

    // Remove empty paragraphs and clean up HTML
    const cleanContent = content
      .replace(/<p><br><\/p>/g, '')
      .replace(/<p><\/p>/g, '')
      .trim()

    if (!cleanContent || cleanContent === '<p><br></p>') return

    try {
      setIsLoading(true)
      
      const newNote = {
        id: `${date.toDateString()}-${Date.now()}`,
        title: '',
        content: cleanContent,
        author: user.fullName || user.emailAddresses[0]?.emailAddress || 'Current User',
        createdAt: date
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newNote,
          date: date.toISOString()
        })
      })

      if (response.ok) {
        await loadNotes()
      } else {
        console.error('Failed to save note:', response.statusText)
        throw new Error('Failed to save note')
      }
    } catch (error) {
      console.error('Failed to save notes for date:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const deleteNote = async (noteId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadNotes()
      } else {
        console.error('Failed to delete note:', response.statusText)
        throw new Error('Failed to delete note')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    notes,
    isLoaded: isLoaded && userLoaded,
    isLoading,
    saveNotesForDate,
    deleteNote,
    refreshNotes: loadNotes
  }
}
