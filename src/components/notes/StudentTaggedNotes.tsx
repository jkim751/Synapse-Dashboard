'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TaggedNote {
  id: string
  content: string
  author: string
  createdAt: Date
  comments?: { id: string }[]
  actionItems?: { id: string }[]
}

interface StudentTaggedNotesProps {
  studentId: string
}

export default function StudentTaggedNotes({ studentId }: StudentTaggedNotesProps) {
  const [notes, setNotes] = useState<TaggedNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/notes?studentId=${studentId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotes(data.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt)
          })))
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [studentId])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-xl">
        <h1 className="text-xl font-semibold mb-4">Student Notes</h1>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Student Notes</h1>
        <Link href="/list/notes" className="text-xs text-orange-500 hover:underline">
          Open  →
        </Link>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-400 text-sm">No notes mention this student</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const commentCount = note.comments?.length ?? 0
            const actionCount = note.actionItems?.length ?? 0
            return (
              <div key={note.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="font-medium">{note.author}</span>
                  <span>•</span>
                  <span>{formatDate(note.createdAt)}</span>
                  {(commentCount > 0 || actionCount > 0) && (
                    <>
                      <span>•</span>
                      <span className="text-orange-600">
                        {[
                          commentCount > 0 && `${commentCount} comment${commentCount !== 1 ? 's' : ''}`,
                          actionCount > 0 && `${actionCount} action${actionCount !== 1 ? 's' : ''}`
                        ].filter(Boolean).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
