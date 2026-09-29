export type Credentials = {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState = 'authorized' | 'starting' | 'notAuthorized' | (string & {})

export type InstanceStateResponse = {
  stateInstance: InstanceState
}

export type CheckAccountResult = {
  exist: boolean
  chatId: string
  fromCache: boolean
}

export type SendMessageResponse = {
  idMessage: string
}

export type DeleteNotificationResponse = {
  result: boolean
  reason?: string
}

export type SenderData = {
  chatId: string
  chatName?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderType?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export type MessageData = {
  typeMessage: string
  textMessageData?: {
    textMessage: string
  }
}

export type Notification = {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  status?: string
  stateInstance?: InstanceState
  senderData?: SenderData
  messageData?: MessageData
}

export type NotificationEnvelope = {
  receiptId: number
  body: Notification
}
