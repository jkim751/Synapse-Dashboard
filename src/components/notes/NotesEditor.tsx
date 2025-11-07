'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    setIsClient(true)
    console.log('NotesEditor received content:', editableContent.substring(0, 100))
  }, [])

  useEffect(() => {
    console.log('NotesEditor content changed:', editableContent.substring(0, 100))
  }, [editableContent])

  if (!isClient) {
    return (
      <div className="w-full h-[650px] bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="space-y-2"> 
      <SimpleRichEditor
        key={editableContent ? 'editing' : 'new'}
        value={editableContent}
        onChange={setEditableContent}
        placeholder="Start typing your notes... Use @ to mention students"
      />
    </div>
  )
}
