'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, Plus, Trash2, X } from 'lucide-react'
import { StyledSelect } from '@/components/ui/styled-select'
import { Modal } from '@/components/ui/modal'
import { ConfirmModal } from '@/components/dashboard/confirm-modal'
import { useLanguage } from '@/components/language-provider'
import { getGradeLevelArabic } from '@/lib/utils'
import { IssueWarningModal } from '@/components/issue-warning-modal'
import { getSession } from '@/lib/auth'
import { fetchCached } from '@/lib/client-cache'

interface WarningRecord {
  id: string
  student?: { fullName?: string }
  issuedByName?: string
  issuedAt?: string
  reason?: string
  type?: string
  deduction?: number
  severity?: string
}

interface StudentOption { id: string; fullName: string; divisionCode?: string | null; gradeLevel?: number | null }

export default function WarningsPage() {
  const { t } = useLanguage()
  const [warnings, setWarnings] = useState<WarningRecord[]>([])
  const router = useRouter()
  useEffect(() => {
    if (getSession()?.role === 'TEACHER') router.replace('/dashboard')
  }, [router])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentPickerOpen, setStudentPickerOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [newWarning, setNewWarning] = useState({ studentId: '', type: 'TARDINESS', reason: '', deduction: '2', severity: 'MODERATE' })
  const [deletingWarning, setDeletingWarning] = useState<WarningRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  useEffect(() => {
    async function loadWarnings() {
      try {
        const [warningsJson, studentsJson] = await Promise.all([
          fetchCached<{ data?: WarningRecord[] }>('dashboard:warnings:all', '/api/warnings'),
          fetchCached<{ data?: StudentOption[] }>('dashboard:students:all', '/api/students'),
        ])
        setWarnings(warningsJson.data ?? [])
        setStudents((studentsJson.data ?? []).map((student: StudentOption) => ({ id: student.id, fullName: student.fullName, divisionCode: student.divisionCode, gradeLevel: student.gradeLevel })))
      } catch (error) {
        console.error('Failed to fetch warnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWarnings()
  }, [])

  const matchingStudentGroups = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase()
    const matches = query ? students.filter((student) => student.fullName.toLocaleLowerCase().includes(query)) : students
    const groups = new Map<number | null, StudentOption[]>()
    for (const student of matches) {
      const divisionGrade = student.divisionCode?.match(/^([1-3])\d{2}$/)?.[1]
      const grade = student.gradeLevel ?? (divisionGrade ? Number(divisionGrade) : null)
      groups.set(grade, [...(groups.get(grade) ?? []), student])
    }
    return Array.from(groups.entries()).sort(([left], [right]) => (left ?? 99) - (right ?? 99)).map(([grade, group]) => ({
      grade,
      students: group.sort((left, right) => (left.divisionCode ?? '999').localeCompare(right.divisionCode ?? '999', undefined, { numeric: true }) || left.fullName.localeCompare(right.fullName)),
    }))
  }, [studentSearch, students])

  const selectStudent = (student: StudentOption) => {
    setNewWarning((current) => ({ ...current, studentId: student.id }))
    setStudentSearch(student.fullName)
    setStudentPickerOpen(false)
  }

  const handleAddWarning = async () => {
    if (!newWarning.studentId) return
    const session = getSession()
    if (!session) return
    const response = await fetch('/api/warnings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': session.id }, body: JSON.stringify({ studentId: newWarning.studentId, type: newWarning.type, reason: newWarning.reason, deduction: Number(newWarning.deduction) || 2, severity: newWarning.severity }) })
    if (!response.ok) return
    const result = await response.json()
    setWarnings((current) => [result.data, ...current])
    setIsOpen(false)
    setNewWarning({ studentId: '', type: 'TARDINESS', reason: '', deduction: '2', severity: 'MODERATE' })
    setStudentSearch('')
    window.dispatchEvent(new CustomEvent('thabat-warnings-changed'))
    router.refresh()
  }

  const deleteWarning = async () => {
    if (!deletingWarning) return
    const session = getSession()
    if (!session) return
    setDeleteBusy(true)
    const response = await fetch(`/api/warnings/${deletingWarning.id}`, { method: 'DELETE', headers: { 'x-thabat-user-id': session.id } })
    if (response.ok) { setWarnings((current) => current.filter((warning) => warning.id !== deletingWarning.id)); setDeletingWarning(null); window.dispatchEvent(new CustomEvent('thabat-warnings-changed')); router.refresh() }
    setDeleteBusy(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('warnings')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('warningsDescription')}</p>
        </div>
        <button onClick={() => setIssueModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
          <Plus className="h-4 w-4" /> {t('issueWarning')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('warningTotal')}</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{warnings.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('warningLevel')}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{warnings.length ? t('warningLevel') : '—'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('riskLevel')}</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{warnings.some((w) => (w.deduction ?? 0) > 5) ? t('high') : t('low')}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-start">{t('student')}</th><th className="px-4 py-3 text-start">{t('warningType')}</th><th className="px-4 py-3 text-start">{t('reason')}</th><th className="px-4 py-3 text-start">{t('deduction')}</th><th className="px-4 py-3 text-start">{t('source')}</th><th className="px-4 py-3 text-start">{t('date')}</th><th className="px-4 py-3 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('loadingWarnings')}</td>
                </tr>
              ) : warnings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t('noWarnings')}</td>
                </tr>
              ) : (
                warnings.map((warning) => (
                  <tr key={warning.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{warning.student?.fullName || '—'}</td>
                    <td className="px-4 py-3">{warning.type || '—'}</td>
                    <td className="px-4 py-3">{warning.reason || '—'}</td>
                    <td className="px-4 py-3">{warning.deduction ?? 0}</td>
                    <td className="px-4 py-3">{warning.issuedByName || '—'}</td>
                    <td className="px-4 py-3">{warning.issuedAt ? new Date(warning.issuedAt).toLocaleDateString() : '—'}</td><td className="px-4 py-3"><button type="button" onClick={() => setDeletingWarning(warning)} aria-label={t('deleteWarning')} className="text-red-600"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
            <Modal open={isOpen} onOpenChange={setIsOpen} className="max-w-md">
              <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('issueWarning')}</h2>
                <button type="button" onClick={() => setIsOpen(false)} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
              </div>
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleAddWarning() }}>
                <div className="relative">
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('student')}</label>
                  <input
                    value={studentSearch}
                    onChange={(event) => {
                      setStudentSearch(event.target.value)
                      setNewWarning((current) => ({ ...current, studentId: '' }))
                      setStudentPickerOpen(true)
                    }}
                    onFocus={() => setStudentPickerOpen(true)}
                    onBlur={() => setTimeout(() => setStudentPickerOpen(false), 150)}
                    placeholder={t('chooseStudent')}
                    role="combobox"
                    aria-expanded={studentPickerOpen}
                    aria-controls="warning-student-results"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950"
                  />
                  {studentPickerOpen && (
                    <div id="warning-student-results" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                      {matchingStudentGroups.length ? matchingStudentGroups.map(({ grade, students: group }) => (
                        <div key={grade ?? 'unassigned'}>
                          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-300">{grade ? getGradeLevelArabic(grade) : 'غير معين'}</div>
                          {group.map((student) => (
                            <button key={student.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectStudent(student)} className="flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-slate-800">
                              <span className="font-medium text-slate-900 dark:text-white">{student.fullName}</span>
                              <span className="shrink-0 text-xs text-emerald-700 dark:text-emerald-300">{student.divisionCode || 'غير معين'}</span>
                            </button>
                          ))}
                        </div>
                      )) : <p className="px-3 py-3 text-sm text-slate-500">لا يوجد طلاب مطابقون</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('warningType')}</label>
                  <StyledSelect value={newWarning.type} onValueChange={(value) => setNewWarning({ ...newWarning, type: value })} aria-label={t('warningType')} options={[{ value: 'TARDINESS', label: t('tardiness') }, { value: 'ABSENCE', label: t('absence') }, { value: 'CONDUCT', label: t('conduct') }]} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">حدد نوع المخالفة التي سيتم تسجيلها على الطالب.</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('warningLevel')}</label>
                  <StyledSelect value={newWarning.severity} onValueChange={(value) => setNewWarning({ ...newWarning, severity: value })} aria-label={t('warningLevel')} options={[{ value: 'MINOR', label: t('low') }, { value: 'MODERATE', label: t('warningLevel') }, { value: 'MAJOR', label: t('high') }]} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">حدد شدة المخالفة: منخفضة أو متوسطة أو عالية.</p>
                </div>
                <textarea value={newWarning.reason} onChange={(e) => setNewWarning({ ...newWarning, reason: e.target.value })} placeholder={t('warningReason')} className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950" />
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t('behaviorDeduction')}</label>
                  <input type="number" value={newWarning.deduction} onChange={(e) => setNewWarning({ ...newWarning, deduction: e.target.value })} placeholder={t('deductionExample')} className="deduction-input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950" />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('deductionHelp')} سيتم خصم هذه النقاط من درجة سلوك الطالب.</p>
                </div>
                <button type="submit" className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-medium text-white hover:bg-amber-600">{t('saveWarning')}</button>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>
      <ConfirmModal open={Boolean(deletingWarning)} title={t('deleteWarning')} message={t('deleteWarningConfirm')} onCancel={() => setDeletingWarning(null)} onConfirm={() => void deleteWarning()} busy={deleteBusy} />
      {issueModalOpen && <IssueWarningModal students={students} onClose={() => setIssueModalOpen(false)} onSaved={(warning) => setWarnings((current) => [warning as WarningRecord, ...current])} />}
    </div>
  )
}
