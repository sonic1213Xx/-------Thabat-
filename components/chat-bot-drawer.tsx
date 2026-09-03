'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Send, Sparkles, Trash2, X } from 'lucide-react'
import { type ChatMessage } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

const CHAT_STORAGE_KEY = 'thabat_chat_history'
const CHAT_LOADING_DELAY = 300

const TypingIndicator = () => (
  <div className="flex w-fit items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
)

const readSavedMessages = (welcomeMessage: ChatMessage): ChatMessage[] => {
  if (typeof window === 'undefined') return [welcomeMessage]

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return [welcomeMessage]

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return [welcomeMessage]

    return parsed as ChatMessage[]
  } catch {
    return [welcomeMessage]
  }
}

const persistMessages = (nextMessages: ChatMessage[]) => {
  if (typeof window === 'undefined') return

  if (!nextMessages.length) {
    window.localStorage.removeItem(CHAT_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextMessages.slice(-50)))
}

export function ChatBotDrawer() {
  const { dir, t } = useLanguage()
  const welcomeMessage: ChatMessage = { role: 'model', content: t('botWelcome') }
  const [open, setOpen] = useState(false)
  const [drawerRendered, setDrawerRendered] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const requestControllerRef = useRef<AbortController | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    setMessages([welcomeMessage])
  }, [])

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
  }, [])

  useEffect(() => {
    const handleOpenChat = () => startFreshConversation()
    window.addEventListener('thabat-chat-open', handleOpenChat)

    return () => {
      window.removeEventListener('thabat-chat-open', handleOpenChat)
    }
  }, [])

  const startFreshConversation = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    setLoading(false)
    setInput('')
    setMessages([welcomeMessage])
    if (typeof window !== 'undefined') window.localStorage.removeItem(CHAT_STORAGE_KEY)
    setOpen(true)
    setDrawerClosing(false)
    setDrawerRendered(true)
  }

  const closeDrawer = () => {
    setOpen(false)
    setDrawerClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setDrawerRendered(false)
      setDrawerClosing(false)
      closeTimerRef.current = null
    }, 180)
  }

  useEffect(() => {
    if (!mounted) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mounted, open])

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const content = input.trim()
    if (!content || loading) return

    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setMessages((current) => [...current, { role: 'model', content: '' }])
    const controller = new AbortController()
    requestControllerRef.current = controller

    try {
      await new Promise((resolve) => setTimeout(resolve, CHAT_LOADING_DELAY))
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || t('botUnavailable'))
      }

      if (!response.body) {
        throw new Error(t('botUnavailable'))
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue

        setMessages((current) => {
          const updated = [...current]
          const last = updated[updated.length - 1]

          if (!last || last.role !== 'model') {
            updated.push({ role: 'model', content: chunk })
            return updated
          }

          updated[updated.length - 1] = {
            ...last,
            content: `${last.content}${chunk}`,
          }

          return updated
        })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessages((current) => {
        const updated = [...current]
        const last = updated[updated.length - 1]

        if (last && last.role === 'model') {
          updated[updated.length - 1] = {
            ...last,
            content: error instanceof Error ? error.message : t('botUnavailable'),
          }
          return updated
        }

        return [
          ...updated,
          { role: 'model', content: error instanceof Error ? error.message : t('botUnavailable') },
        ]
      })
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null
      setLoading(false)
    }
  }

  const clearHistory = () => {
    const resetMessages = [welcomeMessage]
    setMessages(resetMessages)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHAT_STORAGE_KEY)
    }
  }

  const isThinking = loading
  const shouldShowGlow = isInputFocused || isThinking
  const floatingSide = dir === 'rtl' ? 'left-5' : 'right-5'
  const drawerSide = dir === 'rtl' ? 'left-4' : 'right-4'
  const userBubbleAlignment = 'justify-end'
  const botBubbleAlignment = 'justify-start'

  if (!mounted) return null

  return createPortal(
    <>
      <style>{`
        @keyframes sweep-animation {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -100;
          }
        }

        .animate-border-beam {
          animation: sweep-animation 8s linear infinite !important;
        }

        @keyframes chat-drawer-enter {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes chat-drawer-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(12px) scale(0.96); }
        }

        .chat-drawer-enter { animation: chat-drawer-enter 180ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .chat-drawer-exit { animation: chat-drawer-exit 180ms ease-in both; }
      `}</style>
      <button
        type="button"
        onClick={() => open ? closeDrawer() : startFreshConversation()}
        aria-label={t('askBot')}
        className={`group fixed bottom-5 ${floatingSide} z-50 flex h-14 items-center gap-2 rounded-2xl border border-emerald-300/40 bg-emerald-600 px-4 text-white shadow-xl shadow-emerald-900/20 transition duration-300 hover:-translate-y-1 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-white/15"><Bot className="h-5 w-5" /><Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-100 transition group-hover:rotate-12" /></span>
        <span className="hidden text-sm font-bold sm:inline">{t('askBot')}</span>
      </button>

      {drawerRendered && (
        <section
          aria-label={t('askBot')}
          dir={dir}
          className={`fixed bottom-24 ${drawerSide} z-[999] flex h-[min(520px,calc(100vh-9rem))] w-[min(360px,calc(100vw-2rem))] max-w-[360px] flex-col overflow-hidden rounded-3xl border border-border bg-card text-foreground shadow-2xl shadow-slate-950/20 ${drawerClosing ? 'chat-drawer-exit' : 'chat-drawer-enter'}`}
        >
          <header className="flex items-center justify-between border-b border-border bg-muted/35 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="h-5 w-5" /></span>
              <div>
              <h2 className="font-bold">Thabat Bot</h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('botConnected')}
              </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearHistory}
                aria-label={t('clearChat')}
                className="rounded-xl p-2 text-foreground/55 transition hover:bg-accent hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label={t('close')}
                className="rounded-xl p-2 text-foreground/55 transition hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto bg-card p-3">
            {messages.map((message, index) => {
              const shouldShowTypingBubble =
                loading &&
                message.role === 'model' &&
                !message.content &&
                index === messages.length - 1

              if (shouldShowTypingBubble) {
                return (
                  <div key={`${message.role}-${index}`} className={`flex w-full ${botBubbleAlignment} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                    <TypingIndicator />
                  </div>
                )
              }

              if (message.role === 'model' && !message.content) {
                return null
              }

              return (
                <div className={`flex w-full ${message.role === 'user' ? userBubbleAlignment : botBubbleAlignment}`}>
                <div
                  key={`${message.role}-${index}`}
                  dir="auto"
                  className={`w-fit max-w-[85%] break-words overflow-auto rounded-2xl px-3 py-2 text-sm leading-6 animate-in fade-in slide-in-from-bottom-2 duration-200 [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.role === 'user' ? (
                    <span>{message.content}</span>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 prose-ul:list-disc prose-ul:pl-4 prose-li:my-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="border-t border-border bg-muted/25 p-3">
            <div className="flex items-end gap-2">
              <div className="relative flex flex-1 items-center overflow-hidden rounded-2xl border border-border bg-card transition-colors">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                  className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-opacity duration-500 ease-in-out ${shouldShowGlow ? 'opacity-100' : 'opacity-0'}`}
                >
                  <defs>
                    <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="20%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#34d399" />
                      <stop offset="80%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    rx="16"
                    ry="16"
                    fill="none"
                    stroke="url(#beam-gradient)"
                    strokeWidth="3.5"
                    pathLength="100"
                    strokeDasharray="20 80"
                    className="animate-border-beam"
                    style={{
                      filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))',
                    }}
                  />
                </svg>
                <textarea
                  value={input}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void submit()
                    }
                  }}
                  disabled={loading}
                  rows={1}
                  placeholder={t('botInput')}
                  className="relative z-10 max-h-24 min-h-10 w-full resize-none rounded-2xl border border-transparent bg-transparent px-3 py-2 text-sm text-foreground outline-none transition focus:border-transparent focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                aria-label={t('send')}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}
    </>,
    document.body,
  )
}
