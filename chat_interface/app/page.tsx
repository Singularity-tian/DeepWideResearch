'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import DeepWideGrid from './DeepWideGrid'
import MCPBar from './MCPBar'
 

// 动态导入本地 ChatMain 组件，禁用 SSR 以避免 document 未定义错误
const ChatMain = dynamic(
  () => import('../components/ChatMain'),
  { ssr: false }
)

// 标准消息格式 - 遵循 OpenAI 格式
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export default function Home() {
  // 使用标准消息格式保存完整对话历史
  const [messageHistory, setMessageHistory] = useState<ChatMessage[]>([])
  const [researchParams, setResearchParams] = useState<{ deep: number; wide: number }>({ deep: 0.5, wide: 0.5 })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
  

  const handleSendMessage = async (message: string) => {
    try {
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
        history: messageHistory  // 发送完整的对话历史（包含 role 和 content）
      }

      // 打印调试信息
      console.log('🚀 Sending request to backend:')
      console.log('📝 Query:', message)
      console.log('📊 Deep/Wide params:', requestData.message.deepwide)
      console.log('🔧 MCP services:', requestData.message.mcp)
      console.log('📜 History length:', messageHistory.length)
      console.log('📦 Complete request data:', JSON.stringify(requestData, null, 2))

      // 调用后端 Python API - 使用新的消息格式
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

      const data = await response.json()
      const botResponse = data.response || 'No response received'
      
      // 更新消息历史 - 保存用户消息和助手回复
      setMessageHistory([
        ...messageHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: botResponse }
      ])
      
      // 返回研究结果
      return botResponse
      
    } catch (error) {
      console.error('Error calling research API:', error)
      const errorMessage = `❌ Error: ${error instanceof Error ? error.message : 'Failed to connect to research API. Please make sure the backend server is running on http://localhost:8000'}`
      
      // 即使出错也要保存到历史记录
      setMessageHistory([
        ...messageHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: errorMessage }
      ])
      
      return errorMessage
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'flex-end',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 120, 120, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(120, 120, 120, 0.1) 0%, transparent 50%)',
      minHeight: '100vh'
    }}>
      <div style={{ height: '95%', display: 'flex', alignItems: 'flex-end' }}>
        <ChatMain
          onSendMessage={handleSendMessage}
          title="Deep Wide Research"
          placeholder="Ask anything about your research topic..."
          welcomeMessage="Welcome to Deep & Wide Research! I'm your AI research assistant ready to conduct comprehensive research and provide detailed insights. What would you like to explore today?"
          width="900px"
          height="100%"
        recommendedQuestions={[
          "What are the key differences between Databricks and Snowflake?",
          "Explain quantum computing and its applications",
          "What are the latest trends in AI research?",
        ]}
        showHeader={true}
        showHeaderIcon={true}
        headerIcon="/SimpleDWlogo.svg"
        headerIconSize={40}
        backgroundColor="transparent"
        borderWidth={3}
        showAvatar={false}
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
  )
}
