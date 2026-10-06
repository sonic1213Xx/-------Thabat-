'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || 'development'
const dismissedVersionKey = 'thabat-dismissed-update-version'

export function AppVersionNotice() {
  const { locale, dir } = useLanguage()
  const [serverVersion, setServerVersion] = useState<string | null>(null)
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', { cache: 'no-store' })
        if (!response.ok) return
        const result = await response.json() as { version?: string }
        if (active && result.version) setServerVersion(result.version)
      } catch {}
    }

    try {
      setDismissedVersion(localStorage.getItem(dismissedVersionKey))
    } catch {}
    void checkVersion()
    const interval = window.setInterval(checkVersion, 60_000)
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkVersion()
    }
    window.addEventListener('focus', checkWhenVisible)
    document.addEventListener('visibilitychange', checkWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', checkWhenVisible)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [])

  if (!serverVersion || serverVersion === buildVersion || dismissedVersion === serverVersion) return null

  const english = locale === 'en'
  const copy = english
    ? { title: 'A newer version is available', description: 'You can keep working, but refresh to get the latest features and fixes.', refresh: 'Refresh', dismiss: 'Dismiss update notice' }
    : { title: 'يتوفر إصدار أحدث', description: 'يمكنك متابعة العمل، أو تحديث الصفحة للحصول على أحدث الميزات والإصلاحات.', refresh: 'تحديث', dismiss: 'إخفاء إشعار التحديث' }

  const dismiss = () => {
    try {
      localStorage.setItem(dismissedVersionKey, serverVersion)
    } catch {}
    setDismissedVersion(serverVersion)
  }

  return (
    <aside role="status" aria-live="polite" dir={dir} className="fixed inset-x-3 top-3 z-[10000] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-3 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-slate-900 shadow-lg dark:border-sky-900 dark:bg-slate-900 dark:text-white sm:inset-x-4 sm:max-w-xl">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" aria-hidden="true"><RefreshCw className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{copy.title}</span>
        <span className="block text-xs leading-5 text-slate-600 dark:text-slate-300">{copy.description}</span>
      </span>
      <button type="button" onClick={() => window.location.reload()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" aria-label={copy.refresh}>
        <RefreshCw className="h-3.5 w-3.5" />
        <span>{copy.refresh}</span>
      </button>
      <button type="button" onClick={dismiss} className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={copy.dismiss} title={copy.dismiss}>
        <X className="h-4 w-4" />
      </button>
    </aside>
  )
}