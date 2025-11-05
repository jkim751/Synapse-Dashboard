'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Student {
  id: string
  name: string
  surname: string
  img?: string | null
}

interface StudentTagSelectorProps {
  selectedStudents: string[]
  onStudentsChange: (studentIds: string[]) => void
}

export default function StudentTagSelector({ selectedStudents, onStudentsChange }: StudentTagSelectorProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

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

  const filteredStudents = students.filter(student =>
    `${student.name} ${student.surname}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedStudentsList = students.filter(s => selectedStudents.includes(s.id))

  const toggleStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      onStudentsChange(selectedStudents.filter(id => id !== studentId))
    } else {
      onStudentsChange([...selectedStudents, studentId])
    }
  }

  return (
    <div className="relative">
      <div className="mb-2">
        <label className="text-sm font-medium text-gray-700">Tag Students</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {selectedStudentsList.map(student => (
            <div
              key={student.id}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              <Image
                src={student.img || '/noAvatar.png'}
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{student.name} {student.surname}</span>
              <button
                onClick={() => toggleStudent(student.id)}
                className="text-blue-600 hover:text-blue-800 ml-1"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 border-2 border-dashed border-blue-300 rounded-full text-blue-600 hover:bg-blue-50 text-sm"
          >
            + Add Student
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No students found</div>
            ) : (
              filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                    selectedStudents.includes(student.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => {}}
                    className="w-4 h-4"
                  />
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
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
