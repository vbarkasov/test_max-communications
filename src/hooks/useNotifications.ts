import { useEffect, useRef, useState } from 'react'
import { deleteNotification, receiveNotification, toErrorMessage } from '../api/greenApi'
import type { Credentials, Notification } from '../api/types'
import type { MessageStatus } from '../chat'

export type ConnectionState = 'connecting' | 'online' | 'error'

export type NotificationHandlers = {
  onIncoming: (event: { chatId: string; idMessage: string; text: string; senderName?: string }) => void
  onOutgoing: (event: { chatId: string; idMessage: string; text: string }) => void
  onStatus: (event: { idMessage: string; status: MessageStatus }) => void
  onInstanceState: (state: string) => void
}

type LoopState = {
  credentials: Credentials | null
  connection: ConnectionState
  error: string | null
}

/** За сколько миллисекунд считать соединение установленным, пока идёт первый длинный опрос. */
const ASSUME_ONLINE_AFTER_MS = 1200

function readStatus(value: string | undefined): MessageStatus | null {
  switch (value) {
    case 'sent':
      return 'sent'
    case 'delivered':
      return 'delivered'
    case 'read':
      return 'read'
    case 'failed':
      return 'failed'
    default:
      return null
  }
}

function readTextMessage(notification: Notification): string | null {
  if (notification.messageData?.typeMessage !== 'textMessage') return null
  return notification.messageData.textMessageData?.textMessage ?? null
}

function isRecoverable(caught: unknown): boolean {
  if (caught instanceof Error && caught.name === 'AbortError') return false

  const status = (caught as { httpStatus?: number }).httpStatus
  if (typeof status !== 'number' || status === 0) return true

  return status >= 500 || status === 429
}

/**
 * Технология HTTP API: бесконечный цикл ReceiveNotification → DeleteNotification.
 * Уведомление подтверждается в любом случае, иначе оно осталось бы в FIFO-очереди на 24 часа.
 */
export function useNotifications(credentials: Credentials | null, handlers: NotificationHandlers) {
  const [state, setState] = useState<LoopState>({ credentials: null, connection: 'connecting', error: null })

  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!credentials) return

    const controller = new AbortController()
    let cancelled = false
    let failures = 0

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    void (async () => {
      while (!cancelled) {
        // Первый опрос длится до 20 секунд, поэтому считаем соединение живым, если
        // запрос не завершился ошибкой почти сразу после отправки.
        const onlineTimer = setTimeout(() => {
          if (!cancelled) setState({ credentials, connection: 'online', error: null })
        }, ASSUME_ONLINE_AFTER_MS)

        try {
          const envelope = await receiveNotification(credentials, controller.signal)
          clearTimeout(onlineTimer)

          if (envelope) {
            const { receiptId, body } = envelope
            const { onIncoming, onOutgoing, onStatus } = handlersRef.current
            const senderData = body.senderData

            if (body.typeWebhook === 'incomingMessageReceived') {
              const text = readTextMessage(body)
              if (text && senderData?.chatId) {
                onIncoming({
                  chatId: senderData.chatId,
                  idMessage: body.idMessage ?? `incoming-${receiptId}`,
                  text,
                  senderName: senderData.senderName || senderData.chatName,
                })
              }
            } else if (body.typeWebhook === 'outgoingMessageReceived') {
              const text = readTextMessage(body)
              if (text && senderData?.chatId && body.idMessage) {
                onOutgoing({ chatId: senderData.chatId, idMessage: body.idMessage, text })
              }
            } else if (body.typeWebhook === 'outgoingMessageStatus') {
              const status = readStatus(body.status)
              if (body.idMessage && status) onStatus({ idMessage: body.idMessage, status })
            } else if (body.typeWebhook === 'stateInstanceChanged' && body.stateInstance) {
              handlersRef.current.onInstanceState(body.stateInstance)
            }

            try {
              await deleteNotification(credentials, receiptId)
            } catch {
              // Уведомление уже могли удалить — это не повод останавливать цикл.
            }
          }

          failures = 0
          setState({ credentials, connection: 'online', error: null })
        } catch (caught) {
          clearTimeout(onlineTimer)
          if (cancelled || controller.signal.aborted) return

          failures += 1
          setState({ credentials, connection: 'error', error: toErrorMessage(caught) })

          if (!isRecoverable(caught)) {
            handlersRef.current.onInstanceState('notAuthorized')
            return
          }

          await sleep(Math.min(1000 * 2 ** (failures - 1), 15_000))
        }
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [credentials])

  const settled = state.credentials === credentials

  return {
    connection: settled ? state.connection : ('connecting' as ConnectionState),
    error: settled ? state.error : null,
  }
}
