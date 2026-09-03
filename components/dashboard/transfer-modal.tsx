'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { StyledSelect } from '@/components/ui/styled-select'
import { useLanguage } from '@/components/language-provider'

type Division = { code: string; name?: string }
type Student = { id: string; fullName: string; divisionCode?: string | null }

export function TransferModal({ student, divisions, onClose, onTransferred }: { student: Student | null; divisions: Division[]; onClose: () => void; onTransferred: (student: Student) => void }) {
  const { dir, t } = useLanguage()
  const [targetDivision, setTargetDivision] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!student || !targetDivision || targetDivision === student.divisionCode) return
    setSaving(true)
    const response = await fetch('/api/students/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: student.id, toDivision: targetDivision, reason }) })
    if (response.ok) { const result = await response.json(); onTransferred(result.data); onClose() }
    setSaving(false)
  }
  return <Modal open={Boolean(student)} onOpenChange={(open) => !open && onClose()} className="max-w-md"><form onSubmit={save} dir={dir} className="space-y-4"><h2 className="text-xl font-bold">{t('transferStudent')}</h2><p className="text-sm text-slate-600 dark:text-slate-300">{student?.fullName}</p><StyledSelect value={targetDivision} onValueChange={setTargetDivision} placeholder={t('chooseNewDivision')} options={divisions.filter((division) => division.code !== student?.divisionCode).map((division) => ({ value: division.code, label: division.name || division.code }))} /><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('transferReasonOptional')} rows={3} className="w-full rounded-lg border px-3 py-2 text-start dark:bg-slate-950" /><button type="submit" disabled={saving || !targetDivision} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-white disabled:opacity-50">{saving ? t('transferring') : t('confirmTransfer')}</button></form></Modal>
}
