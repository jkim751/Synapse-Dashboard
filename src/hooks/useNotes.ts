'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Note, Comment, ActionItem } from '@/types/notes'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { user, isLoaded: userLoaded } = useUser()

  const NOTES_PER_PAGE = 5 // Load 5 notes at a time

  useEffect(() => {
    if (userLoaded) {
      loadNotes(1)
    }
  }, [userLoaded])

  const loadNotes = async (page: number = 1) => {
    try {
      setIsLoading(true)
      
      const skip = (page - 1) * NOTES_PER_PAGE
      
      const params = new URLSearchParams({
        limit: NOTES_PER_PAGE.toString(),
        skip: skip.toString()
      })
      
      const response = await fetch(`/api/notes?${params}`)
      if (response.ok) {
        const loadedNotes = await response.json()
        const formattedNotes = loadedNotes.map((note: any) => ({
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
        }))

        if (page === 1) {
          setNotes(formattedNotes)
        } else {
          setNotes(prev => [...prev, ...formattedNotes])
        }

        setCurrentPage(page)
        setHasMore(loadedNotes.length === NOTES_PER_PAGE)
        
        // Calculate total pages (approximate)
        if (loadedNotes.length < NOTES_PER_PAGE) {
          setTotalPages(page)
        }
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

  const loadNextPage = async () => {
    if (!hasMore || isLoading) return
    await loadNotes(currentPage + 1)
  }

  const loadPreviousPage = async () => {
    if (currentPage <= 1 || isLoading) return
    await loadNotes(currentPage - 1)
  }

  const refreshCurrentPage = async () => {
    await loadNotes(currentPage)
  }

  const saveNotesForDate = async (content: string, date: Date, noteId?: string, taggedStudents?: string[]) => {
    if (!user) return

    const cleanContent = content
      .replace(/<p><br><\/p>/g, '')
      .replace(/<p><\/p>/g, '')
      .trim()

    try {
      setIsLoading(true)
      
      if (!cleanContent || cleanContent === '<p><br></p>' || cleanContent === '<br>' || cleanContent === '') {
        if (noteId) {
          await deleteNote(noteId)
        }
        return
      }

      const noteData = {
        id: noteId || `${date.toDateString()}-${Date.now()}`,
        title: '',
        content: cleanContent,
        author: user.fullName || user.emailAddresses[0]?.emailAddress || 'Current User',
        createdAt: date,
        studentIds: taggedStudents || []
      }

      const response = await fetch('/api/notes', {
        method: noteId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...noteData,
          date: date.toISOString()
        })
      })

      if (response.ok) {
        await refreshCurrentPage()
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
        await refreshCurrentPage()
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
        await refreshCurrentPage()
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
        await refreshCurrentPage()
      } else {
        console.error('Failed to delete comment:', response.statusText)
        throw new Error('Failed to delete comment')
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
        await refreshCurrentPage()
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
        await refreshCurrentPage()
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
        await refreshCurrentPage()
      } else {
        console.error('Failed to delete action item:', response.statusText)
        throw new Error('Failed to delete action item')
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
    currentPage,
    totalPages,
    hasMore,
    saveNotesForDate,
    deleteNote,
    refreshNotes: refreshCurrentPage,
    loadNextPage,
    loadPreviousPage,
    addComment,
    deleteComment,
    addActionItem,
    toggleActionItem,
    deleteActionItem
  }
}
