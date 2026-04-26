import { API_BASE_URL } from '../../../shared/config/env'
import { requestJsonWithSession } from '../../auth/lib/session'
import type { StartTimerPayload, StopTimerPayload, TimerSession } from '../model/types'

const TIMERS_ENDPOINT = `${API_BASE_URL}/api/v1/timers`

export function startTimer(payload: StartTimerPayload) {
  return requestJsonWithSession<TimerSession>(`${TIMERS_ENDPOINT}/start`, {
    method: 'POST',
    body: payload,
  })
}

export function stopTimer(payload?: StopTimerPayload) {
  return requestJsonWithSession<TimerSession>(`${TIMERS_ENDPOINT}/stop`, {
    method: 'POST',
    body: payload ?? {},
  })
}

export function getActiveTimer() {
  return requestJsonWithSession<TimerSession>(`${TIMERS_ENDPOINT}/active`, {
    method: 'GET',
  })
}
