'use client'

import React, { useMemo, useState } from 'react'

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

  // Frame offset = visual border + inner padding (kept independent from gap)
  const frameOffset = outerBorder + outerPadding

  const clamped = useMemo(() => ({
    deep: Math.max(0, Math.min(1, value.deep)),
    wide: Math.max(0, Math.min(1, value.wide))
  }), [value.deep, value.wide])

  // Indices for intersections (0..4) based on value inclusive at 1.00
  const selectedRowIndex = useMemo(() => {
    return Math.max(0, Math.min(4, Math.round(clamped.deep / step)))
  }, [clamped.deep])
  const selectedColIndex = useMemo(() => {
    return Math.max(0, Math.min(4, Math.round(clamped.wide / step)))
  }, [clamped.wide])

  const gridCols = 4
  const gridRows = 4
  const gridWidth = gridCols * cellSize + (gridCols - 1) * innerBorder + 2 * frameOffset
  const gridHeight = gridRows * cellSize + (gridRows - 1) * innerBorder + 2 * frameOffset

  // Dot is one step right/down from selected intersection. Clamp to grid border for max.
  const dotColIndex = Math.min(gridCols, selectedColIndex + 1)
  const dotRowIndex = Math.min(gridRows, selectedRowIndex + 1)

  const positionForCol = (j: number) => (
    j < gridCols
      ? frameOffset + j * (cellSize + innerBorder)
      : frameOffset + gridCols * cellSize + (gridCols - 1) * innerBorder
  )
  const positionForRow = (i: number) => (
    i < gridRows
      ? frameOffset + i * (cellSize + innerBorder)
      : frameOffset + gridRows * cellSize + (gridRows - 1) * innerBorder
  )

  const selectedDotLeft = positionForCol(dotColIndex)
  const selectedDotTop = positionForRow(dotRowIndex)

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

  // Coverage includes boundary: cells whose top-left corner is within [0, W] × [0, D]
  const isCovered = (row: number, col: number) => {
    const cellWide = col * step
    const cellDeep = row * step
    return cellWide <= clamped.wide && cellDeep <= clamped.deep
  }

  const cellBaseStyle: React.CSSProperties = {
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    backgroundColor: '#141414',
    transition: 'background-color 120ms ease',
    cursor: 'pointer'
  }

  const renderCells = () => {
    const cells: React.ReactNode[] = []
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const covered = isCovered(row, col)
        const isHover = hoverCell && hoverCell.row === row && hoverCell.col === col
        const bg = covered 
          ? (isHover ? 'rgba(74, 144, 226, 0.28)' : 'rgba(74, 144, 226, 0.18)')
          : (isHover ? '#1b1b1b' : '#141414')
        cells.push(
          <div
            key={`${row}-${col}`}
            role="button"
            aria-label={`Set Wide ${(col * step).toFixed(2)}, Deep ${(row * step).toFixed(2)}`}
            aria-pressed={covered}
            onClick={() => onChange({ deep: row * step, wide: col * step })}
            onMouseEnter={() => setHoverCell({ row, col })}
            onMouseLeave={() => setHoverCell(null)}
            style={{ ...cellBaseStyle, backgroundColor: bg }}
          />
        )
      }
    }
    return cells
  }

  const dotStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${selectedDotLeft - 6}px`,
    top: `${selectedDotTop - 6}px`,
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#e6e6e6',
    boxShadow: '0 0 0 1px rgba(200,200,200,0.9), 0 2px 6px rgba(0,0,0,0.35)',
    pointerEvents: 'none'
  }

  const tooltipVisible = hoverCell && hoverCell.row === selectedRowIndex && hoverCell.col === selectedColIndex
  const displayWide = Math.min(1, clamped.wide + step)
  const displayDeep = Math.min(1, clamped.deep + step)
  const tooltipText = `W ${displayWide.toFixed(2)} • D ${displayDeep.toFixed(2)}`
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${selectedDotLeft + 10}px`,
    top: `${selectedDotTop - 28}px`,
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

  return (
    <div style={containerStyle}>
      {/* Header Title */}
      <div style={headerTitleStyle}>Deep × Wide Settings</div>
      
      {/* Value Display */}
      <div style={{ 
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
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Wide
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#e6e6e6' }}>
              {displayWide.toFixed(2)}
            </div>
          </div>
          <div style={{ 
            width: '1px', 
            height: '24px',
            background: '#3a3a3a'
          }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '8px', color: '#888', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Deep
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#e6e6e6' }}>
              {displayDeep.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div style={gridWrapperStyle}>
        {/* Axis labels */}
        <div style={{ 
          ...axisLabelStyle, 
          top: `${-22}px`, 
          left: `${frameOffset}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: `${gridCols * cellSize + (gridCols - 1) * innerBorder}px`
        }}>
          <span style={{ flexShrink: 0 }}>wide</span>
          <svg width={gridCols * cellSize + (gridCols - 1) * innerBorder - 32} height="8" viewBox={`0 0 ${gridCols * cellSize + (gridCols - 1) * innerBorder - 32} 8`} fill="none" style={{ marginTop: '1px' }}>
            <path d={`M0 4H${gridCols * cellSize + (gridCols - 1) * innerBorder - 38}M${gridCols * cellSize + (gridCols - 1) * innerBorder - 38} 4L${gridCols * cellSize + (gridCols - 1) * innerBorder - 41} 1M${gridCols * cellSize + (gridCols - 1) * innerBorder - 38} 4L${gridCols * cellSize + (gridCols - 1) * innerBorder - 41} 7`} stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ 
          ...axisLabelStyle, 
          top: `${frameOffset}px`, 
          left: `${-36}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          height: `${gridRows * cellSize + (gridRows - 1) * innerBorder}px`
        }}>
          <span style={{ flexShrink: 0 }}>deep</span>
          <svg width="8" height={gridRows * cellSize + (gridRows - 1) * innerBorder - 32} viewBox={`0 0 8 ${gridRows * cellSize + (gridRows - 1) * innerBorder - 32}`} fill="none">
            <path d={`M4 0V${gridRows * cellSize + (gridRows - 1) * innerBorder - 38}M4 ${gridRows * cellSize + (gridRows - 1) * innerBorder - 38}L1 ${gridRows * cellSize + (gridRows - 1) * innerBorder - 41}M4 ${gridRows * cellSize + (gridRows - 1) * innerBorder - 38}L7 ${gridRows * cellSize + (gridRows - 1) * innerBorder - 41}`} stroke="#888" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={gridStyle}>
          {renderCells()}
        </div>
        <div style={dotStyle} />
        <div style={tooltipStyle}>{tooltipText}</div>
      </div>
    </div>
  )
}


