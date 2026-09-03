'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSession, type SessionUser } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useLanguage()
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined)
  useEffect(() => {
    const session = getSession()
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else setUser(session)
  }, [pathname, router])
  if (!user) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">{locale === 'ar' ? 'جاري التحقق من الجلسة...' : 'Checking your session...'}</div>
  return <>{children}</>
}
