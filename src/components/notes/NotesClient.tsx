'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNotes } from '@/hooks/useNotes'
import DateNavigation from './DateNavigation'
import SearchBar from './SearchBar'
import NotesEditor from './NotesEditor'
import NotesDisplay from './NotesDisplay'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

export default function NotesClient() {
  const { 
    isLoaded, 
    isLoading,
    loadedDates,
    loadNotesForDate,
    getNotesForDate,
    saveNotesForDate,
    addComment,
    deleteComment,
    addActionItem,
    toggleActionItem,
    deleteActionItem,
    deleteNote
  } = useNotes()
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editableContent, setEditableContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultDate, setSearchResultDate] = useState<Date | null>(null)

  // Load notes when selected date changes
  useEffect(() => {
    if (isLoaded) {
      const dateToLoad = searchResultDate || selectedDate
      loadNotesForDate(dateToLoad)
    }
  }, [selectedDate, searchResultDate, isLoaded])

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const parsedDate = parseDateFromSearch(searchQuery.toLowerCase())
      if (parsedDate) {
        setSearchResultDate(parsedDate)
      } else {
        setSearchResultDate(null)
      }
    } else {
      setSearchResultDate(null)
    }
  }, [searchQuery])

  // Add keyboard navigation
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isEditing || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const previousDay = new Date(selectedDate)
      previousDay.setDate(previousDay.getDate() - 1)
      setSelectedDate(previousDay)
      setSearchQuery('')
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1)
      setSelectedDate(nextDay)
      setSearchQuery('')
    } else if (event.key === 'Home') {
      event.preventDefault()
      setSelectedDate(new Date())
      setSearchQuery('')
    }
  }, [selectedDate, isEditing])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  // Function to strip HTML tags for search
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  // Parse date from search query
  const parseDateFromSearch = (query: string): Date | null => {
    const lowerQuery = query.toLowerCase().trim()
    
    if (lowerQuery === 'today') {
      return new Date()
    } else if (lowerQuery === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    }
    
    try {
      if (query.includes('/')) {
        const parts = query.split('/')
        if (parts.length === 2) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          return new Date(new Date().getFullYear(), month, day)
        } else if (parts.length === 3) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const year = parseInt(parts[2])
          return new Date(year, month, day)
        }
      }
      
      if (query.includes('-') && /^\d{4}-\d{1,2}-\d{1,2}$/.test(query)) {
        return new Date(query)
      }
      
      const parsed = new Date(query)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    } catch (error) {}
    
    return null
  }

  const getCurrentNotes = () => {
    const dateToUse = searchResultDate || selectedDate
    let dayNotes = getNotesForDate(dateToUse)
    
    if (searchQuery.trim() && !searchResultDate) {
      const query = searchQuery.toLowerCase()
      
      // Search across all loaded notes
      const allNotes = loadedDates.flatMap(dateKey => getNotesForDate(new Date(dateKey)))
      
      const monthMatch = allNotes.filter(note => {
        const noteMonth = note.createdAt.toLocaleDateString('en-GB', { month: 'long' }).toLowerCase()
        const noteMonthShort = note.createdAt.toLocaleDateString('en-GB', { month: 'short' }).toLowerCase()
        return noteMonth.includes(query) || noteMonthShort.includes(query)
      })
      
      if (monthMatch.length > 0) {
        dayNotes = monthMatch
      } else {
        dayNotes = allNotes.filter(note => 
          note.title.toLowerCase().includes(query) ||
          stripHtml(note.content).toLowerCase().includes(query) ||
          note.author.toLowerCase().includes(query)
        )
      }
    }
    
    return dayNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  const currentNotes = getCurrentNotes()

  const extractStudentIdsFromContent = (content: string): string[] => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    const mentions = doc.querySelectorAll('a[data-student-id]')
    return Array.from(mentions).map(mention => mention.getAttribute('data-student-id')).filter(Boolean) as string[]
  }

  const handleSave = async (content: string) => {
    try {
      const targetDate = searchResultDate || selectedDate
      const studentIds = extractStudentIdsFromContent(content)
      
      if (editingNoteId) {
        await saveNotesForDate(content, targetDate, editingNoteId, studentIds)
      } else {
        await saveNotesForDate(content, targetDate, undefined, studentIds)
      }
      
      setIsEditing(false)
      setEditingNoteId(null)
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  const handleEdit = (noteId?: string, content?: string, studentIds?: string[]) => {
    console.log('handleEdit called with:', { noteId, contentLength: content?.length, studentIds })
    
    setEditingNoteId(noteId || null)
    setEditableContent(content || '')
    setIsEditing(true)
    
    // Scroll to top when editing
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (noteId: string) => {
    try {
      const targetDate = searchResultDate || selectedDate
      await deleteNote(noteId, targetDate)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleDateNavigation = (newDate: Date) => {
    setSelectedDate(newDate)
    setSearchQuery('')
    setIsEditing(false)
    setEditingNoteId(null)
  }

  // Wrapper functions that include date parameter
  const handleAddComment = async (noteId: string, content: string) => {
    const targetDate = searchResultDate || selectedDate
    await addComment(noteId, content, targetDate)
  }

  const handleDeleteComment = async (noteId: string, commentId: string) => {
    const targetDate = searchResultDate || selectedDate
    await deleteComment(noteId, commentId, targetDate)
  }

  const handleAddActionItem = async (noteId: string, title: string, description?: string) => {
    const targetDate = searchResultDate || selectedDate
    await addActionItem(noteId, title, targetDate, description)
  }

  const handleToggleActionItem = async (noteId: string, actionId: string, completed: boolean) => {
    const targetDate = searchResultDate || selectedDate
    await toggleActionItem(noteId, actionId, completed, targetDate)
  }

  const handleDeleteActionItem = async (noteId: string, actionId: string) => {
    const targetDate = searchResultDate || selectedDate
    await deleteActionItem(noteId, actionId, targetDate)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg min-h-[750px] border border-gray-200 flex items-center justify-center">
            <div className="text-gray-400">Loading notes...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {isLoading && (
        <div className="fixed top-4 right-4 bg-orange-300 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Loading...
        </div>
      )}
      
     
      
      <DateNavigation
        selectedDate={searchResultDate || selectedDate}
        setSelectedDate={handleDateNavigation}
        currentNotes={currentNotes}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editableContent={editableContent}
        setEditableContent={setEditableContent}
        onSave={handleSave}
        isSearchResult={!!searchResultDate}
      />

      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentNotes={currentNotes}
      />

      <div className="max-w-[1400px] mx-auto">
        <div className="bg-white shadow-lg rounded-lg min-h-[750px] border border-gray-200 relative"
             style={{
               backgroundImage: `repeating-linear-gradient(
                 transparent,
                 transparent 31px,
                 #e5e7eb 31px,
                 #e5e7eb 32px
               )`,
               backgroundSize: '100% 32px',
               backgroundPosition: '0 8px'
             }}>
          
          <div className="absolute left-16 top-0 bottom-0 w-px bg-red-300"></div>
          
          <div className="relative z-10 pl-20 pr-8 pt-2">
            {isEditing ? (
              <NotesEditor
                editableContent={editableContent}
                setEditableContent={setEditableContent}
              />
            ) : (
              <>
                <NotesDisplay
                  currentNotes={currentNotes}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onAddActionItem={handleAddActionItem}
                  onToggleActionItem={handleToggleActionItem}
                  onDeleteActionItem={handleDeleteActionItem}
                />
                
                <button
                  onClick={() => handleEdit()}
                  className="mt-6 w-full py-3 border-2 border-dashed border-orange-300 rounded-lg text-orange-500 hover:bg-orange-50 hover:border-orange-400 transition-colors"
                >
                  + Add New Note
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
