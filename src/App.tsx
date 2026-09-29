import { useCallback, useMemo, useState } from 'react'
import { sendMessage as sendMessageRequest, toErrorMessage } from './api/greenApi'
import type { Credentials, InstanceState } from './api/types'
import { createLocalMessageId, type Chat, type Message } from './chat'
import { ChatHeader } from './components/ChatHeader'
import { LoginForm } from './components/LoginForm'
import { MessageInput } from './components/MessageInput'
import { MessageList } from './components/MessageList'
import { NewChatDialog } from './components/NewChatDialog'
import { Sidebar } from './components/Sidebar'
import { useChats } from './hooks/useChats'
import { useNotifications, type NotificationHandlers } from './hooks/useNotifications'
import { clearCredentials, loadCredentials, saveCredentials } from './storage'

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)
  const [instanceState, setInstanceState] = useState<InstanceState | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const {
    chats,
    activeChat,
    activeChatId,
    addChat,
    setActive,
    removeChat,
    appendMessage,
    patchMessage,
    renameChat,
  } = useChats()

  const handlers = useMemo<NotificationHandlers>(
    () => ({
      onIncoming: ({ chatId, idMessage, text, senderName }) => {
        appendMessage({
          id: idMessage,
          chatId,
          text,
          direction: 'in',
          timestamp: Date.now(),
          status: 'sent',
        })
        if (senderName) renameChat(chatId, senderName)
      },

      onOutgoing: ({ chatId, idMessage, text }) => {
        appendMessage({
          id: idMessage,
          chatId,
          text,
          direction: 'out',
          timestamp: Date.now(),
          status: 'sent',
        })
      },

      onStatus: ({ idMessage, status }) => {
        const chat = chats.find((item) => item.messages.some((message) => message.id === idMessage))
        if (chat) patchMessage(chat.chatId, idMessage, { status })
      },

      onInstanceState: (state) => setInstanceState(state as InstanceState),
    }),
    [chats, appendMessage, patchMessage, renameChat],
  )

  const { connection, error: connectionError } = useNotifications(credentials, handlers)

  const handleConnect = useCallback((next: Credentials) => {
    saveCredentials(next)
    setInstanceState('authorized')
    setCredentials(next)
  }, [])

  const handleDisconnect = useCallback(() => {
    clearCredentials()
    setCredentials(null)
    setInstanceState(null)
    setMobileChatOpen(false)
  }, [])

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setActive(chatId)
      setMobileChatOpen(true)
    },
    [setActive],
  )

  const handleCreateChat = useCallback(
    (chat: Chat) => {
      addChat(chat)
      setMobileChatOpen(true)
    },
    [addChat],
  )

  const sendToGreenApi = useCallback(
    async (chatId: string, messageId: string, text: string) => {
      if (!credentials) return

      try {
        const { idMessage } = await sendMessageRequest(credentials, chatId, text)
        patchMessage(chatId, messageId, { id: idMessage, status: 'sent' })
      } catch (caught) {
        patchMessage(chatId, messageId, { status: 'failed', error: toErrorMessage(caught) })
      }
    },
    [credentials, patchMessage],
  )

  const handleSend = useCallback(
    (text: string) => {
      if (!activeChat) return

      const messageId = createLocalMessageId()
      appendMessage({
        id: messageId,
        chatId: activeChat.chatId,
        text,
        direction: 'out',
        timestamp: Date.now(),
        status: 'pending',
      })

      void sendToGreenApi(activeChat.chatId, messageId, text)
    },
    [activeChat, appendMessage, sendToGreenApi],
  )

  const handleRetry = useCallback(
    (message: Message) => {
      patchMessage(message.chatId, message.id, { status: 'pending', error: undefined })
      void sendToGreenApi(message.chatId, message.id, message.text)
    },
    [patchMessage, sendToGreenApi],
  )

  if (!credentials) {
    return <LoginForm onConnect={handleConnect} />
  }

  const connectionTitle =
    instanceState && instanceState !== 'authorized'
      ? `Статус инстанса: ${instanceState}`
      : (connectionError ?? undefined)

  return (
    <div className={`app ${mobileChatOpen && activeChat ? 'app--chat-open' : ''}`}>
      <div className="app__panel app__panel--sidebar">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          connection={connection}
          connectionTitle={connectionTitle}
          credentials={credentials}
          onSelect={handleSelectChat}
          onRemove={removeChat}
          onNewChat={() => setDialogOpen(true)}
          onDisconnect={handleDisconnect}
        />
      </div>

      <div className="app__panel app__panel--chat">
        <ChatHeader chat={activeChat} onBack={() => setMobileChatOpen(false)} />
        <MessageList chat={activeChat} onRetry={handleRetry} />
        <MessageInput disabled={!activeChat} onSend={handleSend} />
      </div>

      {dialogOpen && (
        <NewChatDialog
          credentials={credentials}
          onClose={() => setDialogOpen(false)}
          onCreated={handleCreateChat}
        />
      )}
    </div>
  )
}
