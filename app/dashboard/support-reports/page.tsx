'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Bug, CheckCircle2, Clock3, Lightbulb, Loader2, MessageSquare, Wrench } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getSession } from '@/lib/auth'
import { StyledSelect } from '@/components/ui/styled-select'

type Report = {
  id: string
  category: 'BUG' | 'FIX' | 'SUGGESTION'
  title: string
  description: string
  page?: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  creatorNote?: string | null
  createdAt: string
  reporterId: string
  reporter?: { id: string; name: string; role: string }
}

const categoryIcons = { BUG: Bug, FIX: Wrench, SUGGESTION: Lightbulb }

export default function SupportReportsPage() {
  const { locale, dir } = useLanguage()
  const english = locale === 'en'
  const [reports, setReports] = useState<Report[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<Report['category']>('BUG')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creatorNote, setCreatorNote] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const labels = english
    ? { eyebrow: 'Product support', title: 'Reports Center', description: 'Send a private bug report, fix request, or product suggestion to the Creator.', form: 'Send a report', category: 'Report type', bug: 'Bug', fix: 'Needs fixing', suggestion: 'Suggestion', subject: 'Short title', subjectPlaceholder: 'What should we know?', details: 'Details', detailsPlaceholder: 'Explain what happened, what you expected, and any useful steps to reproduce it.', send: 'Submit report', sending: 'Submitting...', yours: 'Your reports', all: 'All submitted reports', empty: 'No reports yet.', submitted: 'Submitted', note: 'Creator note', notePlaceholder: 'Add an update for the reporter', save: 'Save update', status: 'Status', page: 'Page', open: 'Open', inProgress: 'In progress', resolved: 'Resolved', closed: 'Closed', success: 'Report submitted.', error: 'Something went wrong. Please try again.' }
    : { eyebrow: 'دعم النظام', title: 'مركز البلاغات', description: 'أرسل بلاغاً خاصاً عن خطأ أو طلب إصلاح أو اقتراح إلى المنشئ.', form: 'إرسال بلاغ', category: 'نوع البلاغ', bug: 'خطأ', fix: 'يحتاج إلى إصلاح', suggestion: 'اقتراح', subject: 'عنوان مختصر', subjectPlaceholder: 'ما الذي تريد إبلاغنا به؟', details: 'التفاصيل', detailsPlaceholder: 'اشرح ما حدث، وما المتوقع، وأي خطوات تساعد على إعادة المشكلة.', send: 'إرسال البلاغ', sending: 'جارٍ الإرسال...', yours: 'بلاغاتك', all: 'جميع البلاغات', empty: 'لا توجد بلاغات بعد.', submitted: 'أُرسل في', note: 'ملاحظة المنشئ', notePlaceholder: 'أضف تحديثاً لصاحب البلاغ', save: 'حفظ التحديث', status: 'الحالة', page: 'الصفحة', open: 'مفتوح', inProgress: 'قيد المعالجة', resolved: 'تم الحل', closed: 'مغلق', success: 'تم إرسال البلاغ.', error: 'حدث خطأ. حاول مرة أخرى.' }

  const loadReports = async () => {
    setLoading(true)
    try {
      const session = getSession()
      const response = await fetch('/api/support-reports', { cache: 'no-store', headers: session?.id ? { 'x-thabat-user-id': session.id } : undefined })
      const json = await response.json() as { data?: Report[]; canManage?: boolean }
      if (!response.ok) throw new Error()
      setReports(json.data ?? [])
      setCanManage(Boolean(json.canManage))
    } catch { setReports([]) } finally { setLoading(false) }
  }

  useEffect(() => { void loadReports() }, [])

  const submitReport = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    setSaving(true)
    try {
      const session = getSession()
      const response = await fetch('/api/support-reports', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.id ? { 'x-thabat-user-id': session.id } : {}) }, body: JSON.stringify({ category, title, description, page: window.location.pathname }) })
      if (!response.ok) throw new Error()
      setTitle('')
      setDescription('')
      setMessage(labels.success)
      await loadReports()
    } catch { setMessage(labels.error) } finally { setSaving(false) }
  }

  const updateReport = async (report: Report, nextStatus: Report['status']) => {
    setUpdating(report.id)
    const session = getSession()
    try {
      const response = await fetch('/api/support-reports', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(session?.id ? { 'x-thabat-user-id': session.id } : {}) }, body: JSON.stringify({ id: report.id, status: nextStatus, creatorNote: creatorNote[report.id] ?? report.creatorNote ?? '' }) })
      if (!response.ok) throw new Error()
      await loadReports()
    } catch { setMessage(labels.error) } finally { setUpdating(null) }
  }

  const statusLabels = { OPEN: labels.open, IN_PROGRESS: labels.inProgress, RESOLVED: labels.resolved, CLOSED: labels.closed }
  const categoryLabels = { BUG: labels.bug, FIX: labels.fix, SUGGESTION: labels.suggestion }
  const counts = useMemo(() => reports.reduce((result, report) => ({ ...result, [report.status]: (result[report.status] ?? 0) + 1 }), {} as Record<string, number>), [reports])

  return <div className="space-y-6" dir={dir}>
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"><div className="relative z-10 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white"><MessageSquare className="h-5 w-5" /></span><span className="text-sm font-semibold uppercase tracking-wider text-primary">{labels.eyebrow}</span></div><h1 className="text-3xl font-bold tracking-tight">{labels.title}</h1><p className="mt-2 max-w-xl text-sm text-card-foreground/65">{labels.description}</p></div>{canManage && <div className="flex gap-2">{(['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((status) => <div key={status} className="rounded-xl border border-border/60 bg-muted/50 px-4 py-3 text-center"><p className="text-2xl font-bold leading-none">{counts[status] ?? 0}</p><p className="mt-1 text-xs text-card-foreground/60">{statusLabels[status]}</p></div>)}</div>}</div></header>
    <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"><div className="mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">{labels.form}</h2></div><form onSubmit={submitReport} className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold">{labels.category}<StyledSelect value={category} onValueChange={(value) => setCategory(value as Report['category'])} options={[{ value: 'BUG', label: labels.bug }, { value: 'FIX', label: labels.fix }, { value: 'SUGGESTION', label: labels.suggestion }]} className="mt-2" /></label><label className="text-sm font-semibold">{labels.subject}<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={labels.subjectPlaceholder} className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-normal outline-none focus:border-primary" /></label><label className="text-sm font-semibold md:col-span-2">{labels.details}<textarea required maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={labels.detailsPlaceholder} className="mt-2 w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-normal outline-none focus:border-primary" /></label><div className="flex flex-wrap items-center gap-3 md:col-span-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}{saving ? labels.sending : labels.send}</button>{message && <p className="text-sm text-card-foreground/70" role="status">{message}</p>}</div></form></section>
    <section className="space-y-3"><div className="flex items-center gap-2"><h2 className="text-xl font-bold">{canManage ? labels.all : labels.yours}</h2><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{reports.length}</span></div>{loading ? <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-card-foreground/60"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" /></div> : reports.length ? <div className="space-y-3">{reports.map((report) => { const Icon = categoryIcons[report.category]; return <article key={report.id} className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"><div className="flex items-start gap-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{report.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{categoryLabels[report.category]}</span></div>{canManage && report.reporter && <p className="mt-1 text-xs text-card-foreground/55">{report.reporter.name} · {report.reporter.role}</p>}</div><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${report.status === 'RESOLVED' || report.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : report.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-slate-500/10 text-slate-700 dark:text-slate-300'}`}>{report.status === 'OPEN' ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{statusLabels[report.status]}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-card-foreground/75">{report.description}</p><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-3 text-xs text-card-foreground/55"><span>{labels.submitted}: {new Date(report.createdAt).toLocaleString(english ? 'en-US' : 'ar-SA')}</span>{report.page && <span>{labels.page}: {report.page}</span>}</div>{(report.creatorNote || canManage) && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3"><p className="mb-2 text-xs font-bold text-primary">{labels.note}</p>{canManage ? <><textarea value={creatorNote[report.id] ?? report.creatorNote ?? ''} onChange={(event) => setCreatorNote((current) => ({ ...current, [report.id]: event.target.value }))} placeholder={labels.notePlaceholder} rows={2} className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" /><div className="mt-3 flex flex-wrap items-center gap-2"><StyledSelect value={report.status} onValueChange={(value) => void updateReport(report, value as Report['status'])} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} className="min-w-44" />{updating === report.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}<button type="button" onClick={() => void updateReport(report, report.status)} disabled={updating === report.id} className="rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:bg-accent disabled:opacity-50">{labels.save}</button></div></> : <p className="whitespace-pre-wrap text-sm text-card-foreground/75">{report.creatorNote}</p>}</div>}</div></div></article> })}</div> : <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-card-foreground/60">{labels.empty}</div>}</section>
  </div>
}
