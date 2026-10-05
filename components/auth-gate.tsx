'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clearSession, setSession, type SessionUser } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'
import { SESSION_CHECK_ANIMATION_KEY } from '@/lib/storage'
import DecryptedText from '@/components/decrypted-text'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useLanguage()
  const isDashboardHome = pathname === '/dashboard'
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  const [loadingStep, setLoadingStep] = useState<'hack' | 'joke'>('hack')
  const [showSessionAnimation, setShowSessionAnimation] = useState(false)
  const [loadingSequenceComplete, setLoadingSequenceComplete] = useState(true)
  const sessionAnimationDecisionRef = useRef(false)
  const stageDelayRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (stageDelayRef.current !== null) window.clearTimeout(stageDelayRef.current)
  }, [])

  useEffect(() => {
    let active = true
    const handleExpiredSession = () => {
      if (!active) return
      setUser(null)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    }
    window.addEventListener('thabat-auth-expired', handleExpiredSession)
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ data: SessionUser }> : null)
      .then((result) => {
        if (!active) return
        if (!result?.data) {
          clearSession()
          setUser(null)
          router.replace(`/login?next=${encodeURIComponent(pathname)}`)
          return
        }
        const remember = localStorage.getItem('thabat-session-persistent') === 'true'
        setSession(result.data, remember)
        if (!sessionAnimationDecisionRef.current) {
          sessionAnimationDecisionRef.current = true
          let animationPending = false
          try {
            animationPending = sessionStorage.getItem(SESSION_CHECK_ANIMATION_KEY) === 'true'
            sessionStorage.removeItem(SESSION_CHECK_ANIMATION_KEY)
          } catch {}
          const shouldAnimate = pathname === '/dashboard' && animationPending
          setShowSessionAnimation(shouldAnimate)
          setLoadingSequenceComplete(!shouldAnimate)
        }
        setUser(result.data)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      })
    return () => {
      active = false
      window.removeEventListener('thabat-auth-expired', handleExpiredSession)
    }
  }, [pathname, router])
  if (!user && !isDashboardHome) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400" role="status" aria-live="polite">
        {locale === 'ar' ? 'جارٍ التحقق من الجلسة...' : 'Checking your session...'}
      </div>
    )
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400" role="status" aria-live="polite">
        {locale === 'ar' ? 'جارٍ التحقق من الجلسة...' : 'Checking your session...'}
      </div>
    )
  }
  if (showSessionAnimation && isDashboardHome && !loadingSequenceComplete) {
    const loadingText = loadingStep === 'hack' ? 'Hacking into the mainframe...' : 'Just kidding. Checking your session... 😂'
    return (
      <div dir="ltr" className="flex min-h-screen items-center justify-center bg-slate-950 px-2 text-center text-xs font-semibold leading-tight text-emerald-300 min-[360px]:text-sm min-[414px]:text-base sm:text-2xl md:text-4xl xl:text-5xl" role="status" aria-live="polite" aria-atomic="true">
        <DecryptedText
          key={loadingStep}
          text={loadingText}
          speed={80}
          characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+.,-"
          sequential
          revealDirection="start"
          animateOn="view"
          singleLine
          parentClassName="w-full max-w-5xl"
          onComplete={() => {
            if (stageDelayRef.current !== null) window.clearTimeout(stageDelayRef.current)
            stageDelayRef.current = window.setTimeout(() => {
              stageDelayRef.current = null
              if (loadingStep === 'hack') setLoadingStep('joke')
              else setLoadingSequenceComplete(true)
            }, 2000)
          }}
        />
      </div>
    )
  }
  return <>{children}</>
}
