'use client'

import { useState } from 'react'
import { Comment } from '@/types/notes'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface CommentsSectionProps {
  noteId: string
  comments: Comment[]
  onAddComment: (noteId: string, content: string) => Promise<void>
  onDeleteComment: (noteId: string, commentId: string) => Promise<void>
}

export default function CommentsSection({
  noteId,
  comments,
  onAddComment,
  onDeleteComment
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({
    isOpen: false,
    commentId: null
  })

  const formatBritishDateTime = (date: Date) => {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setIsAdding(true)
      await onAddComment(noteId, newComment)
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteClick = (commentId: string) => {
    setDeleteConfirm({ isOpen: true, commentId })
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.commentId) {
      await onDeleteComment(noteId, deleteConfirm.commentId)
    }
    setDeleteConfirm({ isOpen: false, commentId: null })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, commentId: null })
  }

  return (
    <>
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        variant="danger"
      />

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
          💬 Comments ({comments.length})
        </h3>
        
        <form onSubmit={handleSubmit} className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={3}
          />
          <button
            type="submit"
            disabled={isAdding || !newComment.trim()}
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? 'Adding...' : 'Add Comment'}
          </button>
        </form>

        {comments.length > 0 && (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-gray-800">{comment.author}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatBritishDateTime(comment.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(comment.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
