'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

export type ToastKind = 'loading' | 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string }
type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind, duration?: number) => number
  dismissToast: (id: number) => void
  updateToast: (id: number, message: string, kind: ToastKind, duration?: number) => void
  toast: {
    success: (message: string, duration?: number) => number
    error: (message: string, duration?: number) => number
    info: (message: string, duration?: number) => number
  }
}

const DEFAULT_DURATION = 3000
const EXIT_DURATION = 180

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast & { dismissing?: boolean }>>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const exitTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const clearTimers = (id: number) => {
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
    const exitTimer = exitTimers.current.get(id)
    if (exitTimer) clearTimeout(exitTimer)
    exitTimers.current.delete(id)
  }

  const dismissToast = (id: number) => {
    if (exitTimers.current.has(id)) return
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, dismissing: true } : toast))
    const exitTimer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      exitTimers.current.delete(id)
    }, EXIT_DURATION)
    exitTimers.current.set(id, exitTimer)
  }

  const scheduleDismissal = (id: number, duration = DEFAULT_DURATION) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    if (duration <= 0) return
    timers.current.set(id, setTimeout(() => dismissToast(id), duration))
  }

  const value = useMemo<ToastContextValue>(() => {
    const showToast = (message: string, kind: ToastKind = 'info', duration = DEFAULT_DURATION) => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current, { id, message, kind }])
      scheduleDismissal(id, duration)
      return id
    }
    return {
      showToast,
      dismissToast,
      updateToast: (id, message, kind, duration = DEFAULT_DURATION) => {
        setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, message, kind, dismissing: false } : toast))
        scheduleDismissal(id, duration)
      },
      toast: {
        success: (message, duration = DEFAULT_DURATION) => showToast(message, 'success', duration),
        error: (message, duration = DEFAULT_DURATION) => showToast(message, 'error', duration),
        info: (message, duration = DEFAULT_DURATION) => showToast(message, 'info', duration),
      },
    }
  }, [])

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer))
    exitTimers.current.forEach((timer) => clearTimeout(timer))
    timers.current.clear()
    exitTimers.current.clear()
  }, [])

  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed inset-x-0 top-4 z-[2000] flex flex-col items-center gap-2 px-4" aria-live="polite">{toasts.map((toast) => <div key={toast.id} role="status" className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl transition-all duration-200 ${toast.dismissing ? 'translate-y-[-8px] opacity-0' : 'translate-y-0 opacity-100'} ${toast.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : toast.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : toast.kind === 'loading' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><span>{toast.message}</span><button type="button" onClick={() => dismissToast(toast.id)} className="rounded-md p-1 opacity-70 transition hover:bg-black/10 hover:opacity-100" aria-label="إغلاق التنبيه"><X className="h-4 w-4" /></button></div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
