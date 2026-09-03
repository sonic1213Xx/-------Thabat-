'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, CheckCircle2, Clock3, FileText, Filter, RotateCcw, Search, ShieldAlert, User, Users, XCircle } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { StyledSelect } from '@/components/ui/styled-select'

type AuditLogRecord = {
  id: string
  action?: string
  targetType?: string
  targetName?: string
  userName?: string
  userId?: string | null
  userRole?: string
  timestamp?: string
  relativeTime?: string
  details?: string
}

const actionLabels: Record<string, { ar: string; en: string }> = {
  STUDENT_CREATED: { ar: 'إضافة طالب', en: 'Student created' }, STUDENT_UPDATED: { ar: 'تعديل بيانات طالب', en: 'Student updated' }, STUDENT_TRANSFERRED: { ar: 'نقل طالب', en: 'Student transferred' },
  WARNING_ISSUED: { ar: 'إصدار إنذار', en: 'Warning issued' }, INCIDENT_RECORDED: { ar: 'تسجيل واقعة', en: 'Incident recorded' }, GATE_PASS_ISSUED: { ar: 'إصدار تصريح خروج', en: 'Gate pass issued' },
  GRADEBOOK_SCORE_UPDATED: { ar: 'تحديث درجة', en: 'Grade updated' }, USER_LOGIN: { ar: 'تسجيل دخول', en: 'User signed in' }, BULK_IMPORT: { ar: 'استعادة من Excel', en: 'Bulk import' },
}
const typeLabels: Record<string, { ar: string; en: string }> = { Student: { ar: 'طلاب', en: 'Students' }, Warning: { ar: 'إنذارات', en: 'Warnings' }, Attendance: { ar: 'حضور', en: 'Attendance' }, Gradebook: { ar: 'درجات', en: 'Gradebook' }, Incident: { ar: 'وقائع', en: 'Incidents' }, GatePass: { ar: 'تصاريح', en: 'Gate passes' }, User: { ar: 'مستخدمون', en: 'Users' } }
const roleLabels: Record<string, { ar: string; en: string }> = { PRINCIPAL: { ar: 'مدير المدرسة', en: 'Principal' }, VICE_PRINCIPAL: { ar: 'وكيل المدرسة', en: 'Vice principal' }, TEACHER: { ar: 'معلم', en: 'Teacher' } }

function actionText(action: string | undefined, english: boolean) { return actionLabels[action ?? '']?.[english ? 'en' : 'ar'] ?? action ?? (english ? 'System event' : 'عملية نظام') }
function typeText(type: string | undefined, english: boolean) { return typeLabels[type ?? '']?.[english ? 'en' : 'ar'] ?? type ?? (english ? 'System' : 'نظام') }
function roleText(role: string | undefined, english: boolean) { return roleLabels[role ?? '']?.[english ? 'en' : 'ar'] ?? role ?? (english ? 'Unknown role' : 'دور غير معروف') }
function detailText(details: string | undefined, english: boolean) {
  if (!details) return english ? 'No additional details' : 'لا توجد تفاصيل إضافية'
  try { return Object.entries(JSON.parse(details) as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join(' · ') } catch { return details }
}
function LogIcon({ type }: { type?: string }) {
  if (type === 'Warning' || type === 'Incident') return <ShieldAlert className="h-5 w-5" />
  if (type === 'Student') return <Users className="h-5 w-5" />
  if (type === 'Attendance') return <CheckCircle2 className="h-5 w-5" />
  return <FileText className="h-5 w-5" />
}

export default function AuditLogPage() {
  const { locale, dir } = useLanguage()
  const english = locale === 'en'
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateOnly, setDateOnly] = useState('')
  const [targetType, setTargetType] = useState('')
  const [action, setAction] = useState('')
  const [userId, setUserId] = useState('')
  const [userRole, setUserRole] = useState('')
  const [search, setSearch] = useState('')
  const labels = english ? { eyebrow: 'Operations', title: 'Thabat Log', description: 'A clear timeline of important school operations.', filters: 'Filter activity', date: 'Date', type: 'Record type', action: 'Action', user: 'User', role: 'User role', all: 'All', results: 'results', clear: 'Clear filters', search: 'Search logs', searchPlaceholder: 'Search people, targets, or details', empty: 'No activity matches these filters.', loading: 'Loading activity...', operator: 'Operator', noDetails: 'No additional details', allUsers: 'All users', allRoles: 'All roles' } : { eyebrow: 'العمليات', title: 'سجل ثَبَت', description: 'خط زمني واضح لأهم العمليات والتغييرات داخل المدرسة.', filters: 'تصفية العمليات', date: 'التاريخ', type: 'نوع السجل', action: 'الإجراء', user: 'المستخدم', role: 'دور المستخدم', all: 'الكل', results: 'نتيجة', clear: 'مسح الفلاتر', search: 'بحث في السجل', searchPlaceholder: 'ابحث عن مستخدم أو هدف أو تفاصيل', empty: 'لا توجد عمليات تطابق هذه الفلاتر.', loading: 'جارٍ تحميل العمليات...', operator: 'المنفذ', noDetails: 'لا توجد تفاصيل إضافية', allUsers: 'جميع المستخدمين', allRoles: 'جميع الأدوار' }

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      const params = new URLSearchParams({ limit: '100' })
      if (dateOnly) params.set('dateOnly', dateOnly)
      if (targetType) params.set('targetType', targetType)
      if (action) params.set('action', action)
      if (userId) params.set('userId', userId)
      try { const response = await fetch(`/api/audit-log?${params}`); const json = await response.json(); setLogs(json.data ?? []) } catch { setLogs([]) } finally { setLoading(false) }
    }
    void loadLogs()
  }, [action, dateOnly, targetType, userId])

  const users = useMemo(() => {
    const uniqueUsers = new Map<string, string>()
    logs.forEach((log) => {
      if (log.userId && log.userName) uniqueUsers.set(log.userId, log.userName)
    })
    return Array.from(uniqueUsers, ([id, name]) => ({ id, name }))
  }, [logs])
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return logs.filter((log) => (!userRole || log.userRole === userRole) && (!query || `${actionText(log.action, english)} ${log.targetName ?? ''} ${log.userName ?? ''} ${detailText(log.details, english)}`.toLocaleLowerCase().includes(query)))
  }, [english, logs, search, userRole])
  const hasFilters = Boolean(dateOnly || targetType || action || userId || userRole || search)
  const clearFilters = () => { setDateOnly(''); setTargetType(''); setAction(''); setUserId(''); setUserRole(''); setSearch('') }

  return <div className="space-y-6" dir={dir}>
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"><div className="relative z-10 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white"><Activity className="h-5 w-5" /></span><span className="text-sm font-semibold uppercase tracking-wider text-primary">{labels.eyebrow}</span></div><h1 className="text-3xl font-bold tracking-tight">{labels.title}</h1><p className="mt-2 max-w-xl text-sm text-card-foreground/65">{labels.description}</p></div><div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-4 py-3"><FileText className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold leading-none">{filteredLogs.length}</p><p className="mt-1 text-xs text-card-foreground/60">{labels.results}</p></div></div></div></header>
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /><h2 className="font-bold">{labels.filters}</h2></div><button type="button" onClick={clearFilters} disabled={!hasFilters} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground/70 transition hover:bg-accent disabled:opacity-40"><RotateCcw className="h-4 w-4" />{labels.clear}</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <label className="text-xs font-bold text-foreground/65">{labels.search}<div className="relative mt-2"><Search className="absolute start-3 top-3 h-4 w-4 text-foreground/40" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={labels.searchPlaceholder} aria-label={labels.search} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 ps-9 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></div></label>
      <label className="text-xs font-bold text-foreground/65">{labels.date}<div className="relative mt-2"><CalendarDays className="pointer-events-none absolute end-3 top-3 h-4 w-4 text-foreground/45" /><input type="date" value={dateOnly} onChange={(event) => setDateOnly(event.target.value)} aria-label={labels.date} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pe-9 text-sm font-normal text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30" /></div></label>
      <label className="text-xs font-bold text-foreground/65">{labels.type}<StyledSelect forceDown value={targetType} onValueChange={setTargetType} placeholder={labels.all} aria-label={labels.type} className="mt-2" options={Object.keys(typeLabels).map((type) => ({ value: type, label: typeText(type, english) }))} /></label>
      <label className="text-xs font-bold text-foreground/65">{labels.action}<StyledSelect forceDown value={action} onValueChange={setAction} placeholder={labels.all} aria-label={labels.action} className="mt-2" options={Object.keys(actionLabels).map((key) => ({ value: key, label: actionText(key, english) }))} /></label>
      <label className="text-xs font-bold text-foreground/65">{labels.user}<StyledSelect forceDown value={userId} onValueChange={setUserId} placeholder={labels.allUsers} aria-label={labels.user} className="mt-2" options={users.map((user) => ({ value: user.id, label: user.name }))} /></label>
      <label className="text-xs font-bold text-foreground/65">{labels.role}<StyledSelect forceDown value={userRole} onValueChange={setUserRole} placeholder={labels.allRoles} aria-label={labels.role} className="mt-2" options={Object.keys(roleLabels).map((role) => ({ value: role, label: roleText(role, english) }))} /></label>
    </div></section>
    {loading ? <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-foreground/60"><Clock3 className="mx-auto mb-3 h-6 w-6 animate-pulse text-primary" />{labels.loading}</div> : filteredLogs.length ? <section className="space-y-3">{filteredLogs.map((log) => <article key={log.id} className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"><div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><LogIcon type={log.targetType} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{actionText(log.action, english)}</h2><time className="inline-flex items-center gap-1 text-xs text-foreground/50"><Clock3 className="h-3.5 w-3.5" />{log.relativeTime || log.timestamp || ''}</time></div><p className="mt-1 text-sm text-foreground/65">{typeText(log.targetType, english)}{log.targetName ? ` · ${log.targetName}` : ''}</p><p className="mt-3 text-sm text-foreground/75">{detailText(log.details, english)}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-foreground/55"><span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{labels.operator}: {log.userName || labels.noDetails}</span><span>{labels.role}: {roleText(log.userRole, english)}</span></div></div></div></article>)}</section> : <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-foreground/60"><XCircle className="mx-auto mb-3 h-6 w-6 text-foreground/40" />{labels.empty}</div>}
  </div>
}