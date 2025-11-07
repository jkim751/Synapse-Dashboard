'use client'

import { useState, useRef, useEffect } from 'react'
import MentionAutocomplete from './MentionAutocomplete'
import AutocorrectSuggestion from './AutocorrectSuggestion'
import { getLastWord, shouldAutocorrect, getAutocorrectSuggestions } from '@/utils/autocorrect'

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
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  
  // Autocorrect suggestion state
  const [showAutocorrect, setShowAutocorrect] = useState(false)
  const [autocorrectSuggestions, setAutocorrectSuggestions] = useState<string[]>([])
  const [autocorrectPosition, setAutocorrectPosition] = useState({ top: 0, left: 0 })
  const autocorrectRangeRef = useRef<Range | null>(null)
  const autocorrectWordRef = useRef<string>('')

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only update if we're not currently typing and content has changed
    if (editorRef.current && editorRef.current.innerHTML !== value && document.activeElement !== editorRef.current) {
      const savedSelection = saveSelection()
      editorRef.current.innerHTML = value
      if (savedSelection) {
        restoreSelection(savedSelection)
      }
    }
  }, [value])

  const saveSelection = () => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !editorRef.current) return null
    
    const range = selection.getRangeAt(0)
    return {
      start: getNodeOffset(editorRef.current, range.startContainer, range.startOffset),
      end: getNodeOffset(editorRef.current, range.endContainer, range.endOffset)
    }
  }

  const restoreSelection = (saved: { start: number; end: number }) => {
    if (!editorRef.current) return
    
    const selection = window.getSelection()
    if (!selection) return
    
    const range = document.createRange()
    const startPos = getNodeAndOffset(editorRef.current, saved.start)
    const endPos = getNodeAndOffset(editorRef.current, saved.end)
    
    if (startPos && endPos) {
      range.setStart(startPos.node, startPos.offset)
      range.setEnd(endPos.node, endPos.offset)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }

  const getNodeOffset = (root: Node, node: Node, offset: number): number => {
    let totalOffset = 0
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let currentNode = walker.nextNode()
    
    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset
      }
      totalOffset += currentNode.textContent?.length || 0
      currentNode = walker.nextNode()
    }
    
    return totalOffset
  }

  const getNodeAndOffset = (root: Node, offset: number): { node: Node; offset: number } | null => {
    let currentOffset = 0
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    
    while (node) {
      const length = node.textContent?.length || 0
      if (currentOffset + length >= offset) {
        return { node, offset: offset - currentOffset }
      }
      currentOffset += length
      node = walker.nextNode()
    }
    
    // Fallback to end of content
    if (root.lastChild) {
      return { node: root.lastChild, offset: 0 }
    }
    
    return null
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
      checkForMention()
      checkForAutocorrect()
    }
  }

  const checkForAutocorrect = () => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !editorRef.current) {
      setShowAutocorrect(false)
      return
    }

    const range = selection.getRangeAt(0)
    const textNode = range.startContainer
    
    if (textNode.nodeType !== Node.TEXT_NODE) {
      setShowAutocorrect(false)
      return
    }

    const text = textNode.textContent || ''
    const cursorPos = range.startOffset
    
    // Check if we just typed a space or punctuation
    if (cursorPos > 0 && /[\s.,!?;:]/.test(text[cursorPos - 1])) {
      const { word, startPos } = getLastWord(text, cursorPos - 1)
      
      if (word && word.length > 2) {
        const suggestions = getAutocorrectSuggestions(word)
        
        if (suggestions.length > 0) {
          // Store the range for the misspelled word
          autocorrectRangeRef.current = document.createRange()
          autocorrectRangeRef.current.setStart(textNode, startPos)
          autocorrectRangeRef.current.setEnd(textNode, startPos + word.length)
          autocorrectWordRef.current = word
          
          setAutocorrectSuggestions(suggestions)
          setShowAutocorrect(true)
          updateAutocorrectPosition(autocorrectRangeRef.current)
        } else {
          setShowAutocorrect(false)
        }
      } else {
        setShowAutocorrect(false)
      }
    }
  }

  const updateAutocorrectPosition = (range: Range) => {
    const rect = range.getBoundingClientRect()
    const editorRect = editorRef.current?.getBoundingClientRect()
    
    if (editorRect) {
      setAutocorrectPosition({
        top: rect.bottom - editorRect.top + 5,
        left: rect.left - editorRect.left
      })
    }
  }

  const applyAutocorrect = (suggestion: string) => {
    if (!autocorrectRangeRef.current || !editorRef.current) return

    const selection = window.getSelection()
    if (!selection) return

    // Delete the misspelled word
    autocorrectRangeRef.current.deleteContents()

    // Insert the corrected word
    const correctedText = document.createTextNode(suggestion)
    autocorrectRangeRef.current.insertNode(correctedText)

    // Move cursor after the corrected word
    const newRange = document.createRange()
    newRange.setStartAfter(correctedText)
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)

    setShowAutocorrect(false)
    setAutocorrectSuggestions([])
    onChange(editorRef.current.innerHTML)
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

    mentionRangeRef.current.deleteContents()

    const mentionLink = document.createElement('a')
    mentionLink.href = `/list/students/${student.id}`
    mentionLink.className = 'student-mention'
    mentionLink.setAttribute('data-student-id', student.id)
    mentionLink.style.cssText = 'color: #2563eb; text-decoration: none; background-color: #dbeafe; padding: 2px 6px; border-radius: 4px; font-weight: 500;'
    mentionLink.textContent = `@${student.name} ${student.surname}`
    mentionLink.contentEditable = 'false'

    mentionRangeRef.current.insertNode(mentionLink)

    const space = document.createTextNode(' ')
    mentionLink.parentNode?.insertBefore(space, mentionLink.nextSibling)

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
    // Handle Tab for autocorrect
    if (e.key === 'Tab' && showAutocorrect && autocorrectSuggestions.length > 0) {
      e.preventDefault()
      applyAutocorrect(autocorrectSuggestions[0])
      return
    }

    // Handle Escape to dismiss autocorrect
    if (e.key === 'Escape' && showAutocorrect) {
      e.preventDefault()
      setShowAutocorrect(false)
      setAutocorrectSuggestions([])
      return
    }

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

  const highlightText = () => {
    execCommand('backColor', '#ffeb3b')
  }

  const insertTable = () => {
    if (!editorRef.current) return

    let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">'
    tableHTML += '<thead><tr>'
    for (let j = 0; j < tableCols; j++) {
      tableHTML += '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f3f4f6; font-weight: 600;">Header ' + (j + 1) + '</th>'
    }
    tableHTML += '</tr></thead>'
    tableHTML += '<tbody>'
    for (let i = 1; i < tableRows; i++) {
      tableHTML += '<tr>'
      for (let j = 0; j < tableCols; j++) {
        tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>'
      }
      tableHTML += '</tr>'
    }
    tableHTML += '</tbody></table><p><br></p>'

    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = tableHTML
      
      range.deleteContents()
      
      while (tempDiv.firstChild) {
        range.insertNode(tempDiv.lastChild!)
      }
      
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      editorRef.current.innerHTML += tableHTML
    }

    onChange(editorRef.current.innerHTML)
    setShowTableDialog(false)
    setTableRows(3)
    setTableCols(3)
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
      {showTableDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Insert Table</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rows: <span className="font-bold">{tableRows}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-200"
                  style={{
                    background: `linear-gradient(to right, #fed7aa 0%, #fed7aa ${((tableRows - 2) / 8) * 100}%, #e5e7eb ${((tableRows - 2) / 8) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Columns: <span className="font-bold">{tableCols}</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-200"
                  style={{
                    background: `linear-gradient(to right, #fed7aa 0%, #fed7aa ${((tableCols - 2) / 8) * 100}%, #e5e7eb ${((tableCols - 2) / 6) * 100}%, #e5e7eb 100%)`
                  }}
                />
              </div>

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
                className="flex-1 px-4 py-2 bg-orange-300 text-white rounded hover:bg-orange-500"
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

      <div className="w-full h-[650px] border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-1.5 flex flex-wrap gap-1 items-center">
          <button
            type="button"
            onClick={() => execCommand('bold')}
            className="p-1.5 hover:bg-gray-200 rounded text-sm font-bold w-7 h-7 flex items-center justify-center"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execCommand('italic')}
            className="p-1.5 hover:bg-gray-200 rounded text-sm italic w-7 h-7 flex items-center justify-center"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execCommand('underline')}
            className="p-1.5 hover:bg-gray-200 rounded text-sm underline w-7 h-7 flex items-center justify-center"
            title="Underline"
          >
            U
          </button>

          <div className="w-px bg-gray-300 h-6 mx-1" />

          <select
            onChange={(e) => {
              if (e.target.value) {
                execCommand('formatBlock', e.target.value)
                e.target.value = ''
              }
            }}
            className="px-2 py-1 text-xs border border-gray-300 rounded h-7"
            defaultValue=""
          >
            <option value="" disabled>Heading</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="p">P</option>
          </select>

          <div className="w-px bg-gray-300 h-6 mx-1" />

          <button
            type="button"
            onClick={() => insertList('ul')}
            className="p-1.5 hover:bg-gray-200 rounded text-sm w-7 h-7 flex items-center justify-center"
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => insertList('ol')}
            className="p-1.5 hover:bg-gray-200 rounded text-sm w-7 h-7 flex items-center justify-center"
            title="Numbered List"
          >
            1.
          </button>

          <div className="w-px bg-gray-300 h-6 mx-1" />

          <button
            type="button"
            onClick={() => setShowTableDialog(true)}
            className="p-1.5 hover:bg-gray-200 rounded text-sm w-7 h-7 flex items-center justify-center"
            title="Insert Table"
          >
            ⊞
          </button>

          <div className="w-px bg-gray-300 h-6 mx-1" />

          {/* Alignment - Microsoft Word style */}
          <button
            type="button"
            onClick={() => execCommand('justifyLeft')}
            className="p-1.5 hover:bg-gray-200 rounded w-7 h-7 flex items-center justify-center"
            title="Align Left"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1H2V3zm0 3h8v1H2V6zm0 3h12v1H2V9zm0 3h8v1H2v-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyCenter')}
            className="p-1.5 hover:bg-gray-200 rounded w-7 h-7 flex items-center justify-center"
            title="Align Center"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1H2V3zm2 3h8v1H4V6zm-2 3h12v1H2V9zm2 3h8v1H4v-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyRight')}
            className="p-1.5 hover:bg-gray-200 rounded w-7 h-7 flex items-center justify-center"
            title="Align Right"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1H2V3zm4 3h8v1H6V6zm-4 3h12v1H2V9zm4 3h8v1H6v-1z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand('justifyFull')}
            className="p-1.5 hover:bg-gray-200 rounded w-7 h-7 flex items-center justify-center"
            title="Justify"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h12v1H2V9zm0 3h12v1H2v-1z"/>
            </svg>
          </button>

          <div className="w-px bg-gray-300 h-6 mx-1" />

          <input
            type="color"
            onChange={(e) => execCommand('foreColor', e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
            title="Text Color"
          />
          <input
            type="color"
            onChange={(e) => execCommand('backColor', e.target.value)}
            className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
            title="Background Color"
          />

          <div className="w-px bg-gray-300 h-6 mx-1" />

          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter URL:')
              if (url) execCommand('createLink', url)
            }}
            className="p-1.5 hover:bg-gray-200 rounded text-sm w-7 h-7 flex items-center justify-center"
            title="Insert Link"
          >
            🔗
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="w-full h-[calc(100%-36px)] px-2 overflow-y-auto focus:outline-none"
          style={{
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            fontSize: '16px',
            lineHeight: '32px',
            paddingTop: '0px',
            paddingBottom: '0px'
          }}
          suppressContentEditableWarning={true}
        />

        {!value && (
          <div 
            className="absolute left-2 text-gray-400 pointer-events-none"
            style={{
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
              fontSize: '16px',
              lineHeight: '32px',
              top: '36px'
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
      
      {showAutocorrect && (
        <AutocorrectSuggestion
          suggestions={autocorrectSuggestions}
          position={autocorrectPosition}
          onSelect={applyAutocorrect}
          onDismiss={() => {
            setShowAutocorrect(false)
            setAutocorrectSuggestions([])
          }}
        />
      )}
    </div>
  )
}
