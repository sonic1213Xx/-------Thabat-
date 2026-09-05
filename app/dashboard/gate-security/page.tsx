'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { Camera, CheckCircle2, Keyboard, ScanLine, ShieldCheck, XCircle } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { useLanguage } from '@/components/language-provider'

export default function GateSecurityPage() {
  const { locale } = useLanguage()
  const english = locale === 'en'
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<IScannerControls | null>(null)
  const scanInFlightRef = useRef(false)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [errorCode, setErrorCode] = useState<'QR_USED' | 'QR_UNKNOWN' | null>(null)
  const session = getSession()
  const canScan = hasPermission(session?.role, 'gate_passes', 'scan')

  useEffect(() => () => {
    scannerRef.current?.stop()
  }, [])

  const scanPass = async (value: string) => {
    const passId = value.trim()
    if (!passId || !session || scanInFlightRef.current) return
    scanInFlightRef.current = true
    setStatus('scanning')
    setErrorCode(null)
    try {
      const response = await fetch(`/api/gate-passes/${encodeURIComponent(passId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-role': session.role, 'x-thabat-user-id': session.id }, body: JSON.stringify({ action: 'scan', actorId: session.id }) })
      const result = await response.json()
      if (!response.ok) {
        if (result.code === 'QR_USED' || result.code === 'QR_UNKNOWN') {
          setErrorCode(result.code)
          throw new Error(result.code)
        }
        throw new Error(result.error || (english ? 'Pass rejected.' : 'تم رفض التصريح.'))
      }
      setStatus('success')
      setMessage(english ? 'Pass verified. Student may leave.' : 'تم التحقق من التصريح. يمكن للطالب المغادرة.')
      setToken('')
      window.setTimeout(() => setStatus('idle'), 1800)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error && !['QR_USED', 'QR_UNKNOWN'].includes(error.message) ? error.message : (english ? 'Pass rejected.' : 'تم رفض التصريح.'))
    } finally {
      scanInFlightRef.current = false
    }
  }
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(english ? 'Camera access is unavailable. Use manual code entry.' : 'الكاميرا غير متاحة. استخدم إدخال الرمز يدوياً.')
      return
    }
    try {
      scannerRef.current?.stop()
      const reader = new BrowserQRCodeReader()
      if (!videoRef.current) return
      setMessage('')
      setStatus('scanning')
      scannerRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        videoRef.current,
        (result) => {
          if (!result || scanInFlightRef.current) return
          scannerRef.current?.stop()
          void scanPass(result.getText())
        },
      )
    } catch {
      setStatus('error')
      setMessage(english ? 'Camera permission was denied. You can enter the code manually.' : 'تم رفض إذن الكاميرا. يمكنك إدخال الرمز يدوياً.')
    }
  }

  if (!canScan) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-foreground">{english ? 'Gate Security access is required.' : 'يلزم الدخول بدور حارس الأمن.'}</div>
  return <div className="mx-auto max-w-xl space-y-6 text-foreground" dir={english ? 'ltr' : 'rtl'}>
    <header><p className="text-sm font-semibold uppercase tracking-wider text-primary">{english ? 'Gate Security' : 'أمن البوابة'}</p><h1 className="mt-1 text-3xl font-bold">{english ? 'Gate pass scanner' : 'ماسح تصاريح الخروج'}</h1><p className="mt-2 text-sm text-foreground/65">{english ? 'Scan an approved pass to verify departure.' : 'امسح تصريحاً معتمداً للتحقق من المغادرة.'}</p></header>
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="relative aspect-[4/3] bg-slate-950"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" /><div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(52,211,153,0.25)]"><ScanLine className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-emerald-300" /></div><div className="absolute inset-x-0 bottom-0 bg-slate-950/75 p-3 text-center text-xs text-emerald-100">{status === 'scanning' ? (english ? 'Point camera at the QR code' : 'وجّه الكاميرا إلى رمز QR') : (english ? 'Scanner ready' : 'الماسح جاهز')}</div></div><div className="space-y-3 p-5"><button type="button" onClick={() => void startCamera()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"><Camera className="h-5 w-5" />{english ? 'Open camera' : 'فتح الكاميرا'}</button><div className="flex items-center gap-3 text-xs text-foreground/45"><span className="h-px flex-1 bg-border" />{english ? 'or enter manually' : 'أو أدخل الرمز يدوياً'}<span className="h-px flex-1 bg-border" /></div><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void scanPass(token) }}><input value={token} onChange={(event) => setToken(event.target.value)} placeholder={english ? 'Gate pass code' : 'رمز تصريح الخروج'} aria-label={english ? 'Gate pass code' : 'رمز تصريح الخروج'} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /><button type="submit" disabled={!token.trim() || status === 'scanning'} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 text-foreground hover:bg-accent disabled:opacity-40"><Keyboard className="h-5 w-5" />{english ? 'Verify' : 'تحقق'}</button></form></div></section>
    {typeof document !== 'undefined' && createPortal(<AnimatePresence>
      {status === 'success' && <motion.div initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-500/15 backdrop-blur-sm" role="status" aria-live="polite"><div className="flex flex-col items-center gap-4 text-emerald-500"><motion.div initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }} className="flex h-32 w-32 items-center justify-center rounded-full border-8 border-emerald-400 bg-emerald-100 shadow-[0_0_0_16px_rgba(52,211,153,0.15),0_0_80px_rgba(52,211,153,0.45)] dark:bg-emerald-950"><CheckCircle2 className="h-20 w-20" /></motion.div><p className="text-xl font-bold">{english ? 'Pass verified' : 'تم التحقق من التصريح'}</p></div></motion.div>}
    </AnimatePresence>, document.body)}
    {status === 'error' && <div className="flex items-center gap-3 rounded-2xl border border-red-300/50 bg-red-50 p-4 text-red-800 dark:bg-red-950/20 dark:text-red-200"><XCircle className="h-8 w-8 shrink-0" /><p className="font-semibold">{errorCode === 'QR_USED' ? (english ? 'This QR code has been used before.' : 'تم استخدام رمز QR هذا من قبل.') : errorCode === 'QR_UNKNOWN' ? (english ? 'Unknown QR code.' : 'رمز QR غير معروف.') : message}</p></div>}
    <div className="flex items-center justify-center gap-2 text-xs text-foreground/55"><ShieldCheck className="h-4 w-4 text-primary" />{english ? 'Only approved, unused passes are accepted.' : 'يتم قبول التصاريح المعتمدة وغير المستخدمة فقط.'}</div>
  </div>
}
