'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

// 类型定义
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
  // 轻量级：所有会话元数据
  sessions: Session[]
  
  // 重量级：聊天记录（懒加载缓存）
  chatHistory: Record<string, ChatMessage[]>
  
  // 当前选中的会话
  currentSessionId: string | null
  
  // 加载状态
  isLoading: boolean
  isLoadingChat: boolean
  
  // 会话操作
  fetchSessions: () => Promise<void>
  createSession: (title?: string) => Promise<string>
  switchSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  
  // 消息操作
  addMessage: (sessionId: string, message: ChatMessage) => void
  updateMessages: (sessionId: string, messages: ChatMessage[]) => void
  getCurrentMessages: () => ChatMessage[]
  
  // 保存到后端
  saveSessionToBackend: (sessionId: string, messages: ChatMessage[]) => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // 轻量级：会话列表（只包含元数据）
  const [sessions, setSessions] = useState<Session[]>([])
  
  // 重量级：聊天记录（懒加载，只存储访问过的）
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({})
  
  // 当前选中的会话ID
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  // ==================== API 调用函数 ====================
  
  // 获取所有会话列表（轻量级，只有元数据）
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

  // 获取单个会话的详细消息（懒加载）
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

  // 创建新会话
  const createSession = useCallback(async (title = 'New Chat') => {
    try {
      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, messages: [] })
      })
      if (!res.ok) throw new Error('Failed to create session')
      const data = await res.json()
      
      // 刷新会话列表
      await fetchSessions()
      
      // 初始化空的聊天记录
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

  // 切换会话（懒加载策略）
  const switchSession = useCallback(async (id: string) => {
    console.log('🔄 Switching to session:', id)
    setCurrentSessionId(id)
    
    // 检查是否已经加载过这个会话的消息
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
  }, [chatHistory, fetchSessionMessages])

  // 删除会话（乐观更新，立即从 UI 移除）
  const deleteSession = useCallback(async (id: string) => {
    // 保存旧状态，以便失败时恢复
    const oldSessions = sessions
    const oldCurrentSessionId = currentSessionId
    
    try {
      // 🚀 乐观更新：立即从 UI 中移除（不触发 isLoading）
      const remainingSessions = sessions.filter(s => s.id !== id)
      setSessions(remainingSessions)
      
      // 从 chatHistory 中移除
      setChatHistory(prev => {
        const newHistory = { ...prev }
        delete newHistory[id]
        return newHistory
      })
      
      // 如果删除的是当前会话，立即切换到第一个
      if (currentSessionId === id) {
        if (remainingSessions.length > 0) {
          await switchSession(remainingSessions[0].id)
        } else {
          setCurrentSessionId(null)
        }
      }
      
      // 后台删除（不阻塞 UI）
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error('Delete failed')
      }
      
      console.log('✅ Session deleted:', id)
    } catch (e) {
      console.error('❌ Failed to delete session, rolling back:', e)
      // 删除失败，恢复旧状态
      setSessions(oldSessions)
      if (oldCurrentSessionId !== currentSessionId) {
        setCurrentSessionId(oldCurrentSessionId)
      }
      throw e
    }
  }, [currentSessionId, sessions, switchSession])

  // ==================== 消息操作 ====================
  
  // 添加单条消息到 context（实时同步）
  const addMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setChatHistory(prev => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] || []), message]
    }))
  }, [])

  // 批量更新消息（用于后端返回后同步）
  const updateMessages = useCallback((sessionId: string, messages: ChatMessage[]) => {
    setChatHistory(prev => ({
      ...prev,
      [sessionId]: messages
    }))
  }, [])

  // 获取当前会话的消息
  const getCurrentMessages = useCallback(() => {
    if (!currentSessionId) return []
    return chatHistory[currentSessionId] || []
  }, [currentSessionId, chatHistory])

  // 保存到后端
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
      
      // 刷新会话列表（更新 updatedAt 时间戳）
      await fetchSessions()
    } catch (e) {
      console.warn('Failed to save session to backend:', e)
      throw e
    }
  }, [fetchSessions])

  // ==================== 初始化 ====================
  
  useEffect(() => {
    const init = async () => {
      try {
        await fetchSessions()
        
        // 如果没有会话，创建一个
        const currentSessions = sessions.length > 0 ? sessions : []
        if (currentSessions.length === 0) {
          const newId = await createSession('New Chat')
          setCurrentSessionId(newId)
        } else {
          // 自动选中第一个会话
          await switchSession(currentSessions[0].id)
        }
      } catch (e) {
        console.error('Failed to initialize sessions:', e)
      }
    }
    
    // 只在第一次加载时初始化
    if (sessions.length === 0 && !currentSessionId) {
      init()
    }
  }, []) // 空依赖数组，只在组件挂载时执行一次

  const value: SessionContextType = {
    sessions,
    chatHistory,
    currentSessionId,
    isLoading,
    isLoadingChat,
    fetchSessions,
    createSession,
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

// 自定义 Hook 方便使用
export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

