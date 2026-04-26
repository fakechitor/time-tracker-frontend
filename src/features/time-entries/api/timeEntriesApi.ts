import { API_BASE_URL } from '../../../shared/config/env'
import { requestJsonWithSession } from '../../auth/lib/session'
import type { CreateTimeEntryPayload, ListTimeEntriesParams, ListTimeEntriesResponse, TimeEntry } from '../model/types'

const TIME_ENTRIES_ENDPOINT = `${API_BASE_URL}/api/v1/time-entries`

function buildQuery(params: ListTimeEntriesParams): string {
  const query = new URLSearchParams()
  if (params.task_id) {
    query.set('task_id', params.task_id)
  }
  if (params.from) {
    query.set('from', params.from)
  }
  if (params.to) {
    query.set('to', params.to)
  }
  if (params.sort_by) {
    query.set('sort_by', params.sort_by)
  }
  if (params.order) {
    query.set('order', params.order)
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit))
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset))
  }
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

export function createTimeEntry(payload: CreateTimeEntryPayload) {
  return requestJsonWithSession<TimeEntry>(TIME_ENTRIES_ENDPOINT, {
    method: 'POST',
    body: payload,
  })
}

export function listTimeEntries(params: ListTimeEntriesParams = {}) {
  return requestJsonWithSession<ListTimeEntriesResponse>(`${TIME_ENTRIES_ENDPOINT}${buildQuery(params)}`, {
    method: 'GET',
  })
}
