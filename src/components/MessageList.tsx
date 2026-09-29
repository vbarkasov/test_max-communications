import { useEffect, useRef } from 'react'
import type { Chat, Message } from '../chat'
import { formatDayLabel } from '../chat'
import { MessageBubble } from './MessageBubble'

type Props = {
  chat: Chat | null
  onRetry: (message: Message) => void
}

type Group = {
  key: string
  day: string
  direction: Message['direction']
  messages: Message[]
}

/** Раскладывает сообщения по дням и группирует соседние сообщения одного отправителя. */
function buildGroups(messages: Message[]): Group[] {
  const groups: Group[] = []

  for (const message of messages) {
    const day = formatDayLabel(message.timestamp)
    const last = groups.at(-1)

    if (last && last.day === day && last.direction === message.direction) {
      last.messages.push(message)
      continue
    }

    groups.push({
      key: `${day}-${message.id}`,
      day,
      direction: message.direction,
      messages: [message],
    })
  }

  return groups
}

export function MessageList({ chat, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messages = chat?.messages ?? []

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return

    node.scrollTop = node.scrollHeight
  }, [chat?.chatId, messages.length])

  if (!chat) {
    return (
      <div className="messages">
        <div className="messages__placeholder">
          <p className="messages__placeholder-title">Чат не выбран</p>
          <p className="messages__placeholder-text">
            Создайте новый чат по номеру телефона получателя, чтобы начать переписку в MAX.
          </p>
        </div>
      </div>
    )
  }

  const groups = buildGroups(messages)

  return (
    <div className="messages" ref={scrollRef}>
      {messages.length === 0 ? (
        <div className="messages__placeholder">
          <p className="messages__placeholder-title">Пока нет сообщений</p>
          <p className="messages__placeholder-text">
            Напишите первое сообщение — оно уйдёт получателю в мессенджер MAX.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.key}>
            <div className="messages__day">
              <span className="messages__day-label">{group.day}</span>
            </div>
            <div className={`messages__stack ${group.direction === 'out' ? 'messages__stack--out' : ''}`}>
              {group.messages.map((message) => (
                <MessageBubble key={message.id} message={message} onRetry={onRetry} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
