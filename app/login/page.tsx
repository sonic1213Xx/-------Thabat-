'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, Languages, Lock, LogIn, ShieldCheck, User, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { authenticate, getProfiles, getSession, saveProfile, setSession } from '@/lib/auth'
import { useLanguage } from '@/components/language-provider'
import { VideoBackground } from '@/components/video-background'
import type { TeachingAssignment } from '@/lib/auth'

type AuthenticatedUser = NonNullable<ReturnType<typeof authenticate>> & { assigned_divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: TeachingAssignment[] }

export default function LoginPage() {
  const router = useRouter()
  const { locale, toggleLocale } = useLanguage()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [createMode, setCreateMode] = useState(false)
  const [name, setName] = useState('')
  const [divisions, setDivisions] = useState<string[]>([])
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    if (getSession()) router.replace('/dashboard')
    void fetch('/api/divisions').then((response) => response.json()).then((json) => setDivisions((json.data ?? []).map((item: { code: string }) => item.code))).catch(() => setDivisions([]))
  }, [router])

  const enterDashboard = (user: ReturnType<typeof authenticate>) => {
    if (!user) return
    setSession(user, remember)
    setIsEntering(true)
    window.setTimeout(() => router.push('/dashboard'), 900)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (createMode) {
      const trimmedId = id.trim()
      const trimmedName = name.trim()
      if (!trimmedName || !trimmedId || !password) return
      const normalizedAssignments = teachingAssignments.map((assignment) => ({ ...assignment, subject: assignment.subject.trim(), divisions: Array.from(new Set(assignment.divisions)) })).filter((assignment) => assignment.subject)
      if (!normalizedAssignments.length) {
        setError(locale === 'ar' ? 'أضف مادة واحدة على الأقل.' : 'Add at least one subject.')
        return
      }
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trimmedId, name: trimmedName, password, divisions: Array.from(new Set(normalizedAssignments.flatMap((assignment) => assignment.divisions))), subjectsTaught: normalizedAssignments.map((assignment) => assignment.subject), teachingAssignments: normalizedAssignments }) })
      const result = await response.json() as { data?: AuthenticatedUser; error?: string }
      if (!response.ok || !result.data) {
        setError(result.error ?? (locale === 'ar' ? 'تعذر إنشاء الحساب.' : 'Unable to create account.'))
        return
      }
      saveProfile({ ...result.data, password, createdAt: new Date().toISOString(), lastActivity: locale === 'ar' ? 'لم يسجل الدخول بعد' : 'Not logged in yet', assigned_divisions: result.data.assigned_divisions ?? [], subjectsTaught: result.data.subjectsTaught ?? [], teachingAssignments: result.data.teachingAssignments ?? [] })
      enterDashboard(result.data)
      return
    }
    let user: ReturnType<typeof authenticate> = null
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password }) })
      const result = await response.json() as { data?: AuthenticatedUser }
      user = result.data ?? null
      if (result.data) saveProfile({ ...result.data, password, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString(), assigned_divisions: result.data.assigned_divisions ?? [], subjectsTaught: result.data.subjectsTaught ?? [], teachingAssignments: result.data.teachingAssignments ?? [] })
    } catch { /* Fall back to the built-in development credentials below. */ }
    user ??= authenticate(id, password)
    if (!user) {
      setError(locale === 'ar' ? 'رقم الهوية أو كلمة المرور غير صحيحة.' : 'Incorrect ID number or password.')
      return
    }
    enterDashboard(user)
  }

  return <main className={`relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-10 ${isEntering ? 'login-page-entering' : ''}`} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <VideoBackground />
    <div className="fixed inset-0 z-0 bg-slate-950/60 backdrop-blur-sm" aria-hidden="true" />
    <button type="button" onClick={toggleLocale} aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'} className="fixed end-5 top-5 z-30 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-emerald-400/60 hover:bg-slate-900/85 focus:outline-none focus:ring-2 focus:ring-emerald-400"><Languages className="h-4 w-4 text-emerald-300" />{locale === 'ar' ? 'English' : 'العربية'}</button>
    <section className={`relative z-10 bg-slate-950/75 backdrop-blur-xl border border-emerald-500/20 shadow-2xl shadow-emerald-950/50 rounded-2xl p-8 w-full max-w-md transition-[box-shadow,border-color] duration-500 ${createMode ? 'login-card-create' : ''}`}>
      <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]"><ShieldCheck className="h-7 w-7" /></div><h1 className="text-2xl font-bold text-white tracking-wide">ثَبَت</h1><p className="mt-1 text-xs text-slate-400 font-medium">Thabat School Operations</p></div>
      <form key={createMode ? 'create-profile' : 'sign-in'} onSubmit={submit} className="login-form-mode space-y-5">
        {createMode && <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">{locale === 'ar' ? 'الاسم الكامل' : 'Full name'}</span><div className="relative"><User className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 ps-10 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /></div></label>}
        <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">{locale === 'ar' ? 'رقم الهوية / الرقم الوظيفي' : 'ID number / employee ID'}</span><div className="relative"><User className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" /><input value={id} onChange={(event) => setId(event.target.value)} inputMode="numeric" autoComplete="username" required className="w-full bg-slate-900/80 border border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 ps-10 text-sm transition-all outline-none" /></div></label>
        <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">{locale === 'ar' ? 'كلمة المرور' : 'Password'}</span><div className="relative"><Lock className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" /><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={createMode ? 'new-password' : 'current-password'} required className="w-full bg-slate-900/80 border border-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3 ps-10 text-sm transition-all outline-none" /></div></label>
        {createMode && <div className="space-y-3 rounded-xl border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-300">{locale === 'ar' ? 'المواد والشعب التي تدرسها' : 'Subjects and divisions taught'}</span><button type="button" onClick={() => setTeachingAssignments((current) => [...current, { id: `signup-assignment-${Date.now()}`, subject: '', gradeLevel: null, divisions: [], attendance: true, gradebook: true }])} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">{locale === 'ar' ? 'إضافة مادة' : 'Add subject'}</button></div>
          {!teachingAssignments.length && <p className="text-xs text-slate-500">{locale === 'ar' ? 'أضف مادة واربطها بالشعب.' : 'Add a subject and map it to divisions.'}</p>}
          {teachingAssignments.map((assignment) => <div key={assignment.id} className="space-y-2 rounded-lg border border-slate-700 p-2"><div className="flex gap-2"><input value={assignment.subject} onChange={(event) => setTeachingAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, subject: event.target.value } : item))} placeholder={locale === 'ar' ? 'المادة' : 'Subject'} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /><button type="button" onClick={() => setTeachingAssignments((current) => current.filter((item) => item.id !== assignment.id))} className="rounded-lg px-2 text-red-300" aria-label={locale === 'ar' ? 'حذف المادة' : 'Remove subject'}>×</button></div><div className="flex flex-wrap gap-2">{divisions.map((code) => <label key={code} className={`cursor-pointer rounded-md border px-2 py-1 text-xs ${assignment.divisions.includes(code) ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-700 text-slate-300'}`}><input type="checkbox" className="sr-only" checked={assignment.divisions.includes(code)} onChange={() => setTeachingAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, divisions: item.divisions.includes(code) ? item.divisions.filter((division) => division !== code) : [...item.divisions, code] } : item))} />{code}</label>)}</div></div>)}
        </div>}
        <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-slate-300"><span className="relative flex h-5 w-5 shrink-0 items-center justify-center"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-600 bg-slate-900/80 transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 checked:border-emerald-500 checked:bg-emerald-500" /><Check className="pointer-events-none absolute h-3.5 w-3.5 scale-75 text-white opacity-0 transition peer-checked:scale-100 peer-checked:opacity-100" /></span><span className="transition-colors group-hover:text-white">{locale === 'ar' ? 'تذكرني' : 'Remember me'}</span></label>
        {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <button type="submit" disabled={isEntering} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80"><>{createMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}</>{createMode ? (locale === 'ar' ? 'إنشاء الحساب' : 'Create profile') : (locale === 'ar' ? 'تسجيل الدخول' : 'Sign in')}</button>
      </form>
      <button type="button" onClick={() => { setCreateMode(!createMode); setError('') }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-3 text-sm font-semibold text-emerald-300 transition duration-300 hover:bg-emerald-500/10"><span className="login-mode-icon">{createMode ? <ArrowLeft className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}</span><span>{createMode ? (locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to sign in') : (locale === 'ar' ? 'إنشاء ملف مستخدم' : 'Create a user profile')}</span></button>
    </section>
    {isEntering && <div className="login-launch-overlay" role="status" aria-live="polite"><div className="login-launch-mark"><span className="login-launch-ring" /><ShieldCheck className="relative z-10 h-10 w-10 text-emerald-300" /></div><p>{locale === 'ar' ? 'جارٍ فتح لوحة التحكم' : 'Opening your dashboard'}</p></div>}
  </main>
}
