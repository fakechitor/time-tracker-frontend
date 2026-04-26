export type ReportByTask = {
  task_id: string
  title: string
  total_duration_sec: number
}

export type ReportByDay = {
  day: string
  total_duration_sec: number
}

export type SummaryReport = {
  from: string
  to: string
  total_duration_sec: number
  entries_count: number
  by_task: ReportByTask[]
  by_day: ReportByDay[]
}

export type SummaryReportParams = {
  from: string
  to: string
}
