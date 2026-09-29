import type { Chat } from '../chat'
import { IconBack } from './Icons'

type Props = {
  chat: Chat | null
  onBack: () => void
}

export function ChatHeader({ chat, onBack }: Props) {
  return (
    <header className="chat__header">
      <button className="icon-button icon-button--back chat__back" type="button" onClick={onBack} aria-label="К списку чатов">
        <IconBack />
      </button>

      {chat && (
        <>
          <div className="avatar" aria-hidden="true">
            {(chat.title || chat.phone).charAt(0)}
          </div>
          <div className="chat__identity">
            <h2 className="chat__title">{chat.title || chat.phone}</h2>
            <p className="chat__subtitle">
              +{chat.phone} · chatId {chat.chatId}
            </p>
          </div>
        </>
      )}
    </header>
  )
}
