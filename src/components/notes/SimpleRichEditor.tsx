'use client'

import { useRef, useEffect, useState } from 'react'

interface SimpleRichEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function SimpleRichEditor({ value, onChange, placeholder }: SimpleRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const execCommand = (command: string, value: string | boolean = false) => {
    document.execCommand(command, false, value as string)
    editorRef.current?.focus()
    handleInput()
  }

  const insertList = (type: 'ul' | 'ol') => {
    execCommand(`insert${type === 'ul' ? 'Unordered' : 'Ordered'}List`)
  }

  if (!isClient) {
    return (
      <div className="w-full h-[650px] bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-[650px] border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded text-sm font-bold"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded text-sm italic"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded text-sm underline"
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          className="p-2 hover:bg-gray-200 rounded text-sm line-through"
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Headers */}
        <select
          onChange={(e) => {
            if (e.target.value) {
              execCommand('formatBlock', e.target.value)
              e.target.value = ''
            }
          }}
          className="p-1 text-sm border border-gray-300 rounded"
          defaultValue=""
        >
          <option value="" disabled>Heading</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="p">Paragraph</option>
        </select>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => insertList('ul')}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => insertList('ol')}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Numbered List"
        >
          1. List
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Align Left"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Align Center"
        >
          ↔
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Align Right"
        >
          ➡
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Colors */}
        <input
          type="color"
          onChange={(e) => execCommand('foreColor', e.target.value)}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          title="Text Color"
        />
        <input
          type="color"
          onChange={(e) => execCommand('backColor', e.target.value)}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          title="Background Color"
        />

        <div className="w-px bg-gray-300 mx-1" />

        {/* Link */}
        <button
          type="button"
          onClick={() => {
            const url = prompt('Enter URL:')
            if (url) execCommand('createLink', url)
          }}
          className="p-2 hover:bg-gray-200 rounded text-sm"
          title="Insert Link"
        >
          🔗
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full h-[580px] p-4 overflow-y-auto focus:outline-none"
        style={{
          fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          fontSize: '16px',
          lineHeight: '1.6'
        }}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ __html: value }}
      />

      {!value && (
        <div 
          className="absolute top-20 left-4 text-gray-400 pointer-events-none"
          style={{
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            fontSize: '16px'
          }}
        >
          {placeholder || 'Start typing your notes...'}
        </div>
      )}
    </div>
  )
}
