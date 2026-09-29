import type {
  CheckAccountResult,
  Credentials,
  DeleteNotificationResponse,
  InstanceStateResponse,
  NotificationEnvelope,
  SendMessageResponse,
} from './types'

export const MAX_MESSAGE_LENGTH = 4000

/**
 * Максимальный таймаут ожидания уведомления — 60 секунд по документации,
 * но 20 секунд дают заметно меньше «пустых» запросов к API.
 */
export const RECEIVE_TIMEOUT_SECONDS = 20

export class GreenApiError extends Error {
  readonly httpStatus: number

  constructor(message: string, httpStatus = 0) {
    super(message)
    this.name = 'GreenApiError'
    this.httpStatus = httpStatus
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof GreenApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Непредвиденная ошибка'
}

/**
 * Приводит адрес из личного кабинета к базовому виду:
 * без слеша в конце и без необязательного префикса `/v3`.
 */
export function normalizeApiUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new GreenApiError('Укажите адрес API, например https://api.green-api.com', 400)
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  return withScheme
    .replace(/\/+$/, '')
    .replace(/\/v3$/i, '')
}

/**
 * GREEN-API MAX принимает номера только РФ (7 + 10 цифр) и РБ (375 + 9 цифр).
 * Приводит «8 (999) 123-45-67» к «79991234567», как это делают мессенджеры.
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`
  }

  if (!/^(?:7\d{10}|375\d{9})$/.test(digits)) {
    throw new GreenApiError(
      'Номер должен быть в международном формате: 11 цифр для РФ (7…) или 12 цифр для РБ (375…)',
      400,
    )
  }

  return digits
}

function buildUrl(credentials: Credentials, method: string, suffix = ''): string {
  const base = normalizeApiUrl(credentials.apiUrl)
  return `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${suffix}`
}

function parseJson(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const STATUS_HINTS: Record<number, string> = {
  400: 'Запрос отклонён проверками GREEN-API. Проверьте формат номера и данные инстанса.',
  401: 'GREEN-API не распознал ключ доступа. Проверьте idInstance и apiTokenInstance.',
  403: 'Доступ запрещён. Инстанс должен быть авторизован, а тариф — поддерживать мессенджер MAX.',
  404: 'Инстанс не найден. Проверьте idInstance и адрес apiUrl из личного кабинета GREEN-API.',
  429: 'Превышен лимит частоты запросов. Подождите и повторите.',
  469: 'Превышен лимит проверок номеров. Приостановите проверки примерно на два часа.',
}

function extractErrorMessage(payload: unknown, text: string, httpStatus: number): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (typeof record.reason === 'string' && record.reason) return record.reason
    if (typeof record.message === 'string' && record.message) return record.message
  }

  const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (plain && !plain.startsWith('{') && !plain.startsWith('<')) return plain.slice(0, 200)

  return STATUS_HINTS[httpStatus] ?? `GREEN-API вернул HTTP ${httpStatus}`
}

async function request<T>(
  credentials: Credentials,
  method: string,
  options: { suffix?: string; body?: unknown; signal?: AbortSignal; verb?: 'GET' | 'POST' | 'DELETE' } = {},
): Promise<T> {
  const url = buildUrl(credentials, method, options.suffix)
  const verb = options.verb ?? (options.body === undefined ? 'GET' : 'POST')
  const hasBody = verb === 'POST'

  let response: Response
  try {
    response = await fetch(url, {
      method: verb,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new GreenApiError('Не удалось связаться с GREEN-API. Проверьте адрес API и подключение к сети.')
  }

  const text = await response.text()
  const payload = parseJson(text)

  if (!response.ok) {
    throw new GreenApiError(extractErrorMessage(payload, text, response.status), response.status)
  }

  return payload as T
}

/** GET /waInstance{id}/getStateInstance/{token} */
export async function getStateInstance(credentials: Credentials): Promise<InstanceStateResponse> {
  return request<InstanceStateResponse>(credentials, 'getStateInstance')
}

/**
 * POST /waInstance{id}/setSettings/{token}
 *
 * Для HTTP API обязателен пустой webhookUrl — иначе GREEN-API отдаёт
 * ошибку «Message cannot be received because custom webhook url is set».
 */
export async function setHttpApiSettings(credentials: Credentials): Promise<void> {
  await request(credentials, 'setSettings', {
    body: {
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      stateWebhook: 'yes',
    },
  })
}

/** POST /waInstance{id}/checkAccount/{token} */
export async function checkAccount(credentials: Credentials, phoneNumber: string): Promise<CheckAccountResult> {
  const response = await request<unknown>(credentials, 'checkAccount', {
    body: { phoneNumber: Number(phoneNumber) },
  })

  if (!response || typeof response !== 'object' || !('exist' in response)) {
    const reason =
      response && typeof response === 'object' && typeof (response as { reason?: unknown }).reason === 'string'
        ? (response as { reason: string }).reason
        : 'GREEN-API не смог проверить номер'
    throw new GreenApiError(reason, 400)
  }

  return response as CheckAccountResult
}

/** POST /waInstance{id}/sendMessage/{token} */
export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<SendMessageResponse> {
  return request<SendMessageResponse>(credentials, 'sendMessage', {
    body: { chatId, message },
  })
}

/**
 * GET /waInstance{id}/receiveNotification/{token}?receiveTimeout={seconds}
 *
 * Возвращает null, если за время ожидания уведомлений не появилось.
 */
export async function receiveNotification(
  credentials: Credentials,
  signal?: AbortSignal,
): Promise<NotificationEnvelope | null> {
  const response = await request<NotificationEnvelope | null>(
    credentials,
    'receiveNotification',
    { suffix: `?receiveTimeout=${RECEIVE_TIMEOUT_SECONDS}`, signal },
  )

  if (!response || typeof response.receiptId !== 'number') return null
  return response
}

/** DELETE /waInstance{id}/deleteNotification/{token}/{receiptId} */
export async function deleteNotification(credentials: Credentials, receiptId: number): Promise<void> {
  const response = await request<DeleteNotificationResponse | null>(credentials, 'deleteNotification', {
    suffix: `/${receiptId}`,
    verb: 'DELETE',
  })

  if (response && response.result === false) {
    throw new GreenApiError(response.reason || 'Не удалось подтвердить получение уведомления')
  }
}
