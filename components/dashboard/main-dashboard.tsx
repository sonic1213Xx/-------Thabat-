'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Users,
  BookOpen,
  AlertCircle,
  TrendingUp,
  FileText,
  Clock,
  CalendarCheck,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import { StatCard } from './stat-card'
import { RecentActivityCard } from './recent-activity-card'
import { QuickActionCard } from './quick-action-card'
import { TabLoadingSkeleton } from './tab-loading-skeleton'
import { useLanguage } from '@/components/language-provider'
import { getProfiles, getSession } from '@/lib/auth'
import { fetchCached, invalidateCached } from '@/lib/client-cache'

type ApiStudent = {
  id: string
  fullName: string
  divisionCode: string
  gradeLevel: number
  behaviorScore: number
  attendanceScore: number
  createdAt?: string
}

type ApiWarning = {
  id: string
  studentId: string
  student?: { fullName?: string }
  issuedByName?: string
  issuedAt?: string
  reason?: string
  type?: string
}

type ApiAudit = {
  id: string
  action?: string
  targetType?: string
  targetName?: string
  userName?: string
  userRole?: string
  details?: string
  timestamp?: string
  relativeTime?: string
}

type ApiAttendance = { status: string }
type DashboardTabId = 'overview' | 'students' | 'teams' | 'divisions'

type DashboardStat = {
  id: string
  label: string
  value: string
  change: string
  icon: typeof Users
  color: 'emerald' | 'blue' | 'orange' | 'purple'
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
}

const quickActions = [
  {
    id: '1',
    label: 'importExcel',
    icon: FileText,
    href: '/dashboard/students?action=import',
    description: 'importDescription',
  },
  {
    id: '2',
    label: 'addStudent',
    icon: Users,
    href: '/dashboard/students',
    description: 'addStudentDescription',
  },
  {
    id: '3',
    label: 'issueWarning',
    icon: AlertCircle,
    href: '/dashboard/warnings',
    description: 'warningDescription',
  },
  {
    id: '4',
    label: 'auditLog',
    icon: Clock,
    href: '/dashboard/audit-log',
    description: 'logDescription',
  },
  {
    id: '5',
    label: 'attendance',
    icon: CalendarCheck,
    href: '/dashboard/attendance',
    description: 'attendanceDescription',
  },
] as const

const tabMeta: Array<{ id: DashboardTabId; label: string }> = [
  { id: 'overview', label: 'overviewTab' },
  { id: 'students', label: 'students' },
  { id: 'teams', label: 'teamsTab' },
  { id: 'divisions', label: 'divisionsTab' },
]

function OverviewTabView({
  dashboardStats,
  recentActivities,
  averageBehavior,
}: {
  dashboardStats: DashboardStat[]
  recentActivities: Array<{ id: string; action: string; targetType?: string; targetName: string; operator: string; role?: string; details?: string; time: string }>
  averageBehavior: number
}) {
  const { t, dir } = useLanguage()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="dashboard"
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {t('welcomeThabat')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t('dashboardDescription')}
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboardStats.map((stat) => (
            <motion.div
              key={stat.id}
              layout
              layoutId={`stat-${stat.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <RecentActivityCard activities={recentActivities} />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm"
          >
            <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t('quickSummary')}</h3>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground/70">{t('behaviorAverage')}</span>
                  <span className="text-lg font-bold text-primary">{averageBehavior}%</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-muted">
                  <div className="h-2.5 rounded-full bg-primary" style={{ width: `${averageBehavior}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/50 p-4">
                <p className="text-sm text-card-foreground/70">{t('operatingIndicators')}</p>
                <ul className="mt-3 space-y-2 text-sm text-card-foreground/85" dir={dir}>
                  <li className="flex items-center justify-start gap-3.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{t('attendanceSynced')}</li>
                  <li className="flex items-center justify-start gap-3.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{t('warningsCorrected')}</li>
                  <li className="flex items-center justify-start gap-3.5"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{t('reportsReady')}</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('quickActions')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} label={t(action.label as never)} description={t(action.description as never)} icon={action.icon} href={action.href} id={action.id} />
            ))}
          </div>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  )
}

function StudentTabView({ students }: { students: ApiStudent[] }) {
  const { t, locale } = useLanguage()
  const router = useRouter()
  if (!students.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('noStudentData')}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('studentsAfterImport')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('studentManagement')}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t('currentStudents')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {students.slice(0, 10).map((student) => (
          <div key={student.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('student')}</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{student.fullName}</p>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span>{t('classLabel')}: {student.divisionCode || t('unspecified')}</span>
              <span>{student.gradeLevel || 0}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-center border-t border-slate-200 pt-5 dark:border-slate-800">
        <button type="button" onClick={() => router.push('/dashboard/students')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900">
          {locale === 'ar' ? 'عرض جميع الطلاب' : 'View all students'}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function TeamsTabView({ teams }: { teams: Array<{ id: string; label: string }> }) {
  const { t } = useLanguage()
  if (!teams.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('noSavedTeams')}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('teamAppearsAfterCreation')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('teams')}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t('currentTeams')}</p>
      <div className="mt-6 space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="font-medium text-slate-900 dark:text-white">{team.label}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {t('active')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DivisionsTabView({ divisions, students }: { divisions: Array<{ id: string; code: string; name: string }>; students: ApiStudent[] }) {
  const { t } = useLanguage()
  const summary = divisions.length
    ? divisions.map((division) => {
        const filtered = students.filter((student) => student.divisionCode === division.code)
        const averageBehavior = filtered.length
          ? Math.round(filtered.reduce((sum, student) => sum + (student.behaviorScore || 0), 0) / filtered.length)
          : 0

        return {
          ...division,
          count: filtered.length,
          averageBehavior,
        }
      })
    : []

  if (!summary.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('noSavedDivisions')}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t('divisionAppearsAfterAdd')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('divisionManagement')}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{t('currentDivisionMetrics')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {summary.map((division) => (
          <div key={division.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{division.name || `الفصل ${division.code}`}</span>
              <span className="text-sm text-emerald-600">{t('active')}</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('studentCount')}: {division.count}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('behaviorAverage')}: {division.averageBehavior}/100</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ActiveTabContent({
  tab,
  dashboardStats,
  recentActivities,
  averageBehavior,
  students,
  teams,
  divisions,
}: {
  tab: DashboardTabId
  dashboardStats: DashboardStat[]
  recentActivities: Array<{ id: string; action: string; targetType?: string; targetName: string; operator: string; role?: string; details?: string; time: string }>
  averageBehavior: number
  students: ApiStudent[]
  teams: Array<{ id: string; label: string }>
  divisions: Array<{ id: string; code: string; name: string }>
}) {
  switch (tab) {
    case 'students':
      return <StudentTabView students={students} />
    case 'teams':
      return <TeamsTabView teams={teams} />
    case 'divisions':
      return <DivisionsTabView divisions={divisions} students={students} />
    case 'overview':
    default:
      return <OverviewTabView dashboardStats={dashboardStats} recentActivities={recentActivities} averageBehavior={averageBehavior} />
  }
}

export function MainDashboard() {
  const { t, locale } = useLanguage()
  const [students, setStudents] = useState<ApiStudent[]>([])
  const [warnings, setWarnings] = useState<ApiWarning[]>([])
  const [auditLogs, setAuditLogs] = useState<ApiAudit[]>([])
  const [attendance, setAttendance] = useState<ApiAttendance[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; label: string }>>([])
  const [divisions, setDivisions] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview')
  const [pendingTab, setPendingTab] = useState<DashboardTabId | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const tabTimerRef = useRef<number | null>(null)
  const session = getSession()

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const dashboardData = await fetchCached<{ data?: { students?: ApiStudent[]; warnings?: ApiWarning[]; auditLogs?: ApiAudit[]; attendance?: ApiAttendance[]; teams?: Array<{ id: string; label: string }>; divisions?: Array<{ id: string; code: string; name: string }> } }>(`dashboard:data:${session?.id ?? 'anonymous'}`, '/api/dashboard/data', { headers: session?.id ? { 'x-thabat-user-id': session.id } : undefined })
        setStudents(dashboardData.data?.students ?? [])
        setWarnings(dashboardData.data?.warnings ?? [])
        setAuditLogs(dashboardData.data?.auditLogs ?? [])
        setAttendance(dashboardData.data?.attendance ?? [])
        setTeams(dashboardData.data?.teams ?? [])
        setDivisions(dashboardData.data?.divisions ?? [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadDashboardData()
    const cacheKey = `dashboard:data:${session?.id ?? 'anonymous'}`
    const refreshAttendance = () => { invalidateCached(cacheKey); void loadDashboardData() }
    const refreshWarnings = () => { invalidateCached(cacheKey); void loadDashboardData() }
    window.addEventListener('thabat-attendance-changed', refreshAttendance)
    window.addEventListener('thabat-warnings-changed', refreshWarnings)
    return () => {
      window.removeEventListener('thabat-attendance-changed', refreshAttendance)
      window.removeEventListener('thabat-warnings-changed', refreshWarnings)
    }
  }, [session?.id])

  const hasDashboardData = students.length > 0 || warnings.length > 0 || auditLogs.length > 0 || attendance.length > 0 || teams.length > 0 || divisions.length > 0

  const accessibleStudents = useMemo(() => {
    const session = getSession()
    if (session?.role !== 'TEACHER') return students
    const profile = getProfiles().find((item) => item.id === session.id)
    const assignedDivisions = profile?.assigned_divisions ?? []
    return students.filter((student) => student.divisionCode && assignedDivisions.includes(student.divisionCode))
  }, [students])

  const dashboardStats = useMemo<DashboardStat[]>(() => {
    const totalStudents = accessibleStudents.length
    const divisionsCount = divisions.length || new Set(accessibleStudents.map((student) => student.divisionCode)).size
    const warningsToday = warnings.filter((warning) => {
      const issuedAt = warning.issuedAt ? new Date(warning.issuedAt) : null
      if (!issuedAt) return false
      const today = new Date()
      return issuedAt.toDateString() === today.toDateString()
    }).length
    const operations = auditLogs.length
    const presentAttendance = attendance.filter((record) => record.status === 'PRESENT').length
    const attendanceRate = accessibleStudents.length ? Math.round((presentAttendance / accessibleStudents.length) * 100) : 0

    return [
      {
        id: '1',
        label: t('totalStudents'),
        value: totalStudents.toLocaleString('en-US'),
        change: '',
        icon: Users,
        color: 'emerald',
      },
      {
        id: '2',
        label: t('activeDivisions'),
        value: String(divisionsCount),
        change: '',
        icon: BookOpen,
        color: 'blue',
      },
      {
        id: '3',
        label: t('warningsToday'),
        value: String(warningsToday),
        change: '',
        icon: AlertCircle,
        color: 'orange',
      },
      {
        id: '4',
        label: t('loggedOperations'),
        value: operations.toLocaleString('en-US'),
        change: '',
        icon: TrendingUp,
        color: 'purple',
      },
    ]
  }, [accessibleStudents, warnings, auditLogs, attendance, locale])

  const recentActivities = useMemo(() => {
    return (auditLogs.slice(0, 3) || []).map((log, index) => ({
      id: log.id || String(index),
      action: log.action || t('action'),
      targetType: log.targetType,
      targetName: log.targetName || t('student'),
      operator: locale === 'en' && log.userName === 'نظام ثَبَت' ? t('brandName') : (log.userName || t('brandName')),
      role: log.userRole,
      details: log.details,
      time: locale === 'ar' ? (log.relativeTime || log.timestamp || 'الآن') : (log.timestamp || 'Now'),
    }))
  }, [auditLogs, locale, t])

  const averageBehavior = useMemo(() => {
    if (!accessibleStudents.length) return 0
    return Math.round(accessibleStudents.reduce((sum, student) => sum + (student.behaviorScore ?? 0), 0) / accessibleStudents.length)
  }, [accessibleStudents])

  useEffect(() => {
    return () => {
      if (tabTimerRef.current !== null) {
        window.clearTimeout(tabTimerRef.current)
      }
    }
  }, [])

  const handleTabChange = (nextTab: DashboardTabId) => {
    if (nextTab === activeTab || isLoading) return

    setPendingTab(nextTab)
    setIsLoading(true)

    if (tabTimerRef.current !== null) {
      window.clearTimeout(tabTimerRef.current)
    }

    tabTimerRef.current = window.setTimeout(() => {
      setActiveTab(nextTab)
      setPendingTab(null)
      setIsLoading(false)
      tabTimerRef.current = null
    }, 500)
  }

  return (
    <div className="space-y-6">
      <div className="flex h-14 max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:h-12 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
        {tabMeta.map((tab) => {
          const isSelected = activeTab === tab.id
          const isPending = pendingTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isLoading}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex h-full min-w-[9.5rem] shrink-0 items-center justify-center rounded-xl px-2 text-sm font-medium leading-none transition md:min-w-0 md:w-full ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLoading
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isPending ? t('loading') : t(tab.label as never)}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <TabLoadingSkeleton />
      ) : (
        <ActiveTabContent
          tab={activeTab}
          dashboardStats={dashboardStats}
          recentActivities={recentActivities}
          averageBehavior={averageBehavior}
          students={accessibleStudents}
          teams={teams}
          divisions={divisions}
        />
      )}
    </div>
  )
}
