export interface Comment {
  id: string
  content: string
  author: string
  createdAt: Date
}

export interface ActionItem {
  id: string
  title: string
  description?: string
  completed: boolean
  author: string
  createdAt: Date
  completedAt?: Date
}

export interface StudentTag {
  id: string
  studentId: string
  noteId: string
  createdAt: Date
  student: {
    id: string
    name: string
    surname: string
    img?: string | null
  }
}

export interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
  comments?: Comment[]
  actionItems?: ActionItem[]
  taggedStudents?: StudentTag[]
}
