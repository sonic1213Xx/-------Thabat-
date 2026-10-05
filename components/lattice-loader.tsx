'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import './lattice-loader.css'

type GridSize = 3 | 4
type PatternName = 'arrow' | 'dots' | 'ripple' | 'spiral' | 'orbit' | 'snake' | 'sweep' | 'spin' | 'rain' | 'pulse'
type PatternDefinition = { cells: Array<number | null>; loop: number; scale: number; lit?: number }
type CustomPattern = { cells: Array<number | null>; loop?: number; scale?: number; lit?: number }
type LatticeStatus = 'working' | 'done' | 'error'

type LatticeLoaderProps = {
  label?: string
  doneLabel?: string
  errorLabel?: string
  status?: LatticeStatus
  pattern?: PatternName | CustomPattern
  grid?: GridSize
  shape?: 'square' | 'round'
  color?: string
  doneColor?: string
  errorColor?: string
  cellSize?: number
  gap?: number
  fontSize?: number
  step?: number
  idleOpacity?: number
  glow?: boolean
  glowColor?: string
  showTimer?: boolean
  elapsed?: number
  className?: string
  style?: CSSProperties
}

const PATTERNS: Record<PatternName, Partial<Record<GridSize, PatternDefinition>>> = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
  orbit: {
    3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
    4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 },
  },
  snake: {
    3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
    4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 },
  },
  sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
  spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
  rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
  pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } },
}

const DEFAULT_PATTERN: Record<GridSize, PatternName> = { 3: 'orbit', 4: 'sweep' }
const MARKS: Record<GridSize, Record<'done' | 'error', number[]>> = {
  3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
  4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] },
}

type LoaderStyle = CSSProperties & Record<`--ll-${string}`, string | number>

function resolvePattern(pattern: PatternName | CustomPattern, grid: GridSize): PatternDefinition {
  if (typeof pattern === 'string') {
    return PATTERNS[pattern][grid] ?? PATTERNS[DEFAULT_PATTERN[grid]][grid]!
  }
  const cells = Array.from({ length: grid * grid }, (_, index) => pattern.cells[index] ?? null)
  const max = Math.max(0, ...cells.filter((value): value is number => value !== null))
  return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 }
}

const formatDuration = (deciseconds: number) => deciseconds < 600
  ? `${(deciseconds / 10).toFixed(1)}s`
  : `${Math.floor(deciseconds / 600)}m ${((deciseconds % 600) / 10).toFixed(1)}s`

const spokenDuration = (deciseconds: number) => deciseconds < 600
  ? `${(deciseconds / 10).toFixed(1)} seconds`
  : `${Math.floor(deciseconds / 600)} minutes ${((deciseconds % 600) / 10).toFixed(1)} seconds`

export default function LatticeLoader({
  label = 'Thinking',
  doneLabel = 'Done in',
  errorLabel = 'Failed after',
  status = 'working',
  pattern = 'orbit',
  grid = 3,
  shape = 'round',
  color = 'currentColor',
  doneColor = '#22c55e',
  errorColor = '#ef4444',
  cellSize = 6,
  gap = 2,
  fontSize = 14,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = '',
  showTimer = true,
  elapsed,
  className = '',
  style,
}: LatticeLoaderProps) {
  const gridSize: GridSize = grid === 4 ? 4 : 3
  const resolvedPattern = resolvePattern(pattern, gridSize)
  const marks = MARKS[gridSize]
  const delay = step * resolvedPattern.scale
  const cycle = Math.round(resolvedPattern.loop * delay)
  const timerRef = useRef<HTMLSpanElement>(null)
  const elapsedRef = useRef(0)
  const markRef = useRef<'done' | 'error'>('done')
  const mark = status === 'working' ? markRef.current : status
  markRef.current = mark
  const [announcement, setAnnouncement] = useState(`${label}, in progress`)

  const paint = (deciseconds: number) => {
    elapsedRef.current = deciseconds
    if (timerRef.current) timerRef.current.textContent = formatDuration(deciseconds)
  }

  useLayoutEffect(() => {
    if (elapsed != null) {
      paint(Math.round(elapsed * 10))
      return undefined
    }
    if (status !== 'working') return undefined
    const startedAt = performance.now()
    paint(0)
    const intervalId = window.setInterval(() => paint(Math.floor((performance.now() - startedAt) / 100)), 100)
    return () => window.clearInterval(intervalId)
  }, [status, elapsed])

  useEffect(() => {
    if (status === 'working') setAnnouncement(`${label}, in progress`)
    else setAnnouncement(`${status === 'done' ? doneLabel : errorLabel}${showTimer ? ` ${spokenDuration(elapsedRef.current)}` : ''}`)
  }, [status, label, doneLabel, errorLabel, showTimer])

  const loaderStyle: LoaderStyle = {
    '--ll-n': gridSize,
    '--ll-cell': `${cellSize}px`,
    '--ll-gap': `${gap}px`,
    '--ll-font': `${fontSize}px`,
    '--ll-color': color,
    '--ll-mark': status === 'error' ? errorColor : doneColor,
    '--ll-idle': idleOpacity,
    '--ll-glow': glowColor || color,
    '--ll-mark-glow': glowColor || (status === 'error' ? errorColor : doneColor),
    '--ll-cycle': `${cycle}ms`,
    ...style,
  }

  return (
    <span role="status" className={`lattice-loader${className ? ` ${className}` : ''}`} data-status={status} data-shape={shape} data-glow={glow ? '' : undefined} style={loaderStyle}>
      <span className="lattice-loader__grid" aria-hidden="true">
        <span className="lattice-loader__layer lattice-loader__run">
          {resolvedPattern.cells.map((unit, index) => (
            <span key={index} className="lattice-loader__cell" data-hole={unit === null ? '' : undefined} data-lit={resolvedPattern.lit && resolvedPattern.lit !== 0.62 ? Math.round(resolvedPattern.lit * 100) : undefined} style={unit === null ? undefined : { animationDelay: `${Math.round(unit * delay)}ms` }} />
          ))}
        </span>
        <span className="lattice-loader__layer lattice-loader__mark">
          {resolvedPattern.cells.map((_, index) => <span key={index} className="lattice-loader__cell" data-on={marks[mark].includes(index) ? '' : undefined} />)}
        </span>
      </span>
      <span className="lattice-loader__label" aria-hidden="true">
        <span className="lattice-loader__text" data-active={status === 'working' ? '' : undefined}>{label}</span>
        <span className="lattice-loader__text" data-active={status === 'done' ? '' : undefined}>{doneLabel}</span>
        <span className="lattice-loader__text" data-active={status === 'error' ? '' : undefined}>{errorLabel}</span>
      </span>
      {showTimer && <span ref={timerRef} className="lattice-loader__timer" aria-hidden="true">0.0s</span>}
      <span className="lattice-loader__sr">{announcement}</span>
    </span>
  )
}
