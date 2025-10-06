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
  title?: string
}

export default function DeepWideGrid({
  value,
  onChange,
  cellSize = 24,
  innerBorder = 1,
  outerBorder = 1,
  title
}: DeepWideGridProps) {
  const step = 0.25

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
  const gridWidth = gridCols * cellSize + (gridCols - 1) * innerBorder + 2 * outerBorder
  const gridHeight = gridRows * cellSize + (gridRows - 1) * innerBorder + 2 * outerBorder

  // Dot is one step right/down from selected intersection. Clamp to grid border for max.
  const dotColIndex = Math.min(gridCols, selectedColIndex + 1)
  const dotRowIndex = Math.min(gridRows, selectedRowIndex + 1)

  const positionForCol = (j: number) => (
    j < gridCols
      ? outerBorder + j * (cellSize + innerBorder)
      : outerBorder + gridCols * cellSize + (gridCols - 1) * innerBorder
  )
  const positionForRow = (i: number) => (
    i < gridRows
      ? outerBorder + i * (cellSize + innerBorder)
      : outerBorder + gridRows * cellSize + (gridRows - 1) * innerBorder
  )

  const selectedDotLeft = positionForCol(dotColIndex)
  const selectedDotTop = positionForRow(dotRowIndex)

  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null)

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: 'flex-start'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#bbb',
    letterSpacing: '0.4px',
    userSelect: 'none'
  }

  const gridWrapperStyle: React.CSSProperties = {
    position: 'relative',
    width: `${gridWidth}px`,
    height: `${gridHeight}px`,
    border: `${outerBorder}px solid #2a2a2a`,
    borderRadius: '6px',
    boxSizing: 'content-box',
    overflow: 'visible',
    background: 'transparent'
  }

  const gridStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${outerBorder}px`,
    left: `${outerBorder}px`,
    display: 'grid',
    gridTemplateColumns: `repeat(${gridCols}, ${cellSize}px)`,
    gridAutoRows: `${cellSize}px`,
    gap: `${innerBorder}px`
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
    left: `${selectedDotLeft - 3}px`,
    top: `${selectedDotTop - 3}px`,
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#4a90e2',
    boxShadow: '0 0 0 1px rgba(74,144,226,0.9), 0 2px 6px rgba(0,0,0,0.5)',
    pointerEvents: 'none'
  }

  const tooltipVisible = hoverCell && hoverCell.row === selectedRowIndex && hoverCell.col === selectedColIndex
  const displayWide = Math.min(1, clamped.wide + step)
  const displayDeep = Math.min(1, clamped.deep + step)
  const tooltipText = `W ${displayWide.toFixed(2)} • D ${displayDeep.toFixed(2)} • A ${(displayWide * displayDeep).toFixed(2)}`
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${selectedDotLeft + 8}px`,
    top: `${selectedDotTop - 24}px`,
    background: '#1f1f1f',
    color: '#ddd',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    padding: '4px 6px',
    fontSize: '10px',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: tooltipVisible ? 'block' : 'none'
  }

  return (
    <div style={containerStyle}>
      {title && <div style={titleStyle}>{title}</div>}
      <div style={gridWrapperStyle}>
        <div style={gridStyle}>
          {renderCells()}
        </div>
        <div style={dotStyle} />
        <div style={tooltipStyle}>{tooltipText}</div>
      </div>
    </div>
  )
}


