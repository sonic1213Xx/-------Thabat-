'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import './pill-nav.css'

export type PillNavItem = {
  id?: string
  label: string
  href?: string
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
}

type PillNavProps = {
  logo?: string
  darkLogo?: string
  logoAlt?: string
  showLogo?: boolean
  items: PillNavItem[]
  activeHref?: string
  activeId?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  onMobileMenuClick?: () => void
  mobileMenuLabel?: string
  ariaLabel?: string
  initialLoadAnimation?: boolean
}

export function PillNav({
  logo,
  darkLogo,
  logoAlt = 'Logo',
  showLogo = true,
  items,
  activeHref,
  activeId,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#047857',
  pillColor = '#f8fafc',
  hoveredPillTextColor = '#ffffff',
  pillTextColor = '#0f172a',
  onMobileMenuClick,
  mobileMenuLabel = 'Toggle navigation',
  ariaLabel = 'Primary navigation',
  initialLoadAnimation = true,
}: PillNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([])
  const timelineRefs = useRef<Array<gsap.core.Timeline | null>>([])
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([])
  const logoImageRef = useRef<HTMLImageElement>(null)
  const logoTweenRef = useRef<gsap.core.Tween | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const navItemsRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLAnchorElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const initialAnimationPlayedRef = useRef(false)

  useEffect(() => {
    const menu = mobileMenuRef.current
    if (menu) gsap.set(menu, { visibility: 'hidden', opacity: 0, scaleY: 1 })
  }, [])

  useEffect(() => {
    let active = true
    const timelines = timelineRefs.current
    const activeTweens = activeTweenRefs.current
    const logoElement = logoRef.current
    const navItemsElement = navItemsRef.current
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return

        const pill = circle.parentElement
        const { width, height } = pill.getBoundingClientRect()
        if (!width || !height) return

        const radius = (width * width / 4 + height * height) / (2 * height)
        const diameter = Math.ceil(2 * radius) + 2
        const delta = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - width * width / 4))) + 1
        const originY = diameter - delta

        circle.style.width = `${diameter}px`
        circle.style.height = `${diameter}px`
        circle.style.bottom = `-${delta}px`
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` })

        const label = pill.querySelector('.pill-nav__label')
        const hoverLabel = pill.querySelector('.pill-nav__label-hover')
        if (label) gsap.set(label, { y: 0 })
        if (hoverLabel) gsap.set(hoverLabel, { y: height + 12, opacity: 0 })

        timelineRefs.current[index]?.kill()
        const timeline = gsap.timeline({ paused: true })
        timeline.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0)
        if (label) timeline.to(label, { y: -(height + 8), duration: 2, ease, overwrite: 'auto' }, 0)
        if (hoverLabel) {
          gsap.set(hoverLabel, { y: Math.ceil(height + 100), opacity: 0 })
          timeline.to(hoverLabel, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0)
        }
        timelineRefs.current[index] = timeline
      })
    }

    layout()
    window.addEventListener('resize', layout)
    if (document.fonts?.ready) void document.fonts.ready.then(() => { if (active) layout() }).catch(() => undefined)

    if (initialLoadAnimation && !initialAnimationPlayedRef.current) {
      initialAnimationPlayedRef.current = true
      if (logoRef.current) {
        gsap.set(logoRef.current, { scale: 0 })
        gsap.to(logoRef.current, { scale: 1, duration: 0.6, ease })
      }
      if (navItemsRef.current) {
        gsap.set(navItemsRef.current, { width: 0, overflow: 'hidden' })
        gsap.to(navItemsRef.current, { width: 'auto', duration: 0.6, ease })
      }
    }

    return () => {
      active = false
      window.removeEventListener('resize', layout)
      timelines.forEach((timeline) => timeline?.kill())
      activeTweens.forEach((tween) => tween?.kill())
      logoTweenRef.current?.kill()
      gsap.killTweensOf([logoElement, navItemsElement])
    }
  }, [ease, initialLoadAnimation, items])

  const handleEnter = (index: number) => {
    const timeline = timelineRefs.current[index]
    if (!timeline) return
    activeTweenRefs.current[index]?.kill()
    activeTweenRefs.current[index] = timeline.tweenTo(timeline.duration(), { duration: 0.3, ease, overwrite: 'auto' })
  }

  const handleLeave = (index: number) => {
    const timeline = timelineRefs.current[index]
    if (!timeline) return
    activeTweenRefs.current[index]?.kill()
    activeTweenRefs.current[index] = timeline.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' })
  }

  const handleLogoEnter = () => {
    if (!logoImageRef.current) return
    logoTweenRef.current?.kill()
    gsap.set(logoImageRef.current, { rotate: 0 })
    logoTweenRef.current = gsap.to(logoImageRef.current, { rotate: 360, duration: 0.2, ease, overwrite: 'auto' })
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    const lines = hamburgerRef.current?.querySelectorAll('.pill-nav__hamburger-line')
    if (lines?.length === 2) {
      gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease })
      gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease })
    }
    const menu = mobileMenuRef.current
    if (menu) {
      gsap.to(menu, { opacity: 0, y: 10, duration: 0.2, ease, transformOrigin: 'top center', onComplete: () => gsap.set(menu, { visibility: 'hidden' }) })
    }
  }

  const toggleMobileMenu = () => {
    if (onMobileMenuClick) {
      onMobileMenuClick()
      return
    }

    const nextOpen = !isMobileMenuOpen
    if (!nextOpen) {
      closeMobileMenu()
      return
    }
    setIsMobileMenuOpen(nextOpen)
    const lines = hamburgerRef.current?.querySelectorAll('.pill-nav__hamburger-line')
    if (lines?.length === 2) {
      gsap.to(lines[0], { rotation: nextOpen ? 45 : 0, y: nextOpen ? 3 : 0, duration: 0.3, ease })
      gsap.to(lines[1], { rotation: nextOpen ? -45 : 0, y: nextOpen ? -3 : 0, duration: 0.3, ease })
    }

    const menu = mobileMenuRef.current
    if (!menu) return
    gsap.set(menu, { visibility: 'visible' })
    gsap.fromTo(menu, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease, transformOrigin: 'top center' })
  }

  const cssVars = {
    '--pill-nav-base': baseColor,
    '--pill-nav-pill': pillColor,
    '--pill-nav-hover-text': hoveredPillTextColor,
    '--pill-nav-text': pillTextColor,
  } as CSSProperties

  return (
    <div ref={rootRef} className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label={ariaLabel} style={cssVars}>
        {showLogo && logo && <Link href="/dashboard" prefetch={false} className="pill-nav__logo" aria-label="Home" onMouseEnter={handleLogoEnter} ref={logoRef}>
          <picture>
            {darkLogo && <source srcSet={darkLogo} media="(prefers-color-scheme: dark)" />}
            <img src={logo} alt={logoAlt} ref={logoImageRef} />
          </picture>
        </Link>}
        <div className="pill-nav__items desktop-only" ref={navItemsRef}>
          <ul className="pill-nav__list" role="menubar">
            {items.map((item, index) => {
              const isActive = item.href ? activeHref === item.href : activeId === item.id
              const content = <>
                <span className="pill-nav__hover-circle" aria-hidden="true" ref={(element) => { circleRefs.current[index] = element }} />
                <span className="pill-nav__label-stack">
                  <span className="pill-nav__label">{item.label}</span>
                  <span className="pill-nav__label-hover" aria-hidden="true">{item.label}</span>
                </span>
              </>

              return (
                <li key={item.id ?? item.href ?? `item-${index}`} role="none">
                  {item.href ? (
                    <Link href={item.href} prefetch={false} role="menuitem" className={`pill-nav__pill${isActive ? ' is-active' : ''}`} aria-label={item.ariaLabel ?? item.label} aria-current={isActive ? 'page' : undefined} onMouseEnter={() => handleEnter(index)} onMouseLeave={() => handleLeave(index)}>
                      {content}
                    </Link>
                  ) : (
                    <button type="button" role="menuitemradio" className={`pill-nav__pill${isActive ? ' is-active' : ''}`} aria-label={item.ariaLabel ?? item.label} aria-checked={isActive} disabled={item.disabled} onClick={item.onClick} onMouseEnter={() => handleEnter(index)} onMouseLeave={() => handleLeave(index)}>
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
        <button
          type="button"
          className="pill-nav__mobile-button mobile-only"
          onClick={toggleMobileMenu}
          aria-label={mobileMenuLabel}
          aria-expanded={onMobileMenuClick ? undefined : isMobileMenuOpen}
          aria-controls={onMobileMenuClick ? 'dashboard-sidebar' : 'pill-nav-mobile-menu'}
          ref={hamburgerRef}
        >
          <span className="pill-nav__hamburger-line" />
          <span className="pill-nav__hamburger-line" />
        </button>
      </nav>
      {!onMobileMenuClick && <div id="pill-nav-mobile-menu" className="pill-nav__mobile-menu mobile-only" ref={mobileMenuRef} style={cssVars}>
        <ul className="pill-nav__mobile-list">
          {items.map((item, index) => {
            const isActive = item.href ? activeHref === item.href : activeId === item.id
            return <li key={item.id ?? item.href ?? `mobile-item-${index}`}>
              {item.href ? (
                <Link href={item.href} prefetch={false} className={`pill-nav__mobile-link${isActive ? ' is-active' : ''}`} onClick={closeMobileMenu}>{item.label}</Link>
              ) : (
                <button type="button" className={`pill-nav__mobile-link${isActive ? ' is-active' : ''}`} aria-pressed={isActive} disabled={item.disabled} onClick={() => { closeMobileMenu(); item.onClick?.() }}>{item.label}</button>
              )}
            </li>
          })}
        </ul>
      </div>}
    </div>
  )
}