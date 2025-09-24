'use client'

import { useState } from 'react'
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

  // Function to strip HTML tags for search
  const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const getCurrentNotes = () => {
    let dayNotes = notes
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      
      // Check if search query is a date format
      const isDateSearch = /^\d{1,2}\/\d{1,2}\/\d{4}$|^\d{4}-\d{1,2}-\d{1,2}$|^\d{1,2}\/\d{1,2}$/.test(query) ||
                          query.includes('today') || query.includes('yesterday') ||
                          /^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(query) ||
                          /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(query)
      
      if (isDateSearch) {
        // Handle special date keywords
        if (query === 'today') {
          const today = new Date().toDateString()
          dayNotes = notes.filter(note => note.createdAt.toDateString() === today)
        } else if (query === 'yesterday') {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          dayNotes = notes.filter(note => note.createdAt.toDateString() === yesterday.toDateString())
        } else {
          // Try to parse the date and find notes for that date
          try {
            let searchDate
            if (query.includes('/')) {
              const parts = query.split('/')
              if (parts.length === 2) {
                // DD/MM format - assume current year (British format)
                searchDate = new Date(new Date().getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[0]))
              } else if (parts.length === 3) {
                // DD/MM/YYYY format (British format)
                searchDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
              }
            } else if (query.includes('-')) {
              // YYYY-MM-DD format
              searchDate = new Date(query)
            } else {
              // Month name search
              dayNotes = notes.filter(note => {
                const noteMonth = note.createdAt.toLocaleDateString('en-GB', { month: 'long' }).toLowerCase()
                const noteMonthShort = note.createdAt.toLocaleDateString('en-GB', { month: 'short' }).toLowerCase()
                return noteMonth.includes(query) || noteMonthShort.includes(query)
              })
              return dayNotes
            }
            
            if (searchDate && !isNaN(searchDate.getTime())) {
              dayNotes = notes.filter(note => note.createdAt.toDateString() === searchDate.toDateString())
            } else {
              // If date parsing fails, fall back to regular text search
              dayNotes = notes.filter(note => 
                note.title.toLowerCase().includes(query) ||
                stripHtml(note.content).toLowerCase().includes(query) ||
                note.author.toLowerCase().includes(query)
              )
            }
          } catch (error) {
            // If date parsing fails, fall back to regular text search
            dayNotes = notes.filter(note => 
              note.title.toLowerCase().includes(query) ||
              stripHtml(note.content).toLowerCase().includes(query) ||
              note.author.toLowerCase().includes(query)
            )
          }
        }
      } else {
        // Regular text search across all notes
        dayNotes = notes.filter(note => 
          note.title.toLowerCase().includes(query) ||
          stripHtml(note.content).toLowerCase().includes(query) ||
          note.author.toLowerCase().includes(query)
        )
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
      await saveNotesForDate(content, selectedDate)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
      // You could add a toast notification here
    }
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
      
      <DateNavigation
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        currentNotes={currentNotes}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editableContent={editableContent}
        setEditableContent={setEditableContent}
        onSave={handleSave}
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
          
          {/* Red margin line */}
          <div className="absolute left-16 top-0 bottom-0 w-px bg-red-300"></div>
          
          {/* Notes content */}
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
