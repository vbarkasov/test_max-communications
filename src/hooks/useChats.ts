import { useEffect, useReducer } from 'react'
import type { Chat, Message } from '../chat'
import { trimMessages } from '../chat'
import { loadActiveChatId, loadChats, saveActiveChatId, saveChats } from '../storage'

type State = {
  chats: Chat[]
  activeChatId: string | null
}

type Action =
  | { type: 'addChat'; chat: Chat }
  | { type: 'setActive'; chatId: string }
  | { type: 'removeChat'; chatId: string }
  | { type: 'appendMessage'; message: Message }
  | { type: 'patchMessage'; chatId: string; id: string; patch: Partial<Message> }
  | { type: 'renameChat'; chatId: string; title: string }

function initialState(): State {
  const chats = loadChats()
  const savedId = loadActiveChatId()
  const activeChatId = chats.some((chat) => chat.chatId === savedId) ? savedId : (chats[0]?.chatId ?? null)

  return { chats, activeChatId }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'addChat': {
      const exists = state.chats.some((chat) => chat.chatId === action.chat.chatId)
      return {
        activeChatId: action.chat.chatId,
        chats: exists
          ? state.chats.map((chat) =>
              chat.chatId === action.chat.chatId ? { ...chat, title: action.chat.title, phone: action.chat.phone } : chat,
            )
          : [action.chat, ...state.chats],
      }
    }

    case 'setActive':
      return state.activeChatId === action.chatId ? state : { ...state, activeChatId: action.chatId }

    case 'removeChat': {
      const chats = state.chats.filter((chat) => chat.chatId !== action.chatId)
      const activeChatId =
        state.activeChatId === action.chatId ? (chats[0]?.chatId ?? null) : state.activeChatId
      return { chats, activeChatId }
    }

    case 'appendMessage': {
      let changed = false
      const chats = state.chats.map((chat) => {
        if (chat.chatId !== action.message.chatId) return chat
        if (chat.messages.some((message) => message.id === action.message.id)) return chat

        changed = true
        return { ...chat, messages: trimMessages([...chat.messages, action.message]) }
      })

      return changed ? { ...state, chats } : state
    }

    case 'patchMessage': {
      let changed = false
      const chats = state.chats.map((chat) => {
        if (chat.chatId !== action.chatId) return chat

        const index = chat.messages.findIndex((message) => message.id === action.id)
        if (index === -1) return chat

        changed = true
        const messages = [...chat.messages]
        messages[index] = { ...messages[index], ...action.patch }
        return { ...chat, messages }
      })

      return changed ? { ...state, chats } : state
    }

    case 'renameChat': {
      let changed = false
      const chats = state.chats.map((chat) => {
        if (chat.chatId !== action.chatId || !action.title || chat.title === action.title) return chat

        changed = true
        return { ...chat, title: action.title }
      })

      return changed ? { ...state, chats } : state
    }
  }
}

export function useChats() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    saveChats(state.chats)
  }, [state.chats])

  useEffect(() => {
    saveActiveChatId(state.activeChatId)
  }, [state.activeChatId])

  const activeChat = state.chats.find((chat) => chat.chatId === state.activeChatId) ?? null

  return {
    chats: state.chats,
    activeChat,
    activeChatId: state.activeChatId,
    addChat: (chat: Chat) => dispatch({ type: 'addChat', chat }),
    setActive: (chatId: string) => dispatch({ type: 'setActive', chatId }),
    removeChat: (chatId: string) => dispatch({ type: 'removeChat', chatId }),
    appendMessage: (message: Message) => dispatch({ type: 'appendMessage', message }),
    patchMessage: (chatId: string, id: string, patch: Partial<Message>) =>
      dispatch({ type: 'patchMessage', chatId, id, patch }),
    renameChat: (chatId: string, title: string) => dispatch({ type: 'renameChat', chatId, title }),
  }
}
