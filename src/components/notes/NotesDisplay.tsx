'use client'

import { useState, useEffect } from 'react'

interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
}

interface NotesDisplayProps {
  currentNotes: Note[]
  setIsEditing: (editing: boolean) => void
  setEditableContent: (content: string) => void
}

export default function NotesDisplay({ currentNotes, setIsEditing, setEditableContent }: NotesDisplayProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleEdit = () => {
    setIsEditing(true)
    // Join HTML content with line breaks
    const combinedContent = currentNotes.map(note => note.content).join('<br><br>')
    setEditableContent(combinedContent)
  }

  // Function to strip HTML tags for plain text display in search
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <>
      {currentNotes.length > 0 ? (
        <div className="space-y-8">
          {currentNotes.map((note, index) => (
            <div key={note.id} className="mb-8">
              <div className="flex items-start justify-end mb-2">
                <div className="text-right">
                  <p className="text-sm text-gray-600">by {note.author}</p>
                  <p className="text-xs text-gray-400">
                    {isClient ? note.createdAt.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : ''}
                  </p>
                </div>
              </div>
              <div 
                className="text-gray-800 text-lg leading-8 prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: note.content }}
                style={{
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace"
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg leading-8">No notes for this day</p>
          <button
            onClick={handleEdit}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Note
          </button>
        </div>
      )}
      
      <style jsx global>{`
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-family: inherit;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .prose p {
          margin-bottom: 1em;
        }
        
        .prose ul, .prose ol {
          margin: 1em 0;
          padding-left: 2em;
        }
        
        .prose blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .prose code {
          background-color: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
        }
        
        .prose pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 6px;
          overflow-x: auto;
        }
        
        .prose a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .prose a:hover {
          color: #1d4ed8;
        }
        
        .prose img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
      `}</style>
    </>
  )
}
