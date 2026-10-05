'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import './branched-menu.css'

export type BranchedMenuItem = {
  value?: string
  label: string
  href?: string
  icon?: LucideIcon
  visible?: boolean
  children?: BranchedMenuItem[]
}

type BranchedMenuProps = {
  items: BranchedMenuItem[]
  defaultOpen?: number | number[]
  defaultActive?: string
  onSelect?: (value: string, item: BranchedMenuItem) => void
  onToggle?: (index: number, open: boolean) => void
  color?: string
  accentColor?: string
  lineColor?: string
  width?: number
  rowHeight?: number
  indent?: number
  trunk?: number
  radius?: number
  lineWidth?: number
  fontSize?: number
  drawDuration?: number
  foldDuration?: number
  className?: string
}

type MenuStyle = CSSProperties & Record<`--bm-${string}`, string | number>

const PAD = 6
const MARK = 16

const toSet = (open: number | number[]) => new Set(Array.isArray(open) ? open : open >= 0 ? [open] : [])

export function BranchedMenu({
  items,
  defaultOpen = 0,
  defaultActive = '',
  onSelect,
  onToggle,
  color = 'hsl(var(--card-foreground))',
  accentColor = 'hsl(var(--primary))',
  lineColor = 'hsl(var(--border))',
  width = 240,
  rowHeight = 40,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 15,
  drawDuration = 400,
  foldDuration = 300,
  className = '',
}: BranchedMenuProps) {
  const [open, setOpen] = useState(() => toSet(defaultOpen))
  const [active, setActive] = useState(() => {
    if (defaultActive) return defaultActive
    const firstOpen = items.find((item, index) => item.children && toSet(defaultOpen).has(index))
    return firstOpen?.children?.[0]?.value ?? firstOpen?.children?.[0]?.label ?? ''
  })
  const navRef = useRef<HTMLDivElement>(null)
  const heads = useRef<Array<HTMLButtonElement | null>>([])
  const markerRef = useRef<HTMLSpanElement>(null)
  const latest = useRef({ onSelect, onToggle })
  latest.current = { onSelect, onToggle }

  const activeSection = items.findIndex((item) => item.children?.some((child) => (child.value ?? child.label) === active))
  const markerShown = activeSection >= 0 && open.has(activeSection)

  useEffect(() => {
    if (!defaultActive) return
    setActive(defaultActive)
    const section = items.findIndex((item) => item.children?.some((child) => (child.value ?? child.label) === defaultActive))
    if (section >= 0) setOpen((current) => current.has(section) ? current : new Set([...current, section]))
  }, [defaultActive, items])

  useLayoutEffect(() => {
    const placeMarker = (glide: boolean) => {
      const marker = markerRef.current
      const head = heads.current[activeSection]
      if (!marker) return
      const visible = markerShown && head
      if (!glide) marker.style.transition = 'none'
      if (visible) marker.style.top = `${head.offsetTop + (head.offsetHeight - MARK) / 2}px`
      marker.toggleAttribute('data-on', Boolean(visible))
      if (!glide) {
        void marker.offsetHeight
        marker.style.transition = ''
      }
    }
    placeMarker(true)

    let firstResize = true
    const observer = new ResizeObserver(() => {
      if (firstResize) {
        firstResize = false
        return
      }
      placeMarker(false)
    })
    if (navRef.current) observer.observe(navRef.current)
    return () => observer.disconnect()
  }, [activeSection, markerShown, items, fontSize, rowHeight])

  const select = (value: string, item: BranchedMenuItem) => {
    setActive(value)
    latest.current.onSelect?.(value, item)
  }

  const toggle = (index: number) => {
    const isOpen = !open.has(index)
    setOpen((current) => {
      const next = new Set(current)
      if (isOpen) next.add(index)
      else next.delete(index)
      return next
    })
    latest.current.onToggle?.(index, isOpen)
  }

  const curve = Math.min(radius, rowHeight / 2 - 2)
  const endX = indent - 8
  const rowY = (index: number) => PAD + index * rowHeight + rowHeight / 2
  const branch = (index: number) => `M ${trunk} ${rowY(index) - curve} A ${curve} ${curve} 0 0 0 ${trunk + curve} ${rowY(index)} H ${endX}`
  const reach = (index: number) => `M ${trunk} 0 V ${rowY(index) - curve} A ${curve} ${curve} 0 0 0 ${trunk + curve} ${rowY(index)} H ${endX}`
  const length = (index: number) => rowY(index) - curve + (Math.PI * curve) / 2 + (endX - trunk - curve)
  const menuStyle: MenuStyle = {
    '--bm-w': `${width}px`,
    '--bm-ink': color,
    '--bm-accent': accentColor,
    '--bm-line': lineColor,
    '--bm-font': `${fontSize}px`,
    '--bm-row': `${rowHeight}px`,
    '--bm-indent': `${indent}px`,
    '--bm-line-w': lineWidth,
    '--bm-draw': `${drawDuration}ms`,
    '--bm-fold': `${foldDuration}ms`,
  }

  return (
    <div ref={navRef} className={`branched-menu${className ? ` ${className}` : ''}`} style={menuStyle}>
      <span ref={markerRef} className="branched-menu__marker" aria-hidden="true" />
      {items.map((item, index) => {
        const children = item.children
        const isOpen = Boolean(children && open.has(index))
        const value = item.value ?? item.label
        const leafActive = !children && value === active

        return (
          <section key={value} className="branched-menu__section" data-open={isOpen ? '' : undefined}>
            {children ? (
              <>
                <button
                  ref={(element) => { heads.current[index] = element }}
                  type="button"
                  className="branched-menu__head"
                  aria-expanded={isOpen}
                  aria-controls={`branched-menu-section-${index}`}
                  onClick={() => toggle(index)}
                >
                  {item.label}
                </button>
                <div id={`branched-menu-section-${index}`} className="branched-menu__body">
                  <div className="branched-menu__fold">
                    <div className="branched-menu__tree" style={{ height: PAD * 2 + children.length * rowHeight }}>
                      <svg className="branched-menu__lines" width={indent} height={PAD * 2 + children.length * rowHeight} aria-hidden="true">
                        <path className="branched-menu__base" d={`M ${trunk} 0 V ${rowY(children.length - 1) - curve}`} />
                        {children.map((child, childIndex) => <path key={child.value ?? child.label} className="branched-menu__base" d={branch(childIndex)} />)}
                        {children.map((child, childIndex) => {
                          const childValue = child.value ?? child.label
                          return (
                            <path
                              key={childValue}
                              className="branched-menu__reach"
                              d={reach(childIndex)}
                              style={{ strokeDasharray: length(childIndex), strokeDashoffset: childValue === active ? 0 : length(childIndex) }}
                            />
                          )
                        })}
                      </svg>
                      {children.map((child) => {
                        const childValue = child.value ?? child.label
                        const selected = childValue === active
                        const Icon = child.icon
                        return (
                          <Link
                            key={childValue}
                            href={child.href ?? '#'}
                            className="branched-menu__item"
                            aria-current={selected ? 'page' : undefined}
                            tabIndex={isOpen ? 0 : -1}
                            onClick={() => select(childValue, child)}
                          >
                            {Icon && <Icon className="branched-menu__icon" aria-hidden="true" />}
                            <span className="branched-menu__label">{child.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href={item.href ?? '#'}
                className="branched-menu__head branched-menu__leaf"
                aria-current={leafActive ? 'page' : undefined}
                onClick={() => select(value, item)}
              >
                {item.label}
              </Link>
            )}
          </section>
        )
      })}
    </div>
  )
}