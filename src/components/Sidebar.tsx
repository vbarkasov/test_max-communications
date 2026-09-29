import type { Chat } from '../chat'
import { chatPreview, formatTime, truncate } from '../chat'
import type { Credentials } from '../api/types'
import type { ConnectionState } from '../hooks/useNotifications'
import { ConnectionStatus } from './ConnectionStatus'
import { IconLogout, IconPlus, IconTrash } from './Icons'

type Props = {
  chats: Chat[]
  activeChatId: string | null
  connection: ConnectionState
  connectionTitle?: string
  credentials: Credentials
  onSelect: (chatId: string) => void
  onRemove: (chatId: string) => void
  onNewChat: () => void
  onDisconnect: () => void
}

function lastActivity(chat: Chat): number {
  return chat.messages.at(-1)?.timestamp ?? chat.createdAt
}

export function Sidebar({
  chats,
  activeChatId,
  connection,
  connectionTitle,
  credentials,
  onSelect,
  onRemove,
  onNewChat,
  onDisconnect,
}: Props) {
  const sorted = [...chats].sort((a, b) => lastActivity(b) - lastActivity(a))

  return (
    <div className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__identity">
          <h2 className="sidebar__title">Чаты</h2>
          <ConnectionStatus connection={connection} title={connectionTitle} />
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onDisconnect}
          title={`Отключиться от инстанса ${credentials.idInstance}`}
          aria-label="Отключиться от GREEN-API"
        >
          <IconLogout />
        </button>
      </header>

      <button className="button button--primary sidebar__new" type="button" onClick={onNewChat}>
        <IconPlus />
        Новый чат
      </button>

      <div className="sidebar__list">
        {sorted.length === 0 ? (
          <p className="sidebar__empty">
            Здесь появятся чаты.
            <br />
            Нажмите «Новый чат» и укажите номер получателя.
          </p>
        ) : (
          sorted.map((chat) => (
            <div
              key={chat.chatId}
              className={`chat-item ${chat.chatId === activeChatId ? 'chat-item--active' : ''}`}
              onClick={() => onSelect(chat.chatId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(chat.chatId)
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={chat.chatId === activeChatId}
            >
              <div className="avatar" aria-hidden="true">
                {(chat.title || chat.phone).charAt(0)}
              </div>

              <div className="chat-item__body">
                <div className="chat-item__title-row">
                  <span className="chat-item__title">{chat.title || chat.phone}</span>
                  <span className="chat-item__time">{formatTime(lastActivity(chat))}</span>
                </div>
                <span className="chat-item__preview">{truncate(chatPreview(chat), 60)}</span>
              </div>

              {chat.messages.some((message) => message.status === 'failed') && (
                <span className="chat-item__failed" title="Есть неотправленное сообщение" />
              )}

              <button
                className="icon-button chat-item__remove"
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(chat.chatId)
                }}
                title="Удалить чат из списка"
                aria-label={`Удалить чат ${chat.title || chat.phone}`}
              >
                <IconTrash />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
