'use client'

import { useEffect, useRef, useState } from 'react'
import MentionAutocomplete from './MentionAutocomplete'

interface QuillEditorProps {
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

export default function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<any>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const mentionIndexRef = useRef<number>(0)

  useEffect(() => {
    if (!editorRef.current) return

    const loadQuill = async () => {
      const Quill = (await import('quill')).default
      
      if (quillRef.current) return

      const quill = new Quill(editorRef.current!, {
        theme: 'snow',
        placeholder: placeholder || 'Start typing...',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            ['link'],
            ['clean']
          ]
        }
      })

      quillRef.current = quill

      // Set initial content
      if (value) {
        quill.root.innerHTML = value
      }

      // Handle text changes
      quill.on('text-change', () => {
        const html = quill.root.innerHTML
        onChange(html)
        checkForMention(quill)
      })

      // Handle selection changes
      quill.on('selection-change', () => {
        checkForMention(quill)
      })
    }

    loadQuill()

    return () => {
      if (quillRef.current) {
        quillRef.current = null
      }
    }
  }, [])

  // Update content when value prop changes externally
  useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const selection = quillRef.current.getSelection()
      quillRef.current.root.innerHTML = value
      if (selection) {
        quillRef.current.setSelection(selection)
      }
    }
  }, [value])

  const checkForMention = (quill: any) => {
    const selection = quill.getSelection()
    if (!selection) {
      setShowMentions(false)
      return
    }

    const [line, offset] = quill.getLine(selection.index)
    const lineText = line.domNode.textContent || ''
    const textBeforeCursor = lineText.substring(0, offset)
    
    // Find last @ symbol
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1 && lastAtIndex === textBeforeCursor.length - 1) {
      // Just typed @, show all students
      mentionIndexRef.current = selection.index - 1
      setMentionQuery('')
      setShowMentions(true)
      updateMentionPosition(quill, selection.index)
    } else if (lastAtIndex !== -1) {
      // Check if we're still in a mention
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!/\s/.test(textAfterAt)) {
        mentionIndexRef.current = selection.index - textAfterAt.length - 1
        setMentionQuery(textAfterAt)
        setShowMentions(true)
        updateMentionPosition(quill, selection.index)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const updateMentionPosition = (quill: any, index: number) => {
    const bounds = quill.getBounds(index)
    if (editorRef.current) {
      const editorRect = editorRef.current.getBoundingClientRect()
      setMentionPosition({
        top: bounds.bottom + 5,
        left: bounds.left
      })
    }
  }

  const handleSelectStudent = (student: Student) => {
    if (!quillRef.current) return

    const quill = quillRef.current
    const mentionText = mentionQuery
    
    // Delete the @ and any typed text
    quill.deleteText(mentionIndexRef.current, mentionText.length + 1)
    
    // Insert student mention as a link
    const mentionHTML = `<a href="/list/students/${student.id}" class="student-mention" data-student-id="${student.id}" style="color: #2563eb; text-decoration: none; background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;">@${student.name} ${student.surname}</a>`
    
    quill.clipboard.dangerouslyPasteHTML(mentionIndexRef.current, mentionHTML + ' ')
    quill.setSelection(mentionIndexRef.current + mentionHTML.length + 1)
    
    setShowMentions(false)
    setMentionQuery('')
  }

  return (
    <div className="relative">
      <div ref={editorRef} className="w-full h-[650px]" />
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
