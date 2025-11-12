'use client'

import { useState, useEffect, useRef } from 'react'

interface TableControlsProps {
  editorRef: React.RefObject<HTMLDivElement>
  activeTable: {
    table: HTMLTableElement
    row: HTMLTableRowElement
    cell: HTMLTableCellElement
  } | null
  onAddRow: (above: boolean) => void
  onDeleteRow: () => void
  onAddColumn: (before: boolean) => void
  onDeleteColumn: () => void
}

export default function TableControls({
  editorRef,
  activeTable,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
}: TableControlsProps) {
  const [rowControlPos, setRowControlPos] = useState<{ top: number; left: number } | null>(null)
  const [colControlPos, setColControlPos] = useState<{ top: number; left: number } | null>(null)
  const [showRowMenu, setShowRowMenu] = useState(false)
  const [showColMenu, setShowColMenu] = useState(false)
  const rowMenuRef = useRef<HTMLDivElement>(null)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const rowButtonRef = useRef<HTMLDivElement>(null)
  const colButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTable && editorRef.current) {
      const editorRect = editorRef.current.getBoundingClientRect()
      const tableRect = activeTable.table.getBoundingClientRect()
      const rowRect = activeTable.row.getBoundingClientRect()
      const cellRect = activeTable.cell.getBoundingClientRect()

      // Position row control further to the left of the table, middle of the row
      setRowControlPos({
        top: rowRect.top - editorRect.top + rowRect.height / 2 - 12,
        left: Math.max(5, tableRect.left - editorRect.left - 10), // Ensure minimum 5px from left edge
      })

      // Position column control closer to the table, middle of the cell
      setColControlPos({
        top: Math.max(5, tableRect.top - editorRect.top - 10), // Reduced from -35 to -15 to be closer to table
        left: cellRect.left - editorRect.left + cellRect.width / 2 - 12,
      })
    } else {
      setRowControlPos(null)
      setColControlPos(null)
      setShowRowMenu(false)
      setShowColMenu(false)
    }
  }, [activeTable, editorRef])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      
      if (
        rowMenuRef.current && !rowMenuRef.current.contains(target) &&
        rowButtonRef.current && !rowButtonRef.current.contains(target)
      ) {
        setShowRowMenu(false)
      }
      
      if (
        colMenuRef.current && !colMenuRef.current.contains(target) &&
        colButtonRef.current && !colButtonRef.current.contains(target)
      ) {
        setShowColMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!activeTable || !rowControlPos || !colControlPos) {
    return null
  }

  return (
    <>
      {/* Row Control */}
      <div
        ref={rowButtonRef}
        className="absolute z-[50] w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 shadow-lg border-2 border-white"
        style={{
          top: `${rowControlPos.top}px`,
          left: `${rowControlPos.left}px`,
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowRowMenu(!showRowMenu)
          setShowColMenu(false)
        }}
      >
        <span className="text-xs font-bold">⋮</span>
      </div>
      
      {showRowMenu && (
        <div 
          ref={rowMenuRef} 
          className="absolute z-[51] bg-white border border-gray-300 rounded-lg shadow-xl text-sm w-44"
          style={{
            top: `${rowControlPos.top}px`,
            left: `${rowControlPos.left + 35}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddRow(true)
              setShowRowMenu(false)
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
          >
            Add Row Above
          </button>
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddRow(false)
              setShowRowMenu(false)
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Add Row Below
          </button>
          <div className="border-t border-gray-200"></div>
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDeleteRow()
              setShowRowMenu(false)
            }}
            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg"
          >
            Delete Row
          </button>
        </div>
      )}

      {/* Column Control */}
      <div
        ref={colButtonRef}
        className="absolute z-[50] w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded-full cursor-pointer hover:bg-blue-600 shadow-lg border-2 border-white"
        style={{
          top: `${colControlPos.top}px`,
          left: `${colControlPos.left}px`,
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowColMenu(!showColMenu)
          setShowRowMenu(false)
        }}
      >
        <span className="text-xs font-bold">⋯</span>
      </div>
      
      {showColMenu && (
        <div 
          ref={colMenuRef} 
          className="absolute z-[51] bg-white border border-gray-300 rounded-lg shadow-xl text-sm w-48"
          style={{
            top: `${colControlPos.top + 35}px`,
            left: `${colControlPos.left - 96}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddColumn(true)
              setShowColMenu(false)
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded-t-lg"
          >
            Add Column Before
          </button>
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onAddColumn(false)
              setShowColMenu(false)
            }}
            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
          >
            Add Column After
          </button>
          <div className="border-t border-gray-200"></div>
          <button 
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDeleteColumn()
              setShowColMenu(false)
            }}
            className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg"
          >
            Delete Column
          </button>
        </div>
      )}
    </>
  )
}
