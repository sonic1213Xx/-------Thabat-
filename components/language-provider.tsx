'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { translations, type Locale, type TranslationKey } from '@/lib/translations'
import { getSession } from '@/lib/auth'

const LANGUAGE_STORAGE_KEY = 'thabat-locale'

type LanguageContextValue = {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: (key: TranslationKey) => string
  toggleLocale: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children, initialLocale = 'ar' }: { children: React.ReactNode; initialLocale?: Locale }) {
  const pathname = usePathname()
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [isChanging, setIsChanging] = useState(false)

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const hasLocaleCookie = document.cookie.split('; ').some((cookie) => cookie.startsWith('NEXT_LOCALE='))
    if (!hasLocaleCookie && (savedLocale === 'ar' || savedLocale === 'en')) setLocale(savedLocale)
  }, [])

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale)
    document.cookie = `NEXT_LOCALE=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`
    const session = getSession()
    if (session) {
      void fetch('/api/users/locale', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session.id, locale }) }).catch(() => undefined)
    }
  }, [locale])

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    t: (key) => translations[locale][key],
    toggleLocale: () => {
      setIsChanging(true)
      window.setTimeout(() => {
        setLocale((current) => current === 'ar' ? 'en' : 'ar')
        setIsChanging(false)
      }, 720)
    },
  }), [locale])

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {isChanging && (
        <div className={`language-wave-overlay ${pathname === '/login' ? 'login-language-wave' : ''}`} role="status" aria-live="polite" aria-label={translations[locale].changingLanguage}>
          <div className="language-transition-panel">
            <div className="language-transition-mark"><span className="language-transition-ring" /></div>
            <span>{translations[locale].changingLanguage}</span>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
