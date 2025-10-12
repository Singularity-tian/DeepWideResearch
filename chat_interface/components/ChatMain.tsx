'use client'

import ChatInterface, { ChatInterfaceProps } from './component/ChatInterface'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ChatMainProps extends Omit<ChatInterfaceProps, 'variant'> {}

export default function ChatMain(props: ChatMainProps) {
  return (
    <ChatInterface {...props} variant="main" />
  )
}


