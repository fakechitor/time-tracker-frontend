export type TimerSession = {
  id: string
  task_id: string
  user_id: string
  started_at: string
  stopped_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type StartTimerPayload = {
  task_id: string
}

export type StopTimerPayload = {
  task_id?: string
}
