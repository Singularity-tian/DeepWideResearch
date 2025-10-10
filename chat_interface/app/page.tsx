'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import DeepWideGrid from './DeepWideGrid'
import MCPBar from './MCPBar'
import SessionsSidebar from '../components/SessionsSidebar'
import type { Message as UIMessage } from '../components/component/ChatInterface'
 

// 动态导入本地 ChatMain 组件，禁用 SSR 以避免 document 未定义错误
const ChatMain = dynamic(
  () => import('../components/ChatMain'),
  { ssr: false }
)

// 标准消息格式 - 遵循 OpenAI 格式
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export default function Home() {
  // 使用标准消息格式保存完整对话历史
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([])
  const [researchParams, setResearchParams] = useState<{ deep: number; wide: number }>({ deep: 0.5, wide: 0.5 })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: number; updatedAt: number }>>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  
  // 追踪 selectedSessionId 变化
  React.useEffect(() => {
    console.log('📌 selectedSessionId changed to:', selectedSessionId)
  }, [selectedSessionId])
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [showCreateSuccess, setShowCreateSuccess] = useState(false)

  // 添加点击外部关闭设置面板的逻辑
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSettingsOpen) {
        const target = event.target as Element
        const settingsPanel = document.querySelector('[data-settings-panel]')
        const settingsButton = document.querySelector('[data-settings-button]')
        
        if (settingsPanel && settingsButton) {
          const isClickInPanel = settingsPanel.contains(target)
          const isClickOnButton = settingsButton.contains(target)
          
          if (!isClickInPanel && !isClickOnButton) {
            setIsSettingsOpen(false)
          }
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen])
  const [mcpConfig, setMcpConfig] = useState({
    services: [
      { 
        name: 'Tavily', 
        enabled: true, 
        tools: [
          { name: 'tavily-search', enabled: true, description: 'Web search using Tavily' }
        ]
      },
      { 
        name: 'Exa', 
        enabled: true, 
        tools: [
          { name: 'web_search_exa', enabled: true, description: 'AI-powered web search using Exa' }
        ]
      }
    ]
  })

  // 添加调试信息 - 显示当前参数状态
  React.useEffect(() => {
    console.log('📊 Current research params:', researchParams)
  }, [researchParams])

  // 添加调试信息 - 显示当前 MCP 配置状态
  React.useEffect(() => {
    const enabledServices = mcpConfig.services
      .filter(service => service.enabled)
      .map(service => service.name)

    const mcpForBackend = mcpConfig.services.reduce((acc, service) => {
      if (service.enabled) {
        const enabledTools = service.tools
          .filter(tool => tool.enabled)
          .map(tool => tool.name)
        
        if (enabledTools.length > 0) {
          acc[service.name.toLowerCase()] = enabledTools
        }
      }
      return acc
    }, {} as Record<string, string[]>)
    
    console.log('🔧 Current MCP config:', {
      allServices: mcpConfig.services.map(s => ({ 
        name: s.name, 
        enabled: s.enabled,
        tools: s.tools.map(t => ({ name: t.name, enabled: t.enabled }))
      })),
      enabledServices: enabledServices,
      backendFormat: mcpForBackend
    })
  }, [mcpConfig])
  

  // 会话相关 API 帮助函数
  const fetchSessions = async () => {
    const res = await fetch('/api/history', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load sessions')
    const data = await res.json()
    return (data.sessions || []) as Array<{ id: string; title: string; createdAt: number; updatedAt: number }>
  }

  const fetchSession = async (id: string) => {
    const res = await fetch(`/api/history/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to load session')
    const data = await res.json()
    return data as { id: string; title: string; createdAt: number; updatedAt: number; messages: ChatMessage[] }
  }

  const createSession = async (title = 'New Chat') => {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, messages: [] })
    })
    if (!res.ok) throw new Error('Failed to create session')
    const data = await res.json()
    return data as { id: string; title: string }
  }

  const ensureSession = async () => {
    if (selectedSessionId) return selectedSessionId
    const created = await createSession('New Chat')
    setSelectedSessionId(created.id)
    const nextSessions = await fetchSessions()
    setSessions(nextSessions)
    return created.id
  }

  const saveSession = async (messages: ChatMessage[]) => {
    try {
      const id = await ensureSession()
      const firstUser = messages.find(m => m.role === 'user')
      const title = firstUser ? (firstUser.content || 'New Chat').slice(0, 60) : 'New Chat'
      await fetch(`/api/history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          messages: messages.map(m => ({ ...m, timestamp: m.timestamp ?? Date.now() }))
        })
      })
      const nextSessions = await fetchSessions()
      setSessions(nextSessions)
    } catch (e) {
      console.warn('Failed to save session:', e)
    }
  }

  // 初始化加载会话
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoadingSessions(true)
        const list = await fetchSessions()
        setSessions(list)
        if (list.length === 0) {
          const created = await createSession('New Chat')
          setSelectedSessionId(created.id)
          setMessageHistory([])
          const refreshed = await fetchSessions()
          setSessions(refreshed)
        } else {
          const first = list[0]
          setSelectedSessionId(first.id)
          const detail = await fetchSession(first.id)
          setMessageHistory(Array.isArray(detail.messages) ? detail.messages : [])
        }
      } catch (e) {
        console.warn('Failed to initialize sessions:', e)
      } finally {
        setIsLoadingSessions(false)
      }
    }
    init()
  }, [])

  // 侧边栏下拉（overlay）外部点击关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isSidebarMenuOpen) return
      const target = event.target as Element
      const panel = document.querySelector('[data-sidebar-panel]')
      const toggle = document.querySelector('[data-sidebar-toggle]')
      if (panel && toggle) {
        const inPanel = panel.contains(target)
        const onToggle = toggle.contains(target)
        if (!inPanel && !onToggle) {
          setIsSidebarMenuOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSidebarMenuOpen])

  // 将标准历史映射为 UI 消息
  const uiMessages: UIMessage[] = React.useMemo(() => {
    console.log('🔄 uiMessages recalculating, messageHistory length:', messageHistory.length)
    const result = messageHistory.map((m, idx) => ({
      id: `${m.timestamp ?? idx}-${idx}`,
      content: m.content,
      sender: (m.role === 'assistant' ? 'bot' : 'user') as 'bot' | 'user',
      timestamp: new Date(m.timestamp ?? Date.now())
    }))
    console.log('✅ uiMessages result:', result.length, 'messages')
    return result
  }, [messageHistory])

  const handleSendMessage = async (message: string, onStreamUpdate?: (content: string, isStreaming?: boolean) => void) => {
    // 🔒 关键：在函数开始时锁定当前的sessionId，防止切换会话导致的状态混乱
    // 如果没有sessionId，立即创建一个
    let targetSessionId = selectedSessionId
    if (!targetSessionId) {
      const created = await createSession('New Chat')
      targetSessionId = created.id
      setSelectedSessionId(created.id)
      const nextSessions = await fetchSessions()
      setSessions(nextSessions)
    }
    
    const userMessage: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    const localHistoryBefore = [...messageHistory, userMessage]
    
    try {
      // 检查是否是第一条用户消息，如果是，立即更新会话标题
      const isFirstUserMessage = messageHistory.filter(m => m.role === 'user').length === 0
      if (isFirstUserMessage) {
        const newTitle = message.slice(0, 60)
        // 立即更新会话标题
        fetch(`/api/history/${targetSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTitle,
            messages: localHistoryBefore
          })
        }).then(async () => {
          // 更新本地 sessions 状态以立即反映标题变化
          const nextSessions = await fetchSessions()
          setSessions(nextSessions)
        }).catch(e => console.warn('Failed to update title:', e))
      }

      // 构造请求数据
      const requestData = {
        message: {
          query: message,
          deepwide: {
            deep: researchParams.deep,
            wide: researchParams.wide
          },
            mcp: mcpConfig.services.reduce((acc, service) => {
              // 只包含启用的服务和其工具
              if (service.enabled) {
                const enabledTools = service.tools
                  .filter(tool => tool.enabled)
                  .map(tool => tool.name)
                
                if (enabledTools.length > 0) {
                  // 转换为后端期望的格式：{服务名小写: [启用的工具列表]}
                  acc[service.name.toLowerCase()] = enabledTools
                }
              }
              return acc
            }, {} as Record<string, string[]>)
        },
        history: localHistoryBefore  // 发送包含最新用户消息的对话历史
      }

      console.log('🚀 Sending streaming request to backend:', message)

      // 更新 UI 历史（仅当还在查看目标会话时）
      setMessageHistory(prev => [...prev, userMessage])

      // 调用streaming API
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      let currentStatus = ''
      let finalReport = ''

      // 读取streaming响应
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.action === 'complete' && data.final_report) {
                finalReport = data.final_report
                onStreamUpdate?.(finalReport, false) // 标记streaming结束
              } else if (data.message) {
                currentStatus = data.message
                onStreamUpdate?.(currentStatus, true) // 标记正在streaming
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }

      // 🔒 关键修复：构建完整的历史记录，直接保存到目标session
      const assistantMessage: ChatMessage = { role: 'assistant', content: finalReport || currentStatus, timestamp: Date.now() }
      const completeHistory = [...localHistoryBefore, assistantMessage]
      
      // 保存到目标session（targetSessionId在函数开始时已确保存在）
      const firstUser = completeHistory.find(m => m.role === 'user')
      const title = firstUser ? (firstUser.content || 'New Chat').slice(0, 60) : 'New Chat'
      
      await fetch(`/api/history/${targetSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          messages: completeHistory
        })
      })
      
      // 刷新会话列表
      const nextSessions = await fetchSessions()
      setSessions(nextSessions)
      
      // 只有当用户还在查看这个会话时，才更新UI
      setMessageHistory(currentHistory => {
        // 检查当前选中的会话是否是目标会话
        if (selectedSessionId === targetSessionId) {
          return completeHistory
        }
        // 如果已经切换到其他会话，不更新UI
        return currentHistory
      })
      
      return finalReport || currentStatus
      
    } catch (error) {
      console.error('Error calling research API:', error)
      const errorMessage = `❌ Error: ${error instanceof Error ? error.message : 'Failed to connect to research API. Please make sure the backend server is running on http://localhost:8000'}`
      
      // 🔒 关键修复：构建完整的历史记录，直接保存到目标session
      const errorAssistantMessage: ChatMessage = { role: 'assistant', content: errorMessage, timestamp: Date.now() }
      const completeHistoryWithError = [...localHistoryBefore, errorAssistantMessage]
      
      // 保存到目标session（targetSessionId在函数开始时已确保存在）
      const firstUser = completeHistoryWithError.find(m => m.role === 'user')
      const title = firstUser ? (firstUser.content || 'New Chat').slice(0, 60) : 'New Chat'
      
      await fetch(`/api/history/${targetSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          messages: completeHistoryWithError
        })
      }).catch(e => console.warn('Failed to save error message:', e))
      
      // 刷新会话列表
      const nextSessions = await fetchSessions()
      setSessions(nextSessions)
      
      // 只有当用户还在查看这个会话时，才更新UI
      setMessageHistory(currentHistory => {
        if (selectedSessionId === targetSessionId) {
          return completeHistoryWithError
        }
        return currentHistory
      })
      
      return errorMessage
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '32px 32px 32px 32px',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 120, 120, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(120, 120, 120, 0.1) 0%, transparent 50%)',
      minHeight: '100vh'
    }}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'stretch', gap: '16px', width: '100%' }}>
        {/* 左侧不再占据 flex 空间，使用 header overlay 呈现会话 */}

        {/* 右侧聊天区域（限制最大宽度为 800px） */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '900px', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 顶部控制栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  data-sidebar-toggle
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsSidebarMenuOpen(prev => !prev)
                  }}
                  title={isSidebarMenuOpen ? "Close history" : "Open history"}
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '36px',
                    borderRadius: '18px',
                    border: isSidebarMenuOpen 
                      ? '2px solid #4a4a4a' 
                      : '1px solid #2a2a2a',
                    background: isSidebarMenuOpen 
                      ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)' 
                      : 'rgba(20, 20, 20, 0.9)',
                    color: isSidebarMenuOpen ? '#e6e6e6' : '#bbb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: isSidebarMenuOpen 
                      ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                      : '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 200ms ease',
                    transform: isSidebarMenuOpen ? 'scale(1.05)' : 'scale(1)',
                    backdropFilter: 'blur(8px)',
                    padding: 0,
                    margin: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isSidebarMenuOpen) {
                      e.currentTarget.style.borderColor = '#3a3a3a'
                      e.currentTarget.style.color = '#e6e6e6'
                      e.currentTarget.style.transform = 'scale(1.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSidebarMenuOpen) {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                      e.currentTarget.style.color = '#bbb'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 -4H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* 新建对话按钮 */}
                <button
                  onClick={async () => {
                    if (isCreatingSession) return
                    setIsCreatingSession(true)
                    try {
                      const created = await createSession('New Chat')
                      setSelectedSessionId(created.id)
                      setMessageHistory([]) // 清空消息历史，让 ChatMain 显示 welcome message
                      const next = await fetchSessions()
                      setSessions(next)
                      // 显示成功反馈
                      setShowCreateSuccess(true)
                      setTimeout(() => setShowCreateSuccess(false), 2000)
                    } finally {
                      setIsCreatingSession(false)
                    }
                  }}
                  disabled={isCreatingSession}
                  title="New Chat"
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '36px',
                    borderRadius: '18px',
                    border: '1px solid #2a2a2a',
                    background: 'rgba(20, 20, 20, 0.9)',
                    color: '#bbb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isCreatingSession ? 'default' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 200ms ease',
                    backdropFilter: 'blur(8px)',
                    padding: 0,
                    margin: 0,
                    opacity: isCreatingSession ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreatingSession) {
                      e.currentTarget.style.borderColor = '#3a3a3a'
                      e.currentTarget.style.color = '#e6e6e6'
                      e.currentTarget.style.transform = 'scale(1.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCreatingSession) {
                      e.currentTarget.style.borderColor = '#2a2a2a'
                      e.currentTarget.style.color = '#bbb'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  {isCreatingSession ? (
                    <svg style={{ animation: 'spin 1s linear infinite', height: '18px', width: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : showCreateSuccess ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* Overlay panel under the toggle button */}
                <div
                  data-sidebar-panel
                  style={{
                    position: 'absolute',
                    top: '47px',
                    left: '0',
                    width: `${sidebarWidth}px`,
                    maxHeight: '60vh',
                    overflow: 'visible',
                    background: 'linear-gradient(135deg, rgba(25,25,25,0.98) 0%, rgba(15,15,15,0.98) 100%)',
                    border: '1px solid #2a2a2a',
                    borderRadius: '14px',
                    boxShadow: isSidebarMenuOpen 
                      ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' 
                      : '0 4px 12px rgba(0,0,0,0.3)',
                    opacity: isSidebarMenuOpen ? 1 : 0,
                    transform: isSidebarMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                    transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    pointerEvents: isSidebarMenuOpen ? 'auto' : 'none',
                    backdropFilter: 'blur(12px)',
                    zIndex: 50
                  }}
                  aria-hidden={!isSidebarMenuOpen}
                  onClick={(e) => e.stopPropagation()}
                >
                  <SessionsSidebar
                    sessions={sessions}
                    selectedSessionId={selectedSessionId}
                    isLoading={isLoadingSessions}
                    showHeader={false}
                    showNewButton={false}
                    onSessionClick={async (id) => {
                      try {
                        console.log('🔄 Switching to session:', id)
                        setSelectedSessionId(id)
                        const data = await fetchSession(id)
                        console.log('📥 Fetched session data:', data)
                        console.log('📝 Messages count:', data.messages?.length)
                        setMessageHistory(Array.isArray(data.messages) ? data.messages : [])
                        setIsSidebarMenuOpen(false)
                      } catch (e) {
                        console.warn('Failed to switch session:', e)
                      }
                    }}
                    onCreateNew={async () => {
                const created = await createSession('New Chat')
                setSelectedSessionId(created.id)
                setMessageHistory([])
                const next = await fetchSessions()
                setSessions(next)
                      setIsSidebarMenuOpen(false)
                    }}
                    onDeleteSession={async (id) => {
                      try {
                        const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
                        if (!res.ok && res.status !== 204) throw new Error('Delete failed')
                        const next = await fetchSessions()
                        setSessions(next)
                        if (selectedSessionId === id) {
                          const first = next[0]
                          if (first) {
                            setSelectedSessionId(first.id)
                            const detail = await fetchSession(first.id)
                            setMessageHistory(Array.isArray(detail.messages) ? detail.messages : [])
                          } else {
                            setSelectedSessionId(null)
                            setMessageHistory([])
                          }
                        }
                      } catch (e) {
                        console.warn('Failed to delete session:', e)
                      }
                    }}
                  />
                </div>
              </div>

              {/* 中心标题 */}
              <div style={{ 
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                pointerEvents: 'none'
              }}>
                <img 
                  src="/SimpleDWlogo.svg" 
                  alt="Deep Wide Research" 
                  style={{ 
                    width: '32px',
                    height: '32px',
                    objectFit: 'contain',
                    opacity: 0.5
                  }} 
                />
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#666',
                  letterSpacing: '0.3px'
                }}>
                  Deep Wide Research
                </span>
              </div>

              {/* 右侧占位，保持布局平衡 */}
              <div style={{ width: '80px' }}></div>
            </div>

            <ChatMain
          key={selectedSessionId ?? 'default'}
              initialMessages={uiMessages.length > 0 ? uiMessages : undefined}
          onSendMessage={handleSendMessage}
          title="Deep Wide Research"
          placeholder="Ask anything about your research topic..."
          welcomeMessage="Welcome to Deep & Wide Research! I'm your AI research assistant ready to conduct comprehensive research and provide detailed insights. What would you like to explore today?"
          width="100%"
          height="100%"
        recommendedQuestions={[
          "What are the key differences between Databricks and Snowflake?",
          "Explain quantum computing and its applications",
          "What are the latest trends in AI research?",
        ]}
              showHeader={false}
        backgroundColor="transparent"
        borderWidth={3}
        showAvatar={false}
              headerLeft={(
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    data-sidebar-toggle
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsSidebarMenuOpen(prev => !prev)
                    }}
                    title={isSidebarMenuOpen ? "Close history" : "Open history"}
                    style={{
                      position: 'relative',
                      width: '36px',
                      height: '36px',
                      borderRadius: '18px',
                      border: isSidebarMenuOpen 
                        ? '2px solid #4a4a4a' 
                        : '1px solid #2a2a2a',
                      background: isSidebarMenuOpen 
                        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)' 
                        : 'rgba(20, 20, 20, 0.9)',
                      color: isSidebarMenuOpen ? '#e6e6e6' : '#bbb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: isSidebarMenuOpen 
                        ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                        : '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'all 200ms ease',
                      transform: isSidebarMenuOpen ? 'scale(1.05)' : 'scale(1)',
                      backdropFilter: 'blur(8px)',
                      padding: 0,
                      margin: 0
                    }}
                    onMouseEnter={(e) => {
                      if (!isSidebarMenuOpen) {
                        e.currentTarget.style.borderColor = '#3a3a3a'
                        e.currentTarget.style.color = '#e6e6e6'
                        e.currentTarget.style.transform = 'scale(1.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSidebarMenuOpen) {
                        e.currentTarget.style.borderColor = '#2a2a2a'
                        e.currentTarget.style.color = '#bbb'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 -4H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* 新建对话按钮 */}
                  <button
                    onClick={async () => {
                      if (isCreatingSession) return
                      setIsCreatingSession(true)
                      try {
                        const created = await createSession('New Chat')
                        setSelectedSessionId(created.id)
                        setMessageHistory([]) // 清空消息历史，让 ChatMain 显示 welcome message
                        const next = await fetchSessions()
                        setSessions(next)
                        // 显示成功反馈
                        setShowCreateSuccess(true)
                        setTimeout(() => setShowCreateSuccess(false), 2000)
                      } finally {
                        setIsCreatingSession(false)
                      }
                    }}
                    disabled={isCreatingSession}
                    title="New Chat"
                    style={{
                      position: 'relative',
                      width: '36px',
                      height: '36px',
                      borderRadius: '18px',
                      border: '1px solid #2a2a2a',
                      background: 'rgba(20, 20, 20, 0.9)',
                      color: '#bbb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isCreatingSession ? 'default' : 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'all 200ms ease',
                      backdropFilter: 'blur(8px)',
                      padding: 0,
                      margin: 0,
                      opacity: isCreatingSession ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isCreatingSession) {
                        e.currentTarget.style.borderColor = '#3a3a3a'
                        e.currentTarget.style.color = '#e6e6e6'
                        e.currentTarget.style.transform = 'scale(1.08)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCreatingSession) {
                        e.currentTarget.style.borderColor = '#2a2a2a'
                        e.currentTarget.style.color = '#bbb'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    {isCreatingSession ? (
                      <svg style={{ animation: 'spin 1s linear infinite', height: '18px', width: '18px' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : showCreateSuccess ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Overlay panel under the toggle button */}
                  <div
                    data-sidebar-panel
                    style={{
                      position: 'absolute',
                      top: '47px',
                      left: '0',
                      width: `${sidebarWidth}px`,
                      maxHeight: '60vh',
                      overflow: 'visible',
                      background: 'linear-gradient(135deg, rgba(25,25,25,0.98) 0%, rgba(15,15,15,0.98) 100%)',
                      border: '1px solid #2a2a2a',
                      borderRadius: '14px',
                      boxShadow: isSidebarMenuOpen 
                        ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' 
                        : '0 4px 12px rgba(0,0,0,0.3)',
                      opacity: isSidebarMenuOpen ? 1 : 0,
                      transform: isSidebarMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                      transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      pointerEvents: isSidebarMenuOpen ? 'auto' : 'none',
                      backdropFilter: 'blur(12px)',
                      zIndex: 50
                    }}
                    aria-hidden={!isSidebarMenuOpen}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SessionsSidebar
                      sessions={sessions}
                      selectedSessionId={selectedSessionId}
                      isLoading={isLoadingSessions}
                      showHeader={false}
                      showNewButton={false}
                      onSessionClick={async (id) => {
                          try {
                            console.log('🔄 Switching to session (headerLeft):', id)
                            setSelectedSessionId(id)
                            const data = await fetchSession(id)
                            console.log('📥 Fetched session data (headerLeft):', data)
                            console.log('📝 Messages count (headerLeft):', data.messages?.length)
                            setMessageHistory(Array.isArray(data.messages) ? data.messages : [])
                            setIsSidebarMenuOpen(false)
                          } catch (e) {
                            console.warn('Failed to switch session:', e)
                          }
                        }}
                        onCreateNew={async () => {
                          const created = await createSession('New Chat')
                          setSelectedSessionId(created.id)
                          setMessageHistory([])
                          const next = await fetchSessions()
                          setSessions(next)
                          setIsSidebarMenuOpen(false)
                        }}
                        onDeleteSession={async (id) => {
                          try {
                            const res = await fetch(`/api/history/${id}`, { method: 'DELETE' })
                            if (!res.ok && res.status !== 204) throw new Error('Delete failed')
                            const next = await fetchSessions()
                            setSessions(next)
                            if (selectedSessionId === id) {
                              const first = next[0]
                              if (first) {
                                setSelectedSessionId(first.id)
                                const detail = await fetchSession(first.id)
                                setMessageHistory(Array.isArray(detail.messages) ? detail.messages : [])
                              } else {
                                setSelectedSessionId(null)
                                setMessageHistory([])
                              }
                            }
                          } catch (e) {
                            console.warn('Failed to delete session:', e)
                          }
                        }}
                      />
                  </div>
                </div>
              )}
          aboveInput={
            <div 
              style={{ 
                display: 'flex',
                gap: '8px',
                position: 'relative'
              }}
            >
              {/* Deep/Wide Settings */}
              <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                {/* Settings Panel */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '47px',
                    left: '0',
                    width: '195px',
                  background: 'linear-gradient(135deg, rgba(25,25,25,0.98) 0%, rgba(15,15,15,0.98) 100%)',
                  border: '1px solid #2a2a2a',
                  borderRadius: '14px',
                  boxShadow: isSettingsOpen 
                    ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' 
                    : '0 4px 12px rgba(0,0,0,0.3)',
                  overflow: 'visible',
                  opacity: isSettingsOpen ? 1 : 0,
                  transform: isSettingsOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                  transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  pointerEvents: isSettingsOpen ? 'auto' : 'none',
                  backdropFilter: 'blur(12px)',
                  zIndex: 10
                }}
                aria-hidden={!isSettingsOpen}
                onClick={(e) => e.stopPropagation()}
                data-settings-panel
              >
                {/* Grid Content */}
                <div style={{ padding: '14px' }}>
                  <DeepWideGrid
                    value={researchParams}
                    onChange={(newParams) => {
                      console.log('🔄 Page: Updating research params:', newParams)
                      setResearchParams(newParams)
                    }}
                    cellSize={20}
                    innerBorder={2}
                    outerPadding={4}
                  />
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsSettingsOpen(!isSettingsOpen)
                }}
                data-settings-button
                title="Research Settings"
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '18px',
                  border: isSettingsOpen 
                    ? '2px solid #4a4a4a' 
                    : '1px solid #2a2a2a',
                  background: isSettingsOpen 
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)' 
                    : 'rgba(20, 20, 20, 0.9)',
                  color: isSettingsOpen ? '#e6e6e6' : '#bbb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isSettingsOpen 
                    ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
                    : '0 2px 8px rgba(0,0,0,0.3)',
                  transition: 'all 200ms ease',
                  transform: isSettingsOpen ? 'rotate(180deg) scale(1.05)' : 'rotate(0deg) scale(1)',
                  backdropFilter: 'blur(8px)',
                  padding: 0,
                  margin: 0,
                  zIndex: 11
                }}
                onMouseEnter={(e) => {
                  if (!isSettingsOpen) {
                    e.currentTarget.style.borderColor = '#3a3a3a'
                    e.currentTarget.style.color = '#e6e6e6'
                    e.currentTarget.style.transform = 'scale(1.08)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSettingsOpen) {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                    e.currentTarget.style.color = '#bbb'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="6" r="2.5" fill="currentColor"/>
                  <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="14" cy="12" r="2.5" fill="currentColor"/>
                  <path d="M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="10" cy="18" r="2.5" fill="currentColor"/>
                </svg>
              </button>
              </div>

              {/* Separator Line */}
              <div style={{
                width: '1px',
                height: '20px',
                backgroundColor: '#3a3a3a',
                margin: '0 4px',
                alignSelf: 'center'
              }} />

              {/* MCP Services Bar */}
              <MCPBar
                value={mcpConfig}
                onChange={setMcpConfig}
              />
            </div>
          }
        />
          </div>
        </div>
      </div>
    </div>
  )
}
