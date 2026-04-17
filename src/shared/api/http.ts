export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestInitWithBody = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInitWithBody,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Request failed'
    throw new ApiError(message, response.status)
  }

  return data as T
}
