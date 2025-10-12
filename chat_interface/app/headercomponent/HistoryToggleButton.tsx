import React from 'react'

interface HistoryToggleButtonProps {
  isOpen: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function HistoryToggleButton({ isOpen, onClick }: HistoryToggleButtonProps) {
  return (
    <button
      data-sidebar-toggle
      onClick={onClick}
      title={isOpen ? "Close history" : "Open history"}
      style={{
        position: 'relative',
        width: '36px',
        height: '36px',
        borderRadius: '18px',
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
        margin: 0
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 -4H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

