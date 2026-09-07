'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { isCreatorRole } from '@/lib/permissions'
import { useLanguage } from '@/components/language-provider'
import { Modal } from '@/components/ui/modal'

const NOTICE_KEY_PREFIX = 'thabat-beta-notice-seen:'

export function BetaNotice() {
  const { locale } = useLanguage()
  const [open, setOpen] = useState(false)
  const [noticeKey, setNoticeKey] = useState<string | null>(null)

  useEffect(() => {
    const session = getSession()
    if (!session || isCreatorRole(session.role)) return
    const key = `${NOTICE_KEY_PREFIX}${session.id}`
    setNoticeKey(key)
    if (window.localStorage.getItem(key) !== 'true') setOpen(true)
  }, [])

  const acknowledge = () => {
    if (noticeKey) window.localStorage.setItem(noticeKey, 'true')
    setOpen(false)
  }

  const english = locale === 'en'
  return (
    <Modal open={open} onOpenChange={(nextOpen) => { if (!nextOpen) acknowledge() }} className="max-w-lg">
      <div className="space-y-5" dir={english ? 'ltr' : 'rtl'}>
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {english ? 'Beta testing notice' : 'تنبيه إصدار تجريبي'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {english ? 'Please read before using the system.' : 'يرجى القراءة قبل استخدام النظام.'}
            </p>
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
          <p>{english ? 'This is a beta version for testing only.' : 'هذه نسخة تجريبية مخصصة للاختبار فقط.'}</p>
          <p>{english ? 'Any data currently stored in the system may be deleted when the official application launches.' : 'قد يتم حذف أي بيانات مخزنة حالياً في النظام عند إطلاق التطبيق الرسمي.'}</p>
          <p>{english ? 'Please send any notes, issues, or reports to the curator.' : 'يرجى إرسال أي ملاحظات أو مشكلات أو تقارير إلى القيّم.'}</p>
        </div>
        <button type="button" onClick={acknowledge} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
          {english ? 'I understand' : 'فهمت'}
        </button>
      </div>
    </Modal>
  )
}
