import { API_BASE_URL } from '../../../shared/config/env'
import { requestJsonWithSession } from '../../auth/lib/session'
import type {
  CreateTaskPayload,
  DeleteTaskResponse,
  ListTasksParams,
  ListTasksResponse,
  Task,
  UpdateTaskPayload,
} from '../model/types'

const TASKS_ENDPOINT = `${API_BASE_URL}/api/v1/tasks`

function buildQuery(params: ListTasksParams): string {
  const query = new URLSearchParams()

  if (params.search) {
    query.set('search', params.search)
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

export function listTasks(params: ListTasksParams = {}) {
  return requestJsonWithSession<ListTasksResponse>(`${TASKS_ENDPOINT}${buildQuery(params)}`, {
    method: 'GET',
  })
}

export function getTaskById(taskId: string) {
  return requestJsonWithSession<Task>(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'GET',
  })
}

export function createTask(payload: CreateTaskPayload) {
  return requestJsonWithSession<Task>(TASKS_ENDPOINT, {
    method: 'POST',
    body: payload,
  })
}

export function updateTask(taskId: string, payload: UpdateTaskPayload) {
  return requestJsonWithSession<Task>(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteTask(taskId: string) {
  return requestJsonWithSession<DeleteTaskResponse>(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'DELETE',
  })
}
