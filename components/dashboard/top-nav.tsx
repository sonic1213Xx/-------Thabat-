'use client'

import * as Select from '@radix-ui/react-select'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Menu, Sun, Moon, LogOut, Users, Plus, Check, ChevronDown, X, Trash2, Languages, User, Bell, Eye, AlertTriangle, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { cn, getStoredTeamId, setStoredTeamId, TEAM_OPTIONS, type TeamDefinition } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'
import { clearSession } from '@/lib/auth'
import { getSession, type SessionUser } from '@/lib/auth'
import { isCreatorRole } from '@/lib/permissions'

type DBTeam = { id: string; label: string }
type TransferNotification = { type: 'TRANSFER'; id: string; fromDivision: string; toDivision: string; createdAt: string; readAt: string | null; reviewedAt: string | null; students: Array<{ id: string; fullName: string; fromDivision: string; toDivision: string }>; grades: Array<{ id?: string; studentId: string; divisionId: string; subject: string; teacherId: string; taskPeriod1?: number | null; taskPeriod2?: number | null; examPeriod1?: number | null; examPeriod2?: number | null; finalExam?: number | null; customScores?: Record<string, number | null> }> }
type AttendanceNotification = { type: 'ATTENDANCE'; id: string; createdAt: string; readAt: string | null; studentId: string; studentName: string; divisionId: string; subject: string; date: string; status: 'ABSENT_UNEXCUSED' | 'ESCAPED' }
type ReferralNotification = { type: 'REFERRAL'; id: string; createdAt: string; readAt: string | null; studentName: string; divisionCode: string; subject: string; reason: string; incidentDate: string; incidentTime: string; location: string; actionTaken: string; createdBy: { name: string } }
type Notification = TransferNotification | AttendanceNotification | ReferralNotification

const canUseTeamSwitcher = (role?: string) => Boolean(role && (isCreatorRole(role) || role === 'PRINCIPAL' || role === 'VICE_PRINCIPAL' || role.startsWith('VP_')))
const canReceiveAttendanceAlerts = (role?: string) => Boolean(role && ['PRINCIPAL', 'VICE_PRINCIPAL', 'VP_STUDENT_AFFAIRS', 'VP_ACADEMIC_AFFAIRS', 'VP_OPERATIONS'].includes(role))

export function TopNav() {
  const { dir, t, toggleLocale, locale } = useLanguage()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [teamId, setTeamId] = useState<string>(getStoredTeamId())
  const [dbTeams, setDbTeams] = useState<DBTeam[]>([])
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [transferNotifications, setTransferNotifications] = useState<Notification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [liveReferral, setLiveReferral] = useState<ReferralNotification | null>(null)
  const notificationLoadRef = useRef(false)

  // Load teams from database
  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      const result = await response.json()
      setDbTeams(result.data ?? [])
    } catch (error) {
      console.error('Failed to load teams:', error)
    }
  }

  useEffect(() => {
    const currentSession = getSession()
    setSessionUser(currentSession)
    if (canUseTeamSwitcher(currentSession?.role)) void loadTeams()
    const syncTeam = () => {
      setTeamId(getStoredTeamId())
      if (canUseTeamSwitcher(currentSession?.role)) void loadTeams()
    }
    const handleTeamsChange = () => {
      if (canUseTeamSwitcher(currentSession?.role)) void loadTeams()
      setTeamId(getStoredTeamId())
    }
    window.addEventListener('thabat-team-changed', syncTeam)
    window.addEventListener('thabat-teams-changed', handleTeamsChange)
    return () => {
      window.removeEventListener('thabat-team-changed', syncTeam)
      window.removeEventListener('thabat-teams-changed', handleTeamsChange)
    }
  }, [])

  useEffect(() => {
    if (!sessionUser) return
    const loadNotifications = async () => {
      if (document.visibilityState === 'hidden') return
      try {
        const response = await fetch('/api/transfer-notifications', { headers: { 'x-thabat-user-id': sessionUser.id }, cache: 'no-store' })
        const json = await response.json() as { data?: Notification[] }
        const nextNotifications = json.data ?? []
        if (notificationLoadRef.current) {
          const previousIds = new Set(transferNotifications.map((notification) => `${notification.type}-${notification.id}`))
          const newReferral = nextNotifications.find((notification): notification is ReferralNotification => notification.type === 'REFERRAL' && !previousIds.has(`${notification.type}-${notification.id}`))
          if (newReferral) setLiveReferral(newReferral)
        }
        notificationLoadRef.current = true
        setTransferNotifications(nextNotifications)
      } catch {
        // Keep the last notification state during a temporary polling failure.
      }
    }
    void loadNotifications()
    if (!canReceiveAttendanceAlerts(sessionUser.role)) return
    const interval = window.setInterval(() => void loadNotifications(), 15000)
    return () => window.clearInterval(interval)
  }, [sessionUser])

  useEffect(() => {
    const openNotifications = () => setNotificationsOpen(true)
    window.addEventListener('thabat-open-notifications', openNotifications)
    return () => window.removeEventListener('thabat-open-notifications', openNotifications)
  }, [])

  const printReferral = (referral: ReferralNotification) => {
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) return
    popup.document.write(`<html dir="rtl"><head><title>نموذج إحالة طالب</title><style>body{font-family:Arial,sans-serif;color:#111;padding:36px;line-height:1.8}header{text-align:center;border-bottom:3px solid #047857;padding-bottom:18px}h1{font-size:24px;margin:0}h2{font-size:18px;color:#047857;margin-top:28px}.meta{display:grid;grid-template-columns:1fr 1fr;border:1px solid #9ca3af}.meta div{padding:10px;border:1px solid #d1d5db}.box{border:1px solid #9ca3af;min-height:90px;padding:12px}.sign{display:flex;justify-content:space-between;margin-top:70px}</style></head><body><header><h1>نموذج إحالة طالب إلى وكيل المدرسة</h1><p>ثَبَت - سجل المتابعة المدرسية</p></header><h2>بيانات الإحالة</h2><div class="meta"><div><b>اسم الطالب:</b> ${referral.studentName}</div><div><b>الشعبة:</b> ${referral.divisionCode}</div><div><b>المادة:</b> ${referral.subject}</div><div><b>تاريخ الواقعة:</b> ${referral.incidentDate}</div><div><b>وقت الواقعة:</b> ${referral.incidentTime}</div><div><b>المكان:</b> ${referral.location}</div><div><b>المعلم:</b> ${referral.createdBy.name}</div></div><h2>سبب الإحالة</h2><div class="box">${referral.reason}</div><h2>الإجراء الفوري المتخذ</h2><div class="box">${referral.actionTaken}</div><div class="sign"><span>توقيع المعلم: __________________</span><span>توقيع وكيل المدرسة: __________________</span></div><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  const unreadNotifications = transferNotifications.filter((notification) => !notification.readAt).length
  const openNotification = async (notification: Notification) => {
    setSelectedNotification(notification)
    if (!notification.readAt && sessionUser) {
      await fetch('/api/transfer-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': sessionUser.id }, body: JSON.stringify({ id: notification.id, type: notification.type, action: 'read' }) })
      setTransferNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
    }
  }

  const markNotificationReviewed = async () => {
    if (!selectedNotification || !sessionUser) return
    if (selectedNotification.type === 'ATTENDANCE') return
    await fetch('/api/transfer-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': sessionUser.id }, body: JSON.stringify({ id: selectedNotification.id, type: selectedNotification.type, action: 'reviewed' }) })
    setTransferNotifications((current) => current.map((item) => item.id === selectedNotification.id ? { ...item, reviewedAt: new Date().toISOString(), readAt: item.readAt ?? new Date().toISOString() } : item))
    setSelectedNotification((current) => current ? { ...current, reviewedAt: new Date().toISOString() } : current)
  }

  const teamOptions = useMemo(() => [...TEAM_OPTIONS, ...dbTeams].map((team) => team.id === 'all' ? { ...team, label: t('allTeams') } : team), [dbTeams, t])
  const activeTeamLabel = teamOptions.find((team) => team.id === teamId)?.label ?? t('allTeams')

  const handleTeamChange = (value: string) => {
    setTeamId(value)
    setStoredTeamId(value)
  }

  const submitTeam = async () => {
    const trimmed = teamName.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const endpoint = editingTeamId ? `/api/teams/${editingTeamId}` : '/api/teams'
      const method = editingTeamId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'تعذر حفظ الفريق.')

      setTeamDialogOpen(false)
      setTeamName('')
      setEditingTeamId(null)

      await loadTeams()
      window.dispatchEvent(new CustomEvent('thabat-teams-changed'))
      router.refresh()

      if (!editingTeamId && result.data?.id) {
        handleTeamChange(result.data.id)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('save'))
    } finally {
      setLoading(false)
    }
  }

  const deleteTeam = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا الفريق؟' : 'Are you sure you want to delete this team?')) return

    try {
      const response = await fetch(`/api/teams/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(locale === 'ar' ? 'تعذر حذف الفريق.' : 'Unable to delete team.')

      await loadTeams()
      window.dispatchEvent(new CustomEvent('thabat-teams-changed'))
      router.refresh()

      if (teamId === id) {
        setStoredTeamId('all')
        setTeamId('all')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : locale === 'ar' ? 'تعذر حذف الفريق.' : 'Unable to delete team.')
    }
  }

  return (
    <nav className={cn(
      'sticky top-0 z-40 w-full border-b',
      'border-slate-200 dark:border-slate-800',
      'bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm',
      'shadow-sm dark:shadow-lg'
    )}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 w-full items-center justify-between gap-3 overflow-visible px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLocale}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
            >
              <Languages className="h-4 w-4" />
              <span>{locale === 'ar' ? t('switchToEnglish') : t('switchToArabic')}</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('thabat-mobile-sidebar-toggle'))}
              type="button"
              aria-label={locale === 'ar' ? 'فتح القائمة' : 'Open navigation'}
              aria-controls="dashboard-sidebar"
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard" prefetch={false} className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-lg">
                <img src="/icons/app-icon-light.png" alt="Thabat" className="h-full w-full object-cover dark:hidden" />
                <img src="/icons/app-icon-dark.png" alt="Thabat" className="hidden h-full w-full object-cover dark:block" />
              </div>
              <div className="hidden sm:flex flex-col">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">ثَبَت</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Thabat</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {sessionUser && <button type="button" onClick={() => setNotificationsOpen(true)} className="relative hidden items-center justify-center rounded-lg p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700 sm:inline-flex dark:text-slate-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300" aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}><Bell className="h-5 w-5" />{unreadNotifications > 0 && <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}</button>}
            {sessionUser && <Link href="/dashboard/profile" prefetch={false} className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 sm:flex"><User className="h-4 w-4" /><span>{sessionUser.name}</span></Link>}
            {canUseTeamSwitcher(sessionUser?.role) && <div className="relative hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900 sm:flex">
              <Users className="h-4 w-4 text-emerald-school-600" />
              <Select.Root value={teamId} onValueChange={handleTeamChange} dir={dir}>
                <Select.Trigger className="flex items-center gap-2 bg-transparent text-sm text-slate-700 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:bg-transparent data-[state=open]:outline-none data-[state=open]:ring-0 dark:text-slate-200">
                  <Select.Value placeholder={t('allTeams')} />
                  <Select.Icon>
                    <ChevronDown className="h-4 w-4" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="dropdown-animation z-[1000] min-w-[220px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900" position="popper" side="bottom" sideOffset={8} align="end">
                    <Select.Viewport>
                      {teamOptions.map((team) => (
                        <Select.Item key={team.id} value={team.id} className="relative flex cursor-pointer select-none items-center justify-between rounded-md px-3 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:data-[highlighted]:bg-slate-800">
                          <Select.ItemText>{team.label}</Select.ItemText>
                          <Select.ItemIndicator className="ml-2">
                            <Check className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              <button
                type="button"
                onClick={() => {
                  setTeamName('')
                  setEditingTeamId(null)
                  setTeamDialogOpen(true)
                }}
                className="rounded-md bg-emerald-school-100 p-1 text-emerald-school-700 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:outline-none data-[state=open]:ring-0 dark:bg-emerald-school-950/30 dark:text-emerald-school-300"
                aria-label="Create team"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={cn(
                'inline-flex items-center justify-center rounded-lg p-2',
                'hover:bg-slate-100 dark:hover:bg-slate-800',
                'transition-colors duration-200'
              )}
              aria-label={t('toggleTheme')}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-emerald-school-400" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </button>

            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900 sm:flex">
              <span className="text-xs text-slate-500 dark:text-slate-400">{activeTeamLabel}</span>
            </div>

            <button
              onClick={() => { clearSession(); router.push('/login') }}
              className={cn(
                'inline-flex items-center justify-center rounded-lg p-2',
                'hover:bg-red-50 dark:hover:bg-red-950/20',
                'transition-colors duration-200 text-red-600 dark:text-red-400'
              )}
              aria-label={t('logout')}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>{liveReferral && <motion.button type="button" initial={{ opacity: 0, x: 80, y: -12 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }} onClick={() => { setSelectedNotification(liveReferral); setLiveReferral(null); setNotificationsOpen(true) }} className="fixed end-4 top-4 z-[2000] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-amber-300 bg-white p-4 text-start shadow-2xl ring-4 ring-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:ring-amber-950/40"><span className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"><AlertTriangle className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{locale === 'ar' ? 'إحالة طالب جديدة' : 'New student referral'}</span><span className="mt-1 block truncate font-bold text-slate-900 dark:text-white">{liveReferral.studentName}</span><span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{locale === 'ar' ? `من المعلم ${liveReferral.createdBy.name} · اضغط لفتح النموذج` : `From ${liveReferral.createdBy.name} · Click to open the form`}</span></span></span></motion.button>}</AnimatePresence>
      {notificationsOpen && <Modal open={true} onOpenChange={setNotificationsOpen} className="max-w-2xl">
        {!selectedNotification ? <div className="space-y-4" dir={dir}>
          <div className="flex items-center gap-3 border-b border-border pb-4"><Bell className="h-5 w-5 text-emerald-600" /><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? 'الإشعارات' : 'Notifications'}</h2><p className="text-sm text-card-foreground/60">{locale === 'ar' ? 'تنبيهات النقل والحضور.' : 'Transfer and attendance alerts.'}</p></div></div>
          {!transferNotifications.length && <p className="rounded-lg bg-muted p-6 text-center text-sm text-card-foreground/60">{locale === 'ar' ? 'لا توجد إشعارات.' : 'No notifications.'}</p>}
          <div className="space-y-2">{transferNotifications.map((notification) => <button key={`${notification.type}-${notification.id}`} type="button" onClick={() => void openNotification(notification)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-start transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"><div><p className="font-bold text-card-foreground">{notification.type === 'REFERRAL' ? (locale === 'ar' ? `إحالة طالب: ${notification.studentName}` : `Student referral: ${notification.studentName}`) : notification.type === 'ATTENDANCE' ? (locale === 'ar' ? `${notification.status === 'ESCAPED' ? 'هروب' : 'تخطي حصة'}: ${notification.studentName}` : `${notification.status === 'ESCAPED' ? 'Escaped' : 'Skipped class'}: ${notification.studentName}`) : locale === 'ar' ? `${notification.students.length} طالباً إلى الشعبة ${notification.toDivision}` : `${notification.students.length} students to Division ${notification.toDivision}`}</p><p className="mt-1 text-xs text-card-foreground/60">{notification.type === 'REFERRAL' ? (locale === 'ar' ? `من المعلم ${notification.createdBy.name} · الشعبة ${notification.divisionCode}` : `From ${notification.createdBy.name} · Division ${notification.divisionCode}`) : notification.type === 'ATTENDANCE' ? (locale === 'ar' ? `الشعبة ${notification.divisionId} · ${notification.subject}` : `Division ${notification.divisionId} · ${notification.subject}`) : locale === 'ar' ? `من الشعبة ${notification.fromDivision}` : `From Division ${notification.fromDivision}`} · {new Date(notification.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? 'bg-slate-300' : 'bg-red-600'}`} /></button>)}</div>
        </div> : <div className="space-y-4" dir={dir}>
          {selectedNotification.type === 'REFERRAL' ? <>
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? `إحالة طالب: ${selectedNotification.studentName}` : `Student referral: ${selectedNotification.studentName}`}</h2><p className="mt-1 text-sm text-card-foreground/60">{locale === 'ar' ? `من المعلم ${selectedNotification.createdBy.name} · الشعبة ${selectedNotification.divisionCode} · ${selectedNotification.subject}` : `From ${selectedNotification.createdBy.name} · Division ${selectedNotification.divisionCode} · ${selectedNotification.subject}`}</p></div><button type="button" onClick={() => setSelectedNotification(null)} className="rounded-lg border border-border px-3 py-2 text-sm">{locale === 'ar' ? 'رجوع' : 'Back'}</button></div>
            <div className="space-y-3 text-sm"><p className="rounded-lg bg-muted p-3"><b>{locale === 'ar' ? 'السبب' : 'Reason'}:</b> {selectedNotification.reason}</p><p className="rounded-lg bg-muted p-3"><b>{locale === 'ar' ? 'المكان والوقت' : 'Location and time'}:</b> {selectedNotification.location} · {selectedNotification.incidentDate} {selectedNotification.incidentTime}</p></div>
            <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => printReferral(selectedNotification)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"><Printer className="h-4 w-4" />{locale === 'ar' ? 'طباعة النموذج' : 'Print form'}</button><button type="button" onClick={() => void markNotificationReviewed()} className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white">{locale === 'ar' ? 'تحديد كمراجع' : 'Mark as reviewed'}</button></div>
          </> : selectedNotification.type === 'ATTENDANCE' ? <>
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? `${selectedNotification.status === 'ESCAPED' ? 'هروب' : 'تخطي حصة'}: ${selectedNotification.studentName}` : `${selectedNotification.status === 'ESCAPED' ? 'Escaped' : 'Skipped class'}: ${selectedNotification.studentName}`}</h2><p className="mt-1 text-sm text-card-foreground/60">{locale === 'ar' ? `الشعبة ${selectedNotification.divisionId} · ${selectedNotification.subject}` : `Division ${selectedNotification.divisionId} · ${selectedNotification.subject}`} · {selectedNotification.date}</p></div><button type="button" onClick={() => setSelectedNotification(null)} className="rounded-lg border border-border px-3 py-2 text-sm">{locale === 'ar' ? 'رجوع' : 'Back'}</button></div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">{locale === 'ar' ? 'تم تسجيل هذا التنبيه من قبل المعلم.' : 'This alert was recorded by the teacher.'}</p>
          </> : <>
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? `نقل ${selectedNotification.students.length} طالباً إلى الشعبة ${selectedNotification.toDivision}` : `${selectedNotification.students.length} students transferred to Division ${selectedNotification.toDivision}`}</h2><p className="mt-1 text-sm text-card-foreground/60">{locale === 'ar' ? `من الشعبة ${selectedNotification.fromDivision}` : `From Division ${selectedNotification.fromDivision}`} · {new Date(selectedNotification.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p></div><button type="button" onClick={() => setSelectedNotification(null)} className="rounded-lg border border-border px-3 py-2 text-sm">{locale === 'ar' ? 'رجوع' : 'Back'}</button></div>
            <div className="space-y-3">{selectedNotification.students.map((student) => <div key={student.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-card-foreground">{student.fullName}</p><p className="text-xs text-card-foreground/60">{locale === 'ar' ? `من ${student.fromDivision} إلى ${student.toDivision}` : `${student.fromDivision} to ${student.toDivision}`}</p></div><Eye className="h-4 w-4 text-emerald-600" /></div><div className="mt-3 space-y-2">{selectedNotification.grades.filter((grade) => grade.studentId === student.id).map((grade) => <div key={grade.id ?? `${grade.studentId}-${grade.subject}-${grade.teacherId}`} className="rounded-lg bg-muted p-3 text-xs"><p className="font-bold">{grade.subject}</p><p className="mt-1 text-card-foreground/70">{[grade.taskPeriod1, grade.taskPeriod2, grade.examPeriod1, grade.examPeriod2, grade.finalExam].map((value, index) => value === null || value === undefined ? null : `${['مهمة 1', 'مهمة 2', 'اختبار 1', 'اختبار 2', 'نهائي'][index]}: ${value}`).filter(Boolean).join(' · ') || (locale === 'ar' ? 'لا توجد درجات محفوظة' : 'No saved grades')}</p></div>)}</div></div>)}</div>
            <button type="button" onClick={() => void markNotificationReviewed()} disabled={Boolean(selectedNotification.reviewedAt)} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{selectedNotification.reviewedAt ? (locale === 'ar' ? 'تمت المراجعة' : 'Reviewed') : (locale === 'ar' ? 'تحديد كمراجع' : 'Mark as reviewed')}</button>
          </>}
        </div>}
      </Modal>}

      {teamDialogOpen && (
        <Modal open={teamDialogOpen} onOpenChange={setTeamDialogOpen} className="max-w-md">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{editingTeamId ? 'تعديل الفريق' : 'إنشاء فريق جديد'}</h2>
              <button type="button" onClick={() => setTeamDialogOpen(false)} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submitTeam() }}>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="اسم الفريق"
                disabled={loading}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {editingTeamId ? 'حفظ التغييرات' : 'إنشاء الفريق'}
                </button>
                {editingTeamId && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void deleteTeam(editingTeamId)
                      setTeamDialogOpen(false)
                    }}
                    className="rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    aria-label="Delete team"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </Modal>
      )}
    </nav>
  )
}
