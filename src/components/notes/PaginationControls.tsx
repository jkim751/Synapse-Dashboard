'use client'

interface PaginationControlsProps {
  currentPage: number
  hasMore: boolean
  isLoading: boolean
  onPrevious: () => void
  onNext: () => void
  totalNotes: number
}

export default function PaginationControls({
  currentPage,
  hasMore,
  isLoading,
  onPrevious,
  onNext,
  totalNotes
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-6 p-4 bg-white rounded-lg border border-gray-200">
      <button
        onClick={onPrevious}
        disabled={currentPage === 1 || isLoading}
        className="px-4 py-2 bg-lamaSky text-white rounded hover:bg-lamaSky/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        ← Previous Page
      </button>

      <div className="text-sm text-gray-600">
        Page {currentPage} • {totalNotes} notes loaded
        {isLoading && ' • Loading...'}
      </div>

      <button
        onClick={onNext}
        disabled={!hasMore || isLoading}
        className="px-4 py-2 bg-lamaSky text-white rounded hover:bg-lamaSky/80 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        Next Page →
      </button>
    </div>
  )
}
