'use client'

import { useState, useEffect } from 'react'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  currentNotes: Note[]
}

export default function SearchBar({ searchQuery, setSearchQuery, currentNotes }: SearchBarProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes or dates"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {searchQuery.trim() && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">
              {currentNotes.length} result{currentNotes.length !== 1 ? 's' : ''} found
            </p>
            {isClient && currentNotes.length > 0 && currentNotes[0].createdAt && (
              <p className="text-xs text-gray-400">
                Showing notes from: {currentNotes.map(note => note.createdAt.toLocaleDateString('en-GB')).filter((date, index, arr) => arr.indexOf(date) === index).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
