'use client'

import { useState } from 'react'
import { Note } from '@/types/notes'
import CommentsSection from './CommentsSection'
import ActionItemsSection from './ActionItemsSection'

interface NotesDisplayProps {
  currentNotes: Note[]
  setIsEditing: (editing: boolean) => void
  setEditableContent: (content: string) => void
  onAddComment?: (noteId: string, content: string) => Promise<void>
  onDeleteComment?: (noteId: string, commentId: string) => Promise<void>
  onAddActionItem?: (noteId: string, title: string, description?: string) => Promise<void>
  onToggleActionItem?: (noteId: string, actionId: string, completed: boolean) => Promise<void>
  onDeleteActionItem?: (noteId: string, actionId: string) => Promise<void>
}

export default function NotesDisplay({ 
  currentNotes, 
  setIsEditing, 
  setEditableContent,
  onAddComment,
  onDeleteComment,
  onAddActionItem,
  onToggleActionItem,
  onDeleteActionItem
}: NotesDisplayProps) {
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)

  const handleEdit = () => {
    const content = currentNotes.length > 0 ? currentNotes[0].content : ''
    setEditableContent(content)
    setIsEditing(true)
  }

  if (currentNotes.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-xl mb-4">No notes for this date</p>
        <button
          onClick={handleEdit}
          className="px-6 py-3 bg-orange-400 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Create Note
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {currentNotes.map((note) => {
        const hasComments = note.comments && note.comments.length > 0
        const hasActions = note.actionItems && note.actionItems.length > 0
        const isHovered = hoveredNoteId === note.id

        return (
          <div 
            key={note.id} 
            className="border-b border-gray-200 pb-6 last:border-b-0 relative"
            onMouseEnter={() => setHoveredNoteId(note.id)}
            onMouseLeave={() => setHoveredNoteId(null)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>{note.author}</span>
                  <span>•</span>
                  <span>{note.createdAt.toLocaleDateString()}</span>
                  <span>{note.createdAt.toLocaleTimeString()}</span>
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
              <button
                onClick={handleEdit}
                className="ml-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors whitespace-nowrap"
              >
                Edit
              </button>
            </div>

            {/* Hover overlay for comments and actions */}
            {isHovered && (hasComments || hasActions || onAddComment || onAddActionItem) && (
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
