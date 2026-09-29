export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type Message = {
  id: string
  chatId: string
  text: string
  direction: 'in' | 'out'
  timestamp: number
  status: MessageStatus
  error?: string
}

export type Chat = {
  chatId: string
  phone: string
  title: string
  createdAt: number
  messages: Message[]
}

const MAX_MESSAGES_PER_CHAT = 200

export function createLocalMessageId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatDayLabel(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()

  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)

  if (dayDiff === 0) return 'Сегодня'
  if (dayDiff === 1) return 'Вчера'

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function chatPreview(chat: Chat): string {
  const last = chat.messages.at(-1)
  if (!last) return 'Нет сообщений'

  const prefix = last.direction === 'out' ? 'Вы: ' : ''
  return prefix + last.text.replace(/\s+/g, ' ').trim()
}

export function truncate(text: string, limit = 200): string {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function trimMessages(messages: Message[]): Message[] {
  return messages.length > MAX_MESSAGES_PER_CHAT ? messages.slice(-MAX_MESSAGES_PER_CHAT) : messages
}
