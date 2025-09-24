'use client'

import { useState, useEffect } from 'react'
import QuillEditor from './QuillEditor'
import SimpleRichEditor from './SimpleRichEditor'

interface NotesEditorProps {
  editableContent: string
  setEditableContent: (content: string) => void
}

export default function NotesEditor({ editableContent, setEditableContent }: NotesEditorProps) {
  const [isClient, setIsClient] = useState(false)
  const [useSimpleEditor, setUseSimpleEditor] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check if we should use the simple editor (fallback)
    const checkQuillSupport = async () => {
      try {
        await import('quill')
      } catch (error) {
        console.warn('Quill not available, using simple editor:', error)
        setUseSimpleEditor(true)
      }
    }
    
    checkQuillSupport()
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-[650px] bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    )
  }

  if (useSimpleEditor) {
    return (
      <SimpleRichEditor
        value={editableContent}
        onChange={setEditableContent}
        placeholder="Start typing your notes..."
      />
    )
  }

  return (
    <QuillEditor
      value={editableContent}
      onChange={setEditableContent}
      placeholder="Start typing your notes..."
    />
  )
}
