'use client'

import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'

export function DivisionFormModal({
  open,
  onClose,
  code,
  name,
  onCodeChange,
  onNameChange,
  onSubmit,
  title,
  submitLabel,
}: {
  open: boolean
  onClose: () => void
  code: string
  name: string
  onCodeChange: (value: string) => void
  onNameChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  title?: string
  submitLabel?: string
}) {
  const { t } = useLanguage()
  const modalTitle = title ?? t('addDivision')
  const modalSubmitLabel = submitLabel ?? t('saveDivision')
  return (
    <Modal open={open} onOpenChange={(value) => !value && onClose()} className="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{modalTitle}</h2>
          <button type="button" onClick={onClose} aria-label={t('close')} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          required
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder={t('divisionCode')}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={t('divisionNameOptional')}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-900 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700">
          {modalSubmitLabel}
        </button>
      </form>
    </Modal>
  )
}
