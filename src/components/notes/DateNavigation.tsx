'use client'

import { useState, useEffect } from 'react'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

interface DateNavigationProps {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  currentNotes: Note[]
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  editableContent: string
  setEditableContent: (content: string) => void
  onSave: (content: string) => void
  isSearchResult?: boolean
}

export default function DateNavigation({
  selectedDate,
  setSelectedDate,
  currentNotes,
  isEditing,
  setIsEditing,
  editableContent,
  setEditableContent,
  onSave,
  isSearchResult = false
}: DateNavigationProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate)
    previousDay.setDate(previousDay.getDate() - 1)
    setSelectedDate(previousDay)
    setIsEditing(false)
  }

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setSelectedDate(nextDay)
    setIsEditing(false)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    // Combine HTML content with line breaks for editing
    const combinedContent = currentNotes.map(note => note.content).join('<br><br>')
    setEditableContent(combinedContent)
  }

  const handleSave = () => {
    onSave(editableContent)
  }

  return (
    <div className={`mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${isSearchResult ? 'border-blue-300 bg-blue-50' : ''}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousDay}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
          title="Previous day (← arrow key)"
        >
          ← Previous Day
        </button>
        
        <div className="text-center flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isClient ? selectedDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Loading...'}
            </h1>
            <p className={`text-sm mt-1 ${isSearchResult ? 'text-blue-600' : 'text-gray-500'}`}>
              {isSearchResult && '🔍 '}
              {currentNotes.length} note{currentNotes.length !== 1 ? 's' : ''}
              {isSearchResult && ' (search result)'}
            </p>
          </div>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-orange-400 text-white rounded hover:bg-orange-500 transition-colors"
            title="Go to today (Home key)"
          >
            Today
          </button>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-500"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
          )}
          <button
            onClick={goToNextDay}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            title="Next day (→ arrow key)"
          >
            Next Day →
          </button>
        </div>
      </div>
    </div>
  )
}
