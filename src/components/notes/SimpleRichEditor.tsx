'use client'

import { useState, useRef, useEffect } from 'react'
import MentionAutocomplete from './MentionAutocomplete'

interface SimpleRichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface Student {
  id: string
  name: string
  surname: string
  img?: string | null
}

export default function SimpleRichEditor({ value, onChange, placeholder }: SimpleRichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const mentionRangeRef = useRef<Range | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value
    }
  }, [value])

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
      checkForMention()
    }
  }

  const checkForMention = () => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !editorRef.current) {
      setShowMentions(false)
      return
    }

    const range = selection.getRangeAt(0)
    const textNode = range.startContainer
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setShowMentions(false)
      return
    }

    const text = textNode.textContent || ''
    const cursorPos = range.startOffset
    const textBeforeCursor = text.substring(0, cursorPos)
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!/\s/.test(textAfterAt)) {
        mentionRangeRef.current = range.cloneRange()
        mentionRangeRef.current.setStart(textNode, lastAtIndex)
        mentionRangeRef.current.setEnd(textNode, cursorPos)
        
        setMentionQuery(textAfterAt)
        setShowMentions(true)
        updateMentionPosition(range)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const updateMentionPosition = (range: Range) => {
    const rect = range.getBoundingClientRect()
    const editorRect = editorRef.current?.getBoundingClientRect()
    
    if (editorRect) {
      setMentionPosition({
        top: rect.bottom - editorRect.top + 5,
        left: rect.left - editorRect.left
      })
    }
  }

  const handleSelectStudent = (student: Student) => {
    if (!mentionRangeRef.current || !editorRef.current) return

    const selection = window.getSelection()
    if (!selection) return

    // Delete the @ and typed text
    mentionRangeRef.current.deleteContents()

    // Create mention link
    const mentionLink = document.createElement('a')
    mentionLink.href = `/list/students/${student.id}`
    mentionLink.className = 'student-mention'
    mentionLink.setAttribute('data-student-id', student.id)
    mentionLink.style.cssText = 'color: #2563eb; text-decoration: none; background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;'
    mentionLink.textContent = `@${student.name} ${student.surname}`
    mentionLink.contentEditable = 'false'

    // Insert the mention
    mentionRangeRef.current.insertNode(mentionLink)

    // Add space after mention
    const space = document.createTextNode(' ')
    mentionLink.parentNode?.insertBefore(space, mentionLink.nextSibling)

    // Move cursor after the space
    const newRange = document.createRange()
    newRange.setStartAfter(space)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)

    setShowMentions(false)
    setMentionQuery('')
    
    onChange(editorRef.current.innerHTML)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      document.execCommand('insertLineBreak')
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
    <div className="relative">
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
          onKeyDown={handleKeyDown}
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
      {showMentions && (
        <MentionAutocomplete
          query={mentionQuery}
          position={mentionPosition}
          onSelect={handleSelectStudent}
          onClose={() => setShowMentions(false)}
        />
      )}
    </div>
  )
}
