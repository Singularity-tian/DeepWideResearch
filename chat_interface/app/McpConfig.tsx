'use client'

import React, { useState } from 'react'

export interface McpTool {
  name: string
  enabled: boolean
  description: string
}

export interface McpService {
  name: string
  enabled: boolean
  tools: McpTool[]  // 该服务提供的工具列表，每个工具可以单独开关
}

export interface McpConfigValue {
  services: McpService[]
}

export interface McpConfigProps {
  value: McpConfigValue
  onChange: (value: McpConfigValue) => void
}

export default function McpConfig({ value, onChange }: McpConfigProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleServiceToggle = (index: number) => {
    const newServices = [...value.services]
    const isEnabling = !newServices[index].enabled
    
    // 如果启用服务，同时启用所有工具；如果禁用服务，同时禁用所有工具
    newServices[index] = { 
      ...newServices[index], 
      enabled: isEnabling,
      tools: newServices[index].tools.map(tool => ({ ...tool, enabled: isEnabling }))
    }
    onChange({ services: newServices })
  }

  const handleToolToggle = (serviceIndex: number, toolIndex: number) => {
    const newServices = [...value.services]
    const service = { ...newServices[serviceIndex] }
    
    // 切换工具状态
    service.tools = service.tools.map((tool, index) => 
      index === toolIndex ? { ...tool, enabled: !tool.enabled } : tool
    )
    
    // 如果有任何工具启用，则服务也应该启用
    service.enabled = service.tools.some(tool => tool.enabled)
    
    newServices[serviceIndex] = service
    onChange({ services: newServices })
  }

  const enabledCount = value.services.reduce((count, service) => 
    count + service.tools.filter(tool => tool.enabled).length, 0
  )

  return (
    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
      {/* MCP Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '52px',
          left: '0',
          width: '240px',
          background: 'linear-gradient(135deg, rgba(25,25,25,0.98) 0%, rgba(15,15,15,0.98) 100%)',
          border: '1px solid #2a2a2a',
          borderRadius: '14px',
          boxShadow: isOpen 
            ? '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)' 
            : '0 4px 12px rgba(0,0,0,0.3)',
          overflow: 'visible',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
          transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          pointerEvents: isOpen ? 'auto' : 'none',
          backdropFilter: 'blur(12px)',
          zIndex: 10
        }}
        aria-hidden={!isOpen}
      >
        <div style={{ padding: '14px' }}>
          {/* Header */}
          <div style={{ 
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #2a2a2a'
          }}>
            <div style={{ 
              fontSize: '10px', 
              color: '#888', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px'
            }}>
              Default MCP Servers
            </div>
          </div>

          {/* MCP Services */}
          {value.services.map((service, serviceIndex) => (
            <div key={service.name} style={{ marginBottom: serviceIndex < value.services.length - 1 ? '16px' : '0' }}>
              {/* Service Header */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px', 
                color: '#888', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px',
                paddingLeft: '4px',
                fontWeight: '600'
              }}>
                {/* Service Logo */}
                <img 
                  src={service.name === 'Tavily' ? '/tavilylogo.png' : '/exalogo.png'}
                  alt={`${service.name} logo`}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    objectFit: 'contain'
                  }}
                />
                {service.name}
              </div>
              
              {/* Tools List */}
              {service.tools.map((tool, toolIndex) => (
                <div
                  key={tool.name}
                  style={{
                    marginBottom: toolIndex < service.tools.length - 1 ? '4px' : '0',
                    height: '28px',
                    padding: '0 10px',
                    background: tool.enabled ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    border: `1px solid ${tool.enabled ? '#3a3a3a' : 'transparent'}`,
                    borderRadius: '6px',
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  onClick={() => handleToolToggle(serviceIndex, toolIndex)}
                >
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: tool.enabled ? '#e6e6e6' : '#888',
                    flex: 1
                  }}>
                    {tool.name}
                  </div>
                  {/* Checkmark Icon */}
                  {tool.enabled && (
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      style={{ flexShrink: 0 }}
                    >
                      <path 
                        d="M5 13l4 4L19 7" 
                        stroke="#4ade80" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          ))}
          
          {/* Add Custom MCP Button */}
          <div style={{
            marginTop: '12px',
            padding: '8px 10px',
            border: '1px dashed #3a3a3a',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'not-allowed',
            opacity: 0.5,
            transition: 'all 150ms ease'
          }}>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              style={{ flexShrink: 0 }}
            >
              <path 
                d="M12 5v14M5 12h14" 
                stroke="#888" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ 
              fontSize: '11px', 
              color: '#888',
              fontWeight: '500'
            }}>
              Add Custom MCP
            </div>
          </div>
        </div>
      </div>

      {/* MCP Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="MCP Configuration"
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          borderRadius: '20px',
          border: isOpen 
            ? '2px solid #4a4a4a' 
            : '1px solid #2a2a2a',
          background: isOpen 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)' 
            : 'rgba(20, 20, 20, 0.9)',
          color: isOpen ? '#e6e6e6' : '#bbb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isOpen 
            ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)' 
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 200ms ease',
          transform: isOpen ? 'scale(1.05)' : 'scale(1)',
          backdropFilter: 'blur(8px)',
          padding: 0,
          margin: 0,
          zIndex: 11
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#3a3a3a'
            e.currentTarget.style.color = '#e6e6e6'
            e.currentTarget.style.transform = 'scale(1.08)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = '#2a2a2a'
            e.currentTarget.style.color = '#bbb'
            e.currentTarget.style.transform = 'scale(1)'
          }
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {enabledCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#4ade80',
            border: '2px solid rgba(20, 20, 20, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: '700',
            color: '#0a0a0a'
          }}>
            {enabledCount}
          </div>
        )}
      </button>
    </div>
  )
}
