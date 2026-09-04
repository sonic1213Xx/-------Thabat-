import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { LanguageProvider } from '@/components/language-provider'
import { STORAGE_KEYS } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/toast-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ثَبَت - Thabat School Operations',
  description: 'Modern operational logbook and audit engine for Saudi schools',
  icons: {
    icon: '/favicon.ico',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const sessionUserId = cookieStore.get('THABAT_USER_ID')?.value
  let profile: { locale: string } | null = null
  if (sessionUserId) {
    try {
      profile = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { locale: true } })
    } catch (error) {
      console.error('Unable to resolve server locale:', error)
    }
  }
  const initialLocale = profile?.locale === 'en'
    ? 'en'
    : cookieStore.get('NEXT_LOCALE')?.value === 'en'
      ? 'en'
      : 'ar'
  return (
    <html lang={initialLocale} dir={initialLocale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={cn(
        inter.className,
        'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50'
      )}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey={STORAGE_KEYS.theme}
        >
          <LanguageProvider initialLocale={initialLocale}><ToastProvider>{children}</ToastProvider></LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
