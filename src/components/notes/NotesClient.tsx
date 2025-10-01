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
  const { notes, isLoaded, isLoading, saveNotesForDate } = useNotes()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [editableContent, setEditableContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResultDate, setSearchResultDate] = useState<Date | null>(null)

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
    let dayNotes = notes
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      
      if (searchResultDate) {
        // Date search - filter by the parsed date
        dayNotes = notes.filter(note => note.createdAt.toDateString() === searchResultDate.toDateString())
      } else {
        // Check for month name search
        const monthMatch = notes.filter(note => {
          const noteMonth = note.createdAt.toLocaleDateString('en-GB', { month: 'long' }).toLowerCase()
          const noteMonthShort = note.createdAt.toLocaleDateString('en-GB', { month: 'short' }).toLowerCase()
          return noteMonth.includes(query) || noteMonthShort.includes(query)
        })
        
        if (monthMatch.length > 0) {
          dayNotes = monthMatch
        } else {
          // Regular text search across all notes
          dayNotes = notes.filter(note => 
            note.title.toLowerCase().includes(query) ||
            stripHtml(note.content).toLowerCase().includes(query) ||
            note.author.toLowerCase().includes(query)
          )
        }
      }
    } else {
      // No search query - show notes for selected date
      const dateKey = selectedDate.toDateString()
      dayNotes = notes.filter(note => note.createdAt.toDateString() === dateKey)
    }
    
    return dayNotes
  }

  const currentNotes = getCurrentNotes()

  const handleSave = async (content: string) => {
    try {
      const targetDate = searchResultDate || selectedDate
      await saveNotesForDate(content, targetDate)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
    }
  }

  const handleDateNavigation = (newDate: Date) => {
    setSelectedDate(newDate)
    setSearchQuery('')
    setIsEditing(false)
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
          Saving...
        </div>
      )}
      
      <div className="fixed bottom-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-xs opacity-75">
        ← → use arrows to Navigate days
      </div>
      
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

      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg min-h-[750px] border border-gray-200 relative"
             style={{
               backgroundImage: `repeating-linear-gradient(
                 transparent,
                 transparent 31px,
                 #e5e7eb 31px,
                 #e5e7eb 32px
               )`,
               backgroundSize: '100% 32px',
               paddingTop: '40px'
             }}>
          
          <div className="absolute left-16 top-0 bottom-0 w-px bg-red-300"></div>
          
          <div className="relative z-10 px-20 py-4">
            {isEditing ? (
              <NotesEditor
                editableContent={editableContent}
                setEditableContent={setEditableContent}
              />
            ) : (
              <NotesDisplay
                currentNotes={currentNotes}
                setIsEditing={setIsEditing}
                setEditableContent={setEditableContent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
