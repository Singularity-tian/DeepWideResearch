'use client'

import React, { useState } from 'react'

export interface McpService {
  name: string
  enabled: boolean
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
    newServices[index] = { ...newServices[index], enabled: !newServices[index].enabled }
    onChange({ services: newServices })
  }

  const enabledCount = value.services.filter(s => s.enabled).length

  return (
    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
      {/* MCP Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '52px',
          left: '0',
          width: '200px',
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
          {value.services.map((service, index) => (
            <div 
              key={service.name}
              style={{ 
                marginBottom: index < value.services.length - 1 ? '8px' : '0',
                height: '28px',
                padding: '0 10px',
                background: service.enabled ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                border: `1px solid ${service.enabled ? '#3a3a3a' : 'transparent'}`,
                borderRadius: '6px',
                transition: 'all 150ms ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              onClick={() => handleServiceToggle(index)}
            >
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                color: service.enabled ? '#e6e6e6' : '#888',
                flex: 1
              }}>
                {service.name}
              </div>
              {/* Checkmark Icon */}
              {service.enabled && (
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
