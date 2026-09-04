'use client'

import { Download } from 'lucide-react'
import { exportThabatExcelReport, type StudentRecord } from '@/lib/export-excel'
import { useLanguage } from '@/components/language-provider'
import { useToast } from '@/components/toast-provider'
import { runExport } from '@/lib/export-feedback'

export function ReportExportButton({ students, label = 'تصدير التقرير' }: { students: StudentRecord[]; label?: string }) {
  const { t } = useLanguage()
  const { showToast, updateToast } = useToast()
  return <button type="button" onClick={() => void runExport(() => exportThabatExcelReport(students), showToast, updateToast)} className="inline-flex items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-3.5 font-sans text-base font-bold leading-6 tracking-normal text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95"><Download className="h-5 w-5 stroke-[2.5]" /><span>{label === 'تصدير التقرير' ? t('exportExcelReport') : label}</span></button>
}
