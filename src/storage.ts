import type { Credentials } from './api/types'
import type { Chat } from './chat'

const CREDENTIALS_KEY = 'max-green-api:credentials'
const CHATS_KEY = 'max-green-api:chats'
const ACTIVE_CHAT_KEY = 'max-green-api:active-chat'

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<Credentials>
    if (!parsed.apiUrl || !parsed.idInstance || !parsed.apiTokenInstance) return null

    return {
      apiUrl: parsed.apiUrl,
      idInstance: String(parsed.idInstance),
      apiTokenInstance: parsed.apiTokenInstance,
    }
  } catch {
    return null
  }
}

export function saveCredentials(credentials: Credentials): void {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
}

export function clearCredentials(): void {
  localStorage.removeItem(CREDENTIALS_KEY)
}

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is Chat =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as Chat).chatId === 'string' &&
        Array.isArray((item as Chat).messages),
    )
  } catch {
    return []
  }
}

export function saveChats(chats: Chat[]): void {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
}

export function loadActiveChatId(): string | null {
  return localStorage.getItem(ACTIVE_CHAT_KEY)
}

export function saveActiveChatId(chatId: string | null): void {
  if (chatId) {
    localStorage.setItem(ACTIVE_CHAT_KEY, chatId)
  } else {
    localStorage.removeItem(ACTIVE_CHAT_KEY)
  }
}
