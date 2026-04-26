export type TimeEntry = {
  id: string
  task_id: string
  user_id: string
  started_at: string
  ended_at: string
  duration_sec: number
  created_at: string
  updated_at: string
}

export type CreateTimeEntryPayload = {
  task_id: string
  started_at: string
  ended_at: string
}

export type ListTimeEntriesParams = {
  task_id?: string
  from?: string
  to?: string
  sort_by?: 'started_at' | 'ended_at' | 'created_at' | 'duration_sec'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type ListTimeEntriesResponse = {
  time_entries: TimeEntry[]
  count: number
}
