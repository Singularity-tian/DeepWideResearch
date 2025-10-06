// Message type definition for chat components
export interface Message {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

