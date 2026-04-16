'use client'

import { useState } from 'react'
import { Note } from '@/types/notes'
import CommentsSection from './CommentsSection'
import ActionItemsSection from './ActionItemsSection'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Image from 'next/image'
import Link from 'next/link'

interface NotesDisplayProps {
  currentNotes: Note[]
  onEdit: (noteId: string, content: string, taggedStudents?: string[]) => void
  onDelete: (noteId: string) => void
  onAddComment?: (noteId: string, content: string) => Promise<void>
  onDeleteComment?: (noteId: string, commentId: string) => Promise<void>
  onAddActionItem?: (noteId: string, title: string, description?: string) => Promise<void>
  onToggleActionItem?: (noteId: string, actionId: string, completed: boolean) => Promise<void>
  onDeleteActionItem?: (noteId: string, actionId: string) => Promise<void>
}

export default function NotesDisplay({ 
  currentNotes, 
  onEdit,
  onDelete,
  onAddComment,
  onDeleteComment,
  onAddActionItem,
  onToggleActionItem,
  onDeleteActionItem
}: NotesDisplayProps) {
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; noteId: string | null }>({
    isOpen: false,
    noteId: null
  })

  const handleDeleteClick = (noteId: string) => {
    setDeleteConfirm({ isOpen: true, noteId })
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.noteId) {
      await onDelete(deleteConfirm.noteId)
    }
    setDeleteConfirm({ isOpen: false, noteId: null })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, noteId: null })
  }

  const toggleExpanded = (noteId: string) => {
    setExpandedNoteIds(prev => {
      const next = new Set(prev)
      if (next.has(noteId)) {
        next.delete(noteId)
      } else {
        next.add(noteId)
      }
      return next
    })
  }

  const formatBritishDateTime = (date: Date) => {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (currentNotes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-xl mb-4">No notes for this date</p>
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      <style jsx global>{`
        .prose ul,
        .prose ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
          list-style-position: outside;
        }
        .prose ul li {
          list-style-type: disc;
          margin: 0.25em 0;
          display: list-item;
          line-height: 32px;
        }
        .prose ol li {
          list-style-type: decimal;
          margin: 0.25em 0;
          display: list-item;
          line-height: 32px;
        }
        .prose ul ul li {
          list-style-type: circle;
        }
        .prose ul ul ul li {
          list-style-type: square;
        }
        .prose ul li::before,
        .prose ol li::before {
          display: none !important;
          content: none !important;
        }
        
        .prose p {
          line-height: 32px;
          margin: 0;
        }
        
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          line-height: 32px;
          margin: 0;
        }
        
        /* Table styles for display */
        .prose table {
          border-collapse: collapse;
          display: block;
          overflow-x: auto;
          max-width: 100%;
          margin: 1em 0;
          white-space: nowrap;
        }
        .prose table td,
        .prose table th {
          border: 1px solid #ddd;
          padding: 8px;
          min-width: 50px;
          text-align: left;
          white-space: normal;
        }
        .prose table th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        .prose table tr:hover {
          background-color: #f9fafb;
        }
        .prose table tr:nth-child(even) {
          background-color: #fafafa;
        }
      `}</style>

      <div className="space-y-6">
        {currentNotes.map((note) => {
          const hasComments = note.comments && note.comments.length > 0
          const hasActions = note.actionItems && note.actionItems.length > 0
          const hasTaggedStudents = note.taggedStudents && note.taggedStudents.length > 0
          const isExpanded = expandedNoteIds.has(note.id)
          const hasDetails = !!(onAddComment || onAddActionItem || hasComments || hasActions)

          return (
            <div
              key={note.id}
              className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 hover:border-orange-300 transition-colors relative"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  {/* Tagged Students */}
                  {hasTaggedStudents && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {note.taggedStudents!.map((tag) => (
                        <Link
                          key={tag.id}
                          href={`/list/students/${tag.student.id}`}
                          className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                        >
                          <Image
                            src={tag.student.img || '/noAvatar.png'}
                            alt=""
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                          <span>{tag.student.name} {tag.student.surname}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div
                    className="prose prose-sm max-w-none overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                  <button
                    onClick={() => hasDetails && toggleExpanded(note.id)}
                    className={`flex items-center gap-2 mt-3 text-sm text-gray-500 text-left w-full transition-colors ${hasDetails ? 'hover:text-orange-600 cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="font-medium">{note.author}</span>
                    <span>•</span>
                    <span>{formatBritishDateTime(note.createdAt)}</span>
                    {(hasComments || hasActions) && (
                      <>
                        <span>•</span>
                        <span className="text-orange-600 font-medium">
                          {hasComments && `${note.comments!.length} comment${note.comments!.length !== 1 ? 's' : ''}`}
                          {hasComments && hasActions && ', '}
                          {hasActions && `${note.actionItems!.length} action${note.actionItems!.length !== 1 ? 's' : ''}`}
                        </span>
                      </>
                    )}
                    {hasDetails && (
                      <span className="ml-auto text-xs text-gray-400">
                        {isExpanded ? '▴' : '▾'}
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => {
                      // Pass the note ID, content, and tagged student IDs
                      onEdit(
                        note.id, 
                        note.content,
                        note.taggedStudents?.map(tag => tag.studentId)
                      )
                    }}
                    className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(note.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Comments and actions — inline inside the card so they stay within the orange border */}
              {isExpanded && hasDetails && (
                <div className="mt-4 pt-4 border-t border-orange-200">
                  {onAddComment && onDeleteComment && (
                    <CommentsSection
                      noteId={note.id}
                      comments={note.comments || []}
                      onAddComment={onAddComment}
                      onDeleteComment={onDeleteComment}
                    />
                  )}

                  {onAddActionItem && onToggleActionItem && onDeleteActionItem && (
                    <ActionItemsSection
                      noteId={note.id}
                      actionItems={note.actionItems || []}
                      onAddActionItem={onAddActionItem}
                      onToggleActionItem={onToggleActionItem}
                      onDeleteActionItem={onDeleteActionItem}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
