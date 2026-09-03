'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'

type DivisionGuardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DivisionGuard({ open, onOpenChange }: DivisionGuardProps) {
  const { t } = useLanguage()
  const [divisions, setDivisions] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    const loadDivisions = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/divisions')
        const json = await response.json()
        setDivisions(json.data ?? [])
      } catch (error) {
        console.error('Failed to load divisions:', error)
      } finally {
        setLoading(false)
      }
    }

    void loadDivisions()
  }, [open])

  const hasNoDivisions = !loading && divisions.length === 0

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-md">
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-6 text-sm text-slate-600 dark:text-slate-300">
            <span className="loading-spinner" />
            {t('divisionCheckLoading')}
          </div>
        ) : hasNoDivisions ? (
          <>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('noDivisionAdded')}</h2>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('divisionRequired')}
            </p>

            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <p className="font-semibold mb-2">{t('nextSteps')}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t('goToDivisions')}</li>
                <li>{t('createDivisionExample')}</li>
                <li>{t('returnAddStudents')}</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
              >
                {t('cancel')}
              </button>
              <Link
                href="/dashboard/divisions"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                {t('addDivision')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('divisionsExist')}</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('divisionsReady')}
            </p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t('confirm')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
