'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, Building2, CalendarCheck, Moon, Sun, Trash2, X } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useTheme } from 'next-themes'
import { AttendanceStatusSelect } from '@/components/ui/attendance-status-select'
import { Modal } from '@/components/ui/modal'
import { getSession } from '@/lib/auth'

const SETTINGS_KEY = 'thabat-settings'
type SavedSettings = { schoolName: string; defaultAttendance: 'UNMARKED' | 'PRESENT'; attendanceNotes: boolean; absenceAlerts: boolean; warningAlerts: boolean }
const defaultSettings: SavedSettings = { schoolName: 'مدرسة السلمية الثانوية', defaultAttendance: 'UNMARKED', attendanceNotes: false, absenceAlerts: true, warningAlerts: true }

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'}`} /></button>
}

export default function SettingsPage() {
  const { locale, toggleLocale } = useLanguage()
  const { theme, setTheme } = useTheme()
  const english = locale === 'en'
  const [settings, setSettings] = useState(defaultSettings)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [wipeStep, setWipeStep] = useState<1 | 2>(1)
  const [password, setPassword] = useState('')
  const [wipeError, setWipeError] = useState('')
  const [wipeBusy, setWipeBusy] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const saved = window.localStorage.getItem(SETTINGS_KEY)
    if (!saved) return
    try { setSettings({ ...defaultSettings, ...JSON.parse(saved) as Partial<SavedSettings> }) } catch { window.localStorage.removeItem(SETTINGS_KEY) }
  }, [])

  useEffect(() => {
    if (!dangerOpen || wipeStep !== 2) return
    setCountdown(5)
    const timer = window.setInterval(() => setCountdown((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [dangerOpen, wipeStep])

  const updateSettings = (changes: Partial<SavedSettings>) => setSettings((current) => { const next = { ...current, ...changes }; window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); return next })
  const copy = english ? {
    title: 'Settings', description: 'The few controls used most often by your school team.', school: 'School information', schoolName: 'School name', identifier: 'School ID 1047 · Secondary · Eastern Province', attendance: 'Attendance preferences', defaultStatus: 'Default status', unmarked: 'Leave unmarked', present: 'Mark present', notes: 'Require a note for absences', notifications: 'Notifications', absence: 'Attendance escalation alerts', warnings: 'Warning and transfer alerts', appearance: 'Appearance', language: 'Language', english: 'English', arabic: 'Arabic', theme: 'Theme', light: 'Light', dark: 'Dark', danger: 'Danger zone', dangerDescription: 'Permanently remove all school records and attendance data.', deleteAll: 'Delete all data'
  } : {
    title: 'الإعدادات', description: 'أهم الإعدادات التي يستخدمها فريق المدرسة يومياً.', school: 'معلومات المدرسة', schoolName: 'اسم المدرسة', identifier: 'الرقم 1047 · التعليم الثانوي · المنطقة الشرقية', attendance: 'تفضيلات الحضور', defaultStatus: 'الحالة الافتراضية', unmarked: 'اتركه دون تحديد', present: 'تسجيل حاضر', notes: 'طلب ملاحظة عند تسجيل الغياب', notifications: 'التنبيهات', absence: 'تنبيهات تصعيد الحضور', warnings: 'تنبيهات الإنذارات والنقل', appearance: 'المظهر', language: 'اللغة', english: 'English', arabic: 'العربية', theme: 'المظهر', light: 'فاتح', dark: 'داكن', danger: 'منطقة الخطر', dangerDescription: 'حذف جميع سجلات المدرسة والحضور نهائياً.', deleteAll: 'حذف جميع البيانات'
  }

  const openWipe = () => { setDangerOpen(true); setWipeStep(1); setPassword(''); setWipeError(''); setCountdown(5) }
  const verifyWipePassword = async () => {
    const session = getSession()
    setWipeBusy(true); setWipeError('')
    try {
      const response = await fetch('/api/admin/verify-creator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session?.id ?? '10', password }) })
      if (!response.ok) { setWipeError(english ? 'Incorrect password.' : 'كلمة المرور غير صحيحة'); return }
      setWipeStep(2); setCountdown(5)
    } catch { setWipeError(english ? 'Unable to verify password.' : 'تعذر التحقق من كلمة المرور.') } finally { setWipeBusy(false) }
  }
  const executeWipe = async () => {
    if (countdown > 0) return
    const session = getSession()
    setWipeBusy(true); setWipeError('')
    try {
      const response = await fetch('/api/admin/reset-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session?.id ?? '10', password }) })
      if (!response.ok) { const result = await response.json() as { error?: string }; setWipeError(result.error ?? (english ? 'Unable to delete data.' : 'تعذر حذف البيانات.')); return }
      window.localStorage.removeItem(SETTINGS_KEY); window.location.reload()
    } catch { setWipeError(english ? 'Unable to delete data.' : 'تعذر حذف البيانات.') } finally { setWipeBusy(false) }
  }

  return <div className="space-y-6" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">{copy.title}</h1><p className="text-slate-600 dark:text-slate-400">{copy.description}</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.school}</h2></div><label className="block"><span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{copy.schoolName}</span><input value={settings.schoolName} onChange={(event) => updateSettings({ schoolName: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950" /></label><p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{copy.identifier}</p></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><CalendarCheck className="h-5 w-5 text-blue-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.attendance}</h2></div><label className="block"><span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{copy.defaultStatus}</span><AttendanceStatusSelect value={settings.defaultAttendance} onValueChange={(value) => updateSettings({ defaultAttendance: value as SavedSettings['defaultAttendance'] })} options={[{ value: 'UNMARKED', label: copy.unmarked }, { value: 'PRESENT', label: copy.present }]} english={english} /></label><label className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.notes}</span><Toggle checked={settings.attendanceNotes} onChange={(checked) => updateSettings({ attendanceNotes: checked })} /></label></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Bell className="h-5 w-5 text-orange-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.notifications}</h2></div><div className="space-y-4"><label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.absence}</span><Toggle checked={settings.absenceAlerts} onChange={(checked) => updateSettings({ absenceAlerts: checked })} /></label><label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.warnings}</span><Toggle checked={settings.warningAlerts} onChange={(checked) => updateSettings({ warningAlerts: checked })} /></label></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Sun className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.appearance}</h2></div><div className="space-y-4"><div className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.language}</span><div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => { if (!english) toggleLocale() }} className={`rounded-md px-3 py-1.5 ${english ? 'bg-emerald-600 text-white' : ''}`}>{copy.english}</button><button type="button" onClick={() => { if (english) toggleLocale() }} className={`rounded-md px-3 py-1.5 ${!english ? 'bg-emerald-600 text-white' : ''}`}>{copy.arabic}</button></div></div><div className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.theme}</span><div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => setTheme('light')} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${theme === 'light' ? 'bg-emerald-600 text-white' : ''}`}><Sun className="h-3.5 w-3.5" />{copy.light}</button><button type="button" onClick={() => setTheme('dark')} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${theme === 'dark' ? 'bg-emerald-600 text-white' : ''}`}><Moon className="h-3.5 w-3.5" />{copy.dark}</button></div></div></div></section>
    </div>
    <section className="rounded-xl border border-red-200 bg-red-50/70 p-6 dark:border-red-900/60 dark:bg-red-950/20"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-red-700 dark:text-red-300"><AlertTriangle className="h-5 w-5" /><h2 className="text-xl font-bold">{copy.danger}</h2></div><p className="mt-2 text-sm text-red-700/80 dark:text-red-300/80">{copy.dangerDescription}</p></div><button type="button" onClick={openWipe} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"><Trash2 className="h-4 w-4" />{copy.deleteAll}</button></div></section>
    <Modal open={dangerOpen} onOpenChange={setDangerOpen} className="max-w-lg"><div className="space-y-5" dir={locale === 'ar' ? 'rtl' : 'ltr'}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3 text-red-600"><AlertTriangle className="h-6 w-6" /><h2 className="text-xl font-bold">{wipeStep === 1 ? (english ? 'Confirm identity' : 'تأكيد الهوية') : (english ? 'Are you completely sure?' : 'هل أنت متأكد تماماً؟')}</h2></div><button type="button" onClick={() => setDangerOpen(false)} aria-label={english ? 'Close' : 'إغلاق'} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div><AnimatePresence mode="wait"><motion.div key={wipeStep} initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.18 }}>{wipeStep === 1 ? <div className="space-y-4"><p className="text-sm text-muted-foreground">{english ? 'Enter your password to confirm deletion.' : 'أدخل كلمة المرور لتأكيد الحذف'}</p><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={english ? 'Password' : 'كلمة المرور'} className="w-full rounded-lg border border-border bg-background px-3 py-3" />{wipeError && <p className="text-sm font-semibold text-red-600">{wipeError}</p>}<button type="button" disabled={wipeBusy || !password} onClick={() => void verifyWipePassword()} className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{wipeBusy ? (english ? 'Verifying...' : 'جارٍ التحقق...') : (english ? 'Continue' : 'متابعة')}</button></div> : <div className="space-y-4"><p className="font-semibold text-red-700 dark:text-red-300">{english ? 'This will permanently erase all attendance and school records and cannot be undone.' : 'هذا الإجراء سيقوم بمسح كافة سجلات الحضور والبيانات ولا يمكن التراجع عنه!'}</p><div className="relative overflow-hidden rounded-lg border border-red-200 bg-red-100 dark:border-red-900 dark:bg-red-950/40"><motion.div initial={{ width: '0%' }} animate={{ width: countdown === 0 ? '100%' : `${((5 - countdown) / 5) * 100}%` }} transition={{ duration: 0.35 }} className="absolute inset-y-0 start-0 bg-red-600/20" /><p className="relative p-3 text-center text-sm font-bold text-red-800 dark:text-red-200">{countdown > 0 ? (english ? `Final confirmation available in ${countdown}s` : `تأكيد نهائي (انتظر ${countdown}ث)`) : (english ? 'Ready to delete' : 'جاهز للحذف')}</p></div>{wipeError && <p className="text-sm font-semibold text-red-600">{wipeError}</p>}<div className="flex gap-3"><button type="button" onClick={() => setDangerOpen(false)} className="flex-1 rounded-lg border border-border px-4 py-3 font-semibold">{english ? 'Cancel' : 'إلغاء'}</button><button type="button" disabled={wipeBusy || countdown > 0} onClick={() => void executeWipe()} className="relative flex-1 overflow-hidden rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"><motion.span initial={{ width: '100%' }} animate={{ width: `${(countdown / 5) * 100}%` }} transition={{ duration: 0.35 }} className="absolute inset-y-0 start-0 bg-red-800/50" /><span className="relative">{countdown > 0 ? (english ? `Confirm final (wait ${countdown}s)` : `تأكيد نهائي (انتظر ${countdown}ث)`) : (english ? 'Yes, delete permanently' : 'نعم، احذف النهائي')}</span></button></div></div>}</motion.div></AnimatePresence></div></Modal>
  </div>
}
