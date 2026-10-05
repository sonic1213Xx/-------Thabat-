'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMotionValue, useMotionValueEvent, useReducedMotion, animate } from 'motion/react'
import { ChevronDown, Sparkles } from 'lucide-react'
import './prompt-bar.css'

const ARROW_UP = [12, 4.5, 18.5, 11, 14.25, 11, 14.25, 19.5, 9.75, 19.5, 9.75, 11, 5.5, 11]
const SQUARE = [12, 6, 18, 6, 18, 12, 18, 18, 6, 18, 6, 12, 6, 6]
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const
const MODEL_LABELS = ['Thabat AI', 'Thabat Focus', 'Thabat Quick']
const SENSITIVITY_LEVELS = ['Low', 'Balanced', 'High']
const DISPLAY_ONLY_TITLE = 'Display preference only; responses use the same Gemini model.'
const SPARK_COLOR = '#34d399'

type Spark = { x: number; y: number; radius: number; velocity: number; sway: number; phase: number; age: number; lifetime: number }

function interpolatePath(from: number[], to: number[], progress: number) {
  let path = ''
  for (let index = 0; index < from.length; index += 2) {
    const x = from[index] + (to[index] - from[index]) * progress
    const y = from[index + 1] + (to[index + 1] - from[index + 1]) * progress
    path += `${index ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return `${path}Z`
}

function SendGlyph({ busy }: { busy: boolean }) {
  const reduceMotion = useReducedMotion()
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const direction = useRef(busy ? 1 : -1)
  const progress = useMotionValue(busy ? 1 : 0)

  useLayoutEffect(() => {
    const target = busy ? 1 : 0
    direction.current = busy ? 1 : -1
    if (progress.get() === target) return undefined
    const controls = animate(progress, target, reduceMotion ? { duration: 0 } : { duration: 0.24, ease: EASE_IN_OUT })
    return () => controls.stop()
  }, [busy, progress, reduceMotion])

  useMotionValueEvent(progress, 'change', (value) => {
    pathRef.current?.setAttribute('d', interpolatePath(ARROW_UP, SQUARE, value))
    const pinch = reduceMotion ? 0 : Math.sin(value * Math.PI)
    const scaleX = 1 - 0.12 * pinch
    if (svgRef.current) svgRef.current.style.transform = pinch ? `rotate(${direction.current * 8 * pinch}deg) scale(${scaleX}, ${1 / scaleX})` : ''
  })

  return (
    <svg ref={svgRef} className="prompt-bar__glyph" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path ref={pathRef} d={interpolatePath(ARROW_UP, SQUARE, progress.get())} />
    </svg>
  )
}

type PromptBarProps = {
  placeholder: string
  busy: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function PromptBar({ placeholder, busy, onSend, onStop }: PromptBarProps) {
  const [draft, setDraft] = useState('')
  const [modelLabel, setModelLabel] = useState(MODEL_LABELS[0])
  const [sensitivity, setSensitivity] = useState('Balanced')
  const [openMenu, setOpenMenu] = useState<'model' | 'sensitivity' | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sparkCanvasRef = useRef<HTMLCanvasElement>(null)
  const typing = useRef({ energy: 0, strokes: 0 })
  const reduceMotion = useReducedMotion()
  const maxed = sensitivity === 'High'
  const canSend = Boolean(draft.trim())
  const armed = busy || canSend

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = '0px'
    const maxHeight = 22 * 5
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [draft])

  useEffect(() => {
    const canvas = sparkCanvasRef.current
    if (!maxed || reduceMotion || !canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined

    typing.current.strokes = 0
    let frame = 0
    let lastTime = performance.now()
    let width = 0
    let height = 0
    let spawnTimer = 0
    let speed = 1
    let pulse = 0
    const particles: Spark[] = []
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    const spawn = (burst: boolean) => {
      particles.push({
        x: Math.random() * width,
        y: burst ? height * (0.2 + Math.random() * 0.8) : height + 3,
        radius: 0.9 + Math.random() * 1.1,
        velocity: -(7 + Math.random() * 9),
        sway: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2,
        age: burst ? Math.random() * 1.2 : 0,
        lifetime: 2.4 + Math.random() * 2.4,
      })
    }
    const draw = (now: number) => {
      const delta = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now
      const activity = typing.current
      activity.energy *= Math.exp(-delta / 0.8)
      pulse *= Math.exp(-delta / 0.16)
      if (activity.strokes > 0) {
        activity.strokes = 0
        pulse = 1
      }
      const energy = activity.energy
      speed += (1 + energy * 6 - speed) * (1 - Math.exp(-delta / 0.15))
      spawnTimer += delta
      while (spawnTimer > 0.14) {
        spawnTimer -= 0.14
        if (particles.length < 30) spawn(false)
      }
      context.clearRect(0, 0, width, height)
      context.fillStyle = SPARK_COLOR
      context.shadowColor = SPARK_COLOR
      context.shadowBlur = 6 + energy * 10 + pulse * 6
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        particle.age += delta
        if (particle.age > particle.lifetime) {
          particles.splice(index, 1)
          continue
        }
        const progress = particle.age / particle.lifetime
        const twinkle = 0.7 + 0.3 * Math.sin((now / 160) * (1 + energy) + particle.phase)
        particle.y += particle.velocity * delta * speed
        if (particle.y < -4) {
          particle.y = height + 3
          particle.x = Math.random() * width
        }
        const edge = Math.min(1, Math.max(0, particle.y / 14), Math.max(0, (height - particle.y) / 14))
        context.globalAlpha = Math.min(1, Math.sin(progress * Math.PI) * (0.9 + energy * 0.25) * twinkle) * edge
        context.beginPath()
        context.arc(particle.x + Math.sin((now / 900) * (1 + energy * 0.8) + particle.phase) * particle.sway, particle.y, particle.radius * twinkle * (1 + energy * 0.35), 0, Math.PI * 2)
        context.fill()
      }
      frame = requestAnimationFrame(draw)
    }

    resize()
    for (let index = 0; index < 26; index += 1) spawn(true)
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      context.clearRect(0, 0, width, height)
    }
  }, [maxed, reduceMotion])

  const send = () => {
    const text = draft.trim()
    if (!text || busy) return
    onSend(text)
    setDraft('')
  }

  return (
    <div className="prompt-bar" dir="auto">
      {openMenu && (
        <div className="prompt-bar__menu" role="group" aria-label={openMenu === 'model' ? 'Display model name' : 'Display sensitivity'}>
          {(openMenu === 'model' ? MODEL_LABELS : SENSITIVITY_LEVELS).map((option) => {
            const selected = openMenu === 'model' ? modelLabel === option : sensitivity === option
            return (
              <button
                key={option}
                type="button"
                className="prompt-bar__menu-option"
                aria-pressed={selected}
                title={DISPLAY_ONLY_TITLE}
                onClick={() => {
                  if (openMenu === 'model') setModelLabel(option)
                  else setSensitivity(option)
                  setOpenMenu(null)
                }}
              >
                {option}
                {selected && <span aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>
      )}
      <form className="prompt-bar__field" data-max={maxed ? '' : undefined} onSubmit={(event) => { event.preventDefault(); if (busy) onStop(); else send() }}>
        <canvas ref={sparkCanvasRef} className="prompt-bar__sparks" aria-hidden="true" />
        <textarea
          ref={inputRef}
          className="prompt-bar__input"
          rows={1}
          value={draft}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => {
            setDraft(event.target.value)
            typing.current.energy = Math.min(1.6, typing.current.energy + 0.22)
            typing.current.strokes = Math.min(4, typing.current.strokes + 1)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              if (busy) onStop()
              else send()
            }
          }}
        />
        <div className="prompt-bar__bar">
          <button
            type="button"
            className="prompt-bar__pick"
            aria-label={`Model label: ${modelLabel}. Display preference only.`}
            aria-expanded={openMenu === 'model'}
            title={DISPLAY_ONLY_TITLE}
            onClick={() => setOpenMenu((current) => current === 'model' ? null : 'model')}
          >
            <span>{modelLabel}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="prompt-bar__pick"
            aria-label={`Sensitivity: ${sensitivity}. Display preference only.`}
            aria-expanded={openMenu === 'sensitivity'}
            title={DISPLAY_ONLY_TITLE}
            onClick={() => setOpenMenu((current) => current === 'sensitivity' ? null : 'sensitivity')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{sensitivity}</span>
          </button>
          <span className="prompt-bar__spacer" />
          <button
            type={busy ? 'button' : 'submit'}
            className="prompt-bar__send"
            disabled={!armed}
            aria-label={busy ? 'Stop response' : 'Send message'}
            data-armed={armed ? '' : undefined}
            onClick={busy ? onStop : undefined}
          >
            <SendGlyph busy={busy} />
          </button>
        </div>
      </form>
    </div>
  )
}
