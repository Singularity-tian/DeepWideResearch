'use client'

import React, { useState } from 'react'

export interface DeepWideValue {
  deep: number
  wide: number
}

export interface DeepWideGridProps {
  value: DeepWideValue
  onChange: (value: DeepWideValue) => void
  cellSize?: number
  innerBorder?: number
  outerBorder?: number
  outerPadding?: number
  title?: string
}

export default function DeepWideGrid({
  value,
  onChange,
  cellSize = 24,
  innerBorder = 1,
  outerBorder = 1,
  outerPadding = 4,
  title
}: DeepWideGridProps) {
  const step = 0.25
  const frameOffset = outerBorder + outerPadding
  const gridCols = 4
  const gridRows = 4
  
  // 提取重复计算
  const gridInnerWidth = gridCols * cellSize + (gridCols - 1) * innerBorder
  const gridInnerHeight = gridRows * cellSize + (gridRows - 1) * innerBorder
  const gridWidth = gridInnerWidth + 2 * frameOffset
  const gridHeight = gridInnerHeight + 2 * frameOffset

  // 限制值范围并计算选中的格子
  const clampedDeep = Math.max(0, Math.min(1, value.deep))
  const clampedWide = Math.max(0, Math.min(1, value.wide))
  const selectedRowIndex = Math.max(0, Math.min(3, Math.round(clampedDeep / step) - 1))
  const selectedColIndex = Math.max(0, Math.min(3, Math.round(clampedWide / step) - 1))

  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'stretch',
    position: 'relative',
    width: '100%'
  }

  const headerTitleStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    userSelect: 'none',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #2a2a2a',
    width: '100%'
  }

  const gridWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: `${gridWidth}px`,
    height: `${gridHeight}px`,
    border: `${outerBorder}px solid #2a2a2a`,
    borderRadius: '8px',
    boxSizing: 'content-box',
    overflow: 'visible',
    background: 'rgba(10, 10, 10, 0.6)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.05)',
    marginTop: '26px',
    marginLeft: '40px'
  }

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${frameOffset}px`,
    left: `${frameOffset}px`,
    display: 'grid',
    gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
    gridAutoRows: `${cellSize}px`,
    gap: `${innerBorder}px`
  }

  // Axis labels
  const axisLabelStyle: React.CSSProperties = {
    position: 'absolute',
    color: '#888',
    fontSize: '9px',
    fontWeight: '600',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    userSelect: 'none'
  }

  const cellBaseStyle: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    backgroundColor: '#141414',
    transition: 'background-color 120ms ease',
    cursor: 'pointer',
    position: 'relative'
  }

  const dotStyle: React.CSSProperties = {
    position: 'absolute',
    right: '-3px',
    bottom: '-3px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#e6e6e6',
    boxShadow: '0 0 0 1px rgba(200,200,200,0.9), 0 2px 6px rgba(0,0,0,0.35)',
    pointerEvents: 'none'
  }

  // 优化：使用函数式方式生成格子
  const renderCells = () => 
    Array.from({ length: gridRows }, (_, row) =>
      Array.from({ length: gridCols }, (_, col) => {
        const covered = (col + 1) * step <= clampedWide && (row + 1) * step <= clampedDeep
        const isHover = hoverCell?.row === row && hoverCell?.col === col
        const isSelected = row === selectedRowIndex && col === selectedColIndex
        const backgroundColor = covered 
          ? (isHover ? 'rgba(74, 144, 226, 0.28)' : 'rgba(74, 144, 226, 0.18)')
          : (isHover ? '#1b1b1b' : '#141414')

        return (
          <div
            key={`${row}-${col}`}
            role="button"
            aria-label={`Set Wide ${((col + 1) * step).toFixed(2)}, Deep ${((row + 1) * step).toFixed(2)}`}
            aria-pressed={covered}
            onClick={() => onChange({ deep: (row + 1) * step, wide: (col + 1) * step })}
            onMouseEnter={() => setHoverCell({ row, col })}
            onMouseLeave={() => setHoverCell(null)}
            style={{ ...cellBaseStyle, backgroundColor }}
          >
            {isSelected && <div style={dotStyle} />}
          </div>
        )
      })
    ).flat()

  // 显示值和工具提示
  const displayWide = clampedWide
  const displayDeep = clampedDeep
  const tooltipVisible = hoverCell?.row === selectedRowIndex && hoverCell?.col === selectedColIndex
  
  // 简化tooltip位置计算 - 基于选中格子位置
  const selectedCellLeft = frameOffset + selectedColIndex * (cellSize + innerBorder)
  const selectedCellTop = frameOffset + selectedRowIndex * (cellSize + innerBorder)
  
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${selectedCellLeft + cellSize + 10}px`,
    top: `${selectedCellTop - 28}px`,
    background: 'rgba(20, 20, 20, 0.98)',
    color: '#e6e6e6',
    border: '1px solid #3a3a3a',
    borderRadius: '6px',
    padding: '5px 9px',
    fontSize: '10px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
    display: tooltipVisible ? 'block' : 'none',
    backdropFilter: 'blur(8px)'
  }

  // 提取重复的样式对象
  const valueDisplayStyle: React.CSSProperties = {
    marginBottom: '12px',
    padding: '7px 10px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid #2a2a2a',
    borderRadius: '7px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box'
  }

  const valueLabelStyle: React.CSSProperties = {
    fontSize: '8px', 
    color: '#888', 
    marginBottom: '2px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px'
  }

  const valueNumberStyle: React.CSSProperties = {
    fontSize: '12px', 
    fontWeight: '600', 
    color: '#e6e6e6'
  }

  return (
    <div style={containerStyle}>
      {/* Header Title */}
      <div style={headerTitleStyle}>Deep × Wide Settings</div>
      
      {/* Value Display */}
      <div style={valueDisplayStyle}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={valueLabelStyle}>Wide</div>
            <div style={valueNumberStyle}>{displayWide.toFixed(2)}</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: '#3a3a3a' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={valueLabelStyle}>Deep</div>
            <div style={valueNumberStyle}>{displayDeep.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={gridWrapperStyle}>
        {/* Axis labels */}
        <div style={{ 
          ...axisLabelStyle, 
          top: '-22px', 
          left: `${frameOffset}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: `${gridInnerWidth}px`
        }}>
          <span style={{ flexShrink: 0 }}>wide</span>
          <svg width={gridInnerWidth - 32} height="8" viewBox={`0 0 ${gridInnerWidth - 32} 8`} fill="none" style={{ marginTop: '1px' }}>
            <path d={`M0 4H${gridInnerWidth - 38}M${gridInnerWidth - 38} 4L${gridInnerWidth - 41} 1M${gridInnerWidth - 38} 4L${gridInnerWidth - 41} 7`} stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ 
          ...axisLabelStyle, 
          top: `${frameOffset}px`, 
          left: '-36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          height: `${gridInnerHeight}px`
        }}>
          <span style={{ flexShrink: 0 }}>deep</span>
          <svg width="8" height={gridInnerHeight - 32} viewBox={`0 0 8 ${gridInnerHeight - 32}`} fill="none">
            <path d={`M4 0V${gridInnerHeight - 38}M4 ${gridInnerHeight - 38}L1 ${gridInnerHeight - 41}M4 ${gridInnerHeight - 38}L7 ${gridInnerHeight - 41}`} stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={gridStyle}>
          {renderCells()}
        </div>
        <div style={tooltipStyle}>{`W ${displayWide.toFixed(2)} • D ${displayDeep.toFixed(2)}`}</div>
      </div>
    </div>
  )
}


