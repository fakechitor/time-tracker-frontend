export type TaskStatus = 'active' | 'completed' | 'archived'

export type Task = {
  id: string
  user_id: string
  title: string
  description: string
  status: TaskStatus
  total_time: number
  created_at: string
  updated_at: string
}

export type ListTasksParams = {
  search?: string
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'status'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type ListTasksResponse = {
  tasks: Task[]
  count: number
}

export type CreateTaskPayload = {
  title: string
  description?: string
  status?: TaskStatus
}

export type UpdateTaskPayload = {
  title: string
  description?: string
  status: TaskStatus
}

export type DeleteTaskResponse = {
  deleted: boolean
}
