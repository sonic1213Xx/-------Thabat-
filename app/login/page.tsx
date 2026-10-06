'use client'

import { FormEvent, MouseEvent, useEffect, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Languages, Loader2, Lock, LogIn, ShieldCheck, User, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AUTH_PERSISTENCE_KEY, saveProfile, setSession } from '@/lib/auth'
import { SESSION_CHECK_ANIMATION_KEY } from '@/lib/storage'
import { useLanguage } from '@/components/language-provider'
import { VideoBackground } from '@/components/video-background'
import type { TeachingAssignment } from '@/lib/auth'

type AuthenticatedUser = { id: string; name: string; role: import('@/lib/auth').AppRole; assigned_divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: TeachingAssignment[] }

export default function LoginPage() {
  const router = useRouter()
  const { locale, toggleLocale } = useLanguage()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [createMode, setCreateMode] = useState(false)
  const [name, setName] = useState('')
  const [divisions, setDivisions] = useState<string[]>([])
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
  const [isEntering, setIsEntering] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateX = useTransform(pointerY, [-300, 300], [4, -4])
  const rotateY = useTransform(pointerX, [-300, 300], [-4, 4])
  const prefersReducedMotion = useReducedMotion()

  const handleCardMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set(event.clientX - bounds.left - bounds.width / 2)
    pointerY.set(event.clientY - bounds.top - bounds.height / 2)
  }

  const resetCardTilt = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  useEffect(() => {
    void fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ data: AuthenticatedUser }> : null)
      .then((result) => {
        if (!result?.data) return
        setSession(result.data, localStorage.getItem(AUTH_PERSISTENCE_KEY) === 'true')
        router.replace('/dashboard')
      })
      .catch(() => undefined)
    void fetch('/api/divisions/public').then((response) => response.json()).then((json) => setDivisions((json.data ?? []).map((item: { code: string }) => item.code))).catch(() => setDivisions([]))
  }, [router])

  const enterDashboard = (user: AuthenticatedUser, showSessionCheck: boolean) => {
    if (!user) return
    setSession(user, remember)
    try {
      if (showSessionCheck) sessionStorage.setItem(SESSION_CHECK_ANIMATION_KEY, 'true')
      else sessionStorage.removeItem(SESSION_CHECK_ANIMATION_KEY)
    } catch {}
    setIsEntering(true)
    window.setTimeout(() => router.push('/dashboard'), 900)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      if (createMode) {
        const trimmedId = id.trim()
        const trimmedName = name.trim()
        if (!trimmedName || !trimmedId || !password) return
        const normalizedAssignments = teachingAssignments.map((assignment) => ({ ...assignment, subject: assignment.subject.trim(), divisions: Array.from(new Set(assignment.divisions)) })).filter((assignment) => assignment.subject)
        if (!normalizedAssignments.length) {
          setError(locale === 'ar' ? 'أضف مادة واحدة على الأقل.' : 'Add at least one subject.')
          return
        }
        const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trimmedId, name: trimmedName, password, remember, divisions: Array.from(new Set(normalizedAssignments.flatMap((assignment) => assignment.divisions))), subjectsTaught: normalizedAssignments.map((assignment) => assignment.subject), teachingAssignments: normalizedAssignments }) })
        const result = await response.json() as { data?: AuthenticatedUser; showSessionCheck?: boolean; error?: string }
        if (!response.ok || !result.data) {
          setError(result.error ?? (locale === 'ar' ? 'تعذر إنشاء الحساب.' : 'Unable to create account.'))
          return
        }
        saveProfile({ ...result.data, createdAt: new Date().toISOString(), lastActivity: locale === 'ar' ? 'لم يسجل الدخول بعد' : 'Not logged in yet', assigned_divisions: result.data.assigned_divisions ?? [], subjectsTaught: result.data.subjectsTaught ?? [], teachingAssignments: result.data.teachingAssignments ?? [] })
        enterDashboard(result.data, result.showSessionCheck === true)
        return
      }

      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, password, remember }) })
      const result = await response.json() as { data?: AuthenticatedUser; showSessionCheck?: boolean }
      const user = result.data ?? null
      if (!user) {
        setError(locale === 'ar' ? 'رقم الهوية أو كلمة المرور غير صحيحة.' : 'Incorrect ID number or password.')
        return
      }
      saveProfile({ ...user, createdAt: new Date().toISOString(), lastActivity: new Date().toISOString(), assigned_divisions: user.assigned_divisions ?? [], subjectsTaught: user.subjectsTaught ?? [], teachingAssignments: user.teachingAssignments ?? [] })
      enterDashboard(user, result.showSessionCheck === true)
    } catch {
      setError(locale === 'ar' ? (createMode ? 'تعذر إنشاء الحساب.' : 'تعذر تسجيل الدخول.') : (createMode ? 'Unable to create account.' : 'Unable to sign in.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-10" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <VideoBackground />
    <div className="fixed inset-0 z-0 bg-slate-950/55" aria-hidden="true" />
    <button type="button" onClick={toggleLocale} aria-label={locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'} className="fixed end-5 top-5 z-30 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur-md transition hover:border-emerald-400/60 hover:bg-slate-900/85 focus:outline-none focus:ring-2 focus:ring-emerald-400"><Languages className="h-4 w-4 text-emerald-300" />{locale === 'ar' ? 'English' : 'العربية'}</button>
    <motion.div
      className="relative z-10 w-full max-w-md"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ perspective: 1500 }}
    >
      <motion.div
        className="relative"
        style={{ rotateX: prefersReducedMotion ? 0 : rotateX, rotateY: prefersReducedMotion ? 0 : rotateY, transformStyle: 'preserve-3d' }}
        onMouseMove={handleCardMouseMove}
        onMouseLeave={resetCardTilt}
      >
        <div className="relative isolate overflow-hidden rounded-2xl border border-emerald-300/30 bg-slate-950/95 shadow-2xl shadow-black/40">
          <section className={`relative z-10 overflow-hidden rounded-[15px] bg-transparent p-6 sm:p-8 ${createMode ? 'login-card-create' : ''}`}>
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }} />
            <div className="relative z-10">
              <div className="mb-7 text-center">
                <motion.div
                  initial={prefersReducedMotion ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18, delay: prefersReducedMotion ? 0 : 0.15 }}
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.15)]"
                >
                  <ShieldCheck className="h-7 w-7" />
                </motion.div>
                <motion.h1 initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: prefersReducedMotion ? 0 : 0.2 }} className="text-2xl font-bold text-white">ثَبَت</motion.h1>
                <motion.p initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: prefersReducedMotion ? 0 : 0.3 }} className="mt-1 text-xs font-medium text-white/55">Thabat School Operations</motion.p>
              </div>

              <form key={createMode ? 'create-profile' : 'sign-in'} onSubmit={submit} className="login-form-mode space-y-4">
                {createMode && <label className="block"><span className="mb-2 block text-xs font-medium text-white/75">{locale === 'ar' ? 'الاسم الكامل' : 'Full name'}</span><div className="relative"><User className="absolute start-3 top-3.5 h-4 w-4 text-white/40" /><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 ps-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20" /></div></label>}
                <label className="block"><span className="mb-2 block text-xs font-medium text-white/75">{locale === 'ar' ? 'رقم الهوية / الرقم الوظيفي' : 'ID number / employee ID'}</span><div className="relative"><User className="absolute start-3 top-3.5 h-4 w-4 text-white/40" /><input value={id} onChange={(event) => setId(event.target.value)} inputMode="numeric" autoComplete="username" required className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 ps-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20" /></div></label>
                <label className="block"><span className="mb-2 block text-xs font-medium text-white/75">{locale === 'ar' ? 'كلمة المرور' : 'Password'}</span><div className="relative"><Lock className="absolute start-3 top-3.5 h-4 w-4 text-white/40" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={createMode ? 'new-password' : 'current-password'} required className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pe-12 ps-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-emerald-400/70 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={locale === 'ar' ? (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور') : (showPassword ? 'Hide password' : 'Show password')} title={locale === 'ar' ? (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور') : (showPassword ? 'Hide password' : 'Show password')} aria-pressed={showPassword} className="absolute end-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70">{showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</button></div></label>
                {createMode && <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-white/75">{locale === 'ar' ? 'المواد والشعب التي تدرسها' : 'Subjects and divisions taught'}</span><button type="button" onClick={() => setTeachingAssignments((current) => [...current, { id: `signup-assignment-${Date.now()}`, subject: '', gradeLevel: null, divisions: [], attendance: true, gradebook: true }])} className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25">{locale === 'ar' ? 'إضافة مادة' : 'Add subject'}</button></div>
                  {!teachingAssignments.length && <p className="text-xs text-white/40">{locale === 'ar' ? 'أضف مادة واربطها بالشعب.' : 'Add a subject and map it to divisions.'}</p>}
                  {teachingAssignments.map((assignment) => <div key={assignment.id} className="space-y-2 rounded-lg border border-white/10 p-2"><div className="flex gap-2"><input value={assignment.subject} onChange={(event) => setTeachingAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, subject: event.target.value } : item))} placeholder={locale === 'ar' ? 'المادة' : 'Subject'} className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 text-sm text-white placeholder:text-white/35 focus:border-emerald-400/70 focus:outline-none" /><button type="button" onClick={() => setTeachingAssignments((current) => current.filter((item) => item.id !== assignment.id))} className="rounded-lg px-2 text-red-300" aria-label={locale === 'ar' ? 'حذف المادة' : 'Remove subject'}>×</button></div><div className="flex flex-wrap gap-2">{divisions.map((code) => <label key={code} className={`cursor-pointer rounded-md border px-2 py-1 text-xs transition ${assignment.divisions.includes(code) ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-white/15 text-white/65 hover:border-emerald-400/50'}`}><input type="checkbox" className="sr-only" checked={assignment.divisions.includes(code)} onChange={() => setTeachingAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, divisions: item.divisions.includes(code) ? item.divisions.filter((division) => division !== code) : [...item.divisions, code] } : item))} />{code}</label>)}</div></div>)}
                </div>}
                <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-sm text-white/65"><span className="relative grid h-7 w-7 shrink-0 place-items-center"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} aria-label={locale === 'ar' ? 'تذكرني' : 'Remember me'} className="peer sr-only" /><span aria-hidden="true" className={`absolute inset-0 rounded-lg border-2 transition-all duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-200/40 ${remember ? 'animate-[studentCheckboxBounce_0.3s_cubic-bezier(0.4,0,0.2,1)] border-emerald-500 bg-emerald-500' : 'border-emerald-300 bg-white'}`} /><Check className={`pointer-events-none relative h-4 w-4 text-white transition-transform duration-200 ${remember ? 'scale-100' : 'scale-0'}`} strokeWidth={3} /></span><span className="transition-colors group-hover:text-white">{locale === 'ar' ? 'تذكرني' : 'Remember me'}</span></label>
                {error && <div role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
                <motion.button type="submit" disabled={isSubmitting || isEntering} whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }} className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-4 font-semibold text-slate-950 shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-75">
                  <motion.span className="pointer-events-none absolute inset-y-0 w-2/3 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent" aria-hidden="true" animate={isSubmitting && !prefersReducedMotion ? { x: ['-120%', '180%'] } : { x: '-120%' }} transition={isSubmitting && !prefersReducedMotion ? { duration: 1.15, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }} />
                  <AnimatePresence mode="wait" initial={false}>
                    {isSubmitting ? (
                      <motion.span key="submitting" initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="relative inline-flex items-center gap-2"><Loader2 className={`h-4 w-4 ${prefersReducedMotion ? '' : 'animate-spin'}`} />{locale === 'ar' ? (createMode ? 'جارٍ إنشاء الحساب...' : 'جارٍ التحقق...') : (createMode ? 'Creating profile...' : 'Signing in...')}</motion.span>
                    ) : (
                      <motion.span key="submit-label" initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="relative inline-flex items-center gap-2">{createMode ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{createMode ? (locale === 'ar' ? 'إنشاء الحساب' : 'Create profile') : (locale === 'ar' ? 'تسجيل الدخول' : 'Sign in')}{locale === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>
              <motion.button type="button" whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }} whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }} onClick={() => { setCreateMode(!createMode); setError('') }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/75 transition-colors hover:border-emerald-300/40 hover:bg-emerald-400/[0.06] hover:text-white"><span className="login-mode-icon">{createMode ? <ArrowLeft className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}</span><span>{createMode ? (locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to sign in') : (locale === 'ar' ? 'إنشاء ملف مستخدم' : 'Create a user profile')}</span></motion.button>
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
    {isEntering && <div className="login-success-overlay" role="status" aria-live="polite" aria-atomic="true"><span className="login-success-loader" aria-hidden="true" /><p>{locale === 'ar' ? 'جارٍ تسجيل دخولك...' : 'Logging you in'}</p></div>}
  </main>
}
