'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { TabLoadingSkeleton } from '@/components/dashboard/tab-loading-skeleton'
import { useTabLoading } from '@/components/dashboard/use-tab-loading'
import { useLanguage } from '@/components/language-provider'

type Team = {
  id: string
  label: string
}

export default function TeamsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const { isLoading, withMinimumDelay } = useTabLoading(true)
  const [open, setOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)

  const loadTeams = async () => {
    await withMinimumDelay(async () => {
      try {
        const response = await fetch('/api/teams')
        const result = await response.json()
        setTeams(result.data ?? [])
      } catch (error) {
        console.error('Failed to load teams:', error)
      }
    })
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  const openCreateModal = () => {
    setEditingTeam(null)
    setTeamName('')
    setOpen(true)
  }

  const openEditModal = (team: Team) => {
    setEditingTeam(team)
    setTeamName(team.label)
    setOpen(true)
  }

  const saveTeam = async () => {
    const trimmed = teamName.trim()
    if (!trimmed) return

    try {
      const response = editingTeam
        ? await fetch(`/api/teams/${editingTeam.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: trimmed }),
          })
        : await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: trimmed }),
          })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || t('saveError'))
      }

      setOpen(false)
      setTeamName('')
      setEditingTeam(null)
      await loadTeams()
      window.dispatchEvent(new CustomEvent('thabat-teams-changed'))
      router.refresh()
    } catch (error) {
      console.error('Team save failed:', error)
      alert(error instanceof Error ? error.message : t('saveError'))
    }
  }

  const confirmDeleteTeam = async () => {
    if (!deletingTeam) return

    try {
      const response = await fetch(`/api/teams/${deletingTeam.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || t('deleteError'))
      }

      setDeletingTeam(null)
      await loadTeams()
      window.dispatchEvent(new CustomEvent('thabat-teams-changed'))
      router.refresh()
    } catch (error) {
      console.error('Team delete failed:', error)
      alert(error instanceof Error ? error.message : t('deleteError'))
    }
  }

  if (isLoading) {
    return <TabLoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('teams')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('currentTeams')}</p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" /> {t('createTeam')}
        </button>
      </div>

      {isLoading ? (
        <div className="min-h-[220px] rounded-xl border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <div className="flex min-h-[180px] items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('team')}</p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{team.label}</h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(team)}
                    aria-label={t('editTeam')}
                    className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTeam(team)}
                    aria-label={t('deleteTeam')}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {teams.length === 0 && !isLoading && (
        <div className="min-h-[220px] rounded-2xl border border-dashed border-emerald-300 bg-white p-10 text-center dark:border-emerald-700/50 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('noSavedTeams')}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t('teamAppearsAfterCreation')}</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            <Plus className="h-4 w-4" /> {t('createTeam')}
          </button>
        </div>
      )}

      <Modal open={open} onOpenChange={setOpen} className="max-w-md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingTeam ? t('editTeam') : t('createTeam')}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <input
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder={t('teamName')}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <button
            type="button"
            onClick={() => void saveTeam()}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            {editingTeam ? t('saveChanges') : t('createTeam')}
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(deletingTeam)} onOpenChange={(value) => !value && setDeletingTeam(null)} className="max-w-md">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('deleteTeam')}</h2>
            <button
              type="button"
              onClick={() => setDeletingTeam(null)}
              className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            هل أنت متأكد من حذف الفريق <span className="font-bold">{deletingTeam?.label}</span>؟
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDeletingTeam(null)}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteTeam()}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              حذف
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
