'use client'

import { createContext, useContext, useMemo, useState } from 'react'

export type ToastKind = 'loading' | 'success' | 'error' | 'info'
type Toast = { id: number; kind: ToastKind; message: string }
type ToastContextValue = { showToast: (message: string, kind?: ToastKind) => number; dismissToast: (id: number) => void; updateToast: (id: number, message: string, kind: ToastKind) => void }

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const value = useMemo<ToastContextValue>(() => ({
    showToast: (message, kind = 'info') => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { id, message, kind }]); return id },
    dismissToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    updateToast: (id, message, kind) => setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, message, kind } : toast)),
  }), [])
  return <ToastContext.Provider value={value}>{children}<div className="pointer-events-none fixed inset-x-0 top-4 z-[2000] flex flex-col items-center gap-2 px-4" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${toast.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : toast.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : toast.kind === 'loading' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{toast.message}</div>)}</div></ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
