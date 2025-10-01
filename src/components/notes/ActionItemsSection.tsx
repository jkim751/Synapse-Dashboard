'use client'

import { useState } from 'react'
import { ActionItem } from '@/types/notes'

interface ActionItemsSectionProps {
  noteId: string
  actionItems: ActionItem[]
  onAddActionItem: (noteId: string, title: string, description?: string) => Promise<void>
  onToggleActionItem: (noteId: string, actionId: string, completed: boolean) => Promise<void>
  onDeleteActionItem: (noteId: string, actionId: string) => Promise<void>
}

export default function ActionItemsSection({
  noteId,
  actionItems,
  onAddActionItem,
  onToggleActionItem,
  onDeleteActionItem
}: ActionItemsSectionProps) {
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    try {
      setIsAdding(true)
      await onAddActionItem(noteId, newTitle, newDescription || undefined)
      setNewTitle('')
      setNewDescription('')
      setShowForm(false)
    } catch (error) {
      console.error('Failed to add action item:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const completedItems = actionItems.filter(item => item.completed)
  const pendingItems = actionItems.filter(item => !item.completed)

  return (
    <div className="mt-6 border-t pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-700">
          Action Items ({pendingItems.length} pending, {completedItems.length} completed)
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          {showForm ? 'Cancel' : '+ Add Action'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 bg-green-50 p-4 rounded-lg border border-green-200">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Action title..."
            className="w-full p-2 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)..."
            className="w-full p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={isAdding || !newTitle.trim()}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding...' : 'Add Action Item'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {/* Pending Items */}
        {pendingItems.map((item) => (
          <div key={item.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggleActionItem(noteId, item.id, !item.completed)}
              className="mt-1 w-5 h-5 cursor-pointer"
            />
            <div className="flex-1">
              <h4 className="font-medium text-gray-800">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Created: {item.createdAt.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => onDeleteActionItem(noteId, item.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        ))}

        {/* Completed Items */}
        {completedItems.map((item) => (
          <div key={item.id} className="bg-green-50 p-3 rounded-lg border border-green-200 flex items-start gap-3 opacity-75">
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggleActionItem(noteId, item.id, !item.completed)}
              className="mt-1 w-5 h-5 cursor-pointer"
            />
            <div className="flex-1">
              <h4 className="font-medium text-gray-800 line-through">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-600 mt-1 line-through">{item.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Completed: {item.completedAt?.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => onDeleteActionItem(noteId, item.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
