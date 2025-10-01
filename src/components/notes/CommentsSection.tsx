'use client'

import { useState } from 'react'
import { Comment } from '@/types/notes'

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

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">Comments ({comments.length})</h3>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <button
          type="submit"
          disabled={isAdding || !newComment.trim()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isAdding ? 'Adding...' : 'Add Comment'}
        </button>
      </form>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium text-gray-700">{comment.author}</span>
                <span className="text-xs text-gray-500 ml-2">
                  {comment.createdAt.toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => onDeleteComment(noteId, comment.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
