'use client'

import * as Select from '@radix-ui/react-select'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Menu, Sun, Moon, LogOut, Users, Plus, Check, ChevronDown, X, Trash2, Languages, User, Bell, Eye } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { cn, getStoredTeamId, setStoredTeamId, TEAM_OPTIONS, type TeamDefinition } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'
import { clearSession } from '@/lib/auth'
import { getSession, type SessionUser } from '@/lib/auth'
import { isCreatorRole } from '@/lib/permissions'

type DBTeam = { id: string; label: string }
type TransferNotification = { id: string; fromDivision: string; toDivision: string; createdAt: string; readAt: string | null; reviewedAt: string | null; students: Array<{ id: string; fullName: string; fromDivision: string; toDivision: string }>; grades: Array<{ id?: string; studentId: string; divisionId: string; subject: string; teacherId: string; taskPeriod1?: number | null; taskPeriod2?: number | null; examPeriod1?: number | null; examPeriod2?: number | null; finalExam?: number | null; customScores?: Record<string, number | null> }> }

const canUseTeamSwitcher = (role?: string) => Boolean(role && (isCreatorRole(role) || role === 'PRINCIPAL' || role === 'VICE_PRINCIPAL' || role.startsWith('VP_')))

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
  const [transferNotifications, setTransferNotifications] = useState<TransferNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<TransferNotification | null>(null)

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
    void fetch('/api/transfer-notifications', { headers: { 'x-thabat-user-id': sessionUser.id } }).then((response) => response.json()).then((json: { data?: TransferNotification[] }) => setTransferNotifications(json.data ?? [])).catch(() => setTransferNotifications([]))
  }, [sessionUser])

  useEffect(() => {
    const openNotifications = () => setNotificationsOpen(true)
    window.addEventListener('thabat-open-notifications', openNotifications)
    return () => window.removeEventListener('thabat-open-notifications', openNotifications)
  }, [])

  const unreadNotifications = transferNotifications.filter((notification) => !notification.readAt).length
  const openNotification = async (notification: TransferNotification) => {
    setSelectedNotification(notification)
    if (!notification.readAt && sessionUser) {
      await fetch('/api/transfer-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': sessionUser.id }, body: JSON.stringify({ id: notification.id, action: 'read' }) })
      setTransferNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item))
    }
  }

  const markNotificationReviewed = async () => {
    if (!selectedNotification || !sessionUser) return
    await fetch('/api/transfer-notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': sessionUser.id }, body: JSON.stringify({ id: selectedNotification.id, action: 'reviewed' }) })
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

      {notificationsOpen && <Modal open={true} onOpenChange={setNotificationsOpen} className="max-w-2xl">
        {!selectedNotification ? <div className="space-y-4" dir={dir}>
          <div className="flex items-center gap-3 border-b border-border pb-4"><Bell className="h-5 w-5 text-emerald-600" /><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? 'إشعارات نقل الطلاب' : 'Student transfer notifications'}</h2><p className="text-sm text-card-foreground/60">{locale === 'ar' ? 'إشعار واحد لكل دفعة نقل.' : 'One notification for each transfer batch.'}</p></div></div>
          {!transferNotifications.length && <p className="rounded-lg bg-muted p-6 text-center text-sm text-card-foreground/60">{locale === 'ar' ? 'لا توجد إشعارات نقل جديدة.' : 'No transfer notifications.'}</p>}
          <div className="space-y-2">{transferNotifications.map((notification) => <button key={notification.id} type="button" onClick={() => void openNotification(notification)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-start transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"><div><p className="font-bold text-card-foreground">{locale === 'ar' ? `${notification.students.length} طالباً إلى الشعبة ${notification.toDivision}` : `${notification.students.length} students to Division ${notification.toDivision}`}</p><p className="mt-1 text-xs text-card-foreground/60">{locale === 'ar' ? `من الشعبة ${notification.fromDivision}` : `From Division ${notification.fromDivision}`} · {new Date(notification.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? 'bg-slate-300' : 'bg-red-600'}`} /></button>)}</div>
        </div> : <div className="space-y-4" dir={dir}>
          <div className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? `نقل ${selectedNotification.students.length} طالباً إلى الشعبة ${selectedNotification.toDivision}` : `${selectedNotification.students.length} students transferred to Division ${selectedNotification.toDivision}`}</h2><p className="mt-1 text-sm text-card-foreground/60">{locale === 'ar' ? `من الشعبة ${selectedNotification.fromDivision}` : `From Division ${selectedNotification.fromDivision}`} · {new Date(selectedNotification.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}</p></div><button type="button" onClick={() => setSelectedNotification(null)} className="rounded-lg border border-border px-3 py-2 text-sm">{locale === 'ar' ? 'رجوع' : 'Back'}</button></div>
          <div className="space-y-3">{selectedNotification.students.map((student) => <div key={student.id} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-card-foreground">{student.fullName}</p><p className="text-xs text-card-foreground/60">{locale === 'ar' ? `من ${student.fromDivision} إلى ${student.toDivision}` : `${student.fromDivision} to ${student.toDivision}`}</p></div><Eye className="h-4 w-4 text-emerald-600" /></div><div className="mt-3 space-y-2">{selectedNotification.grades.filter((grade) => grade.studentId === student.id).map((grade) => <div key={grade.id ?? `${grade.studentId}-${grade.subject}-${grade.teacherId}`} className="rounded-lg bg-muted p-3 text-xs"><p className="font-bold">{grade.subject}</p><p className="mt-1 text-card-foreground/70">{[grade.taskPeriod1, grade.taskPeriod2, grade.examPeriod1, grade.examPeriod2, grade.finalExam].map((value, index) => value === null || value === undefined ? null : `${['مهمة 1', 'مهمة 2', 'اختبار 1', 'اختبار 2', 'نهائي'][index]}: ${value}`).filter(Boolean).join(' · ') || (locale === 'ar' ? 'لا توجد درجات محفوظة' : 'No saved grades')}</p></div>)}</div></div>)}</div>
          <button type="button" onClick={() => void markNotificationReviewed()} disabled={Boolean(selectedNotification.reviewedAt)} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{selectedNotification.reviewedAt ? (locale === 'ar' ? 'تمت المراجعة' : 'Reviewed') : (locale === 'ar' ? 'تحديد كمراجع' : 'Mark as reviewed')}</button>
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
