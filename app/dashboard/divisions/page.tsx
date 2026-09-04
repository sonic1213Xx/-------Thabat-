'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { DivisionFormModal } from '@/components/dashboard/division-form-modal'
import { ConfirmModal } from '@/components/dashboard/confirm-modal'
import { DivisionsLoadingSkeleton } from '@/components/dashboard/tab-loading-skeleton'
import { useTabLoading } from '@/components/dashboard/use-tab-loading'
import { useLanguage } from '@/components/language-provider'
import { fetchCached } from '@/lib/client-cache'

interface DivisionRecord {
  id: string
  code: string
  name: string
}

interface DivisionSummary extends DivisionRecord {
  students: number
  averageBehavior: number
}

export default function DivisionsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [divisions, setDivisions] = useState<DivisionRecord[]>([])
  const [students, setStudents] = useState<any[]>([])
  const { isLoading, withMinimumDelay } = useTabLoading(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingDivision, setEditingDivision] = useState<DivisionRecord | null>(null)
  const [newDivision, setNewDivision] = useState({ code: '', name: '' })
  const [deletingDivision, setDeletingDivision] = useState<DivisionRecord | null>(null)

  const loadData = async () => {
    await withMinimumDelay(async () => {
      try {
        const [divisionsRes, studentsRes] = await Promise.all([
          fetchCached<{ data?: DivisionRecord[] }>('dashboard:divisions', '/api/divisions'),
          fetchCached<{ data?: any[] }>('dashboard:students:all', '/api/students'),
        ])

        setDivisions(divisionsRes.data ?? [])
        setStudents(studentsRes.data ?? [])
      } catch (error) {
        console.error('Failed to load divisions:', error)
      }
    })
  }

  useEffect(() => {
    void loadData()
  }, [])

  const divisionSummaries: DivisionSummary[] = (divisions.length ? divisions : []).map((division) => {
    const filtered = students.filter((student) => student.divisionCode === division.code)
    const averageBehavior = filtered.length
      ? Math.round(filtered.reduce((sum, student) => sum + (student.behaviorScore || 0), 0) / filtered.length)
      : 0

    return {
      ...division,
      students: filtered.length,
      averageBehavior,
    }
  })

  const openCreateModal = () => {
    setEditingDivision(null)
    setNewDivision({ code: '', name: '' })
    setIsAddOpen(true)
  }

  const openEditModal = (division: DivisionRecord) => {
    setEditingDivision(division)
    setNewDivision({ code: division.code, name: division.name })
    setIsAddOpen(true)
  }

  const saveDivision = async (event: React.FormEvent) => {
    event.preventDefault()
    const code = newDivision.code.trim()
    const name = newDivision.name.trim() || `${t('divisionLabel')} ${code}`

    if (!code) return

    try {
      const isEditing = Boolean(editingDivision)
      const response = isEditing
        ? await fetch(`/api/divisions/${editingDivision!.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name }),
          })
        : await fetch('/api/divisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name }),
          })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || t('divisionSaved'))
      }

      setIsAddOpen(false)
      setNewDivision({ code: '', name: '' })
      setEditingDivision(null)
      await loadData()
      router.refresh()
    } catch (error) {
      console.error('Division save failed:', error)
      alert(error instanceof Error ? error.message : t('divisionSaved'))
    }
  }

  const confirmDeleteDivision = async () => {
    if (!deletingDivision) return

    try {
      const response = await fetch(`/api/divisions/${deletingDivision.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || t('divisionDeleted'))
      }

      setDeletingDivision(null)
      await loadData()
      router.refresh()
    } catch (error) {
      console.error('Division delete failed:', error)
      alert(error instanceof Error ? error.message : t('divisionDeleted'))
    }
  }

  if (isLoading) {
    return <DivisionsLoadingSkeleton />
  }

  if (!isLoading && divisionSummaries.length === 0) {
    return (
      <div className="space-y-6 min-h-[320px]">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('divisions')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('divisionManagementDescription')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
              <Plus className="h-4 w-4" /> {t('addDivision')}
            </button>
            <a href="/dashboard/students" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
              <Upload className="h-4 w-4" /> {t('importFromExcel')}
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-emerald-300 bg-white p-10 text-center shadow-sm dark:border-emerald-700/50 dark:bg-slate-900">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t('noDivisionsAdded')}</h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">{t('addDivisionToStart')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">
              <Plus className="h-4 w-4" /> {t('addDivision')}
            </button>
            <a href="/dashboard/students" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">
              <Upload className="h-4 w-4" /> {t('importFromExcel')}
            </a>
          </div>
        </div>

        <DivisionFormModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title={editingDivision ? t('editDivision') : t('addDivision')}
          submitLabel={editingDivision ? t('saveChanges') : t('saveDivision')}
          code={newDivision.code}
          name={newDivision.name}
          onCodeChange={(code) => setNewDivision((current) => ({ ...current, code }))}
          onNameChange={(name) => setNewDivision((current) => ({ ...current, name }))}
          onSubmit={saveDivision}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 min-h-[320px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('divisions')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('divisionManagementDescription')}</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> {t('addDivision')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {divisionSummaries.map((division) => (
          <motion.div
            key={division.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{t('divisionLabel')}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{division.code}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => openEditModal(division)} aria-label={t('editDivision')} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDeletingDivision(division)} aria-label={t('deleteDivision')} className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t('studentCount')}</span>
                <span className="font-bold text-slate-900 dark:text-white">{division.students}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t('behaviorAverage')}</span>
                <span className="font-bold text-emerald-600">{division.averageBehavior}/100</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('divisionDetails')}</h2>
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            {t('loadingDivisions')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-start">{t('divisionLabel')}</th><th className="px-4 py-3 text-start">{t('studentCount')}</th><th className="px-4 py-3 text-start">{t('behaviorAverage')}</th><th className="px-4 py-3 text-start">{t('active')}</th><th className="px-4 py-3 text-start">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {divisionSummaries.map((division) => (
                  <tr key={division.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3 font-medium">{division.name || `الفصل ${division.code}`}</td>
                    <td className="px-4 py-3">{division.students}</td>
                    <td className="px-4 py-3">{division.averageBehavior}/100</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {t('active')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openEditModal(division)} aria-label="تعديل الشعبة" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeletingDivision(division)} aria-label="حذف الشعبة" className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DivisionFormModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingDivision ? t('editDivision') : t('addDivision')}
        submitLabel={editingDivision ? t('saveChanges') : t('saveDivision')}
        code={newDivision.code}
        name={newDivision.name}
        onCodeChange={(code) => setNewDivision((current) => ({ ...current, code }))}
        onNameChange={(name) => setNewDivision((current) => ({ ...current, name }))}
        onSubmit={saveDivision}
      />

      <ConfirmModal
        open={Boolean(deletingDivision)}
        title={t('deleteDivision')}
        message={`${t('divisionDeleteConfirm')} ${deletingDivision?.name || deletingDivision?.code}?`}
        onCancel={() => setDeletingDivision(null)}
        onConfirm={confirmDeleteDivision}
      />
    </div>
  )
}
