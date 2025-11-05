'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface Student {
  id: string
  name: string
  surname: string
  img?: string | null
}

interface MentionAutocompleteProps {
  query: string
  position: { top: number; left: number }
  onSelect: (student: Student) => void
  onClose: () => void
}

export default function MentionAutocomplete({ 
  query, 
  position, 
  onSelect, 
  onClose 
}: MentionAutocompleteProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    if (students.length > 0) {
      const lowerQuery = query.toLowerCase()
      const filtered = students.filter(student =>
        student.name.toLowerCase().includes(lowerQuery) ||
        student.surname.toLowerCase().includes(lowerQuery) ||
        `${student.name} ${student.surname}`.toLowerCase().includes(lowerQuery)
      )
      setFilteredStudents(filtered)
      setSelectedIndex(0)
    }
  }, [query, students])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredStudents.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
      } else if (e.key === 'Enter' && filteredStudents.length > 0) {
        e.preventDefault()
        onSelect(filteredStudents[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filteredStudents, selectedIndex, onSelect, onClose])

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/students-list')
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="absolute z-[9999] bg-white border-2 border-blue-300 rounded-lg shadow-xl p-3"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-gray-500 text-sm">Loading students...</div>
      </div>
    )
  }

  if (filteredStudents.length === 0) {
    return (
      <div
        ref={containerRef}
        className="absolute z-[9999] bg-white border-2 border-blue-300 rounded-lg shadow-xl p-3"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-gray-500 text-sm">No students found</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-[9999] bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left, minWidth: '250px' }}
    >
      {filteredStudents.map((student, index) => (
        <button
          key={student.id}
          onClick={() => onSelect(student)}
          className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors ${
            index === selectedIndex ? 'bg-blue-100' : ''
          }`}
        >
          <Image
            src={student.img || '/noAvatar.png'}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm font-medium">
            {student.name} {student.surname}
          </span>
        </button>
      ))}
    </div>
  )
}
