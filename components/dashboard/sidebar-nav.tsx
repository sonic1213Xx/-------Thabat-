'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  AlertCircle,
  Clock,
  CalendarCheck,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  UserPlus,
  ShieldAlert,
  FolderKanban,
  Coffee,
  ScanLine,
  Bus,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'
import { getSession } from '@/lib/auth'
import { can } from '@/lib/roles'
import { hasPermission, isCreatorRole } from '@/lib/permissions'

export function SidebarNav() {
  const { dir, t, locale } = useLanguage()
  const pathname = usePathname()
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const session = getSession()
  const navItems = [
    { label: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { label: t('students'), href: '/dashboard/students', icon: Users },
    { label: t('teams'), href: '/dashboard/teams', icon: Users },
    { label: t('divisions'), href: '/dashboard/divisions', icon: BookOpen },
    { label: t('warnings'), href: '/dashboard/warnings', icon: AlertCircle, visible: session?.role !== 'TEACHER' },
    { label: t('vicePrincipalCenter'), href: '/dashboard/vice-principal', icon: ShieldAlert, visible: Boolean(session && (can(session.role, 'can_approve_gate_passes') || session.role === 'GATE_SECURITY')) },
    { label: t('attendance'), href: '/dashboard/attendance', icon: CalendarCheck },
    { label: t('teachersLounge'), href: '/dashboard/teachers-lounge', icon: Coffee, visible: Boolean(session && (isCreatorRole(session.role) || session.role === 'TEACHER' || session.role === 'PRINCIPAL' || session.role === 'VICE_PRINCIPAL')) },
    { label: t('auditLog'), href: '/dashboard/audit-log', icon: Clock, visible: Boolean(session && hasPermission(session.role, 'audit_log', 'read')) },
    { label: t('reports'), href: '/dashboard/reports', icon: BarChart3, visible: Boolean(session && hasPermission(session.role, 'reports', 'read')) },
    { label: t('settings'), href: '/dashboard/settings', icon: Settings },
    { label: t('rolesAndPermissions'), href: '/dashboard/settings/roles', icon: ShieldAlert, visible: Boolean(session && (isCreatorRole(session.role) || session.role === 'PRINCIPAL')) },
    { label: locale === 'ar' ? 'ماسح تصاريح الخروج' : 'Gate pass scanner', href: '/dashboard/gate-security', icon: ScanLine, visible: Boolean(session && (isCreatorRole(session.role) || session.role === 'PRINCIPAL' || session.role === 'GATE_SECURITY')) },
    { label: locale === 'ar' ? 'عمليات النقل المدرسي' : 'Transportation', href: '/dashboard/transportation', icon: Bus, visible: Boolean(session && (isCreatorRole(session.role) || session.role === 'PRINCIPAL' || session.role === 'TRANSPORTATION_SUPERVISOR')) },
  ]

  const helpContent = useMemo(() => {
    if (pathname.includes('/students')) {
      return {
        title: t('studentsHelpTitle'),
        items: [
          { icon: UserPlus, text: t('addStudentsHelp') },
          { icon: ShieldAlert, text: t('divisionsHelp') },
          { icon: FileSpreadsheet, text: t('recordsHelp') },
        ],
      }
    }

    if (pathname.includes('/teams') || pathname.includes('/divisions')) {
      return {
        title: t('teamsHelpTitle'),
        items: [
          { icon: FolderKanban, text: t('teamSwitcherHelp') },
          { icon: Users, text: t('addTeamHelp') },
          { icon: BookOpen, text: t('manageDivisionsHelp') },
        ],
      }
    }

    return {
      title: t('helpCenter'),
      items: [
        { icon: Users, text: t('startStudentsHelp') },
        { icon: BookOpen, text: t('prepareHelp') },
        { icon: ShieldAlert, text: t('auditHelp') },
      ],
    }
  }, [pathname, t])

  const openChatFromHelp = () => {
    setHelpOpen(false)
    window.dispatchEvent(new CustomEvent('thabat-chat-open'))
  }

  useEffect(() => {
    setNavigating(false)
  }, [pathname])

  useEffect(() => {
    const toggle = () => setMobileOpen((open) => !open)
    window.addEventListener('thabat-mobile-sidebar-toggle', toggle)
    return () => window.removeEventListener('thabat-mobile-sidebar-toggle', toggle)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileOpen])

  return (
    <>
    {mobileOpen && <button type="button" aria-label={locale === 'ar' ? 'إغلاق القائمة' : 'Close navigation'} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 animate-[fadeIn_0.22s_ease-out] bg-slate-950/40 backdrop-blur-sm md:hidden" />}
    {navigating && <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-slate-950/55 p-6 text-white backdrop-blur-sm md:hidden" role="status" aria-live="polite"><Loader2 className="h-9 w-9 animate-spin text-emerald-300" /><span className="text-sm font-semibold">{locale === 'ar' ? 'يرجى الانتظار...' : 'Please wait...'}</span></div>}
    <aside id="dashboard-sidebar" className={cn(
      'w-[280px] shrink-0 flex-col md:static md:flex md:w-[260px]',
      mobileOpen ? `fixed inset-y-0 start-0 z-50 flex ${dir === 'rtl' ? 'animate-[mobileSidebarEnterRtl_0.28s_cubic-bezier(0.22,1,0.36,1)]' : 'animate-[mobileSidebarEnterLtr_0.28s_cubic-bezier(0.22,1,0.36,1)]'}` : 'hidden',
      'border-r border-slate-200/80 bg-white/90 shadow-[inset_-1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/95',
      'md:sticky md:top-0 h-screen overflow-hidden'
    )} dir={dir}>
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div className="text-start">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{t('brandName')}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('dashboard')}</p>
          </div>
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white md:hidden" aria-label={locale === 'ar' ? 'إغلاق القائمة' : 'Close navigation'}>
            {dir === 'rtl' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navItems.filter((item) => item.visible !== false).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              onClick={() => {
                if (pathname !== item.href) setNavigating(true)
                setMobileOpen(false)
              }}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ring-1 ring-transparent',
                isActive
                  ? 'bg-emerald-school-50 text-emerald-school-700 shadow-sm ring-emerald-school-100 dark:bg-emerald-school-950/30 dark:text-emerald-school-300 dark:ring-emerald-school-900/50'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
              )}
            >
              <span className="flex items-center gap-3">
                <span className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                )}>
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="leading-none">{item.label}</span>
              </span>
              <ChevronLeft className={cn('h-3.5 w-3.5 opacity-60 transition-transform', isActive && 'translate-x-0')} />
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200/80 px-3 py-4 dark:border-slate-800/80">
        <button onClick={() => setHelpOpen(true)} className={cn(
          'flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium',
          'text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white',
          'shadow-sm ring-1 ring-slate-200 dark:ring-slate-800'
        )}>
          <HelpCircle className="h-4 w-4" />
          <span>{t('help')}</span>
        </button>
      </div>

      {helpOpen && (
        <Modal open={helpOpen} onOpenChange={setHelpOpen} className="max-w-lg">
          <div className="space-y-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-600">{t('helpBrand')}</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{helpContent.title}</h2>
              </div>
            </div>

            <div className="space-y-3">
              {helpContent.items.map(({ icon: Icon, text }) => (
                <div key={text} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-slate-700 dark:text-slate-200">
                    <span className="font-bold text-slate-900 dark:text-white">{text.split(':')[0]}:</span>
                    {text.includes(':') ? ` ${text.split(':').slice(1).join(':').trim()}` : ''}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
              <button type="button" onClick={() => setHelpOpen(false)} className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                {t('okay')}
              </button>
              <button type="button" onClick={openChatFromHelp} className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                {t('askBot')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </aside>
    </>
  )
}
