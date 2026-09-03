'use client'

import { useMemo, useState } from 'react'
import { Bus, CheckCircle2, MapPin, Plus, Users } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { useLanguage } from '@/components/language-provider'

export default function TransportationPage() {
  const { locale } = useLanguage()
  const english = locale === 'en'
  const session = getSession()
  const [routes, setRoutes] = useState<Array<{ id: string; label: string; status: string; students: number }>>([])
  const [routeName, setRouteName] = useState('')
  const canManage = hasPermission(session?.role, 'transportation', 'update')
  const addRoute = () => { const label = routeName.trim(); if (!label) return; setRoutes((current) => [...current, { id: crypto.randomUUID(), label, status: 'READY', students: 0 }]); setRouteName('') }
  const readyRoutes = useMemo(() => routes.filter((route) => route.status === 'READY').length, [routes])
  if (!hasPermission(session?.role, 'transportation', 'read')) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-foreground">{english ? 'Transportation access is required.' : 'يلزم الدخول بدور مشرف النقل.'}</div>
  return <div className="space-y-6 text-foreground" dir={english ? 'ltr' : 'rtl'}><header><p className="text-sm font-semibold uppercase tracking-wider text-primary">{english ? 'Transportation' : 'النقل المدرسي'}</p><h1 className="mt-1 text-3xl font-bold">{english ? 'Route operations' : 'عمليات المسارات'}</h1><p className="mt-2 text-sm text-foreground/65">{english ? 'Prepare routes and verify student pickup and drop-off.' : 'إدارة المسارات والتحقق من استلام وتسليم الطلاب.'}</p></header><div className="grid gap-4 sm:grid-cols-3"><Metric icon={MapPin} label={english ? 'Routes' : 'المسارات'} value={String(routes.length)} /><Metric icon={CheckCircle2} label={english ? 'Ready today' : 'جاهزة اليوم'} value={String(readyRoutes)} /><Metric icon={Users} label={english ? 'Students tracked' : 'طلاب متابعون'} value={String(routes.reduce((sum, route) => sum + route.students, 0))} /></div><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Bus className="h-5 w-5 text-primary" /><h2 className="font-bold">{english ? 'Bus routes' : 'مسارات الحافلات'}</h2></div>{canManage && <div className="mb-5 flex gap-2"><input value={routeName} onChange={(event) => setRouteName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addRoute()} placeholder={english ? 'Route ID or name' : 'معرف أو اسم المسار'} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /><button type="button" onClick={addRoute} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"><Plus className="h-4 w-4" />{english ? 'Add route' : 'إضافة مسار'}</button></div>}{routes.length ? <div className="grid gap-3 md:grid-cols-2">{routes.map((route) => <div key={route.id} className="flex items-center justify-between rounded-xl border border-border p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary"><MapPin className="h-5 w-5" /></span><div><p className="font-semibold">{route.label}</p><p className="text-xs text-foreground/55">{route.students} {english ? 'students assigned' : 'طالب مسند'}</p></div></div><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">{english ? 'Ready' : 'جاهز'}</span></div>)}</div> : <p className="py-8 text-center text-sm text-foreground/55">{english ? 'Add a route to begin tracking transport.' : 'أضف مساراً لبدء متابعة النقل.'}</p>}</section></div>
}
function Metric({ icon: Icon, label, value }: { icon: typeof Bus; label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-sm text-foreground/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div> }
