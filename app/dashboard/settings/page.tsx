'use client'

import { useEffect, useState } from 'react'
import { Bell, Building2, CalendarCheck, Moon, Sun } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useTheme } from 'next-themes'

const SETTINGS_KEY = 'thabat-settings'

type SavedSettings = {
  schoolName: string
  defaultAttendance: 'UNMARKED' | 'PRESENT'
  attendanceNotes: boolean
  absenceAlerts: boolean
  warningAlerts: boolean
}

const defaultSettings: SavedSettings = {
  schoolName: 'مدرسة السلمية الثانوية',
  defaultAttendance: 'UNMARKED',
  attendanceNotes: false,
  absenceAlerts: true,
  warningAlerts: true,
}

export default function SettingsPage() {
  const { locale, toggleLocale } = useLanguage()
  const { theme, setTheme } = useTheme()
  const english = locale === 'en'
  const [settings, setSettings] = useState(defaultSettings)

  useEffect(() => {
    const saved = window.localStorage.getItem(SETTINGS_KEY)
    if (!saved) return
    try { setSettings({ ...defaultSettings, ...JSON.parse(saved) as Partial<SavedSettings> }) } catch { window.localStorage.removeItem(SETTINGS_KEY) }
  }, [])

  const updateSettings = (changes: Partial<SavedSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes }
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      return next
    })
  }

  const copy = english ? {
    title: 'Settings', description: 'The few controls used most often by your school team.', school: 'School information', schoolName: 'School name', identifier: 'School ID 1047 · Secondary · Eastern Province', attendance: 'Attendance preferences', defaultStatus: 'Default status', unmarked: 'Leave unmarked', present: 'Mark present', notes: 'Require a note for absences', notifications: 'Notifications', absence: 'Attendance escalation alerts', warnings: 'Warning and transfer alerts', appearance: 'Appearance', language: 'Language', english: 'English', arabic: 'Arabic', theme: 'Theme', light: 'Light', dark: 'Dark',
  } : {
    title: 'الإعدادات', description: 'أهم الإعدادات التي يستخدمها فريق المدرسة يومياً.', school: 'معلومات المدرسة', schoolName: 'اسم المدرسة', identifier: 'الرقم 1047 · التعليم الثانوي · المنطقة الشرقية', attendance: 'تفضيلات الحضور', defaultStatus: 'الحالة الافتراضية', unmarked: 'اتركه دون تحديد', present: 'تسجيل حاضر', notes: 'طلب ملاحظة عند تسجيل الغياب', notifications: 'التنبيهات', absence: 'تنبيهات تصعيد الحضور', warnings: 'تنبيهات الإنذارات والنقل', appearance: 'المظهر', language: 'اللغة', english: 'English', arabic: 'العربية', theme: 'المظهر', light: 'فاتح', dark: 'داكن',
  }

  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">{copy.title}</h1><p className="text-slate-600 dark:text-slate-400">{copy.description}</p></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.school}</h2></div><label className="block"><span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{copy.schoolName}</span><input value={settings.schoolName} onChange={(event) => updateSettings({ schoolName: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-950" /></label><p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{copy.identifier}</p></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><CalendarCheck className="h-5 w-5 text-blue-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.attendance}</h2></div><label className="block"><span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{copy.defaultStatus}</span><select value={settings.defaultAttendance} onChange={(event) => updateSettings({ defaultAttendance: event.target.value as SavedSettings['defaultAttendance'] })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"><option value="UNMARKED">{copy.unmarked}</option><option value="PRESENT">{copy.present}</option></select></label><label className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.notes}</span><input type="checkbox" checked={settings.attendanceNotes} onChange={(event) => updateSettings({ attendanceNotes: event.target.checked })} className="h-4 w-4 accent-emerald-600" /></label></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Bell className="h-5 w-5 text-orange-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.notifications}</h2></div><div className="space-y-4"><label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.absence}</span><input type="checkbox" checked={settings.absenceAlerts} onChange={(event) => updateSettings({ absenceAlerts: event.target.checked })} className="h-4 w-4 accent-emerald-600" /></label><label className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.warnings}</span><input type="checkbox" checked={settings.warningAlerts} onChange={(event) => updateSettings({ warningAlerts: event.target.checked })} className="h-4 w-4 accent-emerald-600" /></label></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-5 flex items-center gap-3"><Sun className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.appearance}</h2></div><div className="space-y-4"><div className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.language}</span><div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => { if (!english) toggleLocale() }} className={`rounded-md px-3 py-1.5 ${english ? 'bg-emerald-600 text-white' : ''}`}>{copy.english}</button><button type="button" onClick={() => { if (english) toggleLocale() }} className={`rounded-md px-3 py-1.5 ${!english ? 'bg-emerald-600 text-white' : ''}`}>{copy.arabic}</button></div></div><div className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-300"><span>{copy.theme}</span><div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => setTheme('light')} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${theme === 'light' ? 'bg-emerald-600 text-white' : ''}`}><Sun className="h-3.5 w-3.5" />{copy.light}</button><button type="button" onClick={() => setTheme('dark')} className={`flex items-center gap-1 rounded-md px-3 py-1.5 ${theme === 'dark' ? 'bg-emerald-600 text-white' : ''}`}><Moon className="h-3.5 w-3.5" />{copy.dark}</button></div></div></div></section>
    </div>
  </div>
}