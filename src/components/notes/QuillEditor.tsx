'use client'

import { useEffect, useRef, useState } from 'react'
import MentionAutocomplete from './MentionAutocomplete'
import { getLastWord, shouldAutocorrect } from '@/utils/autocorrect'

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
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)

  useEffect(() => {
    if (!editorRef.current) return

    const loadQuill = async () => {
      const Quill = (await import('quill')).default
      
      if (quillRef.current) return

      const quill = new Quill(editorRef.current!, {
        theme: 'snow',
        placeholder: placeholder || 'Start typing...',
        modules: {
          toolbar: {
            container: [
              [{ header: [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ color: [] }, { background: [] }],
              ['link'],
              ['table-custom'], // Custom button
              ['clean']
            ],
            handlers: {
              'table-custom': () => {
                setShowTableDialog(true)
              }
            }
          },
          clipboard: {
            matchVisual: false
          }
        }
      })

      // Add icon for custom table button
      const tableButton = document.querySelector('.ql-table-custom')
      if (tableButton) {
        tableButton.innerHTML = '⊞'
        tableButton.setAttribute('title', 'Insert Table')
      }

      quillRef.current = quill

      // Set initial content with proper formatting
      if (value) {
        const delta = quill.clipboard.convert({ html: value })
        quill.setContents(delta)
      }

      // Handle text changes with autocorrect
      quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
        if (source === 'user') {
          handleAutocorrect(quill, delta)
        }
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
      const delta = quillRef.current.clipboard.convert({ html: value })
      quillRef.current.setContents(delta)
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

  const handleAutocorrect = (quill: any, delta: any) => {
    // Check if user typed a space or punctuation (triggers autocorrect)
    const ops = delta.ops || []
    const lastOp = ops[ops.length - 1]
    
    if (lastOp && lastOp.insert && typeof lastOp.insert === 'string') {
      const insertedText = lastOp.insert
      
      // Trigger on space, period, comma, etc.
      if (/[\s.,!?;:]/.test(insertedText)) {
        const selection = quill.getSelection()
        if (!selection) return

        const cursorPos = selection.index
        const text = quill.getText(0, cursorPos)
        const { word, startPos } = getLastWord(text, cursorPos - insertedText.length)
        
        if (word && word.length > 2) {
          const correction = shouldAutocorrect(word)
          
          if (correction) {
            // Remove the old word
            quill.deleteText(startPos, word.length, 'silent')
            // Insert the corrected word
            quill.insertText(startPos, correction, 'silent')
            // Restore cursor position
            quill.setSelection(startPos + correction.length + insertedText.length, 0, 'silent')
          }
        }
      }
    }
  }

  const insertTable = () => {
    if (!quillRef.current) return

    const quill = quillRef.current
    
    // Create table HTML
    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">'
    
    // Header row
    tableHTML += '<thead><tr>'
    for (let j = 0; j < tableCols; j++) {
      tableHTML += '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f3f4f6; font-weight: 600;">Header ' + (j + 1) + '</th>'
    }
    tableHTML += '</tr></thead>'
    
    // Body rows
    tableHTML += '<tbody>'
    for (let i = 1; i < tableRows; i++) {
      tableHTML += '<tr>'
      for (let j = 0; j < tableCols; j++) {
        tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>'
      }
      tableHTML += '</tr>'
    }
    tableHTML += '</tbody></table><p><br></p>'

    // Get current cursor position
    const range = quill.getSelection()
    const position = range ? range.index : quill.getLength()

    // Insert table at cursor position
    quill.clipboard.dangerouslyPasteHTML(position, tableHTML)
    
    // Move cursor after table
    quill.setSelection(position + tableHTML.length)

    setShowTableDialog(false)
    setTableRows(3)
    setTableCols(3)
  }

  return (
    <div className="relative">
      {/* Table Dialog */}
      {showTableDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rows: {tableRows}
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Columns: {tableCols}
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Preview */}
              <div className="border border-gray-300 rounded p-2 bg-gray-50">
                <p className="text-xs text-gray-600 mb-2">Preview:</p>
                <div className="overflow-auto max-h-40">
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '10px' }}>
                    <thead>
                      <tr>
                        {Array.from({ length: tableCols }).map((_, j) => (
                          <th key={j} style={{ border: '1px solid #ddd', padding: '4px', backgroundColor: '#f3f4f6' }}>
                            H{j + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: tableRows - 1 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: tableCols }).map((_, j) => (
                            <td key={j} style={{ border: '1px solid #ddd', padding: '4px' }}>
                              Cell
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={insertTable}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Insert Table
              </button>
              <button
                onClick={() => {
                  setShowTableDialog(false)
                  setTableRows(3)
                  setTableCols(3)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .ql-editor ul,
        .ql-editor ol {
          padding-left: 1.5em;
          list-style-position: outside;
        }
        .ql-editor li {
          list-style-type: disc;
          display: list-item;
        }
        .ql-editor ol li {
          list-style-type: decimal;
        }
        .ql-editor ul li::before,
        .ql-editor ol li::before {
          display: none !important;
          content: none !important;
        }
        
        /* Style for custom table button */
        .ql-table-custom {
          width: 28px !important;
        }
        .ql-table-custom::before {
          content: '⊞' !important;
          font-size: 18px !important;
        }
      `}</style>
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
