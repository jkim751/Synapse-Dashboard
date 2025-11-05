'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface Note {
  id: string
  content: string
  author: string
  createdAt: Date
}

interface StudentNotesProps {
  studentId: string
}

export default function StudentNotes({ studentId }: StudentNotesProps) {
  const { userId } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; noteId: string | null }>({
    isOpen: false,
    noteId: null
  })

  const formatBritishDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  useEffect(() => {
    fetchNotes()
  }, [studentId])

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/student-notes?studentId=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt)
        })))
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newNote.trim()) return

    try {
      const response = await fetch('/api/student-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          content: newNote,
        })
      })

      if (response.ok) {
        await fetchNotes()
        setNewNote('')
        setIsAdding(false)
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const handleUpdate = async (noteId: string) => {
    if (!editContent.trim()) return

    try {
      const response = await fetch('/api/student-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId,
          content: editContent,
        })
      })

      if (response.ok) {
        await fetchNotes()
        setEditingId(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Failed to update note:', error)
    }
  }

  const handleDeleteClick = (noteId: string) => {
    setDeleteConfirm({ isOpen: true, noteId })
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.noteId) {
      try {
        const response = await fetch('/api/student-notes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: deleteConfirm.noteId })
        })

        if (response.ok) {
          await fetchNotes()
        }
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
    setDeleteConfirm({ isOpen: false, noteId: null })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, noteId: null })
  }

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-xl">
        <h1 className="text-xl font-semibold mb-4">Student Notes</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Student Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      <div className="bg-white p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Student Notes</h1>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-sm px-3 py-1 bg-lamaSky/70 text-white rounded hover:bg-lamaSky/80"
            >
              + Add Note
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mb-4 p-3 border border-gray-200 rounded-xl">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type your note..."
              className="w-full p-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-lamaSky"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAdd}
                className="text-sm px-3 py-1 bg-lamaSky text-white rounded hover:bg-lamaSky/80"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewNote('')
                }}
                className="text-sm px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-gray-400 text-sm">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 rounded-xl">
                {editingId === note.id ? (
                  <>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-lamaSky"
                      rows={3}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleUpdate(note.id)}
                        className="text-xs px-2 py-1 bg-lamaSky text-white rounded hover:bg-lamaSky/80"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditContent('')
                        }}
                        className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>
                        {note.author} • {formatBritishDate(note.createdAt)}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(note.id)
                            setEditContent(note.content)
                          }}
                          className="text-lamaSky hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(note.id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
