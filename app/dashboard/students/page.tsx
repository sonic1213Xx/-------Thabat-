'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, BookOpen, Download, Edit3, Eye, FileText, Filter, Plus, Search, Trash2, Upload, UserCog, X } from 'lucide-react'
import { ImportModal, type ImportResult } from '@/components/dashboard/import-modal'
import { BulkStudentEditor } from '@/components/dashboard/bulk-student-editor'
import { EditStudentModal } from '@/components/dashboard/edit-student-modal'
import { DivisionGuard } from '@/components/dashboard/division-guard'
import { StyledSelect } from '@/components/ui/styled-select'
import { Modal } from '@/components/ui/modal'
import { getStoredDivisions, getStoredTeamId, setStoredDivisions } from '@/lib/utils'
import { TransferModal } from '@/components/dashboard/transfer-modal'
import { BulkTransferModal } from '@/components/dashboard/bulk-transfer-modal'
import { ConfirmModal } from '@/components/dashboard/confirm-modal'
import { StudentsLoadingSkeleton } from '@/components/dashboard/tab-loading-skeleton'
import { useTabLoading } from '@/components/dashboard/use-tab-loading'
import { useLanguage } from '@/components/language-provider'
import { getGradeLevelArabic } from '@/lib/utils'
import { can } from '@/lib/roles'
import { getProfiles, getSession, type TeachingAssignment } from '@/lib/auth'
import { GradebookTable, type GradebookRow } from '@/components/gradebook-table'
import { exportEmptyGradebookTemplates, exportEmptyGradebookTemplatesToPdf } from '@/lib/export-gradebook'
import { TeacherInspectionView, type TeacherProfile } from '@/components/teacher-inspection-view'

interface StudentRecord {
  id: string
  fullName: string
  arabicName?: string
  nationalId?: string | null
  academicId?: string | null
  gpa?: number | null
  parentPhone?: string | null
  level?: string | null
  gradeLevel?: number | null
  divisionId?: string | null
  divisionCode?: string | null
  behaviorScore: number
  attendanceScore: number
  isActive?: boolean
}

export default function StudentsPage() {
  const { t, locale } = useLanguage()
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [divisions, setDivisions] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [availableDivisionCodes, setAvailableDivisionCodes] = useState<string[]>([])
  const [templateDivisions, setTemplateDivisions] = useState<string[]>([])
  const [gradebookExportOpen, setGradebookExportOpen] = useState(false)
  const [gradebookExportType, setGradebookExportType] = useState<'EXCEL' | 'PDF'>('EXCEL')
  const [division, setDivision] = useState<string | null>(null)
  const { isLoading, setIsLoading, withMinimumDelay } = useTabLoading(true)
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [showDivisionGuard, setShowDivisionGuard] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [transferStudent, setTransferStudent] = useState<StudentRecord | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [bulkEditing, setBulkEditing] = useState(false)
  const [activeView, setActiveView] = useState<'roster' | 'gradebook' | 'inspection'>('roster')
  const [currentRole, setCurrentRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentSubject, setCurrentSubject] = useState('')
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
  const [teacherProfiles, setTeacherProfiles] = useState<TeacherProfile[]>([])
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, string[]>>({})
  const [studentSearch, setStudentSearch] = useState('')
  const deferredStudentSearch = useDeferredValue(studentSearch)
  const selectedStudents = students.filter((student) => selectedStudentIds.includes(student.id))
  const bulkEditStudents = (importResult?.students ?? selectedStudents).map((student) => ({ id: student.id, fullName: student.fullName, academicId: student.academicId ?? null, gpa: student.gpa ?? null, parentPhone: student.parentPhone ?? null, nationalId: student.nationalId ?? null, divisionCode: student.divisionCode ?? null }))
  const [newStudent, setNewStudent] = useState({
    fullName: '',
    nationalId: '',
    divisionCode: '',
  })

  useEffect(() => {
    const session = getSession()
    setCurrentRole(session?.role ?? null)
    setCurrentUserId(session?.id ?? null)
    const profiles = getProfiles()
    const currentProfile = profiles.find((profile) => profile.id === session?.id)
    setCurrentSubject(currentProfile?.subject ?? '')
    setTeachingAssignments(currentProfile?.teachingAssignments ?? (currentProfile?.subject ? [{ id: `assignment-${currentProfile.id}`, subject: currentProfile.subject, gradeLevel: currentProfile.gradeLevel ?? null, divisions: currentProfile.assigned_divisions ?? [], attendance: true, gradebook: true }] : []))
    setTeacherProfiles(profiles.filter((profile) => profile.role === 'TEACHER').map(({ id, name, role, subject }) => ({ id, name, role, subject })))
    const profileAssignments = Object.fromEntries(profiles.map((item) => [item.id, item.assigned_divisions ?? []]))
    try {
      const stored = localStorage.getItem('thabat-teacher-divisions')
      setTeacherAssignments(stored ? { ...profileAssignments, ...JSON.parse(stored) as Record<string, string[]> } : profileAssignments)
    } catch {
      setTeacherAssignments(profileAssignments)
    }
  }, [])

  useEffect(() => {
    if (currentRole === 'TEACHER' && !division) {
      const assigned = teacherAssignments[currentUserId ?? ''] ?? []
      if (assigned[0]) setDivision(assigned[0])
    }
  }, [currentRole, currentUserId, division, teacherAssignments])

  useEffect(() => {
    setDivision(null)
    setStudents([])
  }, [setIsLoading])

  useEffect(() => {
    if (window.location.search.includes('action=import')) setIsImportOpen(true)
  }, [])

  useEffect(() => {
    const syncDivisions = async () => {
      try {
        const response = await fetch('/api/divisions')
        const json = await response.json()
        const nextDivisions = json.data ?? []
        setDivisions(nextDivisions)
        setAvailableDivisionCodes(nextDivisions.map((item: { code: string }) => item.code))
        setTemplateDivisions((current) => current.length ? current.filter((code) => nextDivisions.some((item: { code: string }) => item.code === code)) : nextDivisions.map((item: { code: string }) => item.code))
        setNewStudent((current) => ({
          ...current,
          divisionCode: current.divisionCode || nextDivisions[0]?.code || '',
        }))
      } catch (error) {
        console.error('Failed to load divisions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void syncDivisions()
    window.addEventListener('thabat-divisions-changed', syncDivisions)

    return () => {
      window.removeEventListener('thabat-divisions-changed', syncDivisions)
    }
  }, [])

  useEffect(() => {
    async function loadStudents() {
      if (!division) return
      await withMinimumDelay(async () => {
        try {
          const url = division === 'all' ? '/api/students' : `/api/students?division=${division}`
          const res = await fetch(url)
          const json = await res.json()
          setStudents(json.data ?? [])
        } catch (error) {
          console.error('Failed to fetch students:', error)
        }
      })
    }

    loadStudents()
  }, [division, withMinimumDelay])

  const hasDivisions = divisions.length > 0 || students.length > 0
  const divisionOptions = useMemo(
    () => Array.from(new Set([...availableDivisionCodes, ...divisions.map((item) => item.code), ...students.map((student) => student.divisionCode)]))
      .filter((code): code is string => Boolean(code))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true })),
    [availableDivisionCodes, divisions, students],
  )

  const visibleStudents = useMemo(() => {
    const query = deferredStudentSearch.trim().toLocaleLowerCase()
    if (!query) return students
    return students.filter((student) =>
      `${student.fullName} ${student.arabicName ?? ''} ${student.academicId ?? ''} ${student.nationalId ?? ''} ${student.divisionCode ?? ''}`
        .toLocaleLowerCase()
        .includes(query),
    )
  }, [deferredStudentSearch, students])
  const canInspectTeachers = currentRole === 'CREATOR' || currentRole === 'CURATOR' || currentRole === 'PRINCIPAL' || currentRole === 'VICE_PRINCIPAL'
  const isTeacher = currentRole === 'TEACHER'
  const canEditStudents = currentRole ? can(currentRole, 'can_edit_students') : false
  const canDeleteStudents = currentRole ? can(currentRole, 'can_delete_records') : false
  const gradebookRows: GradebookRow[] = visibleStudents.map((student) => ({ id: student.id, fullName: student.fullName, divisionCode: student.divisionCode, gpa: student.gpa }))
  const updateTeacherAssignments = (next: Record<string, string[]>) => {
    setTeacherAssignments(next)
    localStorage.setItem('thabat-teacher-divisions', JSON.stringify(next))
  }
  const assignedDivisionOptions = currentRole === 'TEACHER'
    ? teacherAssignments[currentUserId ?? ''] ?? []
    : divisionOptions
  const availableSubjects = Array.from(new Set(teachingAssignments.filter((assignment) => assignment.gradebook && (!division || assignment.divisions.length === 0 || assignment.divisions.includes(division))).map((assignment) => assignment.subject))).filter(Boolean)

  const refreshStudents = async (selectedDivision = division) => {
    if (!selectedDivision) return
    const url = selectedDivision === 'all' ? '/api/students' : `/api/students?division=${selectedDivision}`
    const response = await fetch(url)
    const json = await response.json()
    setStudents(json.data ?? [])
  }

  const handleImportComplete = async (result: ImportResult) => {
    setImportResult(result)
    setDivision('all')
    await refreshStudents('all')
    window.dispatchEvent(new CustomEvent('thabat-students-changed'))
  }

  const closeAddStudentModal = () => {
    setIsAddStudentOpen(false)
    setShowDivisionGuard(false)
  }

  const handleDivisionGuardChange = (nextOpen: boolean) => {
    setShowDivisionGuard(nextOpen)
    if (!nextOpen) {
      setIsAddStudentOpen(false)
    }
  }

  const handleAddStudentClick = () => {
    setIsAddStudentOpen(false)
    setShowDivisionGuard(false)

    if (divisionOptions.length > 0 && !newStudent.divisionCode) {
      setNewStudent((current) => ({ ...current, divisionCode: divisionOptions[0] }))
    }

    setIsAddStudentOpen(true)
  }

  const handleAddStudent = async () => {
    if (!newStudent.fullName.trim()) return

    const response = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: newStudent.fullName.trim(),
        nationalId: newStudent.nationalId.trim() || undefined,
        divisionCode: newStudent.divisionCode.trim() || undefined,
      }),
    })
    if (!response.ok) return

    setIsAddStudentOpen(false)
    setShowDivisionGuard(false)
    setNewStudent({ fullName: '', nationalId: '', divisionCode: divisions[0]?.code ?? '' })
    await refreshStudents()
    window.dispatchEvent(new CustomEvent('thabat-students-changed'))
  }

  const handleImportedStudents = (parsed: Array<{ name: string; nationalId: string; divisionCode?: string; gradeLevel?: number }>) => {
    const imported = parsed.map((entry, index) => ({
      id: `imported-${Date.now()}-${index}`,
      fullName: entry.name,
      arabicName: entry.name,
      nationalId: entry.nationalId,
      divisionCode: (entry.divisionCode ?? '').trim() || divisions[0]?.code || '',
      gradeLevel: entry.gradeLevel || 1,
      behaviorScore: 100,
      attendanceScore: 100,
      isActive: true,
    }))

    const validImported = imported.filter((student) => student.divisionCode)

    const nextDivisions = parsed
      .map((entry) => (entry.divisionCode ?? '').trim())
      .filter(Boolean)
      .filter((code, index, arr) => arr.indexOf(code) === index)
      .map((code, index) => ({ id: `division-${Date.now()}-${index}`, code, name: `${t('division')} ${code}`, teamId: getStoredTeamId() }))

    if (nextDivisions.length) {
      const existing = getStoredDivisions()
      const merged = [...existing.filter((item) => !nextDivisions.some((next) => next.code === item.code)), ...nextDivisions]
      setStoredDivisions(merged)
      window.dispatchEvent(new CustomEvent('thabat-divisions-changed'))
    }

    setStudents((current) => [...validImported, ...current])
    setIsImportOpen(false)
  }

  const deleteStudent = async () => {
    if (!deletingStudent) return
    setDeleteBusy(true)
    const response = await fetch(`/api/students?id=${deletingStudent.id}`, { method: 'DELETE' })
    if (response.ok) { setStudents((current) => current.filter((student) => student.id !== deletingStudent.id)); setDeletingStudent(null) }
    setDeleteBusy(false)
  }

  if (isLoading) {
    return <StudentsLoadingSkeleton />
  }

  if (!hasDivisions && !isLoading) {
    return (
      <div className="space-y-6 min-h-[320px]">
        <div className="rounded-2xl border border-dashed border-emerald-300 bg-white p-10 text-center shadow-sm dark:border-emerald-700/50 dark:bg-slate-900">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('noDivisions')}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">{t('addDivisionFirst')}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={handleAddStudentClick} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> {t('addStudent')}
            </button>
            <button type="button" onClick={() => setIsImportOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <Upload className="h-4 w-4" /> {t('importExcel')}
            </button>
          </div>
        </div>

        <DivisionGuard open={showDivisionGuard} onOpenChange={handleDivisionGuardChange} />

        <AnimatePresence>
          {isAddStudentOpen && (
            <Modal open={isAddStudentOpen} onOpenChange={(nextOpen) => {
              setIsAddStudentOpen(nextOpen)
              if (!nextOpen) {
                setShowDivisionGuard(false)
              }
            }} className="max-w-md">
              <div>
              <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('addStudent')}</h2>
                  <button type="button" onClick={closeAddStudentModal} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
                </div>
                <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void handleAddStudent() }}>
                  <input value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} placeholder={t('studentName')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950" />
                  <input value={newStudent.nationalId} onChange={(e) => setNewStudent({ ...newStudent, nationalId: e.target.value })} placeholder={t('nationalId')} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-start dark:border-slate-700 dark:bg-slate-950" />
                  <StyledSelect
                    value={newStudent.divisionCode}
                    onValueChange={(value) => setNewStudent({ ...newStudent, divisionCode: value })}
                    placeholder={divisionOptions.length > 0 ? t('chooseDivisionOption') : t('noAvailableDivisions')}
                    options={divisionOptions.length > 0 ? divisionOptions.map((code) => ({ value: code, label: code })) : [{ value: '', label: t('noAvailableDivisions') }]}
                  />
                  <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700">{t('saveStudent')}</button>
                </form>
              </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} onImported={handleImportComplete} />}
      </div>
    )
  }

  return (
    <div className="space-y-6 min-h-[320px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('students')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('studentsPageDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          {canEditStudents && <>
            <button onClick={() => setIsImportOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
              <Upload className="h-4 w-4" /> {t('importAction')}
            </button>
            <button onClick={handleAddStudentClick} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> {t('addStudent')}
            </button>
          </>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <button type="button" onClick={() => setActiveView('roster')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === 'roster' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <BookOpen className="h-4 w-4" /> {locale === 'ar' ? 'كشف الطلاب الرئيسي' : 'Main student roster'}
        </button>
        {isTeacher && <button type="button" onClick={() => setActiveView('gradebook')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === 'gradebook' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <FileText className="h-4 w-4" /> {locale === 'ar' ? 'كشف الدرجات' : 'Gradebook'}
        </button>}
        {canInspectTeachers && <button type="button" onClick={() => { setActiveView('inspection'); setDivision('all') }} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${activeView === 'inspection' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
          <Eye className="h-4 w-4" /> {locale === 'ar' ? 'كشوفات المعلمين' : 'Teacher inspection'}
        </button>}
      </div>
      {canEditStudents && selectedStudentIds.length > 0 && <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-emerald-900/50 dark:bg-slate-900/95"><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{locale === 'ar' ? `تم تحديد ${selectedStudentIds.length} طالباً` : `${selectedStudentIds.length} students selected`}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setBulkEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"><Edit3 className="h-4 w-4" />{locale === 'ar' ? 'تعديل جماعي' : 'Bulk edit'}</button><button type="button" onClick={() => setBulkTransferOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><UserCog className="h-4 w-4" />{locale === 'ar' ? 'نقل المحددين' : 'Transfer selected'}</button>{canDeleteStudents && <button type="button" onClick={async () => { if (!confirm(locale === 'ar' ? `حذف ${selectedStudentIds.length} طالباً؟` : `Delete ${selectedStudentIds.length} students?`)) return; const response = await fetch('/api/students/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: selectedStudentIds, performedByUserId: currentUserId }) }); if (response.ok) { setStudents((current) => current.filter((student) => !selectedStudentIds.includes(student.id))); setSelectedStudentIds([]); window.dispatchEvent(new CustomEvent('thabat-students-changed')) } else alert(locale === 'ar' ? 'تعذر حذف الطلاب.' : 'Unable to delete students.') }} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"><Trash2 className="h-4 w-4" />{locale === 'ar' ? 'حذف المحددين' : 'Delete selected'}</button>}<button type="button" onClick={() => setSelectedStudentIds([])} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-card-foreground/70">{locale === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}</button></div></div>}

      {canInspectTeachers && <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-emerald-600" /><div><h2 className="font-bold text-card-foreground">{locale === 'ar' ? 'تصدير قوالب كشوف الدرجات' : 'Export gradebook templates'}</h2><p className="text-xs text-card-foreground/60">{locale === 'ar' ? `تم تحديد ${templateDivisions.length} شعبة` : `${templateDivisions.length} divisions selected`}</p></div></div><button type="button" onClick={() => setGradebookExportOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"><FileText className="h-4 w-4" />{locale === 'ar' ? 'اختيار التصدير' : 'Choose export'}</button></section>}
      {gradebookExportOpen && <Modal open={true} onOpenChange={setGradebookExportOpen} className="max-w-2xl"><div className="space-y-5"><div><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? 'تصدير قوالب كشوف الدرجات' : 'Export gradebook templates'}</h2><p className="mt-1 text-sm text-card-foreground/60">{locale === 'ar' ? 'اختر نوع الملف والشعب التي تريد تضمينها.' : 'Choose a file type and the divisions to include.'}</p></div><fieldset><legend className="text-sm font-bold text-card-foreground">{locale === 'ar' ? 'نوع الملف' : 'File type'}</legend><div className="mt-2 grid grid-cols-2 gap-3">{(['EXCEL', 'PDF'] as const).map((type) => <label key={type} className="cursor-pointer"><input type="radio" name="gradebook-export-type" value={type} checked={gradebookExportType === type} onChange={() => setGradebookExportType(type)} className="peer sr-only" /><span className={`flex justify-center rounded-xl border px-4 py-3 text-sm font-bold transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 ${type === 'PDF' ? 'border-border hover:border-red-400 peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-700 dark:peer-checked:bg-red-950/40 dark:peer-checked:text-red-300' : 'border-border hover:border-emerald-400 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:peer-checked:bg-emerald-950/40 dark:peer-checked:text-emerald-300'}`}>{type}</span></label>)}</div></fieldset><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-card-foreground">{locale === 'ar' ? 'الشعب' : 'Divisions'}</h3><p className="text-xs text-card-foreground/60">{locale === 'ar' ? `تم تحديد ${templateDivisions.length} من ${divisionOptions.length}` : `${templateDivisions.length} of ${divisionOptions.length} selected`}</p></div><button type="button" onClick={() => setTemplateDivisions((current) => current.length === divisionOptions.length ? [] : divisionOptions)} className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">{templateDivisions.length === divisionOptions.length ? (locale === 'ar' ? 'إلغاء تحديد الكل' : 'Clear all') : (locale === 'ar' ? 'تحديد الكل' : 'Select all')}</button></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{divisionOptions.map((code) => <label key={code} className="cursor-pointer"><input type="checkbox" checked={templateDivisions.includes(code)} onChange={() => setTemplateDivisions((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code])} className="peer sr-only" /><span className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:border-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white"><span>{locale === 'ar' ? `الشعبة ${code}` : `Division ${code}`}</span>{templateDivisions.includes(code) && <span aria-hidden="true">✓</span>}</span></label>)}</div><div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setGradebookExportOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="button" disabled={!templateDivisions.length} onClick={() => { if (gradebookExportType === 'PDF') void exportEmptyGradebookTemplatesToPdf(templateDivisions); else void exportEmptyGradebookTemplates(templateDivisions); setGradebookExportOpen(false) }} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${gradebookExportType === 'PDF' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{locale === 'ar' ? `تصدير ${gradebookExportType}` : `Export ${gradebookExportType}`}</button></div></div></Modal>}

      {activeView === 'inspection' ? <TeacherInspectionView teachers={teacherProfiles} assignments={teacherAssignments} students={gradebookRows} availableDivisions={divisionOptions} onAssignmentsChange={updateTeacherAssignments} /> : <>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Filter className={`h-4 w-4 ${!division ? 'text-slate-400 dark:text-slate-600' : division === 'all' ? 'text-slate-400 dark:text-slate-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className={`${!division ? 'text-slate-500 dark:text-slate-500' : division === 'all' ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-white font-medium'}`}>
              {!division ? t('chooseDivisionToView') : division === 'all' ? t('showAllStudents') : `${t('division')}: ${division}`}
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-64">
              <Search className="absolute start-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder={locale === 'ar' ? 'ابحث بالاسم أو الرقم الأكاديمي أو الهوية' : 'Search by name, academic ID, or national ID'}
                aria-label={locale === 'ar' ? 'البحث عن طالب' : 'Search students'}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ps-10 text-start text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <StyledSelect value={division || ''} onValueChange={(val) => { setDivision(val || null); setStudentSearch('') }} placeholder={t('chooseDivisionOption')} options={[{ value: '', label: t('chooseDivisionOption') }, ...(currentRole === 'TEACHER' ? [] : [{ value: 'all', label: t('showAll') }]), ...assignedDivisionOptions.map((code) => ({ value: code, label: code }))]} className="min-w-44" />
          </div>
        </div>
      </div>

      {isTeacher && activeView === 'gradebook' && division && division !== 'all' && <>
        {gradebookRows.length > 0 ? <>
          {availableSubjects.length > 1 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{locale === 'ar' ? 'المادة:' : 'Subject:'}</span>{availableSubjects.map((subject) => <button key={subject} type="button" onClick={() => setCurrentSubject(subject)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${currentSubject === subject ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300'}`}>{subject}</button>)}</div>}
          <GradebookTable divisionName={division} subject={currentSubject || availableSubjects[0] || 'Unassigned subject'} teacherId={currentUserId ?? undefined} students={gradebookRows} allDivisionCodes={assignedDivisionOptions} readOnly={false} />
        </> : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">{locale === 'ar' ? 'لا يوجد طلاب في هذه الشعبة بعد.' : 'No students are assigned to this division yet.'}</div>}
      </>}

      {activeView === 'roster' && <>
      <div className="space-y-3 md:hidden">
        {visibleStudents.map((student) => (
          <article key={student.id} onClick={() => canEditStudents && setEditingStudent(student)} className={`rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${canEditStudents ? 'cursor-pointer' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-bold text-slate-900 dark:text-white">{student.fullName}</h2>
                <p className="mt-1 text-xs text-slate-500">{student.academicId || '—'} · {student.divisionCode || student.divisionId || t('unspecified')}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">{student.gradeLevel ? getGradeLevelArabic(student.gradeLevel) : '—'}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-slate-500">{t('gpa')}</span><strong>{student.gpa ?? '—'}</strong></div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-slate-500">{t('behavior')}</span><strong>{student.behaviorScore}</strong></div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><span className="block text-slate-500">{t('attendanceScore')}</span><strong>{student.attendanceScore}</strong></div>
            </div>
            {canEditStudents && <div className="mt-3 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setEditingStudent(student)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">{t('editAction')}</button>
              <button type="button" onClick={() => setTransferStudent(student)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">{t('transferAction')}</button>
              {canDeleteStudents && <button type="button" onClick={() => setDeletingStudent(student)} aria-label={t('deleteStudent')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-300"><Trash2 className="h-4 w-4" /></button>}
            </div>}
          </article>
        ))}
        {!visibleStudents.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{!division ? t('chooseDivisionToView') : t('noStudentRecords')}</p>}
      </div>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {canEditStudents && <th className="w-12 px-3 py-3 text-center"><input type="checkbox" checked={visibleStudents.length > 0 && visibleStudents.every((student) => selectedStudentIds.includes(student.id))} onChange={() => setSelectedStudentIds((current) => visibleStudents.every((student) => current.includes(student.id)) ? current.filter((id) => !visibleStudents.some((student) => student.id === id)) : Array.from(new Set([...current, ...visibleStudents.map((student) => student.id)])))} aria-label={locale === 'ar' ? 'تحديد جميع الطلاب' : 'Select all students'} /></th>}<th className="px-4 py-3 text-start">{t('studentName')}</th><th className="px-4 py-3 text-start">{t('academicId')}</th><th className="px-4 py-3 text-start">{t('gpa')}</th><th className="px-4 py-3 text-start">{t('parentPhone')}</th><th className="px-4 py-3 text-start">{t('nationalId')}</th><th className="px-4 py-3 text-start">{t('division')}</th><th className="px-4 py-3 text-start">{t('gradeLevel')}</th>

                <th className="px-4 py-3 text-start">{t('behavior')}</th><th className="px-4 py-3 text-start">{t('attendanceScore')}</th><th className="px-4 py-3 text-start">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {!division ? (
                <tr>
                    <td colSpan={canEditStudents ? 11 : 10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Filter className="h-8 w-8 text-slate-400" />
                      <p className="text-slate-600 dark:text-slate-400">{t('chooseDivisionToView')}</p>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                    <td colSpan={canEditStudents ? 11 : 10} className="px-4 py-8 text-center text-slate-500">
                    {t('loadingStudents')}
                  </td>
                </tr>
              ) : visibleStudents.length === 0 ? (
                <tr>
                    <td colSpan={canEditStudents ? 11 : 10} className="px-4 py-8 text-center text-slate-500">
                    {t('noStudentRecords')}
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="sync" initial key={division ?? 'no-division'}>
                {visibleStudents.map((student, index) => (
                  <motion.tr key={student.id} initial={index < 10 ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: index < 10 ? 0.14 : 0, delay: index < 10 ? index * 0.02 : 0, ease: 'easeOut' }} onClick={() => canEditStudents && setEditingStudent(student)} className={`${canEditStudents ? 'cursor-pointer' : ''} border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                    {canEditStudents && <td className="px-3 py-3 text-center"><input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => setSelectedStudentIds((current) => current.includes(student.id) ? current.filter((id) => id !== student.id) : [...current, student.id])} onClick={(event) => event.stopPropagation()} aria-label={`${locale === 'ar' ? 'تحديد' : 'Select'} ${student.fullName}`} /></td>}<td className="px-4 py-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{student.fullName}</div>
                        <div className="text-xs text-slate-500">{student.arabicName || '—'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.academicId || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.gpa ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.parentPhone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.nationalId || '—'}</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{student.divisionCode || student.divisionId || `${t('unspecified')} / غير معين`}</span></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{student.gradeLevel ? getGradeLevelArabic(student.gradeLevel) : 'غير معين'}</td>
                    <td className="px-4 py-3">{student.behaviorScore}</td>
                    <td className="px-4 py-3">{student.attendanceScore}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2">
                      {canEditStudents && <button type="button" onClick={(event) => { event.stopPropagation(); setEditingStudent(student) }} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        <Edit3 className="h-3.5 w-3.5" /> {t('editAction')}
                      </button>}
                      {canEditStudents && <button type="button" onClick={(event) => { event.stopPropagation(); setTransferStudent(student) }} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        <UserCog className="h-3.5 w-3.5" /> {t('transferAction')}
                      </button>}
                      {canDeleteStudents && <button type="button" onClick={(event) => { event.stopPropagation(); setDeletingStudent(student) }} aria-label={t('deleteStudent')} className="ms-2 text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>}
      </>}

      <DivisionGuard open={showDivisionGuard} onOpenChange={handleDivisionGuardChange} />

      <AnimatePresence>
        {isAddStudentOpen && (
          <Modal open={isAddStudentOpen} onOpenChange={(nextOpen) => {
            setIsAddStudentOpen(nextOpen)
            if (!nextOpen) {
              setShowDivisionGuard(false)
            }
          }} className="max-w-md">
            <div>
            <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('addStudent')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('addStudentInfo')}</p>
            </div>
            <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void handleAddStudent() }}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('studentName')}</label>
                <input value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} placeholder={t('enterFullName')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-start transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-600 dark:focus:bg-slate-900 dark:focus:ring-emerald-900" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('nationalId')}</label>
                <input value={newStudent.nationalId} onChange={(e) => setNewStudent({ ...newStudent, nationalId: e.target.value })} placeholder={t('exampleNationalId')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-start transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:placeholder:text-slate-600 dark:focus:bg-slate-900 dark:focus:ring-emerald-900" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('division')}</label>
                <StyledSelect
                  value={newStudent.divisionCode}
                  onValueChange={(value) => setNewStudent({ ...newStudent, divisionCode: value })}
                  placeholder={divisionOptions.length > 0 ? t('chooseDivision') : t('noAvailableDivisions')}
                  options={divisionOptions.length > 0 ? divisionOptions.map((code) => ({ value: code, label: code })) : [{ value: '', label: t('noAvailableDivisions') }]}
                />
              </div>
              <button type="submit" disabled={divisionOptions.length > 0 && !newStudent.divisionCode} className="mt-6 w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600">{t('saveStudent')}</button>
            </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} onImported={handleImportComplete} />}

      {importResult && !bulkEditing && <Modal open={true} onOpenChange={(open) => !open && setImportResult(null)} className="max-w-lg"><div dir="rtl"><h2 className="text-xl font-bold">{t('importSuccess')}</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t('importSummary').replace('{count}', String(importResult.imported)).replace('{divisions}', String(importResult.divisionCount))}</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setImportResult(null)} className="flex-1 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">{t('close')}</button><button type="button" onClick={() => setBulkEditing(true)} disabled={!importResult.students.length} className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-white disabled:opacity-50">{t('bulkEdit')}</button></div></div></Modal>}
      {bulkEditing && bulkEditStudents.length > 0 && <BulkStudentEditor students={bulkEditStudents} onClose={() => setBulkEditing(false)} onSaved={(updated) => { setStudents((current) => current.map((student) => updated.find((item) => item.id === student.id) ? { ...student, ...updated.find((item) => item.id === student.id) } : student)); setSelectedStudentIds([]); setBulkEditing(false) }} />}

      {editingStudent && <EditStudentModal student={editingStudent} onClose={() => setEditingStudent(null)} onSaved={(updated) => { setStudents((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); window.dispatchEvent(new CustomEvent('thabat-students-changed')) }} />}
      <TransferModal student={transferStudent} divisions={divisionOptions.map((code) => ({ code }))} onClose={() => setTransferStudent(null)} onTransferred={(updated) => { setStudents((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); window.dispatchEvent(new CustomEvent('thabat-students-changed')) }} />
      <BulkTransferModal open={bulkTransferOpen} students={selectedStudents} divisions={divisionOptions.map((code) => ({ code }))} onClose={() => setBulkTransferOpen(false)} onTransferred={() => { setStudents((current) => current.filter((student) => !selectedStudentIds.includes(student.id))); setSelectedStudentIds([]); window.dispatchEvent(new CustomEvent('thabat-students-changed')) }} />
      <ConfirmModal open={Boolean(deletingStudent)} title={t('deleteStudent')} message={t('confirmDeleteStudent')} onCancel={() => setDeletingStudent(null)} onConfirm={() => void deleteStudent()} busy={deleteBusy} />
    </div>
  )
}
