'use client'

import { useState } from 'react'
import { Note } from '@/types/notes'
import CommentsSection from './CommentsSection'
import ActionItemsSection from './ActionItemsSection'
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
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)

  if (currentNotes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-xl mb-4">No notes for this date</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {currentNotes.map((note) => {
        const hasComments = note.comments && note.comments.length > 0
        const hasActions = note.actionItems && note.actionItems.length > 0
        const hasTaggedStudents = note.taggedStudents && note.taggedStudents.length > 0
        const isHovered = hoveredNoteId === note.id

        return (
          <div 
            key={note.id} 
            className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 hover:border-orange-300 transition-colors relative"
            onMouseEnter={() => setHoveredNoteId(note.id)}
            onMouseLeave={() => setHoveredNoteId(null)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
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
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <span className="font-medium">{note.author}</span>
                  <span>•</span>
                  <span>{note.createdAt.toLocaleString()}</span>
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
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => onEdit(
                    note.id, 
                    note.content,
                    note.taggedStudents?.map(tag => tag.studentId)
                  )}
                  className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Hover overlay for comments and actions */}
            {isHovered && (onAddComment || onAddActionItem || hasComments || hasActions) && (
              <div 
                className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-orange-400 rounded-lg shadow-2xl z-50 p-6 max-h-[500px] overflow-y-auto"
                onMouseEnter={() => setHoveredNoteId(note.id)}
                onMouseLeave={() => setHoveredNoteId(null)}
              >
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
  )
}
