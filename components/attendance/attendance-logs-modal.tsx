'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, ChevronDown, ClipboardList, Download, FileSpreadsheet, Loader2, Save, Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { getCurrentProfile, getSession } from '@/lib/auth'
import { AttendanceStatusSelect } from '@/components/ui/attendance-status-select'
import { StyledSelect } from '@/components/ui/styled-select'
import { exportAttendancePdf } from '@/lib/export-attendance-pdf'
import { exportAttendanceWorkbook } from '@/lib/export-attendance-fixed'
import { useToast } from '@/components/toast-provider'
import { runExport } from '@/lib/export-feedback'

type StudentRow = { studentId: string; studentName: string; divisionCode?: string | null; status: string; notes?: string | null }
type SavedSession = { id: string; date: string; divisionId: string; mode: string; presentCount: number; absentCount: number; createdAt: string }

const statusOptions = (english: boolean) => [
  { value: 'PRESENT', label: english ? 'Present' : 'حاضر' },
  { value: 'ABSENT_UNEXCUSED', label: english ? 'Absent' : 'غائب' },
  { value: 'ABSENT_EXCUSED', label: english ? 'Excused' : 'غياب بعذر' },
  { value: 'LATE', label: english ? 'Late' : 'متأخر' },
]

const filterStatusOptions = (english: boolean) => [{ value: 'ALL', label: english ? 'All statuses' : 'كل الحالات' }, ...statusOptions(english)]

export function AttendanceLogsModal({ open, onClose, english }: { open: boolean; onClose: () => void; english: boolean }) {
  const session = getSession()
  const profile = getCurrentProfile()
  const { showToast, updateToast } = useToast()
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([])
  const [divisions, setDivisions] = useState<string[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [divisionMenuOpen, setDivisionMenuOpen] = useState(false)
  const initialStudentsRef = useRef(new Map<string, { status: string; notes: string }>())

  const loadSavedDates = async () => {
    if (!session) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ logs: 'true', month, divisionId: 'ALL' })
      const response = await fetch(`/api/attendance?${params}`, { headers: { 'x-thabat-user-id': session.id } })
      const result = await response.json() as { data?: SavedSession[] }
      setSavedSessions(result.data ?? [])
    } catch { setSavedSessions([]) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!open || !session) return
    void fetch('/api/divisions').then((response) => response.json()).then((result) => setDivisions((result.data ?? []).map((item: { code: string }) => item.code))).catch(() => setDivisions([]))
    void loadSavedDates()
  }, [open, session?.id, month])

  useEffect(() => {
    if (!open || !session || !selectedDate || !selectedDivision) return
    const loadStudents = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ logs: 'true', date: selectedDate, divisionId: selectedDivision })
        const response = await fetch(`/api/attendance?${params}`, { headers: { 'x-thabat-user-id': session.id } })
        const result = await response.json() as { data?: StudentRow[] }
        const loadedStudents = result.data ?? []
        setStudents(loadedStudents)
        initialStudentsRef.current = new Map(loadedStudents.map((student) => [student.studentId, { status: student.status, notes: student.notes ?? '' }]))
      } catch { setStudents([]) } finally { setLoading(false) }
    }
    void loadStudents()
  }, [open, session?.id, selectedDate, selectedDivision])

  const dates = useMemo(() => Array.from(new Set(savedSessions.map((item) => item.date))), [savedSessions])
  const filteredStudents = useMemo(() => students.filter((student) => student.studentName.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (statusFilter === 'ALL' || student.status === statusFilter)), [students, query, statusFilter])
  const pageSize = 100
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const visibleStudents = filteredStudents.slice(page * pageSize, (page + 1) * pageSize)
  const updateStudent = (studentId: string, update: Partial<StudentRow>) => setStudents((current) => current.map((student) => student.studentId === studentId ? { ...student, ...update } : student))

  const openDate = (date: string) => {
    setSelectedDate(date)
    setSelectedDivision(null)
    setStudents([])
    setQuery('')
    setStatusFilter('ALL')
    setPage(0)
  }

  const resetLogs = () => {
    setSelectedDate(null)
    setSelectedDivision(null)
    setStudents([])
    setQuery('')
    setStatusFilter('ALL')
    setPage(0)
    setDivisionMenuOpen(false)
    initialStudentsRef.current.clear()
  }

  useEffect(() => {
    if (open) resetLogs()
  }, [open])

  const save = async () => {
    if (!session || !selectedDate || !selectedDivision || !students.length) return
    const changedStudents = students.filter((student) => {
      const initial = initialStudentsRef.current.get(student.studentId)
      return initial?.status !== student.status || initial.notes !== (student.notes ?? '')
    })
    if (!changedStudents.length) {
      showToast(english ? 'No attendance changes to save.' : 'لا توجد تغييرات للحفظ.', 'info')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-thabat-user-id': session.id },
        body: JSON.stringify({ date: selectedDate, records: changedStudents.map((student) => ({ studentId: student.studentId, status: student.status, notes: student.notes ?? '', divisionId: selectedDivision })) }),
      })
      if (!response.ok) throw new Error('save failed')
      for (const student of changedStudents) initialStudentsRef.current.set(student.studentId, { status: student.status, notes: student.notes ?? '' })
      showToast(english ? 'Saved attendance snapshot.' : 'تم تحديث سجل الحضور.', 'success')
      await loadSavedDates()
    } catch { showToast(english ? 'Unable to save attendance.' : 'تعذر حفظ الحضور.', 'error') } finally { setSaving(false) }
  }

  const exportRows = students.map((student) => ({ id: student.studentId, fullName: student.studentName, divisionCode: student.divisionCode, status: student.status, notes: student.notes ?? '' }))
  const exportFile = (type: 'EXCEL' | 'PDF') => {
    if (!selectedDate || !selectedDivision) return
    if (type === 'PDF') void runExport(() => exportAttendancePdf(exportRows, [selectedDivision], selectedDate, { name: profile?.name || session?.name || '', role: profile?.role || session?.role || 'PRINCIPAL' }), showToast, updateToast)
    else void runExport(() => exportAttendanceWorkbook([selectedDivision], selectedDate, exportRows, { name: profile?.name || session?.name || '', role: profile?.role || session?.role || 'PRINCIPAL' }, session?.id, true), showToast, updateToast)
  }

  const closeEditor = () => { setSelectedDate(null); setSelectedDivision(null); setStudents([]); setQuery(''); setPage(0); void loadSavedDates() }
  const dateSessions = (date: string) => savedSessions.filter((item) => item.date === date)
  const handleClose = () => { resetLogs(); onClose() }

  return <Modal open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()} className="max-w-6xl">
    <div className="space-y-5">
      {selectedDate && selectedDivision && <StyledSelect value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(0) }} aria-label={english ? 'Filter by status' : 'تصفية حسب الحالة'} options={filterStatusOptions(english)} className="h-9 w-44 rounded-lg px-2 text-xs" />}
      <div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" /><div><h2 className="text-xl font-bold">{english ? 'Attendance logs' : 'سجل الحضور والغياب'}</h2><p className="text-xs text-muted-foreground">{selectedDate ? (english ? 'Choose a division to edit this day' : 'اختر شعبة لتعديل هذا اليوم') : (english ? 'Choose a saved day' : 'اختر يوماً محفوظاً')}</p></div></div>

      {!selectedDate ? <>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2"><CalendarDays className="h-4 w-4 text-emerald-600" /><span className="sr-only">{english ? 'Month' : 'الشهر'}</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : dates.length ? <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="max-h-[58vh] space-y-2 overflow-y-auto pe-1">{dates.map((date) => <motion.button key={date} type="button" variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} onClick={() => openDate(date)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"><div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-emerald-600" /><div><p className="font-bold">{date}</p><p className="text-xs text-muted-foreground">{english ? `${dateSessions(date).length} saved division(s)` : `تم حفظ ${dateSessions(date).length} شعبة`}</p></div></div><ArrowLeft className="h-4 w-4 text-muted-foreground rtl:rotate-180" /></motion.button>)}</motion.div> : <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" /><p className="mt-3 font-semibold">{english ? 'No saved attendance days for this month.' : 'لا توجد أيام حضور محفوظة لهذا الشهر.'}</p></div>}
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20"><button type="button" onClick={closeEditor} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{english ? 'Saved days' : 'الأيام المحفوظة'}</button><span className="text-sm font-bold">{selectedDate}</span></div>
        <div className="relative"><button type="button" onClick={() => setDivisionMenuOpen((current) => !current)} className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-emerald-500"><span>{selectedDivision ? (english ? `Division ${selectedDivision}` : `الشعبة ${selectedDivision}`) : (english ? 'Choose a division to edit' : 'اختر شعبة للتعديل')}</span><ChevronDown className={`h-4 w-4 text-emerald-600 transition-transform ${divisionMenuOpen ? 'rotate-180' : ''}`} /></button><AnimatePresence>{divisionMenuOpen && <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} className="absolute inset-x-0 top-full z-20 mt-2 grid max-h-60 grid-cols-2 gap-1 overflow-auto rounded-xl border border-border bg-card p-2 shadow-xl sm:grid-cols-3">{divisions.map((code) => <button type="button" key={code} onClick={() => { setSelectedDivision(code); setDivisionMenuOpen(false); setStudents([]); setPage(0) }} className={`flex items-center justify-between rounded-lg px-3 py-2 text-start text-sm ${selectedDivision === code ? 'bg-emerald-600 text-white' : 'hover:bg-muted'}`}>{english ? `Division ${code}` : `الشعبة ${code}`}{selectedDivision === code && <Check className="h-4 w-4" />}</button>)}</motion.div>}</AnimatePresence></div>
        {!selectedDivision ? <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center"><CalendarDays className="mx-auto h-10 w-10 text-emerald-600/60" /><p className="mt-3 font-semibold">{english ? 'Select a division to load students.' : 'اختر شعبة لتحميل الطلاب.'}</p></div> : <><div className="flex flex-wrap gap-2"><div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder={english ? 'Filter students' : 'تصفية الطلاب'} className="w-full rounded-lg border py-2 ps-9 pe-3 text-sm" /></div><button type="button" onClick={() => void save()} disabled={saving || !students.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{english ? 'Save day' : 'حفظ اليوم'}</button><button type="button" onClick={() => exportFile('EXCEL')} disabled={!students.length} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"><FileSpreadsheet className="h-4 w-4" />Excel</button><button type="button" onClick={() => exportFile('PDF')} disabled={!students.length} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50"><Download className="h-4 w-4" />PDF</button></div>{loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : <div className="max-h-[55vh] overflow-auto rounded-lg border"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-start">{english ? 'Student' : 'الطالب'}</th><th className="p-3 text-start">{english ? 'Status' : 'الحالة'}</th><th className="p-3 text-start">{english ? 'Notes' : 'ملاحظات'}</th></tr></thead><tbody>{visibleStudents.map((student) => <tr key={student.studentId} className="border-t border-border"><td className="p-3 font-semibold">{student.studentName}</td><td className="min-w-[18rem] p-3"><AttendanceStatusSelect value={student.status === 'UNMARKED' ? '' : student.status} onValueChange={(value) => updateStudent(student.studentId, { status: value })} options={statusOptions(english)} english={english} variant="buttons" /></td><td className="p-3"><input value={student.notes ?? ''} onChange={(event) => updateStudent(student.studentId, { notes: event.target.value })} className="w-full min-w-[12rem] rounded-lg border px-2 py-1.5" /></td></tr>)}</tbody></table>{!students.length && <p className="py-10 text-center text-muted-foreground">{english ? 'No students found.' : 'لا يوجد طلاب.'}</p>}</div>}{filteredStudents.length > pageSize && <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{english ? `${page + 1} of ${pageCount}` : `${page + 1} من ${pageCount}`}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">{english ? 'Previous' : 'السابق'}</button><button type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">{english ? 'Next' : 'التالي'}</button></div></div>}</>}
      </>}
    </div>
  </Modal>
}
