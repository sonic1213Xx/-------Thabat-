'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, User } from 'lucide-react'
import { getCurrentProfile, getProfileSignature, saveProfileSignature } from '@/lib/auth'
import { SignatureCanvas } from '@/components/ui/signature-canvas'
import { useLanguage } from '@/components/language-provider'
import { TeachingAssignmentEditor } from '@/components/dashboard/teaching-assignment-editor'
import type { TeachingAssignment } from '@/lib/auth'

export default function ProfilePage() {
  const [profile, setProfile] = useState(getCurrentProfile())
  const [signature, setSignature] = useState<string | null>(getProfileSignature())
  const [editing, setEditing] = useState(false)
  const [divisions, setDivisions] = useState<string[]>([])
  const [assignments, setAssignments] = useState<TeachingAssignment[]>(profile?.teachingAssignments ?? [])
  const [assignmentsEditing, setAssignmentsEditing] = useState(false)
  const [assignmentsSaving, setAssignmentsSaving] = useState(false)
  const [assignmentsMessage, setAssignmentsMessage] = useState('')
    const { t, locale } = useLanguage()
  useEffect(() => { const sync = () => { const nextProfile = getCurrentProfile(); setProfile(nextProfile); setAssignments(nextProfile?.teachingAssignments ?? []); setSignature(getProfileSignature()) }; window.addEventListener('thabat-profile-signature-changed', sync); void fetch('/api/divisions').then((response) => response.json()).then((json) => setDivisions((json.data ?? []).map((item: { code: string }) => item.code))).catch(() => setDivisions([])); return () => window.removeEventListener('thabat-profile-signature-changed', sync) }, [])
  const saveAssignments = async () => {
    if (!profile) return
    const nextAssignments = assignments.filter((assignment) => assignment.subject.trim()).map((assignment) => ({ ...assignment, subject: assignment.subject.trim(), divisions: Array.from(new Set(assignment.divisions)) }))
    if (!nextAssignments.length) { setAssignmentsMessage(locale === 'ar' ? 'أضف مادة واحدة على الأقل.' : 'Add at least one subject.'); return }
    setAssignmentsSaving(true)
    try {
      const response = await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: profile.id, name: profile.name, role: profile.role, divisions: Array.from(new Set(nextAssignments.flatMap((assignment) => assignment.divisions))), subjectsTaught: nextAssignments.map((assignment) => assignment.subject), teachingAssignments: nextAssignments }) })
      if (!response.ok) throw new Error('Unable to save assignments')
      const nextProfile = { ...profile, teachingAssignments: nextAssignments, subjectsTaught: nextAssignments.map((assignment) => assignment.subject), subject: nextAssignments[0].subject, assigned_divisions: Array.from(new Set(nextAssignments.flatMap((assignment) => assignment.divisions))) }
      const { saveProfile } = await import('@/lib/auth')
      saveProfile(nextProfile)
      setProfile(nextProfile)
      setAssignments(nextAssignments)
      setAssignmentsEditing(false)
      setAssignmentsMessage(locale === 'ar' ? 'تم الحفظ.' : 'Saved.')
    } catch { setAssignmentsMessage(locale === 'ar' ? 'تعذر الحفظ.' : 'Unable to save.') } finally { setAssignmentsSaving(false) }
  }
    if (!profile) return <div className="p-6 text-slate-500">{t('noUserSession')}</div>
    return <div className="space-y-6" dir="rtl"><header><p className="text-sm font-bold text-emerald-600">{t('account')}</p><h1 className="mt-1 text-3xl font-bold">{t('profile')}</h1><p className="mt-2 text-slate-600 dark:text-slate-400">{t('profileDescription')}</p></header><section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><User className="h-6 w-6" /></div><div><h2 className="text-xl font-bold">{profile.name}</h2><p className="text-sm text-slate-500">ID: {profile.id} · {profile.role}</p></div></div></section>{profile.role === 'TEACHER' && <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{locale === 'ar' ? 'المواد والشعب' : 'Teaching assignments'}</h2><p className="mt-1 text-sm text-slate-500">{locale === 'ar' ? 'حدّث المواد والشعب المرتبطة بك.' : 'Update your subjects and mapped divisions.'}</p></div><button type="button" onClick={() => { setAssignmentsEditing((current) => !current); setAssignmentsMessage('') }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Pencil className="h-4 w-4" />{assignmentsEditing ? t('cancel') : (locale === 'ar' ? 'تعديل' : 'Edit')}</button></div>{assignmentsEditing ? <><TeachingAssignmentEditor assignments={assignments} divisions={divisions} locale={locale} onChange={setAssignments} /><button type="button" disabled={assignmentsSaving} onClick={() => void saveAssignments()} className="mt-4 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{assignmentsSaving ? t('saving') : t('saveChanges')}</button></> : <div className="mt-4 flex flex-wrap gap-2">{assignments.map((assignment) => <span key={assignment.id} className="rounded-lg border px-3 py-2 text-sm">{assignment.subject}: {assignment.divisions.join(', ') || (locale === 'ar' ? 'كل الشعب' : 'All divisions')}</span>)}{!assignments.length && <p className="text-sm text-slate-500">{locale === 'ar' ? 'لم تتم إضافة مواد بعد.' : 'No teaching assignments yet.'}</p>}</div>}{assignmentsMessage && <p className="mt-3 text-sm text-emerald-600">{assignmentsMessage}</p>}</section>}<section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{t('digitalSignature')}</h2><p className="mt-1 text-sm text-slate-500">{t('signatureDescription')}</p></div>{signature && <button type="button" onClick={() => saveProfileSignature(null)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"><Trash2 className="h-4 w-4" />{t('deleteSignature')}</button>}</div>{signature ? <div className="mt-5 flex flex-wrap items-end gap-5"><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><img src={signature} alt={t('savedSignature')} className="h-24 w-64 object-contain" /></div><button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"><Pencil className="h-4 w-4" />{t('updateSignature')}</button></div> : <div className="mt-5"><p className="text-sm text-slate-500">{t('noSavedSignature')}</p><button type="button" onClick={() => setEditing(true)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">{t('addStudent')}</button></div>}</section>{editing && <SignatureCanvas initialSignature={signature} showDefaultOption onCancel={() => setEditing(false)} onSave={(value, saveAsDefault) => { saveProfileSignature(value); setSignature(value); setEditing(false); if (saveAsDefault) window.dispatchEvent(new CustomEvent('thabat-profile-signature-changed')) }} />}</div>
}
