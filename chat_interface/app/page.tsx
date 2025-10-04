'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

// 动态导入 ChatMain 组件，禁用 SSR 以避免 document 未定义错误
const ChatMain = dynamic(
  () => import('puppychat').then((mod) => mod.ChatMain),
  { ssr: false }
)

export default function Home() {
  const [messageHistory, setMessageHistory] = useState<string[]>([])

  const handleSendMessage = async (message: string) => {
    try {
      // 调用后端 Python API
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          history: messageHistory
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      // 更新消息历史
      setMessageHistory([...messageHistory, message])
      
      // 返回研究结果
      return data.response || 'No response received'
      
    } catch (error) {
      console.error('Error calling research API:', error)
      return `❌ Error: ${error instanceof Error ? error.message : 'Failed to connect to research API. Please make sure the backend server is running on http://localhost:8000'}`
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      gap: '20px',
      padding: '20px'
    }}>
      {/* Logo 区域 */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '10px'
      }}>
        <Image 
          src="/DWResearch.png" 
          alt="Deep & Wide Research Logo" 
          width={80} 
          height={80}
          priority
        />
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold',
          color: 'white',
          margin: 0
        }}>
          Deep & Wide Research
        </h1>
      </div>

      {/* 聊天界面 */}
      <ChatMain
        onSendMessage={handleSendMessage}
        title="Research Assistant"
        placeholder="Ask anything about your research topic..."
        welcomeMessage="Welcome to Deep & Wide Research! I'm your AI research assistant ready to conduct comprehensive research and provide detailed insights. What would you like to explore today?"
        width="900px"
        height="85%"
        recommendedQuestions={[
          "What are the key differences between Databricks and Snowflake?",
          "Explain quantum computing and its applications",
          "What are the latest trends in AI research?",
        ]}
        showHeader={true}
        backgroundColor="transparent"
        borderWidth={3}
        showAvatar={false}
      />
    </div>
  )
}
