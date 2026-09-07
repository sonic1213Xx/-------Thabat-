'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, Check, Loader2, Send, Sparkles, Trash2, Undo2, X } from 'lucide-react'
import { type ChatMessage } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { getSession } from '@/lib/auth'
import { usePathname, useRouter } from 'next/navigation'

const CHAT_LOADING_DELAY = 300
type AgentPlan = { type: string; [key: string]: unknown }
type AgentPreview = { plan: AgentPlan; steps: string[]; target: string; actionId?: string; state: 'preview' | 'executed' | 'restored' }

function getScreenContext(pathname: string) {
  const root = document.querySelector('main') ?? document.body
  const isVisible = (element: Element) => {
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
  }
  const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim()
  const controls = Array.from(root.querySelectorAll('button, a, input, textarea, select, [role="button"]'))
    .filter(isVisible)
    .map((element) => ({
      type: element.tagName.toLowerCase(),
      label: element.getAttribute('aria-label') || element.getAttribute('title') || text(element) || element.getAttribute('placeholder') || '',
      value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ? element.value : undefined,
    }))
    .filter((control) => control.label || control.value)
    .slice(0, 80)
  const rows = Array.from(root.querySelectorAll('table tr, [role="row"], article, li'))
    .filter(isVisible)
    .map(text)
    .filter(Boolean)
    .slice(0, 100)
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4'))
    .filter(isVisible)
    .map(text)
    .filter(Boolean)
    .slice(0, 20)

  return {
    path: pathname,
    title: document.title,
    focusedElement: document.activeElement instanceof HTMLElement ? text(document.activeElement) || document.activeElement.getAttribute('aria-label') : '',
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    headings,
    rows,
    controls,
    mainText: (root.innerText || '').slice(0, 12000),
  }
}

const TypingIndicator = () => (
  <div className="flex w-fit items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
)

export function ChatBotDrawer() {
  const { dir, locale, t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const welcomeMessage: ChatMessage = { role: 'model', content: t('botWelcome') }
  const [open, setOpen] = useState(false)
  const [drawerRendered, setDrawerRendered] = useState(false)
  const [drawerClosing, setDrawerClosing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [actionPreview, setActionPreview] = useState<AgentPreview | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
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
    const handleOpenChat = () => openConversation()
    window.addEventListener('thabat-chat-open', handleOpenChat)

    return () => {
      window.removeEventListener('thabat-chat-open', handleOpenChat)
    }
  }, [])

  const openConversation = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
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
        body: JSON.stringify({
          messages: nextMessages,
          screenContext: {
            ...getScreenContext(pathname),
            locale,
            profileName: getSession()?.name,
          },
        }),
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
      let responseText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        if (!chunk) continue
        responseText += chunk

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
      if (responseText.startsWith('__THABAT_ACTION_PLAN__')) {
        const plan = JSON.parse(responseText.slice('__THABAT_ACTION_PLAN__'.length)) as AgentPlan
        const previewResponse = await fetch('/api/chat/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'preview', plan, locale }),
        })
        const preview = await previewResponse.json() as { error?: string; steps?: string[]; target?: string }
        if (!previewResponse.ok) throw new Error(preview.error || 'This action is not allowed.')
        setActionPreview({ plan, steps: preview.steps ?? [], target: preview.target ?? '', state: 'preview' })
        setMessages((current) => {
          const updated = [...current]
          const last = updated[updated.length - 1]
          if (last?.role === 'model') updated[updated.length - 1] = { ...last, content: 'I prepared an action preview for your confirmation.' }
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
    setActionPreview(null)
  }

  const confirmAction = async () => {
    if (!actionPreview || actionPreview.state !== 'preview') return
    setActionLoading(true)
    try {
      const response = await fetch('/api/chat/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'execute', plan: actionPreview.plan, confirmed: true, currentPath: pathname }),
      })
      const result = await response.json() as { error?: string; actionId?: string; path?: string; navigation?: boolean }
      if (!response.ok) throw new Error(result.error || 'The action could not be completed.')
      setActionPreview({ ...actionPreview, actionId: result.actionId, state: 'executed' })
      if (result.navigation && result.path) router.push(result.path)
    } catch (error) {
      setMessages((current) => [...current, { role: 'model', content: error instanceof Error ? error.message : 'The action could not be completed.' }])
    } finally {
      setActionLoading(false)
    }
  }

  const restoreAction = async () => {
    if (!actionPreview?.actionId || actionPreview.state !== 'executed') return
    setActionLoading(true)
    try {
      const response = await fetch('/api/chat/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'restore', actionId: actionPreview.actionId }),
      })
      const result = await response.json() as { error?: string; path?: string }
      if (!response.ok) throw new Error(result.error || 'The restore could not be completed.')
      setActionPreview({ ...actionPreview, state: 'restored' })
      if (result.path) router.push(result.path)
    } catch (error) {
      setMessages((current) => [...current, { role: 'model', content: error instanceof Error ? error.message : 'The restore could not be completed.' }])
    } finally {
      setActionLoading(false)
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
        onClick={() => open ? closeDrawer() : openConversation()}
        aria-label={t('askBot')}
        aria-expanded={open}
        title={t('askBot')}
        className={`group fixed bottom-4 ${floatingSide} z-50 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-600 p-0 text-white shadow-lg shadow-emerald-900/20 transition duration-300 hover:-translate-y-1 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15"><Bot className="h-5 w-5" /><Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-100 transition group-hover:rotate-12" /></span>
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
              <div className="flex items-center gap-2">
                <h2 className="!text-base !leading-tight shrink-0 whitespace-nowrap font-bold">Thabat Bot</h2>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{locale === 'ar' ? 'تجريبي' : 'Beta'}</span>
              </div>
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
                <div key={`${message.role}-${index}`} className={`flex w-full ${message.role === 'user' ? userBubbleAlignment : botBubbleAlignment}`}>
                <div
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
            {actionPreview && (
              <div className="animate-in slide-in-from-bottom-2 relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.07] p-3 shadow-sm duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                      {actionPreview.state === 'preview' ? <Sparkles className="h-4 w-4" /> : actionPreview.state === 'executed' ? <Check className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{locale === 'ar' ? (actionPreview.state === 'preview' ? 'معاينة الإجراء' : actionPreview.state === 'executed' ? 'اكتمل الإجراء' : 'تمت الاستعادة') : actionPreview.state === 'preview' ? 'Action preview' : actionPreview.state === 'executed' ? 'Action completed' : 'Action restored'}</p>
                      <p className="mt-0.5 text-[11px] text-foreground/60">{locale === 'ar' ? (actionPreview.state === 'preview' ? 'راجع الإجراء قبل التنفيذ' : actionPreview.state === 'executed' ? 'نقطة الاستعادة متاحة' : 'تمت إعادة البيانات إلى حالتها السابقة') : actionPreview.state === 'preview' ? 'Review before changes' : actionPreview.state === 'executed' ? 'Restore point available' : 'Data returned to its previous state'}</p>
                    </div>
                  </div>
                  {actionPreview.state === 'preview' && <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">{locale === 'ar' ? 'بانتظار الموافقة' : 'Needs approval'}</span>}
                </div>
                <div className="mt-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/50">{locale === 'ar' ? 'الهدف' : 'Target'}</p>
                  <p dir="auto" className="mt-0.5 truncate text-sm font-semibold">{actionPreview.target}</p>
                </div>
                <ol className="mt-3 space-y-2">
                  {actionPreview.steps.map((step, index) => (
                    <li key={step} className="flex items-start gap-2 text-xs text-foreground/75">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-card text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{index + 1}</span>
                      <span dir="auto" className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
                {actionPreview.state === 'preview' && <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200">{locale === 'ar' ? 'هل أنت متأكد من المتابعة؟' : 'Are you sure you want to continue?'}</p>}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {actionPreview.state === 'preview' && <button type="button" disabled={actionLoading} onClick={() => void confirmAction()} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">{actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {locale === 'ar' ? 'تأكيد' : 'Confirm'}</button>}
                  {actionPreview.state === 'executed' && <button type="button" disabled={actionLoading} onClick={() => void restoreAction()} className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-600 px-3 py-2.5 text-xs font-bold text-amber-700 transition hover:bg-amber-500/10 dark:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50">{actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} {locale === 'ar' ? 'استعادة الحالة السابقة' : 'Restore previous state'}</button>}
                  {actionPreview.state === 'preview' && <button type="button" disabled={actionLoading} onClick={() => setActionPreview(null)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-bold transition hover:bg-accent"><X className="h-3.5 w-3.5" /> {locale === 'ar' ? 'إلغاء' : 'Cancel'}</button>}
                </div>
              </div>
            )}
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
