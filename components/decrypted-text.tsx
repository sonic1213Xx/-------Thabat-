'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'

type RevealDirection = 'start' | 'end' | 'center'
type AnimationTrigger = 'view' | 'hover' | 'inViewHover' | 'click'

type DecryptedTextProps = {
  text?: string
  speed?: number
  maxIterations?: number
  sequential?: boolean
  revealDirection?: RevealDirection
  useOriginalCharsOnly?: boolean
  characters?: string
  className?: string
  parentClassName?: string
  encryptedClassName?: string
  animateOn?: AnimationTrigger
  clickMode?: 'once' | 'toggle'
  singleLine?: boolean
  onComplete?: () => void
}

function getRevealOrder(length: number, direction: RevealDirection) {
  const order = Array.from({ length }, (_, index) => index)
  if (direction === 'end') return order.reverse()
  if (direction !== 'center') return order

  const centerOrder: number[] = []
  const included = new Set<number>()
  const middle = Math.floor(length / 2)
  for (let offset = 0; centerOrder.length < length; offset += 1) {
    const index = offset % 2 === 0 ? middle + offset / 2 : middle - Math.ceil(offset / 2)
    if (index >= 0 && index < length && !included.has(index)) {
      centerOrder.push(index)
      included.add(index)
    }
  }
  return centerOrder
}

export default function DecryptedText({
  text = '',
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'hover',
  clickMode = 'once',
  singleLine = false,
  onComplete,
}: DecryptedTextProps) {
  const textCharacters = useMemo(() => Array.from(text), [text])
  const availableCharacters = useMemo(() => useOriginalCharsOnly
    ? Array.from(new Set(textCharacters.filter((character) => !/\s/.test(character))))
    : Array.from(characters), [characters, textCharacters, useOriginalCharsOnly])
  const revealOrder = useMemo(() => getRevealOrder(textCharacters.length, revealDirection), [revealDirection, textCharacters.length])
  const [displayText, setDisplayText] = useState(() => animateOn === 'view'
    ? textCharacters.map((character, index) => /\s/.test(character) || !availableCharacters.length ? character : availableCharacters[index % availableCharacters.length]).join('')
    : text)
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(() => new Set())
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'click' && animateOn !== 'view')
  const [hasAnimated, setHasAnimated] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'reverse'>('forward')
  const containerRef = useRef<HTMLSpanElement>(null)
  const intervalRef = useRef<number | null>(null)
  const revealedRef = useRef<Set<number>>(new Set())
  const orderRef = useRef<number[]>([])
  const pointerRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const shuffleText = useCallback((revealed: Set<number>) => textCharacters.map((character, index) => {
    if (/\s/.test(character) || revealed.has(index) || !availableCharacters.length) return character
    return availableCharacters[Math.floor(Math.random() * availableCharacters.length)]
  }).join(''), [availableCharacters, textCharacters])

  const startDecrypt = useCallback(() => {
    revealedRef.current = new Set()
    orderRef.current = revealOrder
    pointerRef.current = 0
    setRevealedIndices(new Set())
    setDisplayText(shuffleText(new Set()))
    setDirection('forward')
    setIsDecrypted(false)
    setIsAnimating(true)
  }, [revealOrder, shuffleText, text])

  const startReverse = useCallback(() => {
    const allIndices = new Set(textCharacters.map((_, index) => index))
    revealedRef.current = allIndices
    orderRef.current = revealOrder.slice().reverse()
    pointerRef.current = 0
    setRevealedIndices(allIndices)
    setDisplayText(text)
    setDirection('reverse')
    setIsDecrypted(false)
    setIsAnimating(true)
  }, [revealOrder, text, textCharacters])

  useEffect(() => {
    const startsEncrypted = animateOn === 'click' || animateOn === 'view'
    revealedRef.current = new Set()
    setRevealedIndices(new Set())
    setDisplayText(startsEncrypted ? shuffleText(new Set()) : text)
    setIsAnimating(false)
    setIsDecrypted(!startsEncrypted)
    setHasAnimated(false)
    setDirection('forward')
  }, [animateOn, shuffleText, text])

  useEffect(() => {
    if (!isAnimating) return undefined

    let iteration = 0
    const iterations = Math.max(1, maxIterations)
    const finish = (decrypted: boolean) => {
      setIsAnimating(false)
      setIsDecrypted(decrypted)
      if (decrypted) setDisplayText(text)
      onCompleteRef.current?.()
    }

    intervalRef.current = window.setInterval(() => {
      const current = revealedRef.current
      if (sequential) {
        if (direction === 'forward') {
          if (current.size >= textCharacters.length) {
            finish(true)
            return
          }
          const index = revealOrder[current.size]
          const next = new Set(current)
          if (index !== undefined) next.add(index)
          revealedRef.current = next
          setRevealedIndices(next)
          setDisplayText(shuffleText(next))
          if (next.size >= textCharacters.length) finish(true)
          return
        }

        if (pointerRef.current >= orderRef.current.length) {
          const empty = new Set<number>()
          revealedRef.current = empty
          setRevealedIndices(empty)
          setDisplayText(shuffleText(empty))
          finish(false)
          return
        }
        const next = new Set(current)
        next.delete(orderRef.current[pointerRef.current++])
        revealedRef.current = next
        setRevealedIndices(next)
        setDisplayText(shuffleText(next))
        if (!next.size) finish(false)
        return
      }

      if (direction === 'forward') {
        iteration += 1
        if (iteration >= iterations) finish(true)
        else setDisplayText(shuffleText(current))
        return
      }

      const source = current.size ? current : new Set(textCharacters.map((_, index) => index))
      const next = new Set(source)
      const removeCount = Math.max(1, Math.ceil(textCharacters.length / iterations))
      for (let count = 0; count < removeCount && next.size; count += 1) {
        const indices = Array.from(next)
        next.delete(indices[Math.floor(Math.random() * indices.length)])
      }
      iteration += 1
      if (!next.size || iteration >= iterations) {
        const empty = new Set<number>()
        revealedRef.current = empty
        setRevealedIndices(empty)
        setDisplayText(shuffleText(empty))
        finish(false)
      } else {
        revealedRef.current = next
        setRevealedIndices(next)
        setDisplayText(shuffleText(next))
      }
    }, Math.max(1, speed))

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [direction, isAnimating, maxIterations, revealOrder, sequential, shuffleText, speed, text, textCharacters])

  useEffect(() => {
    if (animateOn !== 'view' && animateOn !== 'inViewHover') return undefined
    if (typeof IntersectionObserver === 'undefined') return undefined

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !hasAnimated) {
        setHasAnimated(true)
        startDecrypt()
      }
    }, { root: null, rootMargin: '0px', threshold: 0.1 })
    const element = containerRef.current
    if (element) observer.observe(element)
    return () => observer.disconnect()
  }, [animateOn, hasAnimated, startDecrypt])

  const handleClick = () => {
    if (animateOn !== 'click' || isAnimating) return
    if (clickMode === 'toggle' && isDecrypted) startReverse()
    else if (!isDecrypted || clickMode === 'toggle') startDecrypt()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (animateOn === 'click' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      handleClick()
    }
  }

  const resetToPlainText = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
    revealedRef.current = new Set()
    setRevealedIndices(new Set())
    setDisplayText(text)
    setIsAnimating(false)
    setIsDecrypted(true)
    setDirection('forward')
  }

  return (
    <motion.span
      ref={containerRef}
      className={parentClassName}
      style={{ display: 'inline-block', whiteSpace: singleLine ? 'nowrap' : 'pre-wrap', fontFamily: 'inherit' }}
      onMouseEnter={animateOn === 'hover' || animateOn === 'inViewHover' ? () => { if (!isAnimating) startDecrypt() } : undefined}
      onMouseLeave={animateOn === 'hover' || animateOn === 'inViewHover' ? resetToPlainText : undefined}
      onClick={animateOn === 'click' ? handleClick : undefined}
      onKeyDown={animateOn === 'click' ? handleKeyDown : undefined}
      role={animateOn === 'click' ? 'button' : undefined}
      tabIndex={animateOn === 'click' ? 0 : undefined}
      aria-label={animateOn === 'click' ? text : undefined}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(displayText).map((character, index) => {
          const isRevealed = revealedIndices.has(index) || (!isAnimating && isDecrypted)
          return <span key={index} className={isRevealed ? className : encryptedClassName}>{character}</span>
        })}
      </span>
    </motion.span>
  )
}
