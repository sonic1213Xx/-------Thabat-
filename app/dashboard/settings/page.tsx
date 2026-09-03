'use client'

import { useState } from 'react'
import { Building2, DatabaseBackup, Users, Settings2, AlertTriangle, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'

export default function SettingsPage() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState({
    schoolName: 'مدرسة السلمية الثانوية',
    autoAudit: true,
    teamPermissions: true,
    backupMode: true,
  })
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  const handleResetData = async () => {
    setResetting(true)
    setResetMessage('')
    try {
      const response = await fetch('/api/dev/reset-data', { method: 'POST' })
      const result = await response.json()

      if (response.ok) {
        setResetMessage(t('resetSuccess'))
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setResetMessage(result.error || t('resetError'))
      }
    } catch (error) {
      setResetMessage(t('resetFailure'))
      console.error(error)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('settings')}</h1>
        <p className="text-slate-600 dark:text-slate-400">{t('settingsDescription')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('schoolInfo')}</h2>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-slate-600 dark:text-slate-300">{t('schoolName')}</span>
              <input value={settings.schoolName} onChange={(e) => setSettings((prev) => ({ ...prev, schoolName: e.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-right dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t('schoolIdentifier')}: 1047 · {t('schoolLevel')} · {t('schoolRegion')}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('teamAccess')}</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700 dark:text-slate-300">{t('teamPermissions')}</span>
              <input type="checkbox" checked={settings.teamPermissions} onChange={() => setSettings((prev) => ({ ...prev, teamPermissions: !prev.teamPermissions }))} className="h-4 w-4 accent-emerald-600" />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700 dark:text-slate-300">{t('automaticAudit')}</span>
              <input type="checkbox" checked={settings.autoAudit} onChange={() => setSettings((prev) => ({ ...prev, autoAudit: !prev.autoAudit }))} className="h-4 w-4 accent-emerald-600" />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <DatabaseBackup className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('backupDatabase')}</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-700 dark:text-slate-300">{t('automaticBackup')}</span>
              <input type="checkbox" checked={settings.backupMode} onChange={() => setSettings((prev) => ({ ...prev, backupMode: !prev.backupMode }))} className="h-4 w-4 accent-emerald-600" />
            </label>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('lastBackupDetails')}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('dangerZone')}</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {t('resetWarning')}
            </p>
            <button
              type="button"
              onClick={() => setResetDialogOpen(true)}
              className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700"
            >
              <AlertTriangle className="mb-1 inline h-4 w-4" /> {t('resetAllData')}
            </button>
          </div>
        </div>
      </div>

      <Modal open={resetDialogOpen} onOpenChange={setResetDialogOpen} className="max-w-md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('confirmReset')}</h2>
          </div>

          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
            <p className="font-semibold mb-2">{t('warning')}:</p>
            <p>{t('resetWarning')}</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>{t('studentsAndGirls')}</li>
              <li>{t('teamsAndDivisions')}</li>
              <li>{t('attendanceRecords')}</li>
              <li>{t('warningsRecords')}</li>
              <li>{t('auditRecords')}</li>
            </ul>
          </div>

          {resetMessage && (
            <div
              className={`rounded-lg p-3 text-sm ${
                resetMessage === t('resetSuccess')
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/30'
              }`}
            >
              {resetMessage}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleResetData()}
              disabled={resetting}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('resetting')}
                </>
              ) : (
                t('deleteAllData')
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
