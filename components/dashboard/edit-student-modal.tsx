'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'
import { getGradeLevelArabic } from '@/lib/utils'

type Student = {
  id: string
  fullName: string
  academicId?: string | null
  gpa?: number | null
  parentPhone?: string | null
  nationalId?: string | null
  divisionCode?: string | null
  gradeLevel?: number | null
  level?: string | null
  conductNotes?: string | null
}

const gradeLevelFromDivision = (divisionCode: string) => {
  const match = divisionCode.trim().match(/^([1-3])\d{2}$/)
  return match ? Number(match[1]) : null
}

export function EditStudentModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: (student: Student) => void }) {
  const { dir, t } = useLanguage()
  const initialGradeLevel = student.gradeLevel ?? gradeLevelFromDivision(student.divisionCode ?? '')
  const [form, setForm] = useState({
    fullName: student.fullName,
    academicId: student.academicId ?? '',
    gpa: student.gpa?.toString() ?? '',
    parentPhone: student.parentPhone ?? '',
    nationalId: student.nationalId ?? '',
    divisionCode: student.divisionCode ?? '',
    gradeLevel: initialGradeLevel?.toString() ?? '',
    level: student.level ?? (initialGradeLevel ? getGradeLevelArabic(initialGradeLevel) : ''),
    conductNotes: student.conductNotes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const response = await fetch('/api/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, ...form }) })
    if (response.ok) {
      const result = await response.json()
      onSaved(result.data)
      onClose()
    }
    setSaving(false)
  }

  const fields = [
    ['fullName', t('studentName'), t('enterFullName'), 'text'],
    ['academicId', t('academicId'), t('academicId'), 'text'],
    ['nationalId', t('nationalId'), t('exampleNationalId'), 'text'],
    ['parentPhone', t('parentPhone'), t('parentPhone'), 'tel'],
    ['divisionCode', t('division'), t('chooseDivision'), 'text'],
    ['gpa', t('gpa'), t('gpa'), 'number'],
    ['gradeLevel', t('gradeLevel'), t('gradeLevel'), 'number'],
    ['level', t('level'), t('level'), 'text'],
  ] as const

  return <Modal open={true} onOpenChange={(open) => !open && onClose()} className="max-w-lg"><div dir={dir}>
    <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700"><h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('editStudentData')}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('updateStudentInfo')}</p></div>
    <form onSubmit={(event) => { event.preventDefault(); void save() }} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([key, label, placeholder, type]) => {
          const derivedGrade = key === 'divisionCode' ? gradeLevelFromDivision(form.divisionCode) : null
          const displayValue = key === 'gradeLevel' && form[key] ? getGradeLevelArabic(Number(form[key])) : form[key]
          return <div key={key} className={key === 'fullName' || key === 'divisionCode' ? 'sm:col-span-2' : ''}><label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label><input type={key === 'gradeLevel' ? 'text' : type} readOnly={key === 'gradeLevel'} min={key === 'gradeLevel' ? 1 : undefined} max={key === 'gradeLevel' ? 3 : undefined} step={key === 'gpa' ? '0.01' : undefined} value={displayValue} onChange={(event) => {
            const value = event.target.value
            if (key === 'divisionCode') {
              const grade = gradeLevelFromDivision(value)
              setForm({ ...form, divisionCode: value, ...(grade ? { gradeLevel: String(grade), level: getGradeLevelArabic(grade) } : {}) })
            } else {
              setForm({ ...form, [key]: value })
            }
          }} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-start transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-600 dark:focus:bg-slate-900 dark:focus:ring-emerald-900" />{derivedGrade && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{form.divisionCode} · {getGradeLevelArabic(derivedGrade)}</p>}</div>
        })}
      </div>
      <div><label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('conductNotes')}</label><textarea value={form.conductNotes} onChange={(event) => setForm({ ...form, conductNotes: event.target.value })} placeholder={t('addConductNotes')} rows={3} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-start transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-600 dark:focus:bg-slate-900 dark:focus:ring-emerald-900" /></div>
      <button type="submit" disabled={saving || !form.fullName.trim()} className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">{saving ? t('saving') : t('save')}</button>
    </form>
  </div></Modal>
}
