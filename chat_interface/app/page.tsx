'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import DeepWideGrid from './DeepWideGrid'
import MCPBar from './MCPBar'
import HistoryToggleButton from './headercomponent/HistoryToggleButton'
import NewChatButton from './headercomponent/NewChatButton'
import SessionsOverlay from './headercomponent/SessionsOverlay'
import { useSession } from './context/SessionContext'
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
  // 🎯 使用 SessionContext（包含会话列表、消息历史等）
  const {
    sessions,
    chatHistory,
    currentSessionId,
    tempSessionId,
    isLoading: isLoadingSessions,
    isLoadingChat,
    createSession,
    createTempSession,
    promoteTempSession,
    switchSession,
    deleteSession,
    addMessage,
    updateMessages,
    getCurrentMessages,
    saveSessionToBackend
  } = useSession()

  // UI 状态
  const [researchParams, setResearchParams] = useState<{ deep: number; wide: number }>({ deep: 0.5, wide: 0.5 })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [showCreateSuccess, setShowCreateSuccess] = useState(false)
  
  // 🔑 用于 ChatMain 组件的稳定 key，避免在临时会话提升时重新挂载组件
  const [chatComponentKey, setChatComponentKey] = useState<string>('default')
  
  // 当 currentSessionId 改变时更新 chatComponentKey（但排除临时会话提升的情况）
  const previousSessionIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    const prev = previousSessionIdRef.current
    const current = currentSessionId
    
    // 如果是从临时会话切换到正式会话（提升），保持 key 不变
    const isTempPromotion = prev?.startsWith('temp-') && current && !current.startsWith('temp-')
    
    if (!isTempPromotion && current !== prev && current) {
      // 正常的会话切换，更新 key
      console.log('🔑 Updating chatComponentKey from', prev, 'to', current)
      setChatComponentKey(current)
    }
    
    previousSessionIdRef.current = current
  }, [currentSessionId])
  
  // 追踪 currentSessionId 变化
  React.useEffect(() => {
    console.log('📌 currentSessionId changed to:', currentSessionId)
  }, [currentSessionId])

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

  // 将 Context 中的消息映射为 UI 消息
  const uiMessages: UIMessage[] = React.useMemo(() => {
    // 直接从 chatHistory 获取当前会话的消息，避免 getCurrentMessages 的异步问题
    const currentMessages = currentSessionId ? (chatHistory[currentSessionId] || []) : []
    console.log('🔄 uiMessages recalculating, currentSessionId:', currentSessionId, 'messages:', currentMessages.length)
    const result = currentMessages.map((m, idx) => ({
      id: `${m.timestamp ?? idx}-${idx}`,
      content: m.content,
      sender: (m.role === 'assistant' ? 'bot' : 'user') as 'bot' | 'user',
      timestamp: new Date(m.timestamp ?? Date.now())
    }))
    console.log('✅ uiMessages result:', result.length, 'messages')
    return result
  }, [chatHistory, currentSessionId]) // 依赖 chatHistory 和 currentSessionId

  // 处理新建会话
  const handleCreateNewChat = async () => {
    if (isCreatingSession) return
    setIsCreatingSession(true)
    try {
      // 如果已经有临时会话，切换到它；否则创建新的临时会话
      if (tempSessionId) {
        await switchSession(tempSessionId)
      } else {
        createTempSession()
      }
      setIsSidebarMenuOpen(false)
      // 显示成功反馈
      setShowCreateSuccess(true)
      setTimeout(() => setShowCreateSuccess(false), 2000)
    } finally {
      setIsCreatingSession(false)
    }
  }

  // 处理会话切换（使用 Context 的缓存机制）
  const handleSessionClick = async (id: string) => {
    try {
      await switchSession(id) // ✅ 使用 Context 的 switchSession，自动处理缓存
      setIsSidebarMenuOpen(false)
    } catch (e) {
      console.warn('Failed to switch session:', e)
    }
  }

  // 处理会话删除
  const handleDeleteSession = async (id: string) => {
    try {
      await deleteSession(id) // ✅ 使用 Context 的 deleteSession
    } catch (e) {
      console.warn('Failed to delete session:', e)
    }
  }

  const handleSendMessage = async (message: string, onStreamUpdate?: (content: string, isStreaming?: boolean) => void) => {
    // 🔒 关键：在函数开始时锁定当前的sessionId，防止切换会话导致的状态混乱
    let targetSessionId = currentSessionId
    
    // 📝 在提升临时会话之前，先保存临时会话的消息
    let messagesBeforePromotion: ChatMessage[] = []
    if (tempSessionId && currentSessionId === tempSessionId) {
      messagesBeforePromotion = chatHistory[tempSessionId] || []
    }
    
    // 如果当前是临时会话，先将其提升为正式会话
    if (tempSessionId && currentSessionId === tempSessionId) {
      console.log('⬆️ Promoting temp session before sending message')
      const firstUserMessage = message.slice(0, 60) // 使用第一条消息的前60个字符作为标题
      targetSessionId = await promoteTempSession(firstUserMessage)
    } else if (!targetSessionId) {
      // 如果没有会话，创建一个新的正式会话
      const firstUserMessage = message.slice(0, 60)
      targetSessionId = await createSession(firstUserMessage)
      await switchSession(targetSessionId)
    }
    
    const userMessage: ChatMessage = { role: 'user', content: message, timestamp: Date.now() }
    
    // 📝 如果刚提升了临时会话，使用提升前保存的消息；否则从 chatHistory 获取
    const currentMessages = messagesBeforePromotion.length > 0 
      ? messagesBeforePromotion 
      : (chatHistory[targetSessionId] || [])
    const localHistoryBefore = [...currentMessages, userMessage]
    
    try {
      // ✅ 立即添加用户消息到 Context（UI 立即更新）
      addMessage(targetSessionId, userMessage)

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

      // 调用streaming API - 使用环境变量或默认本地地址
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/research`, {
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

      // ✅ 添加助手回复到 Context
      const assistantMessage: ChatMessage = { role: 'assistant', content: finalReport || currentStatus, timestamp: Date.now() }
      addMessage(targetSessionId, assistantMessage)
      
      // ✅ 保存到后端
      const completeHistory = [...localHistoryBefore, assistantMessage]
      await saveSessionToBackend(targetSessionId, completeHistory)
      
      // 🔑 如果是从临时会话提升过来的，现在可以安全地更新 chatComponentKey 了
      if (messagesBeforePromotion.length > 0 && targetSessionId !== chatComponentKey) {
        console.log('🔑 Updating chatComponentKey after successful message, from', chatComponentKey, 'to', targetSessionId)
        setChatComponentKey(targetSessionId)
      }
      
      return finalReport || currentStatus
      
    } catch (error) {
      console.error('Error calling research API:', error)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const errorMessage = `❌ Error: ${error instanceof Error ? error.message : `Failed to connect to research API. Please make sure the backend server is running at ${apiUrl}`}`
      
      // ✅ 添加错误消息到 Context
      const errorAssistantMessage: ChatMessage = { role: 'assistant', content: errorMessage, timestamp: Date.now() }
      addMessage(targetSessionId, errorAssistantMessage)
      
      // ✅ 保存到后端
      const completeHistoryWithError = [...localHistoryBefore, errorAssistantMessage]
      await saveSessionToBackend(targetSessionId, completeHistoryWithError).catch(e => 
        console.warn('Failed to save error message:', e)
      )
      
      // 🔑 如果是从临时会话提升过来的，现在可以安全地更新 chatComponentKey 了
      if (messagesBeforePromotion.length > 0 && targetSessionId !== chatComponentKey) {
        console.log('🔑 Updating chatComponentKey after error message, from', chatComponentKey, 'to', targetSessionId)
        setChatComponentKey(targetSessionId)
      }
      
      return errorMessage
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw',
      display: 'flex', 
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      padding: '32px 32px 32px 32px',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 120, 120, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(120, 120, 120, 0.1) 0%, transparent 50%)',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex', 
        alignItems: 'stretch', 
        gap: '16px',
        overflow: 'hidden'
      }}>
        {/* 左侧不再占据 flex 空间，使用 header overlay 呈现会话 */}

        {/* 右侧聊天区域（限制最大宽度为 800px） */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: 0
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '900px', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            overflow: 'hidden',
            minHeight: 0
          }}>
            {/* 顶部控制栏 */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '0 4px', 
              position: 'relative',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HistoryToggleButton
                  isOpen={isSidebarMenuOpen}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsSidebarMenuOpen(prev => !prev)
                  }}
                />

                <NewChatButton
                  isCreating={isCreatingSession}
                  showSuccess={showCreateSuccess}
                  onClick={handleCreateNewChat}
                />

                {/* Overlay panel under the toggle button */}
                <SessionsOverlay
                  isOpen={isSidebarMenuOpen}
                  sidebarWidth={sidebarWidth}
                  sessions={sessions}
                  selectedSessionId={currentSessionId}
                  isLoading={isLoadingSessions}
                  onSessionClick={handleSessionClick}
                  onCreateNew={handleCreateNewChat}
                  onDeleteSession={handleDeleteSession}
                />
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

            {/* ChatMain 包装器 - 填充剩余空间 */}
            <div style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ChatMain
                key={chatComponentKey}
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
                  <HistoryToggleButton
                    isOpen={isSidebarMenuOpen}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsSidebarMenuOpen(prev => !prev)
                    }}
                  />

                  <NewChatButton
                    isCreating={isCreatingSession}
                    showSuccess={showCreateSuccess}
                    onClick={handleCreateNewChat}
                  />

                  {/* Overlay panel under the toggle button */}
                  <SessionsOverlay
                    isOpen={isSidebarMenuOpen}
                    sidebarWidth={sidebarWidth}
                    sessions={sessions}
                    selectedSessionId={currentSessionId}
                    isLoading={isLoadingSessions}
                    onSessionClick={handleSessionClick}
                    onCreateNew={handleCreateNewChat}
                    onDeleteSession={handleDeleteSession}
                  />
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
    </div>
  )
}
