'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import DeepWideGrid from './DeepWideGrid'
 

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
  

  const handleSendMessage = async (message: string) => {
    try {
      // 调用后端 Python API - 使用新的消息格式
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            query: message,
            deep: researchParams.deep,
            wide: researchParams.wide
          },
          history: messageHistory  // 发送完整的对话历史（包含 role 和 content）
        }),
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
      padding: '20px'
    }}>
      <div style={{ height: '95%', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
        {/* 左侧内联设置抽屉（与输入框对齐底部） */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Research Settings"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              border: '1px solid #2a2a2a',
              background: '#141414',
              color: '#bbb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M19 12C19 12.34 18.97 12.67 18.91 12.99L21 14.5L19.5 17L17.12 16.53C16.7 16.87 16.22 17.15 15.7 17.35L15.4 20H12.6L12.3 17.35C11.78 17.15 11.3 16.87 10.88 16.53L8.5 17L7 14.5L9.09 12.99C9.03 12.67 9 12.34 9 12C9 11.66 9.03 11.33 9.09 11.01L7 9.5L8.5 7L10.88 7.47C11.3 7.13 11.78 6.85 12.3 6.65L12.6 4H15.4L15.7 6.65C16.22 6.85 16.7 7.13 17.12 7.47L19.5 7L21 9.5L18.91 11.01C18.97 11.33 19 11.66 19 12Z" stroke="currentColor" strokeWidth="1.6"/>
            </svg>
          </button>
          <div style={{
            width: isSettingsOpen ? '240px' : '0px',
            overflow: 'hidden',
            transition: 'width 200ms ease',
            marginLeft: '12px',
            background: 'rgba(20,20,20,0.95)',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
          }}>
            {isSettingsOpen && (
              <div style={{ padding: '12px' }}>
                <DeepWideGrid
                  value={researchParams}
                  onChange={setResearchParams}
                  title="Deep × Wide"
                />
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#bbb' }}>
                  {(() => {
                    const step = 0.25
                    const w = Math.min(1, researchParams.wide + step)
                    const d = Math.min(1, researchParams.deep + step)
                    return `W ${w.toFixed(2)} · D ${d.toFixed(2)} · A ${(w * d).toFixed(2)}`
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
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
        />
      </div>
    </div>
  )
}
