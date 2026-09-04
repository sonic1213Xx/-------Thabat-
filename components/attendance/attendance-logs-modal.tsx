'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Loader2, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { getSession } from '@/lib/auth'

export type AttendanceLogRow = { id: string; studentId: string; studentName: string; divisionCode?: string | null; date: string; status: string; notes?: string | null; hasDoctorNote: boolean }

export function AttendanceLogsModal({ open, onClose, onStudentClick, english }: { open: boolean; onClose: () => void; onStudentClick: (student: AttendanceLogRow) => void; english: boolean }) {
  const [logs, setLogs] = useState<AttendanceLogRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const session = getSession()
    if (!session) return
    setLoading(true)
    void fetch('/api/attendance?logs=true', { headers: { 'x-thabat-user-id': session.id } }).then((response) => response.json()).then((result) => setLogs(result.data ?? [])).catch(() => setLogs([])).finally(() => setLoading(false))
  }, [open])

  const statusLabel = (status: string) => ({ ABSENT_EXCUSED: english ? 'Excused' : 'غياب بعذر', ABSENT_UNEXCUSED: english ? 'Absent' : 'غياب', LATE: english ? 'Late' : 'متأخر', OTHER: english ? 'Other' : 'أخرى' }[status] ?? status)

  return <Modal open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()} className="max-w-4xl">
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">{english ? 'Attendance logs' : 'سجل الحضور والغياب'}</h2></div><button type="button" onClick={onClose} aria-label={english ? 'Close' : 'إغلاق'} className="rounded-lg p-2 hover:bg-muted"><X className="h-4 w-4" /></button></div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : <div className="max-h-[60vh] overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-start">{english ? 'Student' : 'الطالب'}</th><th className="p-3 text-start">{english ? 'Division' : 'الشعبة'}</th><th className="p-3 text-start">{english ? 'Date' : 'التاريخ'}</th><th className="p-3 text-start">{english ? 'Status' : 'الحالة'}</th><th className="p-3 text-start">{english ? 'Doctor note' : 'ملاحظة طبية'}</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t border-border"><td className="p-3"><button type="button" onClick={() => onStudentClick(log)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">{log.studentName}</button></td><td className="p-3">{log.divisionCode ?? '-'}</td><td className="p-3">{log.date}</td><td className="p-3">{statusLabel(log.status)}</td><td className="p-3">{log.hasDoctorNote ? (log.notes || (english ? 'Yes' : 'نعم')) : '-'}</td></tr>)}</tbody></table>{!logs.length && <p className="py-10 text-center text-muted-foreground">{english ? 'No attendance logs found.' : 'لا توجد سجلات حضور.'}</p>}</div>}
    </div>
  </Modal>
}