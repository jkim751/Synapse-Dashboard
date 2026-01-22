'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Note, Comment, ActionItem } from '@/types/notes'

export function useNotes() {
  const [notesByDate, setNotesByDate] = useState<Map<string, Note[]>>(new Map())
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set())
  const [dateLoadOrder, setDateLoadOrder] = useState<string[]>([]) // Track order of loaded dates
  const { user, isLoaded: userLoaded } = useUser()

  const MAX_CACHED_DATES = 20

  useEffect(() => {
    setIsLoaded(userLoaded)
  }, [userLoaded])

  const loadNotesForDate = async (date: Date) => {
    const dateKey = date.toDateString()
    
    // Skip if already loaded
    if (loadedDates.has(dateKey)) {
      // Move this date to the end of the load order (most recently accessed)
      setDateLoadOrder(prev => [...prev.filter(d => d !== dateKey), dateKey])
      return notesByDate.get(dateKey) || []
    }

    try {
      setIsLoading(true)
      
      // Create start and end of day for the selected date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      const params = new URLSearchParams({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString()
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

        // Check if we need to remove old dates
        setDateLoadOrder(prev => {
          const newOrder = [...prev, dateKey]
          
          if (newOrder.length > MAX_CACHED_DATES) {
            // Remove the oldest date (first in array)
            const oldestDate = newOrder[0]
            
            setNotesByDate(currentMap => {
              const newMap = new Map(currentMap)
              newMap.delete(oldestDate)
              newMap.set(dateKey, formattedNotes)
              return newMap
            })
            
            setLoadedDates(currentSet => {
              const newSet = new Set(currentSet)
              newSet.delete(oldestDate)
              newSet.add(dateKey)
              return newSet
            })
            
            return newOrder.slice(1) // Remove first element
          } else {
            setNotesByDate(prev => new Map(prev).set(dateKey, formattedNotes))
            setLoadedDates(prev => new Set(prev).add(dateKey))
            return newOrder
          }
        })
        
        return formattedNotes
      } else {
        console.error('Failed to load notes:', response.statusText)
        return []
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
      return []
    } finally {
      setIsLoading(false)
    }
  }

  const getNotesForDate = (date: Date): Note[] => {
    const dateKey = date.toDateString()
    return notesByDate.get(dateKey) || []
  }

  const refreshDate = async (date: Date) => {
    const dateKey = date.toDateString()
    
    // Don't remove from loadedDates - just mark for refresh
    // This prevents flickering and maintains cache position
    setLoadedDates(prev => {
      const newSet = new Set(prev)
      newSet.delete(dateKey)
      return newSet
    })
    
    // Don't remove from dateLoadOrder - just update in place
    // This maintains the cache order
    await loadNotesForDate(date)
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
          await deleteNote(noteId, date)
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
        // Optimistically update the cache before refreshing
        const dateKey = date.toDateString()
        if (noteId) {
          // Update existing note
          setNotesByDate(prev => {
            const newMap = new Map(prev)
            const existingNotes = newMap.get(dateKey) || []
            const updatedNotes = existingNotes.map(n => 
              n.id === noteId 
                ? { ...n, content: cleanContent, taggedStudents: [] }
                : n
            )
            newMap.set(dateKey, updatedNotes)
            return newMap
          })
        } else {
          // Add new note optimistically
          setNotesByDate(prev => {
            const newMap = new Map(prev)
            const existingNotes = newMap.get(dateKey) || []
            const newNote: Note = {
              id: noteData.id,
              title: '',
              content: cleanContent,
              author: noteData.author,
              createdAt: date,
              comments: [],
              actionItems: [],
              taggedStudents: []
            }
            newMap.set(dateKey, [newNote, ...existingNotes])
            return newMap
          })
        }
        
        // Then refresh to get server state (including tagged students)
        await refreshDate(date)
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

  const deleteNote = async (noteId: string, date: Date) => {
    try {
      setIsLoading(true)
      
      // Optimistically remove from cache
      const dateKey = date.toDateString()
      setNotesByDate(prev => {
        const newMap = new Map(prev)
        const existingNotes = newMap.get(dateKey) || []
        newMap.set(dateKey, existingNotes.filter(n => n.id !== noteId))
        return newMap
      })
      
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh to ensure sync with server
        await refreshDate(date)
      } else {
        console.error('Failed to delete note:', response.statusText)
        // Revert optimistic update on error
        await refreshDate(date)
        throw new Error('Failed to delete note')
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const addComment = async (noteId: string, content: string, date: Date) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (response.ok) {
        await refreshDate(date)
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const deleteComment = async (noteId: string, commentId: string, date: Date) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await refreshDate(date)
      } else {
        console.error('Failed to delete comment:', response.statusText)
        throw new Error('Failed to delete comment')
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const addActionItem = async (noteId: string, title: string, date: Date, description?: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      })

      if (response.ok) {
        await refreshDate(date)
      }
    } catch (error) {
      console.error('Failed to add action item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const toggleActionItem = async (noteId: string, actionId: string, completed: boolean, date: Date) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })

      if (response.ok) {
        await refreshDate(date)
      }
    } catch (error) {
      console.error('Failed to toggle action item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const deleteActionItem = async (noteId: string, actionId: string, date: Date) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/notes/${noteId}/actions/${actionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await refreshDate(date)
      } else {
        console.error('Failed to delete action item:', response.statusText)
        throw new Error('Failed to delete action item')
      }
    } catch (error) {
      console.error('Failed to delete action item:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoaded,
    isLoading,
    loadedDates: Array.from(loadedDates),
    loadNotesForDate,
    getNotesForDate,
    saveNotesForDate,
    deleteNote,
    addComment,
    deleteComment,
    addActionItem,
    toggleActionItem,
    deleteActionItem
  }
}
