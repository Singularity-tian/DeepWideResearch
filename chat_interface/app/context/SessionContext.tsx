'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Type definitions
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

interface SessionContextType {
  // Lightweight: session metadata for all sessions
  sessions: Session[]
  
  // Heavy: chat history (lazy-loaded cache)
  chatHistory: Record<string, ChatMessage[]>
  
  // Currently selected session
  currentSessionId: string | null
  
  // Temporary session (not yet saved to backend)
  tempSessionId: string | null
  
  // Loading state
  isLoading: boolean
  isLoadingChat: boolean
  
  // Session operations
  fetchSessions: () => Promise<void>
  createSession: (title?: string) => Promise<string>
  createTempSession: () => string
  promoteTempSession: (title?: string) => Promise<string>
  switchSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  
  // Message operations
  addMessage: (sessionId: string, message: ChatMessage) => void
  updateMessages: (sessionId: string, messages: ChatMessage[]) => void
  getCurrentMessages: () => ChatMessage[]
  
  // Save to backend
  saveSessionToBackend: (sessionId: string, messages: ChatMessage[]) => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Lightweight: session list (metadata only)
  const [sessions, setSessions] = useState<Session[]>([])
  
  // Heavy: chat history (lazy-loaded, only store accessed sessions)
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({})
  
  // Currently selected session ID
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // Temporary session ID (not saved to backend)
  const [tempSessionId, setTempSessionId] = useState<string | null>(null)
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  // ==================== API Call Functions ====================
  
  // Fetch all sessions list (lightweight, metadata only)
  const fetchSessions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/history', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e) {
      console.error('Failed to fetch sessions:', e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch detailed messages for a single session (lazy-loaded)
  const fetchSessionMessages = useCallback(async (id: string) => {
    setIsLoadingChat(true)
    try {
      const res = await fetch(`/api/history/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load session messages')
      const data = await res.json()
      return Array.isArray(data.messages) ? data.messages : []
    } catch (e) {
      console.error('Failed to fetch session messages:', e)
      return []
    } finally {
      setIsLoadingChat(false)
    }
  }, [])

  // Create new session (save to backend immediately)
  const createSession = useCallback(async (title = 'New Chat') => {
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: [] })
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json()
      
      // Refresh session list
      await fetchSessions()
      
      // Initialize empty chat history
      setChatHistory(prev => ({
        ...prev,
        [data.id]: []
      }))
      
      return data.id
    } catch (e) {
      console.error('Failed to create session:', e)
      throw e
    }
  }, [fetchSessions])

  // Create temporary session (don't save to backend until user sends the first message)
  const createTempSession = useCallback(() => {
    const tempId = `temp-${Date.now()}`
    console.log('📝 Creating temp session:', tempId)
    
    // Initialize empty chat history
    setChatHistory(prev => ({
      ...prev,
      [tempId]: []
    }))
    
    // Set as temporary session
    setTempSessionId(tempId)
    setCurrentSessionId(tempId)
    
    return tempId
  }, [])

  // Promote temporary session to permanent session (save to backend)
  const promoteTempSession = useCallback(async (title = 'New Chat') => {
    if (!tempSessionId) {
      throw new Error('No temp session to promote')
    }
    
    console.log('⬆️ Promoting temp session to permanent:', tempSessionId)
    
    try {
      // Get messages from temporary session
      const messages = chatHistory[tempSessionId] || []
      
      // Create permanent session
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          messages: messages.map(m => ({ ...m, timestamp: m.timestamp ?? Date.now() }))
        })
      })
      
      if (!res.ok) throw new Error('Failed to promote session')
      const data = await res.json()
      
      // Refresh session list
      await fetchSessions()
      
      // Migrate messages from temporary session to new permanent session
      setChatHistory(prev => {
        const newHistory = { ...prev }
        newHistory[data.id] = messages
        delete newHistory[tempSessionId]
        return newHistory
      })
      
      // Clear temporary session flag
      setTempSessionId(null)
      setCurrentSessionId(data.id)
      
      console.log('✅ Temp session promoted to:', data.id)
      return data.id
    } catch (e) {
      console.error('Failed to promote temp session:', e)
      throw e
    }
  }, [tempSessionId, chatHistory, fetchSessions])

  // Switch session (lazy-loading strategy)
  const switchSession = useCallback(async (id: string) => {
    console.log('🔄 Switching to session:', id)
    setCurrentSessionId(id)
    
    // If switching to non-temporary session, clear temporary session flag and data
    if (!id.startsWith('temp-')) {
      if (tempSessionId) {
        console.log('🗑️ Clearing temp session:', tempSessionId)
        setChatHistory(prev => {
          const newHistory = { ...prev }
          delete newHistory[tempSessionId]
          return newHistory
        })
        setTempSessionId(null)
      }
      
      // Check if messages for this session have already been loaded
      if (!chatHistory[id]) {
        console.log('📥 Loading messages for session:', id)
        const messages = await fetchSessionMessages(id)
        setChatHistory(prev => ({
          ...prev,
          [id]: messages
        }))
        console.log('✅ Loaded', messages.length, 'messages')
      } else {
        console.log('✅ Using cached messages:', chatHistory[id].length)
      }
    }
  }, [chatHistory, fetchSessionMessages, tempSessionId])

  // Delete session (optimistic update, remove from UI immediately)
  const deleteSession = useCallback(async (id: string) => {
    // Save old state for recovery on failure
    const oldSessions = sessions
    const oldCurrentSessionId = currentSessionId
    
    try {
      // 🚀 Optimistic update: remove from UI immediately (don't trigger isLoading)
      const remainingSessions = sessions.filter(s => s.id !== id)
      setSessions(remainingSessions)
      
      // Remove from chatHistory
      setChatHistory(prev => {
        const newHistory = { ...prev }
        delete newHistory[id]
        return newHistory
      })
      
      // If deleting current session, immediately switch to the first one
      if (currentSessionId === id) {
        if (remainingSessions.length > 0) {
          await switchSession(remainingSessions[0].id)
        } else {
          setCurrentSessionId(null)
        }
      }
      
      // Delete in background (non-blocking UI)
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error('Delete failed')
      }
      
      console.log('✅ Session deleted:', id)
    } catch (e) {
      console.error('❌ Failed to delete session, rolling back:', e)
      // Delete failed, restore old state
      setSessions(oldSessions)
      if (oldCurrentSessionId !== currentSessionId) {
        setCurrentSessionId(oldCurrentSessionId)
      }
      throw e
    }
  }, [currentSessionId, sessions, switchSession])

  // ==================== Message Operations ====================
  
  // Add single message to context (real-time sync)
  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setChatHistory(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), message]
    }))
  }, [])

  // Batch update messages (sync after backend returns)
  const updateMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
    setChatHistory(prev => ({
      ...prev,
      [sessionId]: messages
    }))
  }, [])

  // Get messages from current session
  const getCurrentMessages = useCallback(() => {
    if (!currentSessionId) return []
    return chatHistory[currentSessionId] || []
  }, [currentSessionId, chatHistory])

  // Save to backend
  const saveSessionToBackend = useCallback(async (sessionId: string, messages: ChatMessage[]) => {
    try {
      const firstUser = messages.find(m => m.role === 'user')
      const title = firstUser ? (firstUser.content || 'New Chat').slice(0, 60) : 'New Chat'
      
      await fetch(`/api/history/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          messages: messages.map(m => ({ ...m, timestamp: m.timestamp ?? Date.now() }))
        })
      })
      
      // Refresh session list (update updatedAt timestamp)
      await fetchSessions()
    } catch (e) {
      console.warn('Failed to save session to backend:', e)
      throw e
    }
  }, [fetchSessions])

  // ==================== Initialization ====================
  
  useEffect(() => {
    let isMounted = true
    
    const init = async () => {
      try {
        // Load session list
        await fetchSessions()
        
        // Check if component is still mounted
        if (!isMounted) return
        
        // Use setSessions callback to get the latest sessions
        setSessions(currentSessions => {
          if (currentSessions.length === 0) {
            // If no sessions exist, create a temporary session
            console.log('🆕 No sessions found, creating temp session')
            const tempId = `temp-${Date.now()}`
            setChatHistory(prev => ({ ...prev, [tempId]: [] }))
            setTempSessionId(tempId)
            setCurrentSessionId(tempId)
          } else if (!currentSessionId) {
            // If sessions exist but none selected, auto-select the first one
            console.log('📂 Found existing sessions, switching to first')
            switchSession(currentSessions[0].id)
          }
          return currentSessions
        })
      } catch (e) {
        console.error('Failed to initialize sessions:', e)
      }
    }
    
    // Initialize
    init()
    
    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array, execute only once on component mount

  const value: SessionContextType = {
    sessions,
    chatHistory,
    currentSessionId,
    tempSessionId,
    isLoading,
    isLoadingChat,
    fetchSessions,
    createSession,
    createTempSession,
    promoteTempSession,
    switchSession,
    deleteSession,
    addMessage,
    updateMessages,
    getCurrentMessages,
    saveSessionToBackend
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

// Custom Hook for convenient usage
export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

