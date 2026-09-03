'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, FileText, ShieldAlert, User, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/language-provider'

interface ActivityItem {
  id: string
  action: string
  targetType?: string
  targetName: string
  operator: string
  role?: string
  details?: string
  time: string
}

const actionLabels: Record<string, { ar: string; en: string }> = {
  STUDENT_CREATED: { ar: 'إضافة طالب', en: 'Student created' }, STUDENT_UPDATED: { ar: 'تعديل بيانات طالب', en: 'Student updated' }, STUDENT_TRANSFERRED: { ar: 'نقل طالب', en: 'Student transferred' },
  WARNING_ISSUED: { ar: 'إصدار إنذار', en: 'Warning issued' }, INCIDENT_RECORDED: { ar: 'تسجيل واقعة', en: 'Incident recorded' }, GATE_PASS_ISSUED: { ar: 'إصدار تصريح خروج', en: 'Gate pass issued' },
  GRADEBOOK_SCORE_UPDATED: { ar: 'تحديث درجة', en: 'Grade updated' }, USER_LOGIN: { ar: 'تسجيل دخول', en: 'User signed in' }, BULK_IMPORT: { ar: 'استعادة من Excel', en: 'Bulk import' },
}
const typeLabels: Record<string, { ar: string; en: string }> = { Student: { ar: 'طلاب', en: 'Students' }, Warning: { ar: 'إنذارات', en: 'Warnings' }, Attendance: { ar: 'حضور', en: 'Attendance' }, Gradebook: { ar: 'درجات', en: 'Gradebook' }, Incident: { ar: 'وقائع', en: 'Incidents' }, GatePass: { ar: 'تصاريح', en: 'Gate passes' }, User: { ar: 'مستخدمون', en: 'Users' } }
const roleLabels: Record<string, { ar: string; en: string }> = { PRINCIPAL: { ar: 'مدير المدرسة', en: 'Principal' }, VICE_PRINCIPAL: { ar: 'وكيل المدرسة', en: 'Vice principal' }, TEACHER: { ar: 'معلم', en: 'Teacher' }, CURATOR: { ar: 'المنشئ', en: 'Creator' } }

function eventText(value: string | undefined, labels: Record<string, { ar: string; en: string }>, english: boolean, fallback: string) { return labels[value ?? '']?.[english ? 'en' : 'ar'] ?? value ?? fallback }
function detailsText(value: string | undefined, english: boolean) {
  if (!value) return english ? 'No additional details' : 'لا توجد تفاصيل إضافية'
  try { return Object.entries(JSON.parse(value) as Record<string, unknown>).map(([key, item]) => `${key}: ${String(item)}`).join(' · ') } catch { return value }
}
function EventIcon({ type }: { type?: string }) {
  if (type === 'Warning' || type === 'Incident') return <ShieldAlert className="h-5 w-5" />
  if (type === 'Student') return <Users className="h-5 w-5" />
  if (type === 'Attendance') return <CheckCircle2 className="h-5 w-5" />
  return <FileText className="h-5 w-5" />
}

export function RecentActivityCard({ activities }: { activities: ActivityItem[] }) {
  const router = useRouter()
  const { t, locale, dir } = useLanguage()
  const english = locale === 'en'
  const ForwardArrow = dir === 'rtl' ? ArrowLeft : ArrowRight

  return <section className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm" dir={dir}>
    <div className="flex items-center justify-between border-b border-border/70 p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Activity className="h-5 w-5" /></span><div><h2 className="font-bold">{t('recentOperations')}</h2><p className="mt-0.5 text-xs text-foreground/55">{english ? 'Latest recorded activity' : 'آخر العمليات المسجلة'}</p></div></div><button type="button" onClick={() => router.push('/dashboard/audit-log')} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-primary transition hover:bg-accent">{t('viewAll')}<ForwardArrow className="h-4 w-4" /></button></div>
    <div className="p-4"><AnimatePresence mode="popLayout">{activities.length ? activities.map((activity, index) => <motion.article key={activity.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ delay: index * 0.08 }} className="relative flex gap-3 rounded-xl p-3 transition hover:bg-accent/60"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><EventIcon type={activity.targetType} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{eventText(activity.action, actionLabels, english, english ? 'System event' : 'عملية نظام')}</h3><time className="inline-flex shrink-0 items-center gap-1 text-xs text-foreground/50"><Clock3 className="h-3.5 w-3.5" />{activity.time}</time></div><p className="mt-1 text-sm text-foreground/65">{eventText(activity.targetType, typeLabels, english, english ? 'System' : 'نظام')} · {activity.targetName}</p><p className="mt-2 truncate text-xs text-foreground/60">{detailsText(activity.details, english)}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/50"><span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{activity.operator}</span>{activity.role && <span>{eventText(activity.role, roleLabels, english, activity.role)}</span>}</div></div></motion.article>) : <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-foreground/60">{t('noOperations')}</div>}</AnimatePresence></div>
  </section>
}