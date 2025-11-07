'use client'

interface AutocorrectSuggestionProps {
  suggestions: string[]
  position: { top: number; left: number }
  onSelect: (suggestion: string) => void
  onDismiss: () => void
}

export default function AutocorrectSuggestion({
  suggestions,
  position,
  onSelect,
  onDismiss
}: AutocorrectSuggestionProps) {
  if (suggestions.length === 0) return null

  return (
    <div
      className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        minWidth: '150px',
        maxWidth: '250px'
      }}
    >
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex items-center justify-between">
        <span>Did you mean?</span>
        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
          Tab
        </kbd>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none text-sm border-b border-gray-100 last:border-b-0"
          >
            <span className="font-medium text-gray-900">{suggestion}</span>
            {index === 0 && (
              <span className="ml-2 text-xs text-gray-500">(recommended)</span>
            )}
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 mx-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Esc</kbd> to dismiss
      </div>
    </div>
  )
}
