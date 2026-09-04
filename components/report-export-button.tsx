'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { exportThabatExcelReport, type StudentRecord } from '@/lib/export-excel'
import { useLanguage } from '@/components/language-provider'
import { useToast } from '@/components/toast-provider'
import { runExport } from '@/lib/export-feedback'

export function ReportExportButton({ students, label = 'تصدير التقرير' }: { students: StudentRecord[]; label?: string }) {
  const { t } = useLanguage()
  const { showToast, updateToast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = () => {
    if (isExporting) return
    setIsExporting(true)
    void runExport(() => exportThabatExcelReport(students), showToast, updateToast).finally(() => setIsExporting(false))
  }
  return <button type="button" onClick={handleExport} disabled={isExporting} className="inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-3.5 font-sans text-base font-bold leading-6 tracking-normal text-white shadow-md transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-wait disabled:opacity-60">{isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5 stroke-[2.5]" />}<span>{label === 'تصدير التقرير' ? t('exportExcelReport') : label}</span></button>
}
