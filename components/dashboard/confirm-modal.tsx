'use client'

import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'

export function ConfirmModal({ open, title, message, onCancel, onConfirm, busy = false }: { open: boolean; title: string; message: string; onCancel: () => void; onConfirm: () => void; busy?: boolean }) {
  const { dir, t } = useLanguage()
  return <Modal open={open} onOpenChange={(value) => !value && onCancel()} className="max-w-sm"><div dir={dir}><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{message}</p><div className="mt-6 flex gap-3"><button type="button" onClick={onCancel} className="flex-1 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">{t('cancel')}</button><button type="button" onClick={onConfirm} disabled={busy} className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-white disabled:opacity-50">{busy ? t('deleting') : t('delete')}</button></div></div></Modal>
}
