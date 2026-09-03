'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'

interface AttendanceRecord {
  date: string
  status: string
  notes?: string
  markedByName?: string
}

interface StudentAttendanceStats {
  totalDays: number
  presentCount: number
  excusedCount: number
  unexcusedCount: number
  lateCount: number
}

interface StudentAttendanceModalProps {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  onIssueWarning?: () => void
}

export function StudentAttendanceModal({
  open,
  onClose,
  studentId,
  studentName,
  onIssueWarning,
}: StudentAttendanceModalProps) {
  const { t } = useLanguage()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<StudentAttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/attendance/student/${studentId}`)
        const result = await response.json()

        if (response.ok && result.data) {
          setRecords(result.data.records)
          setStats(result.data.stats)
        }
      } catch (error) {
        console.error('Failed to load student attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [open, studentId])

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: t('present'),
      ABSENT_EXCUSED: t('absentExcused'),
      ABSENT_UNEXCUSED: t('absentUnexcused'),
      LATE: t('late'),
      UNMARKED: t('unmarked'),
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      ABSENT_EXCUSED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      ABSENT_UNEXCUSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      LATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      UNMARKED: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    }
    return colors[status] || colors.UNMARKED
  }

  return (
    <Modal open={open} onOpenChange={onClose} className="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('attendanceHistory')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">{studentName}</p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-slate-500">{t('attendanceLoading')}</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800 md:grid-cols-5">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('totalDays')}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalDays}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('present')}</p>
                  <p className="text-lg font-bold text-emerald-600">{stats.presentCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('absentExcused')}</p>
                  <p className="text-lg font-bold text-amber-600">{stats.excusedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('absentUnexcused')}</p>
                  <p className="text-lg font-bold text-red-600">{stats.unexcusedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('late')}</p>
                  <p className="text-lg font-bold text-blue-600">{stats.lateCount}</p>
                </div>
              </div>
            )}

            {/* Records List */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {records.length === 0 ? (
                <p className="py-4 text-center text-slate-500">{t('noAttendanceRecords')}</p>
              ) : (
                records.map((record, index) => (
                  <div
                    key={`${record.date}-${index}`}
                    className="flex items-start justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{record.date}</p>
                      {record.notes && <p className="text-xs text-slate-600 dark:text-slate-400">{record.notes}</p>}
                      {record.markedByName && (
                        <p className="text-xs text-slate-500 dark:text-slate-500">{t('markedBy')}: {record.markedByName}</p>
                      )}
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Issue Warning Button */}
            {onIssueWarning && (
              <button
                type="button"
                onClick={onIssueWarning}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
              >
                <AlertTriangle className="h-4 w-4" /> {t('issueWarning')}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
