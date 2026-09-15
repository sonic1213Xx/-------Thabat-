'use client'

import { useEffect, useState } from 'react'
import { FileText, Save, TrendingUp, Users } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { ReportExportButton } from '@/components/report-export-button'
import { useToast } from '@/components/toast-provider'
import { fetchCached } from '@/lib/client-cache'

export default function ReportsPage() {
  const { t, locale } = useLanguage()
  const { toast } = useToast()
  const [students, setStudents] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsRes, warningsRes] = await Promise.all([
          fetchCached<{ data?: any[] }>('dashboard:students:all', '/api/students'),
          fetchCached<{ data?: any[] }>('dashboard:warnings:all', '/api/warnings'),
        ])
        const studentsData = studentsRes.data ?? []
        const warningsData = warningsRes.data ?? []
        setStudents(studentsData)
        setWarnings(warningsData)
      } catch (error) {
        console.error('Failed to load reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const totalWarnings = warnings.length
  const avgBehavior = students.length
    ? Math.round(students.reduce((sum, item) => sum + (item.behaviorScore || 0), 0) / students.length)
    : 0

  const handleSave = () => {
    localStorage.setItem('thabat-report-snapshot', JSON.stringify({
      savedAt: new Date().toISOString(),
      students,
      warnings,
    }))
    toast.success(locale === 'ar' ? 'تم حفظ التقرير بنجاح' : 'Report saved successfully')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('reports')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('reportsDescription')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <Save className="h-4 w-4" />
            {locale === 'ar' ? 'حفظ التقرير' : 'Save report'}
          </button>
          <ReportExportButton students={students} label="تصدير التقرير" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('totalStudents')}</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{students.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('averageBehaviorMetric')}</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{avgBehavior}/100</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{t('reportTotal')}</span>
            <FileText className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{totalWarnings}</div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('performanceSummary')}</h2>
        {loading ? (
          <p className="text-slate-500">{t('loadingReport')}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300">{t('numberOfStudents')}</span>
              <span className="font-bold text-slate-900 dark:text-white">{students.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300">{t('numberOfWarnings')}</span>
              <span className="font-bold text-slate-900 dark:text-white">{totalWarnings}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <span className="text-slate-600 dark:text-slate-300">{t('behaviorScoreAverage')}</span>
              <span className="font-bold text-slate-900 dark:text-white">{avgBehavior}/100</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
