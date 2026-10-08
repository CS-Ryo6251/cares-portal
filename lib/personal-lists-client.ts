'use client'

export class ListRequestError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export async function listRequest<T>(url: string, body?: unknown, method = body ? 'POST' : 'GET', signal?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  try {
    const response = await fetch(url, { method, cache: 'no-store', signal: controller.signal, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
    const data = await response.json()
    if (!response.ok) throw new ListRequestError(data.error || '処理を完了できませんでした。', response.status)
    return data as T
  } catch (error) {
    if (error instanceof ListRequestError) throw error
    throw new ListRequestError('通信が完了しませんでした。内容を確認して再度お試しください。', 0)
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
}
