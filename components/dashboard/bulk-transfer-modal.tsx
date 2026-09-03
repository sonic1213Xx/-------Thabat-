'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { StyledSelect } from '@/components/ui/styled-select'
import { useLanguage } from '@/components/language-provider'
import { getSession } from '@/lib/auth'

type Student = { id: string; fullName: string; divisionCode?: string | null }
type Division = { code: string; name?: string }

export function BulkTransferModal({ open, students, divisions, onClose, onTransferred }: { open: boolean; students: Student[]; divisions: Division[]; onClose: () => void; onTransferred: () => void }) {
  const { dir, locale, t } = useLanguage()
  const [targetDivision, setTargetDivision] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const session = getSession()
    if (!session || !targetDivision) return
    setSaving(true)
    try {
      const response = await fetch('/api/students/transfer/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds: students.map((student) => student.id), toDivision: targetDivision, reason, performedByUserId: session.id }) })
      if (!response.ok) throw new Error(locale === 'ar' ? 'تعذر نقل الطلاب.' : 'Unable to transfer students.')
      onTransferred()
      onClose()
    } catch (error) {
      alert(error instanceof Error ? error.message : locale === 'ar' ? 'تعذر نقل الطلاب.' : 'Unable to transfer students.')
    } finally {
      setSaving(false)
    }
  }
  return <Modal open={open && students.length > 0} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-lg"><form onSubmit={save} dir={dir} className="space-y-4"><h2 className="text-xl font-bold text-card-foreground">{locale === 'ar' ? `نقل ${students.length} طالباً` : `Transfer ${students.length} students`}</h2><p className="rounded-lg bg-muted p-3 text-sm text-card-foreground/70">{locale === 'ar' ? 'سيصل إشعار مجمع إلى معلم الشعبة الجديدة مع سجل الدرجات السابق.' : 'The receiving teacher will get one grouped notification with previous grade records.'}</p><StyledSelect value={targetDivision} onValueChange={setTargetDivision} placeholder={t('chooseNewDivision')} options={divisions.filter((division) => !students.every((student) => division.code === student.divisionCode)).map((division) => ({ value: division.code, label: division.name || division.code }))} /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('transferReasonOptional')} rows={3} className="w-full rounded-lg border px-3 py-2 text-start dark:bg-slate-950" /><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button><button type="submit" disabled={saving || !targetDivision} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('transferring') : t('confirmTransfer')}</button></div></form></Modal>
}
