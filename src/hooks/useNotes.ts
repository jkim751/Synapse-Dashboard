'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Note, Comment, ActionItem } from '@/types/notes'

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
          createdAt: new Date(note.createdAt),
          comments: note.comments?.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt)
          })) || [],
          actionItems: note.actionItems?.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            completedAt: a.completedAt ? new Date(a.completedAt) : undefined
          })) || []
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
    if (!user) return

    // Remove empty paragraphs and clean up HTML
    const cleanContent = content
      .replace(/<p><br><\/p>/g, '')
      .replace(/<p><\/p>/g, '')
      .trim()

    try {
      setIsLoading(true)
      
      // If content is empty or just whitespace/empty HTML, delete notes for this date
      if (!cleanContent || cleanContent === '<p><br></p>' || cleanContent === '<br>' || cleanContent === '') {
        const response = await fetch('/api/notes/delete-by-date', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date.toISOString()
          })
        })

        if (response.ok) {
          await loadNotes()
        } else {
          console.error('Failed to delete notes:', response.statusText)
          throw new Error('Failed to delete notes')
        }
        return
      }

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

  const addComment = async (noteId: string, content: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      throw error
    }
  }

  const deleteComment = async (noteId: string, commentId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      throw error
    }
  }

  const addActionItem = async (noteId: string, title: string, description?: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      })

      if (response.ok) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to add action item:', error)
      throw error
    }
  }

  const toggleActionItem = async (noteId: string, actionId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })

      if (response.ok) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to toggle action item:', error)
      throw error
    }
  }

  const deleteActionItem = async (noteId: string, actionId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/actions/${actionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadNotes()
      }
    } catch (error) {
      console.error('Failed to delete action item:', error)
      throw error
    }
  }

  return {
    notes,
    isLoaded: isLoaded && userLoaded,
    isLoading,
    saveNotesForDate,
    deleteNote,
    refreshNotes: loadNotes,
    addComment,
    deleteComment,
    addActionItem,
    toggleActionItem,
    deleteActionItem
  }
}
