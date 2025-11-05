'use client'

import { useState, useEffect } from 'react'
import QuillEditor from './QuillEditor'
import SimpleRichEditor from './SimpleRichEditor'

interface NotesEditorProps {
  editableContent: string
  setEditableContent: (content: string) => void
}

export default function NotesEditor({ 
  editableContent, 
  setEditableContent
}: NotesEditorProps) {
  const [isClient, setIsClient] = useState(false)
  const [useSimpleEditor, setUseSimpleEditor] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
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

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        💡 Tip: Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">@</span> to mention students
      </p>
      {useSimpleEditor ? (
        <SimpleRichEditor
          value={editableContent}
          onChange={setEditableContent}
          placeholder="Start typing your notes... Use @ to mention students"
        />
      ) : (
        <QuillEditor
          value={editableContent}
          onChange={setEditableContent}
          placeholder="Start typing your notes... Use @ to mention students"
        />
      )}
    </div>
  )
}
