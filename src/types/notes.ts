export interface Comment {
  id: string
  content: string
  author: string
  noteId: string
  userId: string
  createdAt: Date
}

export interface ActionItem {
  id: string
  title: string
  description?: string
  completed: boolean
  noteId: string
  userId: string
  createdAt: Date
  completedAt?: Date
}

export interface Note {
  id: string
  title: string
  content: string
  author: string
  createdAt: Date
  comments?: Comment[]
  actionItems?: ActionItem[]
}
