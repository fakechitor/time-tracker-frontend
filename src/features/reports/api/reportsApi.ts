import { API_BASE_URL } from '../../../shared/config/env'
import { requestJsonWithSession } from '../../auth/lib/session'
import type { SummaryReport, SummaryReportParams } from '../model/types'

const REPORTS_ENDPOINT = `${API_BASE_URL}/api/v1/reports`

function buildSummaryQuery(params: SummaryReportParams): string {
  const query = new URLSearchParams()
  query.set('from', params.from)
  query.set('to', params.to)
  return `?${query.toString()}`
}

export function getSummaryReport(params: SummaryReportParams) {
  return requestJsonWithSession<SummaryReport>(`${REPORTS_ENDPOINT}/summary${buildSummaryQuery(params)}`, {
    method: 'GET',
  })
}
