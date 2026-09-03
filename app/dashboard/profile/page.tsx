'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, User } from 'lucide-react'
import { getCurrentProfile, getProfileSignature, saveProfileSignature } from '@/lib/auth'
import { SignatureCanvas } from '@/components/ui/signature-canvas'
import { useLanguage } from '@/components/language-provider'

export default function ProfilePage() {
  const [profile, setProfile] = useState(getCurrentProfile())
  const [signature, setSignature] = useState<string | null>(getProfileSignature())
  const [editing, setEditing] = useState(false)
    const { t } = useLanguage()
  useEffect(() => { const sync = () => { setProfile(getCurrentProfile()); setSignature(getProfileSignature()) }; window.addEventListener('thabat-profile-signature-changed', sync); return () => window.removeEventListener('thabat-profile-signature-changed', sync) }, [])
    if (!profile) return <div className="p-6 text-slate-500">{t('noUserSession')}</div>
    return <div className="space-y-6" dir="rtl"><header><p className="text-sm font-bold text-emerald-600">{t('account')}</p><h1 className="mt-1 text-3xl font-bold">{t('profile')}</h1><p className="mt-2 text-slate-600 dark:text-slate-400">{t('profileDescription')}</p></header><section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><User className="h-6 w-6" /></div><div><h2 className="text-xl font-bold">{profile.name}</h2><p className="text-sm text-slate-500">ID: {profile.id} · {profile.role}</p></div></div></section><section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{t('digitalSignature')}</h2><p className="mt-1 text-sm text-slate-500">{t('signatureDescription')}</p></div>{signature && <button type="button" onClick={() => saveProfileSignature(null)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"><Trash2 className="h-4 w-4" />{t('deleteSignature')}</button>}</div>{signature ? <div className="mt-5 flex flex-wrap items-end gap-5"><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><img src={signature} alt={t('savedSignature')} className="h-24 w-64 object-contain" /></div><button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"><Pencil className="h-4 w-4" />{t('updateSignature')}</button></div> : <div className="mt-5"><p className="text-sm text-slate-500">{t('noSavedSignature')}</p><button type="button" onClick={() => setEditing(true)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white">{t('addStudent')}</button></div>}</section>{editing && <SignatureCanvas initialSignature={signature} showDefaultOption onCancel={() => setEditing(false)} onSave={(value, saveAsDefault) => { saveProfileSignature(value); setSignature(value); setEditing(false); if (saveAsDefault) window.dispatchEvent(new CustomEvent('thabat-profile-signature-changed')) }} />}</div>
}
